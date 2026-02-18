"""Anthropic Claude LLM client with cost tracking, web search, and retry.
Also includes OllamaClient for local model inference via Ollama."""
import os
import time
from typing import Optional
import httpx
from anthropic import AsyncAnthropic
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from backend.app.config import get_settings
import structlog

logger = structlog.get_logger()

MODEL_PRICING = {
    "claude-sonnet-4-5-20250929": {"input": 3.00, "output": 15.00},
    "claude-haiku-4-5-20251001": {"input": 0.80, "output": 4.00},
}

# $10 per 1,000 searches
WEB_SEARCH_COST_PER_REQUEST = 0.01


class OllamaClient:
    """Async client for local Ollama inference. Cost is $0.00."""

    def __init__(self):
        self.base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        self.model = os.getenv("OLLAMA_MODEL", "llama3:8b")
        self._healthy: Optional[bool] = None

    async def health_check(self) -> bool:
        """Check if Ollama is running and reachable."""
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                resp = await client.get(f"{self.base_url}/api/tags")
                self._healthy = resp.status_code == 200
                return self._healthy
        except (httpx.ConnectError, httpx.TimeoutException, OSError):
            self._healthy = False
            return False

    async def call(
        self,
        model: Optional[str] = None,
        system: str = "",
        messages: list[dict] = None,
        max_tokens: int = 2048,
        temperature: float = 0.3,
        tools: Optional[list] = None,  # ignored for Ollama, kept for interface compat
    ) -> dict:
        """Call Ollama's chat API. Returns the same dict shape as LLMClient.call()."""
        start = time.time()
        use_model = model or self.model

        # Build Ollama message format (same role/content as Anthropic)
        ollama_messages = []
        if system:
            ollama_messages.append({"role": "system", "content": system})
        if messages:
            ollama_messages.extend(messages)

        payload = {
            "model": use_model,
            "messages": ollama_messages,
            "stream": False,
            "options": {
                "temperature": temperature,
                "num_predict": max_tokens,
            },
        }

        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(
                f"{self.base_url}/api/chat",
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()

        duration_ms = int((time.time() - start) * 1000)

        # Ollama returns token counts in the response
        input_tokens = data.get("prompt_eval_count", 0) or 0
        output_tokens = data.get("eval_count", 0) or 0
        content = data.get("message", {}).get("content", "")

        result = {
            "content": content,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "cost_usd": 0.0,  # Local inference is free
            "duration_ms": duration_ms,
            "model": use_model,
            "stop_reason": "end_turn",
            "web_searches": 0,
            "provider": "ollama",
        }

        logger.info(
            "ollama_call",
            model=use_model,
            tokens=input_tokens + output_tokens,
            cost=0.0,
            duration_ms=duration_ms,
        )
        return result


ollama_client = OllamaClient()


class LLMClient:
    def __init__(self):
        settings = get_settings()
        self.client = AsyncAnthropic(api_key=settings.anthropic_api_key)

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10), retry=retry_if_exception_type((TimeoutError, ConnectionError)))
    async def call(
        self,
        model: str,
        system: str,
        messages: list[dict],
        max_tokens: int = 4096,
        temperature: float = 0.3,
        tools: Optional[list] = None,
    ) -> dict:
        start = time.time()

        kwargs = {
            "model": model,
            "system": system,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
        }
        if tools:
            kwargs["tools"] = tools

        # Call with pause_turn loop — web search may need multiple rounds
        total_input_tokens = 0
        total_output_tokens = 0
        total_web_searches = 0
        all_text_parts: list[str] = []
        tool_use_data = None
        conv_messages = list(messages)

        for _ in range(5):  # Max 5 continuation rounds
            response = await self.client.messages.create(**kwargs)

            total_input_tokens += response.usage.input_tokens
            total_output_tokens += response.usage.output_tokens

            # Count web searches in this round
            server_tool_use = getattr(response.usage, "server_tool_use", None)
            if server_tool_use:
                total_web_searches += getattr(server_tool_use, "web_search_requests", 0)

            # Extract text from response blocks
            for block in response.content:
                if block.type == "text":
                    all_text_parts.append(block.text)
                elif block.type == "tool_use" and tool_use_data is None:
                    tool_use_data = {"name": block.name, "input": block.input}

            # If pause_turn, continue the conversation with the response so far
            if response.stop_reason == "pause_turn":
                logger.info("llm_pause_turn", model=model, round=_ + 1)
                conv_messages.append({"role": "assistant", "content": response.content})
                kwargs["messages"] = conv_messages
                continue

            # Done — either end_turn or tool_use or max_tokens
            break

        duration_ms = int((time.time() - start) * 1000)

        pricing = MODEL_PRICING.get(model, {"input": 3.0, "output": 15.0})
        input_cost = (total_input_tokens / 1_000_000) * pricing["input"]
        output_cost = (total_output_tokens / 1_000_000) * pricing["output"]
        web_search_cost = total_web_searches * WEB_SEARCH_COST_PER_REQUEST

        text_content = "\n".join(all_text_parts)

        result = {
            "content": text_content,
            "input_tokens": total_input_tokens,
            "output_tokens": total_output_tokens,
            "cost_usd": round(input_cost + output_cost + web_search_cost, 6),
            "duration_ms": duration_ms,
            "model": model,
            "stop_reason": response.stop_reason,
            "web_searches": total_web_searches,
        }

        if tool_use_data:
            result["tool_use"] = tool_use_data

        logger.info("llm_call", model=model, tokens=total_input_tokens + total_output_tokens, cost=result["cost_usd"], duration_ms=duration_ms, web_searches=total_web_searches)
        return result


llm_client = LLMClient()
