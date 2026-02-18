"""Workflow state machine with smart context threading, lead persistence, and agent collaboration."""
import json
from datetime import datetime, timedelta, timezone
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.app.database.models import (
    WorkflowRun, WorkflowStep, WorkflowStatus, StepStatus,
    Lead, LeadStage,
    AgentActionConfig, HITLMode, ApprovalRequest, ApprovalStatus,
)
from backend.app.config import load_yaml_config
from backend.app.core.message_bus import message_bus
import structlog

logger = structlog.get_logger()

# Actions that require HITL check before execution
HITL_CONTROLLED_ACTIONS = {
    "send_email", "post_tweet", "make_api_call", "update_lead",
    "draft_outreach", "format_and_publish", "send",
}


async def check_hitl(
    agent_slug: str,
    action_name: str,
    payload: dict,
    db: AsyncSession,
    context: dict | None = None,
) -> dict:
    """Check if an action needs human approval before proceeding.

    Returns:
        {"proceed": True, "payload": payload} for AUTO mode
        {"proceed": False, "reason": "manual_only"} for MANUAL mode
        {"proceed": False, "approval_id": id, "reason": "awaiting_approval"} for APPROVE mode
    """
    # Look up the config for this agent+action
    result = await db.execute(
        select(AgentActionConfig).where(
            AgentActionConfig.agent_slug == agent_slug,
            AgentActionConfig.action_name == action_name,
        )
    )
    config = result.scalar_one_or_none()

    # Default to APPROVE if no config exists for controlled actions
    mode = config.mode if config else HITLMode.APPROVE

    if mode == HITLMode.AUTO:
        return {"proceed": True, "payload": payload}

    if mode == HITLMode.MANUAL:
        return {"proceed": False, "reason": "manual_only"}

    # APPROVE mode: create an approval request
    approval = ApprovalRequest(
        agent_slug=agent_slug,
        action_name=action_name,
        payload=payload,
        context=context,
        status=ApprovalStatus.PENDING,
        expires_at=datetime.utcnow() + timedelta(hours=24),
    )
    db.add(approval)
    await db.flush()

    await message_bus.publish("approval.requested", {
        "approval_id": approval.id,
        "agent_slug": agent_slug,
        "action_name": action_name,
        "payload_summary": str(payload)[:200],
    })

    logger.info(
        "hitl_approval_requested",
        agent=agent_slug,
        action=action_name,
        approval_id=approval.id,
    )

    return {
        "proceed": False,
        "approval_id": approval.id,
        "reason": "awaiting_approval",
    }


# ── Prompt templates that thread previous agent output into the next agent ──

STEP_PROMPTS = {
    # ─── Outreach Pipeline ───
    "scout_local_businesses": """You are Elena, Fuega AI's Local Outreach Specialist. Scout REAL businesses in the target area.

TARGET AREA: {location}
{industry_line}

USE WEB SEARCH to find real small businesses in {location}. Search for things like:
- "restaurants in {location}"
- "salons in {location}"
- "small businesses {location}"
- "dentist {location}"
- "{location} tiendas" etc.

Find 5-10 REAL businesses with their actual names, ratings, and details from Google.

For EACH real business you find, provide ALL these fields:
- "business_name": The real business name
- "industry": The business category
- "location": Their actual address or neighborhood
- "google_rating": Their actual Google rating (or estimate)
- "review_count": Their actual review count (or estimate)
- "has_website": true or false based on what you find
- "has_social": true or false based on what you find
- "digital_gap_score": 40-95 (your assessment — higher = bigger gap)
- "score": 30-85 (overall lead score)
- "email": Contact email if you find one, or a plausible one
- "phone": Their phone number if available
- "recommended_service_tier": "starter" or "growth" or "premium"
- "notes": One sentence on their digital gap

Return ONLY valid JSON:
{{"businesses": [{{"business_name": "...", "industry": "...", "location": "...", "google_rating": 4.2, "review_count": 87, "has_website": false, "has_social": true, "digital_gap_score": 72, "score": 65, "email": "...", "phone": "...", "recommended_service_tier": "growth", "notes": "..."}}]}}""",

    "research_businesses": """You are Tomás, Fuega AI's SMB Researcher. Deep-dive on each business from the scout report.

USE WEB SEARCH to research each business — look up their website, social media, Google listing, and competitors. Get real data.

BUSINESSES FROM SCOUT:
{previous_output}

For EACH business, produce a research brief with these EXACT JSON fields:
- "business_name": (match from scout)
- "research": {{"summary": "...", "digital_audit": {{"website": "...", "google_business": "...", "social_media": "..."}}, "competitors": ["comp1", "comp2", "comp3"], "market_opportunity": "..."}}
- "quick_win": The #1 thing we could deliver in 30 days
- "recommended_tier": "starter" ($149/mo) or "growth" ($499/mo) or "premium" ($999/mo)
- "value_proposition": One compelling sentence tailored to this business
- "score": 40-90 (updated qualification score)

Return ONLY valid JSON:
{{"researched_businesses": [{{"business_name": "...", "research": {{...}}, "quick_win": "...", "recommended_tier": "...", "value_proposition": "...", "score": 65}}]}}""",

    "score_and_qualify": """Score and qualify these researched leads for our sales pipeline.

RESEARCHED LEADS:
{previous_output}

Score each lead 0-100 based on:
- Digital maturity gap (30%): Bigger gap = bigger opportunity
- Industry fit (25%): How well our services match their needs
- Budget capacity (25%): Can they afford $149-999/mo based on business size?
- Growth indicators (20%): Signs of growth, investment, expansion

Only qualify leads scoring >= 50. For each qualified lead, recommend:
- Priority rank (1 = highest priority)
- Recommended service tier
- Best outreach channel (email, whatsapp, instagram_dm, phone)
- Key talking point for outreach

Return as JSON:
{{"qualified_leads": [
  {{"business_name": "...", "score": 0-100, "qualified": true/false, "priority": 1, "recommended_tier": "...", "outreach_channel": "...", "key_talking_point": "...", "score_breakdown": {{...}}}}
]}}""",

    "draft_outreach": """Draft HIGHLY personalized outreach messages for these qualified leads.

QUALIFIED LEADS WITH RESEARCH:
{previous_output}

CRITICAL INSTRUCTIONS:
You MUST reference SPECIFIC details from the research step for each lead. Generic messages will be rejected.

For EACH qualified lead, produce personalized outreach using these rules:

1. PERSONALIZATION (mandatory — use real data from research):
   - Reference their exact Google rating and number of reviews (e.g., "Con tus 4.5 estrellas y 120 resenas...")
   - Mention what their customers say (positive themes from reviews)
   - Identify their specific digital gaps found during research (no website, no social media, poor SEO, etc.)
   - Reference their location/neighborhood

2. LANGUAGE:
   - Write in Spanish (es) for Mexico/Colombia leads
   - Write in Portuguese (pt) for Brazil leads
   - Default to Spanish if language not specified

3. VALUE PROPOSITION — tailor to their #1 gap:
   - No website → "Te creamos una pagina web profesional en 2 semanas"
   - No social media → "Manejamos tus redes sociales para atraer mas clientes"
   - Low Google visibility → "Te ayudamos a aparecer en los primeros resultados de Google"
   - No online ordering/booking → "Implementamos reservaciones/pedidos en linea"

4. MESSAGE LENGTH:
   - Email: 3-4 sentences MAX (subject line + short body)
   - WhatsApp: 2-3 sentences MAX (casual, direct, no formality)
   - Voice clip script: 2-3 sentences for a 15-20 second audio greeting

5. GENERATE BOTH email AND WhatsApp versions for each lead

6. TONE: Warm, casual, respectful — like a helpful neighbor, NOT a salesperson

Return ONLY valid JSON with this EXACT structure:
{{"outreach_messages": [
  {{
    "business_name": "...",
    "email_subject": "...",
    "email_body": "...",
    "whatsapp_message": "...",
    "voice_clip_script": "...",
    "personalization_notes": "Key details used: rating, gap, value prop chosen",
    "language": "es|pt",
    "channel": "email+whatsapp"
  }}
]}}""",

    "review_outreach": """Review these outreach messages drafted by the Local Outreach Specialist.

OUTREACH MESSAGES TO REVIEW:
{previous_output}

Review each message for:
1. Accuracy — Are the claims about the business correct and verifiable?
2. Tone — Is it warm, professional, and appropriate for a small business owner?
3. Value prop — Does it clearly communicate what we can do for them?
4. CTA — Is the call-to-action clear but not pushy?
5. Language quality — Is the Spanish/Portuguese natural and correct?
6. Platform fit — Is the format right for the channel (email vs WhatsApp vs DM)?

Score each message 1-10. If score < 7, provide specific revision instructions.

Return as JSON:
{{"reviews": [
  {{"business_name": "...", "score": 1-10, "decision": "approve|revise", "feedback": "...", "revised_message": "..." (if revising)}}
]}}""",

    "compliance_review": """Review these outreach messages for legal compliance before they go out.

OUTREACH MESSAGES (editor-approved):
{previous_output}

Check each message against:
1. Mexico — LFPDPPP (data privacy), Federal Consumer Protection Law
2. Brazil — LGPD, Consumer Defense Code
3. CAN-SPAM basics (if email channel)
4. Platform policies (if social DM channel)

Specifically verify:
- No unsupported or misleading claims
- No fake urgency or pressure tactics
- Proper identification of who we are
- Appropriate for cold outreach in the jurisdiction

Return as JSON:
{{"compliance_results": [
  {{"business_name": "...", "status": "pass|flag|reject", "issues": [], "required_changes": [], "citations": []}}
]}}""",

    # ─── Content Pipeline ───
    "research_keywords": """Research trending keywords and content opportunities for our clients.

CONTEXT:
{previous_output}

Find 10-15 keyword opportunities across our client portfolio:
- Focus on local, high-intent keywords in Spanish/Portuguese
- Include search volume estimates and difficulty scores
- Prioritize keywords with commercial intent (people ready to buy/hire)
- For each keyword, suggest a content angle

Return as JSON:
{{"keywords": [{{"keyword": "...", "language": "es|pt", "volume": 0, "difficulty": 0-100, "intent": "...", "suggested_angle": "...", "target_client": "..."}}]}}""",

    "score_and_approve": """Score and prioritize these content topics from the SEO Analyst.

KEYWORD OPPORTUNITIES:
{previous_output}

Score each topic 1-10 based on:
- Client relevance (30%): Does this match a current client's needs?
- Revenue potential (25%): Will this drive business for the client?
- Trend alignment (25%): Is this topic trending or evergreen?
- Resource cost (20%): Can we produce this efficiently?

Approve topics scoring >= 7. For approved topics, specify:
- Target client, platform, language, word count target
- Priority order for production queue

Return as JSON:
{{"approved_topics": [{{"keyword": "...", "score": 1-10, "approved": true/false, "client": "...", "platform": "...", "language": "...", "word_count": 0, "priority": 1}}]}}""",

    "write_content": """Write content based on these approved topics from the CEO.

APPROVED TOPICS:
{previous_output}

For the highest-priority approved topic, produce:
- Title (compelling, SEO-optimized)
- Full body content (target word count from brief)
- Hashtags (5-10, relevant and trending)
- CTA (specific, actionable)
- SEO keywords naturally integrated

Write natively in the target language. Match the client's brand voice.

Return as JSON:
{{"content": {{"title": "...", "body": "...", "hashtags": [], "cta": "...", "platform": "...", "language": "...", "word_count": 0, "seo_keywords": [], "target_client": "..."}}}}""",

    "review_and_score": """Review this content piece from the Content Writer.

CONTENT TO REVIEW:
{previous_output}

Score each criterion 1-10:
1. Accuracy — Claims backed by data or verifiable facts
2. SEO — Target keywords integrated naturally
3. Brand voice — Reads like the client wrote it
4. Grammar — Flawless in the target language
5. Engagement — Strong hook, clear CTA, good readability
6. Platform fit — Right format and length for the target platform
7. Cultural fit — Appropriate for the specific LATAM market

Overall score = weighted average. Threshold: 7.0
- Score < 7: Send back with specific revision instructions
- Score >= 7: Approve

Return as JSON:
{{"scores": {{"accuracy": 0, "seo": 0, "brand_voice": 0, "grammar": 0, "engagement": 0, "platform_fit": 0, "cultural_fit": 0}}, "overall_score": 0.0, "decision": "approve|revise|reject", "feedback": "..."}}""",

    "format_and_publish": """Format this approved content for publishing.

APPROVED CONTENT:
{previous_output}

Adapt the content to the target platform's native format:
- Right character limits, image specs, formatting
- Optimal posting time for the target market timezone
- Cross-platform versions if applicable

Return as JSON:
{{"publish_plan": {{"platform": "...", "formatted_content": "...", "scheduled_time": "...", "hashtags": [], "status": "scheduled"}}}}""",

    "collect_metrics": """Collect performance metrics for recently published content.

CONTEXT:
{previous_output}

Report on content performance across all platforms:
- Impressions, engagement rate, clicks, shares
- Compare to benchmarks
- Flag any anomalies
- Recommend optimizations

Return as JSON:
{{"metrics": {{"total_impressions": 0, "avg_engagement_rate": 0, "top_performers": [], "underperformers": [], "recommendations": []}}}}""",
}


def _build_step_prompt(action: str, run_context: dict, step_id: str, config_steps: dict) -> str:
    """Build a rich, context-aware prompt for a workflow step."""
    template = STEP_PROMPTS.get(action)

    # Gather previous step outputs as readable context
    previous_output = ""
    for sid, sdata in run_context.items():
        if sid == step_id:
            continue
        if isinstance(sdata, dict):
            previous_output += json.dumps(sdata, indent=2, ensure_ascii=False) + "\n"
        elif isinstance(sdata, str):
            previous_output += sdata + "\n"

    if not previous_output.strip():
        previous_output = "(No previous step data available — use your general knowledge and the context provided.)"

    if template:
        location = run_context.get("location", "Mexico City")
        industry = run_context.get("industry", "")
        industry_line = f"INDUSTRY FOCUS: {industry}" if industry else "INDUSTRY: All small businesses (restaurants, salons, shops, services, etc.)"

        return template.format(
            previous_output=previous_output.strip(),
            location=location,
            industry_line=industry_line,
        )

    # Fallback for actions without templates
    if previous_output and previous_output != "(No previous step data available — use your general knowledge and the context provided.)":
        return f"Execute action: {action}\n\nContext from previous steps:\n{previous_output}\n\nRespond with structured JSON."

    return f"Execute action: {action}\n\nRespond with structured JSON."


async def _persist_leads_from_step(action: str, output: dict, source: str, run_context: dict, db: AsyncSession):
    """Create or update Lead records based on workflow step output."""
    from backend.app.api.leads import _parse_and_create_leads

    try:
        if action == "scout_local_businesses":
            # Scout creates new leads
            created = await _parse_and_create_leads(output, source, db)
            logger.info("leads_created_from_scout", count=len(created), source=source)
            return created

        elif action == "research_businesses":
            # Research updates existing leads with research data
            researched = output.get("researched_businesses", [])
            updated_count = 0
            for item in researched:
                if not isinstance(item, dict):
                    continue
                biz_name = item.get("business_name")
                if not biz_name:
                    continue
                result = await db.execute(
                    select(Lead).where(Lead.business_name == biz_name).order_by(Lead.created_at.desc())
                )
                lead = result.scalar_one_or_none()
                if lead:
                    lead.agent_research = item.get("research", item)
                    lead.recommended_service_tier = item.get("recommended_tier")
                    if item.get("score"):
                        lead.score = min(max(int(item["score"]), 0), 100)
                    lead.stage = LeadStage.RESEARCHED
                    updated_count += 1
            if updated_count:
                await db.commit()
            logger.info("leads_updated_from_research", count=updated_count)

        elif action == "score_and_qualify":
            # Scoring updates lead scores and qualifies them
            qualified = output.get("qualified_leads", [])
            updated_count = 0
            for item in qualified:
                if not isinstance(item, dict):
                    continue
                biz_name = item.get("business_name")
                if not biz_name:
                    continue
                result = await db.execute(
                    select(Lead).where(Lead.business_name == biz_name).order_by(Lead.created_at.desc())
                )
                lead = result.scalar_one_or_none()
                if lead:
                    lead.score = min(max(int(item.get("score", lead.score or 0)), 0), 100)
                    lead.recommended_service_tier = item.get("recommended_tier", lead.recommended_service_tier)
                    lead.outreach_channel = item.get("outreach_channel", lead.outreach_channel)
                    if item.get("qualified", True):
                        lead.stage = LeadStage.QUALIFIED
                    updated_count += 1
            if updated_count:
                await db.commit()
            logger.info("leads_updated_from_scoring", count=updated_count)

        elif action == "draft_outreach":
            # Outreach drafting updates leads with message drafts (supports both old and new format)
            messages = output.get("outreach_messages", [])
            updated_count = 0
            for item in messages:
                if not isinstance(item, dict):
                    continue
                biz_name = item.get("business_name")
                if not biz_name:
                    continue
                result = await db.execute(
                    select(Lead).where(Lead.business_name == biz_name).order_by(Lead.created_at.desc())
                )
                lead = result.scalar_one_or_none()
                if lead:
                    # Support new enhanced format (email_body + whatsapp_message)
                    # as well as old format (message)
                    draft = item.get("email_body") or item.get("message", "")
                    lead.outreach_draft = draft
                    lead.outreach_channel = item.get("channel", lead.outreach_channel or "email+whatsapp")
                    lead.stage = LeadStage.OUTREACH_DRAFTED
                    updated_count += 1
            if updated_count:
                await db.commit()
            logger.info("leads_updated_from_outreach", count=updated_count)

    except Exception:
        logger.warning("lead_persistence_failed", action=action, exc_info=True)


class WorkflowEngine:
    """Executes workflow pipelines as state machines with smart context threading."""

    def __init__(self):
        self._agents: dict = {}

    def register_agent(self, slug: str, agent):
        self._agents[slug] = agent

    async def start_workflow(
        self,
        workflow_name: str,
        db: AsyncSession,
        context: Optional[dict] = None,
        trigger: str = "manual"
    ) -> WorkflowRun:
        """Start a new workflow run."""
        workflows_config = load_yaml_config("workflows")
        config = workflows_config.get("workflows", {}).get(workflow_name)
        if not config:
            raise ValueError(f"Unknown workflow: {workflow_name}")
        if not config.get("steps"):
            raise ValueError(f"Workflow '{workflow_name}' has no steps defined")

        run = WorkflowRun(
            workflow_name=workflow_name,
            status=WorkflowStatus.RUNNING,
            current_step_id=config["steps"][0]["id"],
            trigger=trigger,
            context=context or {},
            started_at=datetime.now(timezone.utc),
        )
        db.add(run)
        await db.flush()

        for step_cfg in config["steps"]:
            step = WorkflowStep(
                run_id=run.id,
                step_id=step_cfg["id"],
                agent_slug=step_cfg.get("agent"),
                action=step_cfg.get("action", ""),
                status=StepStatus.PENDING,
            )
            db.add(step)

        await db.commit()
        await message_bus.publish(f"workflow.{workflow_name}.started", {"run_id": run.id})

        # Execute steps
        await self._execute_workflow(run, config, db)
        return run

    async def _execute_workflow(self, run: WorkflowRun, config: dict, db: AsyncSession):
        """Execute workflow steps sequentially with smart context threading."""
        steps_config = {s["id"]: s for s in config["steps"]}
        current_step_id = run.current_step_id

        while current_step_id:
            step_cfg = steps_config.get(current_step_id)
            if not step_cfg:
                break

            # Get the DB step record
            result = await db.execute(
                select(WorkflowStep).where(
                    WorkflowStep.run_id == run.id,
                    WorkflowStep.step_id == current_step_id,
                )
            )
            step = result.scalar_one_or_none()
            if not step:
                break

            # Check for human approval gate
            if step_cfg.get("requires_human_approval"):
                step.status = StepStatus.AWAITING_APPROVAL
                run.status = WorkflowStatus.PAUSED_FOR_APPROVAL
                run.current_step_id = current_step_id
                await db.commit()
                await message_bus.publish("workflow.approval_needed", {
                    "run_id": run.id,
                    "step_id": current_step_id,
                    "workflow": run.workflow_name,
                })
                return  # Stop here, resume when approved

            # Execute step
            step.status = StepStatus.RUNNING
            step.started_at = datetime.now(timezone.utc)
            await db.commit()

            await message_bus.publish(f"agent.{step_cfg.get('agent', 'system')}.running", {
                "run_id": run.id,
                "step_id": current_step_id,
                "action": step_cfg.get("action"),
                "workflow": run.workflow_name,
            })

            try:
                slug = step_cfg.get("agent")
                agent = self._agents.get(slug) if slug else None
                if agent:
                    action = step_cfg.get("action", "")

                    # Build a smart, context-aware prompt
                    prompt = _build_step_prompt(
                        action=action,
                        run_context=run.context or {},
                        step_id=current_step_id,
                        config_steps=steps_config,
                    )

                    step_result = await agent.think(
                        prompt=prompt,
                        db=db,
                        context=run.context,
                    )
                    step.output_data = step_result.get("parsed") or {"raw": step_result.get("content", "")}
                    step.cost_usd = step_result.get("cost_usd", 0)
                    step.duration_ms = step_result.get("duration_ms", 0)

                    # Update run context with step output
                    if run.context is None:
                        run.context = {}
                    run.context[current_step_id] = step.output_data

                    # Auto-persist to Lead records
                    source = f"{slug}:{action}"
                    await _persist_leads_from_step(action, step.output_data, source, run.context, db)

                    # ── HITL check for controlled actions ──
                    if action in HITL_CONTROLLED_ACTIONS:
                        hitl_result = await check_hitl(
                            agent_slug=slug,
                            action_name=action,
                            payload=step.output_data or {},
                            db=db,
                            context={"run_id": run.id, "step_id": current_step_id, "workflow": run.workflow_name},
                        )
                        if not hitl_result.get("proceed"):
                            approval_id = hitl_result.get("approval_id")
                            step.status = StepStatus.AWAITING_APPROVAL
                            if approval_id:
                                step.approval_id = approval_id
                            run.status = WorkflowStatus.PAUSED_FOR_APPROVAL
                            run.current_step_id = current_step_id
                            await db.commit()
                            await message_bus.publish("workflow.approval_needed", {
                                "run_id": run.id,
                                "step_id": current_step_id,
                                "workflow": run.workflow_name,
                                "approval_id": approval_id,
                                "reason": hitl_result.get("reason"),
                            })
                            logger.info(
                                "workflow_paused_for_hitl",
                                run_id=run.id,
                                step=current_step_id,
                                action=action,
                                approval_id=approval_id,
                            )
                            return  # Stop here, resume when approved

                    await message_bus.publish(f"agent.{slug}.completed", {
                        "run_id": run.id,
                        "step_id": current_step_id,
                        "action": action,
                        "cost_usd": step.cost_usd,
                        "duration_ms": step.duration_ms,
                    })

                elif slug:
                    # Agent required but not registered
                    step.status = StepStatus.FAILED
                    step.error_message = f"Agent not registered: {slug}"
                    step.completed_at = datetime.now(timezone.utc)
                    run.status = WorkflowStatus.FAILED
                    run.error_message = f"Step {current_step_id} failed: Agent not registered: {slug}"
                    run.completed_at = datetime.now(timezone.utc)
                    await db.commit()
                    logger.error("agent_not_registered", step=current_step_id, slug=slug)
                    return

                step.status = StepStatus.COMPLETED
                step.completed_at = datetime.now(timezone.utc)

                # Check for revision loop
                if step_cfg.get("retry_on_low_score"):
                    retry_cfg = step_cfg["retry_on_low_score"]
                    score = step.output_data.get("overall_score", 10) if step.output_data else 10
                    if score < retry_cfg["threshold"] and step.retry_count < retry_cfg["max_revisions"]:
                        step.retry_count += 1
                        current_step_id = retry_cfg["retry_step"]
                        run.current_step_id = current_step_id
                        await db.commit()
                        continue

            except Exception as e:
                step.status = StepStatus.FAILED
                step.error_message = str(e)
                step.completed_at = datetime.now(timezone.utc)
                run.status = WorkflowStatus.FAILED
                run.error_message = f"Step {current_step_id} failed: {e}"
                run.completed_at = datetime.now(timezone.utc)
                await db.commit()
                logger.error("workflow_step_failed", step=current_step_id, error=str(e))
                return

            current_step_id = step_cfg.get("next")
            run.current_step_id = current_step_id
            await db.commit()

        # Workflow completed
        run.status = WorkflowStatus.COMPLETED
        run.completed_at = datetime.now(timezone.utc)
        await db.commit()
        await message_bus.publish(f"workflow.{run.workflow_name}.completed", {"run_id": run.id})

    async def approve_step(self, run_id: int, step_id: str, db: AsyncSession, approved: bool = True):
        """Approve or reject a paused workflow step."""
        result = await db.execute(select(WorkflowRun).where(WorkflowRun.id == run_id))
        run = result.scalar_one_or_none()
        if not run or run.status != WorkflowStatus.PAUSED_FOR_APPROVAL:
            raise ValueError("Workflow not in approval state")

        step_result = await db.execute(
            select(WorkflowStep).where(
                WorkflowStep.run_id == run_id,
                WorkflowStep.step_id == step_id,
            )
        )
        step = step_result.scalar_one_or_none()
        if not step:
            raise ValueError(f"Step {step_id} not found")

        if approved:
            step.status = StepStatus.COMPLETED
            step.completed_at = datetime.now(timezone.utc)
            run.status = WorkflowStatus.RUNNING
            await db.commit()

            workflows_config = load_yaml_config("workflows")
            config = workflows_config.get("workflows", {}).get(run.workflow_name)
            if config:
                steps_config = {s["id"]: s for s in config["steps"]}
                next_step = steps_config.get(step_id, {}).get("next")
                if next_step:
                    run.current_step_id = next_step
                    await db.commit()
                    await self._execute_workflow(run, config, db)
        else:
            step.status = StepStatus.FAILED
            step.completed_at = datetime.now(timezone.utc)
            run.status = WorkflowStatus.CANCELLED
            run.completed_at = datetime.now(timezone.utc)
            await db.commit()

    async def resume_from_approval(self, approval_id: int, db: AsyncSession, approved: bool = True):
        """Resume a workflow that was paused by a HITL approval request.

        Called when an approval decision is made via the approvals API.
        Finds the workflow step linked to this approval_id and resumes or cancels.
        """
        step_result = await db.execute(
            select(WorkflowStep).where(WorkflowStep.approval_id == approval_id)
        )
        step = step_result.scalar_one_or_none()
        if not step:
            return  # No linked workflow step

        run_result = await db.execute(
            select(WorkflowRun).where(WorkflowRun.id == step.run_id)
        )
        run = run_result.scalar_one_or_none()
        if not run or run.status != WorkflowStatus.PAUSED_FOR_APPROVAL:
            return

        if approved:
            # If the approval had a modified payload, update the step output
            approval_result = await db.execute(
                select(ApprovalRequest).where(ApprovalRequest.id == approval_id)
            )
            approval = approval_result.scalar_one_or_none()
            if approval and approval.modified_payload:
                step.output_data = approval.modified_payload
                # Also update run context with modified payload
                if run.context and step.step_id in run.context:
                    run.context[step.step_id] = approval.modified_payload

            step.status = StepStatus.COMPLETED
            step.completed_at = datetime.now(timezone.utc)
            run.status = WorkflowStatus.RUNNING
            await db.commit()

            workflows_config = load_yaml_config("workflows")
            config = workflows_config.get("workflows", {}).get(run.workflow_name)
            if config:
                steps_config = {s["id"]: s for s in config["steps"]}
                next_step = steps_config.get(step.step_id, {}).get("next")
                if next_step:
                    run.current_step_id = next_step
                    await db.commit()
                    await self._execute_workflow(run, config, db)
                else:
                    # This was the last step
                    run.status = WorkflowStatus.COMPLETED
                    run.completed_at = datetime.now(timezone.utc)
                    await db.commit()

            logger.info("workflow_resumed_from_approval", run_id=run.id, step=step.step_id)
        else:
            step.status = StepStatus.FAILED
            step.completed_at = datetime.now(timezone.utc)
            run.status = WorkflowStatus.CANCELLED
            run.completed_at = datetime.now(timezone.utc)
            await db.commit()
            logger.info("workflow_cancelled_from_approval", run_id=run.id, step=step.step_id)


workflow_engine = WorkflowEngine()
