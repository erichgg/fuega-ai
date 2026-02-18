"""Base Agent class - objective, role-based, with web search and tool access."""
import json
import os
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.app.database.models import Agent, AgentLog, AgentMemory, AgentStatus
from backend.app.core.llm import llm_client, ollama_client
from backend.app.config import load_yaml_config
import structlog

logger = structlog.get_logger()

# Agents that should have web search enabled (they need real-world data)
WEB_SEARCH_AGENTS = {
    "local_outreach", "smb_researcher", "prospector", "seo_analyst",
}

# Agents that can run on local Ollama models (simpler tasks, no web search needed)
LOCAL_MODEL_AGENTS = {
    "social_media_manager", "cfo_agent", "fulfillment_agent",
    "email_marketing_agent", "analytics_agent",
}

# Ollama config (overridable via env)
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3:8b")
OLLAMA_ENABLED = os.getenv("OLLAMA_ENABLED", "true").lower() == "true"

# Agents that use reduced max_tokens (2048 instead of default 4096)
REDUCED_TOKEN_AGENTS = {"ceo", "editor"}


class BaseAgent:
    """Base class for all Chyspa AI agents.

    Agents are objective, fact-based tools defined by:
    - Role: What decisions this agent makes
    - Inputs: What data/context it needs
    - Outputs: What it produces (structured JSON)
    - Tools: What APIs/databases it can query (including web search)
    - Model: Which Claude model to use
    - Budget: Max monthly API spend
    """

    slug: str = ""

    def __init__(self):
        self.config = self._load_config()
        self.model = self.config.get("model", "claude-haiku-4-5-20251001")
        self.system_prompt = self.config.get("system_prompt", "")
        self.name = self.config.get("name", self.slug)
        self.role = self.config.get("role", "")

    def _load_config(self) -> dict:
        agents_config = load_yaml_config("agents")
        if agents_config and "agents" in agents_config:
            return agents_config["agents"].get(self.slug, {})
        return {}

    def _available_integrations(self) -> str:
        """Return a summary of configured API integrations for agent context."""
        from backend.app.config import get_settings
        settings = get_settings()
        integrations = []
        if settings.twitter_api_key:
            integrations.append("Twitter/X (posting, reading tweets)")
        if settings.resend_api_key:
            integrations.append("Resend (transactional & marketing email)")
        if settings.elevenlabs_api_key:
            integrations.append("ElevenLabs (AI voiceover, text-to-speech, audio content)")
        if settings.pexels_api_key:
            integrations.append("Pexels (stock photos & video)")
        if settings.youtube_api_key:
            integrations.append("YouTube (video publishing, analytics)")
        if settings.wordpress_url:
            integrations.append("WordPress (blog publishing)")
        if settings.buffer_access_token:
            integrations.append("Buffer (social media scheduling)")
        if settings.openai_api_key:
            integrations.append("OpenAI (image generation via DALL-E)")
        if not integrations:
            return ""
        return "\n\nAvailable platform integrations (API keys configured):\n- " + "\n- ".join(integrations) + "\nWhen planning actions, leverage these real integrations. Reference specific platforms you can use."

    def _get_tools(self, context: Optional[dict] = None) -> Optional[list]:
        """Build the tools list for this agent. Agents in WEB_SEARCH_AGENTS get web search."""
        tools = []

        if self.slug in WEB_SEARCH_AGENTS:
            web_search_tool: dict = {
                "type": "web_search_20250305",
                "name": "web_search",
                "max_uses": 5,
            }
            # Add location context for local-oriented agents
            location = None
            if context:
                location = context.get("location")
            if location and self.slug in ("local_outreach", "smb_researcher", "prospector"):
                # Try to parse city/country from location string
                parts = [p.strip() for p in location.split(",")]
                loc_config: dict = {"type": "approximate"}
                if len(parts) >= 2:
                    loc_config["city"] = parts[0]
                    loc_config["country"] = parts[-1] if len(parts[-1]) == 2 else "MX"
                    if len(parts) >= 3:
                        loc_config["region"] = parts[1]
                else:
                    loc_config["city"] = parts[0]
                    loc_config["country"] = "MX"
                loc_config["timezone"] = "America/Mexico_City"
                web_search_tool["user_location"] = loc_config

            tools.append(web_search_tool)

        return tools if tools else None

    async def think(
        self,
        prompt: str,
        db: AsyncSession,
        context: Optional[dict] = None,
        max_tokens: int = 4096,
        temperature: float = 0.3,
    ) -> dict:
        """Make an LLM call with cost tracking, web search, and budget enforcement.

        Routes to Ollama for LOCAL_MODEL_AGENTS when available, falls back to Claude.
        Reduces max_tokens for CEO/Editor agents.
        """
        # Apply reduced max_tokens for agents that don't need 4K output
        if self.slug in REDUCED_TOKEN_AGENTS and max_tokens > 2048:
            max_tokens = 2048

        # Check budget
        agent_record = await self._get_agent_record(db)
        if agent_record and agent_record.status == AgentStatus.BUDGET_EXCEEDED:
            logger.warning("agent_budget_exceeded", agent=self.slug)
            return {"error": "Budget exceeded", "agent": self.slug}

        # Recall relevant memories
        memories = await self._recall_memories(db, agent_record)

        # Build messages
        system = self.system_prompt
        system += self._available_integrations()
        if self.slug in WEB_SEARCH_AGENTS:
            system += "\n\nIMPORTANT: You have web search enabled. USE IT to find real businesses, real data, real facts. Search Google for actual businesses in the target area. Do not make up or generate fictional businesses — search and find real ones."
        if memories:
            system += f"\n\nRelevant learnings from past experience:\n{json.dumps(memories, indent=2)}"
        if context:
            system += f"\n\nCurrent context:\n{json.dumps(context, indent=2)}"

        messages = [{"role": "user", "content": prompt}]

        # Build tools (web search for agents that need it)
        tools = self._get_tools(context)

        # Route to Ollama for local model agents when enabled and healthy
        use_ollama = False
        if OLLAMA_ENABLED and self.slug in LOCAL_MODEL_AGENTS:
            try:
                if await ollama_client.health_check():
                    use_ollama = True
                else:
                    logger.warning(
                        "ollama_unavailable_fallback_claude",
                        agent=self.slug,
                        msg="Ollama not reachable, falling back to Claude Haiku",
                    )
            except Exception:
                logger.warning(
                    "ollama_health_check_error",
                    agent=self.slug,
                    msg="Ollama health check failed, falling back to Claude Haiku",
                )

        # Call LLM (Ollama or Claude)
        if use_ollama:
            result = await ollama_client.call(
                model=OLLAMA_MODEL,
                system=system,
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature,
            )
        else:
            result = await llm_client.call(
                model=self.model,
                system=system,
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature,
                tools=tools,
            )

        # Log the call
        await self._log_action(db, prompt, result, agent_record)

        # Update spend
        if agent_record:
            agent_record.month_spend_usd = (agent_record.month_spend_usd or 0) + result.get("cost_usd", 0)
            agent_record.total_calls = (agent_record.total_calls or 0) + 1
            agent_record.total_tokens = (agent_record.total_tokens or 0) + result.get("input_tokens", 0) + result.get("output_tokens", 0)
            if (agent_record.month_spend_usd or 0) >= (agent_record.monthly_budget_usd or 0) and agent_record.monthly_budget_usd:
                agent_record.status = AgentStatus.BUDGET_EXCEEDED
                logger.critical("budget_exceeded", agent=self.slug, spend=agent_record.month_spend_usd)
            await db.commit()

        # Try to parse JSON from response
        result["parsed"] = self._parse_json(result.get("content", ""))
        return result

    async def _get_agent_record(self, db: AsyncSession) -> Optional[Agent]:
        result = await db.execute(select(Agent).where(Agent.slug == self.slug))
        return result.scalar_one_or_none()

    async def _log_action(self, db: AsyncSession, prompt: str, result: dict, agent_record: Optional[Agent] = None):
        if agent_record is None:
            agent_record = await self._get_agent_record(db)
        if not agent_record:
            return
        log = AgentLog(
            agent_id=agent_record.id,
            action=f"{self.slug}_think",
            input_summary=prompt[:500],
            output_summary=result.get("content", "")[:500],
            input_tokens=result.get("input_tokens", 0),
            output_tokens=result.get("output_tokens", 0),
            cost_usd=result.get("cost_usd", 0),
            duration_ms=result.get("duration_ms", 0),
            success=True,
        )
        db.add(log)

    async def _recall_memories(self, db: AsyncSession, agent_record: Optional[Agent] = None) -> list[dict]:
        if agent_record is None:
            agent_record = await self._get_agent_record(db)
        if not agent_record:
            return []
        result = await db.execute(
            select(AgentMemory)
            .where(AgentMemory.agent_id == agent_record.id)
            .order_by(AgentMemory.confidence.desc())
            .limit(10)
        )
        memories = result.scalars().all()
        return [{"key": m.key, "value": m.value, "confidence": m.confidence} for m in memories]

    async def learn(self, db: AsyncSession, category: str, key: str, value: dict, confidence: float = 0.5):
        """Store a learning for future recall."""
        agent_record = await self._get_agent_record(db)
        if not agent_record:
            return
        memory = AgentMemory(
            agent_id=agent_record.id,
            category=category,
            key=key,
            value=value,
            confidence=confidence,
        )
        db.add(memory)
        await db.commit()

    @staticmethod
    def _parse_json(text: str) -> Optional[dict]:
        """Try to extract JSON from LLM response."""
        import re
        # Try direct parse
        try:
            return json.loads(text)
        except (json.JSONDecodeError, TypeError):
            pass
        # Try extracting from code block
        match = re.search(r'``' + '`(?:json)?\s*([\s\S]*?)\s*``' + '`', text)
        if match:
            try:
                return json.loads(match.group(1))
            except json.JSONDecodeError:
                pass
        # Try finding JSON object
        match = re.search(r'\{[\s\S]*?\}', text)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                pass
        return None
