from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, Float, Text, Boolean, DateTime,
    ForeignKey, JSON, Enum as SAEnum, Index
)
from sqlalchemy.orm import DeclarativeBase, relationship
from sqlalchemy.ext.mutable import MutableDict
import enum


class Base(DeclarativeBase):
    pass


class AgentStatus(str, enum.Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    BUDGET_EXCEEDED = "budget_exceeded"
    ERROR = "error"


class WorkflowStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    PAUSED_FOR_APPROVAL = "paused_for_approval"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class StepStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"
    AWAITING_APPROVAL = "awaiting_approval"


class ContentStatus(str, enum.Enum):
    IDEA = "idea"
    APPROVED = "approved"
    WRITING = "writing"
    REVIEW = "review"
    REVISION = "revision"
    READY = "ready"
    SCHEDULED = "scheduled"
    PUBLISHED = "published"
    REJECTED = "rejected"


class LeadStage(str, enum.Enum):
    PROSPECT = "prospect"
    RESEARCHED = "researched"
    QUALIFIED = "qualified"
    OUTREACH_DRAFTED = "outreach_drafted"
    OUTREACH_SENT = "outreach_sent"
    RESPONDED = "responded"
    WON = "won"
    LOST = "lost"


class DeliverableStatus(str, enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    REVIEW = "review"
    DELIVERED = "delivered"
    OVERDUE = "overdue"


class Agent(Base):
    __tablename__ = "agents"
    id = Column(Integer, primary_key=True)
    slug = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    role = Column(String(100), nullable=False)
    description = Column(Text)
    model = Column(String(100), nullable=False)
    status = Column(SAEnum(AgentStatus), default=AgentStatus.ACTIVE)
    monthly_budget_usd = Column(Float, default=0.0)
    month_spend_usd = Column(Float, default=0.0)
    total_calls = Column(Integer, default=0)
    total_tokens = Column(Integer, default=0)
    success_rate = Column(Float, default=1.0)
    created_at = Column(DateTime, default=lambda: datetime.utcnow())
    updated_at = Column(DateTime, default=lambda: datetime.utcnow(), onupdate=lambda: datetime.utcnow())

    logs = relationship("AgentLog", back_populates="agent")
    memories = relationship("AgentMemory", back_populates="agent")


class AgentLog(Base):
    __tablename__ = "agent_logs"
    id = Column(Integer, primary_key=True)
    agent_id = Column(Integer, ForeignKey("agents.id"), nullable=False, index=True)
    action = Column(String(100), nullable=False)
    input_summary = Column(Text)
    output_summary = Column(Text)
    input_tokens = Column(Integer, default=0)
    output_tokens = Column(Integer, default=0)
    cost_usd = Column(Float, default=0.0)
    duration_ms = Column(Integer, default=0)
    success = Column(Boolean, default=True)
    error_message = Column(Text)
    metadata_ = Column("metadata", JSON)
    created_at = Column(DateTime, default=lambda: datetime.utcnow(), index=True)

    agent = relationship("Agent", back_populates="logs")


class AgentMemory(Base):
    __tablename__ = "agent_memory"
    id = Column(Integer, primary_key=True)
    agent_id = Column(Integer, ForeignKey("agents.id"), nullable=False, index=True)
    category = Column(String(50), nullable=False)
    key = Column(String(200), nullable=False)
    value = Column(JSON)
    confidence = Column(Float, default=0.5)
    created_at = Column(DateTime, default=lambda: datetime.utcnow())
    updated_at = Column(DateTime, default=lambda: datetime.utcnow(), onupdate=lambda: datetime.utcnow())

    agent = relationship("Agent", back_populates="memories")

    __table_args__ = (Index("ix_agent_memory_lookup", "agent_id", "category", "key"),)


class Client(Base):
    __tablename__ = "clients"
    id = Column(Integer, primary_key=True)
    name = Column(String(200), nullable=False)
    business_name = Column(String(200))
    business_type = Column(String(100))
    country = Column(String(50), default="MX")
    language = Column(String(10), default="es")
    email = Column(String(200))
    phone = Column(String(50))
    plan_tier = Column(String(50))
    monthly_rate_usd = Column(Float, default=0.0)
    monthly_rate_mxn = Column(Float, default=0.0)
    brand_voice_notes = Column(Text)
    website_url = Column(String(500))
    social_profiles = Column(JSON)
    status = Column(String(20), default="active")
    start_date = Column(DateTime)
    created_at = Column(DateTime, default=lambda: datetime.utcnow())
    updated_at = Column(DateTime, default=lambda: datetime.utcnow(), onupdate=lambda: datetime.utcnow())

    deliverables = relationship("ClientDeliverable", back_populates="client")
    invoices = relationship("Invoice", back_populates="client")


class Lead(Base):
    __tablename__ = "leads"
    id = Column(Integer, primary_key=True)
    # Identity
    business_name = Column(String(200), nullable=False)
    contact_name = Column(String(200))
    email = Column(String(200))
    phone = Column(String(50))
    website_url = Column(String(500))
    # Context
    industry = Column(String(100))
    location = Column(String(200))
    country = Column(String(50), default="MX")
    language = Column(String(10), default="es")
    # Pipeline
    stage = Column(SAEnum(LeadStage), default=LeadStage.PROSPECT, index=True)
    score = Column(Integer, default=0)
    source = Column(String(200))
    # Scout data
    digital_gap_score = Column(Float)
    google_rating = Column(Float)
    review_count = Column(Integer)
    has_website = Column(Boolean)
    has_social = Column(Boolean)
    # Outreach
    outreach_draft = Column(Text)
    outreach_channel = Column(String(50))
    recommended_service_tier = Column(String(50))
    # Research
    agent_research = Column(JSON)
    # Meta
    notes = Column(Text)
    assigned_agent = Column(String(50))
    client_id = Column(Integer, ForeignKey("clients.id"), index=True)
    created_at = Column(DateTime, default=lambda: datetime.utcnow())
    updated_at = Column(DateTime, default=lambda: datetime.utcnow(), onupdate=lambda: datetime.utcnow())


class ClientDeliverable(Base):
    __tablename__ = "client_deliverables"
    id = Column(Integer, primary_key=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    title = Column(String(300), nullable=False)
    service_type = Column(String(50), nullable=False)
    description = Column(Text)
    status = Column(SAEnum(DeliverableStatus), default=DeliverableStatus.PENDING)
    due_date = Column(DateTime)
    delivered_date = Column(DateTime)
    created_at = Column(DateTime, default=lambda: datetime.utcnow())

    client = relationship("Client", back_populates="deliverables")


class ContentIdea(Base):
    __tablename__ = "content_ideas"
    id = Column(Integer, primary_key=True)
    client_id = Column(Integer, ForeignKey("clients.id"), index=True)
    title = Column(String(300), nullable=False)
    description = Column(Text)
    keywords = Column(JSON)
    target_platform = Column(String(50))
    target_language = Column(String(10), default="es")
    category = Column(String(100))
    ceo_score = Column(Float)
    ceo_feedback = Column(Text)
    source_agent = Column(String(50))
    status = Column(SAEnum(ContentStatus), default=ContentStatus.IDEA)
    created_at = Column(DateTime, default=lambda: datetime.utcnow())


class ContentDraft(Base):
    __tablename__ = "content_drafts"
    id = Column(Integer, primary_key=True)
    idea_id = Column(Integer, ForeignKey("content_ideas.id"), index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), index=True)
    title = Column(String(300), nullable=False)
    body = Column(Text, nullable=False)
    platform = Column(String(50))
    language = Column(String(10), default="es")
    hashtags = Column(JSON)
    cta = Column(String(500))
    seo_keywords = Column(JSON)
    word_count = Column(Integer, default=0)
    editor_score = Column(Float)
    editor_feedback = Column(Text)
    editor_scores_detail = Column(JSON)
    revision_count = Column(Integer, default=0)
    status = Column(SAEnum(ContentStatus), default=ContentStatus.WRITING)
    created_at = Column(DateTime, default=lambda: datetime.utcnow())
    updated_at = Column(DateTime, default=lambda: datetime.utcnow(), onupdate=lambda: datetime.utcnow())


class PublishedContent(Base):
    __tablename__ = "published_content"
    id = Column(Integer, primary_key=True)
    draft_id = Column(Integer, ForeignKey("content_drafts.id"), index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), index=True)
    platform = Column(String(50), nullable=False)
    platform_post_id = Column(String(200))
    url = Column(String(500))
    published_at = Column(DateTime, default=lambda: datetime.utcnow())

    metrics = relationship("ContentMetric", back_populates="content")


class ContentMetric(Base):
    __tablename__ = "content_metrics"
    id = Column(Integer, primary_key=True)
    content_id = Column(Integer, ForeignKey("published_content.id"), nullable=False, index=True)
    impressions = Column(Integer, default=0)
    engagements = Column(Integer, default=0)
    clicks = Column(Integer, default=0)
    shares = Column(Integer, default=0)
    likes = Column(Integer, default=0)
    comments = Column(Integer, default=0)
    reach = Column(Integer, default=0)
    engagement_rate = Column(Float, default=0.0)
    collected_at = Column(DateTime, default=lambda: datetime.utcnow())

    content = relationship("PublishedContent", back_populates="metrics")


class SEOAudit(Base):
    __tablename__ = "seo_audits"
    id = Column(Integer, primary_key=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    url = Column(String(500), nullable=False)
    overall_score = Column(Float)
    technical_score = Column(Float)
    content_score = Column(Float)
    backlink_score = Column(Float)
    findings = Column(JSON)
    recommendations = Column(JSON)
    created_at = Column(DateTime, default=lambda: datetime.utcnow())


class SEOKeyword(Base):
    __tablename__ = "seo_keywords"
    id = Column(Integer, primary_key=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    keyword = Column(String(200), nullable=False)
    language = Column(String(10), default="es")
    current_rank = Column(Integer)
    previous_rank = Column(Integer)
    search_volume = Column(Integer)
    difficulty = Column(Float)
    opportunity_score = Column(Float)
    tracked_since = Column(DateTime, default=lambda: datetime.utcnow())
    last_checked = Column(DateTime, default=lambda: datetime.utcnow())


class AdCampaign(Base):
    __tablename__ = "ad_campaigns"
    id = Column(Integer, primary_key=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    platform = Column(String(50), nullable=False)
    name = Column(String(200), nullable=False)
    objective = Column(String(100))
    status = Column(String(50), default="draft")
    budget_daily_usd = Column(Float, default=0.0)
    total_spend_usd = Column(Float, default=0.0)
    impressions = Column(Integer, default=0)
    clicks = Column(Integer, default=0)
    conversions = Column(Integer, default=0)
    ctr = Column(Float, default=0.0)
    cpc = Column(Float, default=0.0)
    roas = Column(Float, default=0.0)
    ad_copy = Column(JSON)
    targeting = Column(JSON)
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    created_at = Column(DateTime, default=lambda: datetime.utcnow())
    updated_at = Column(DateTime, default=lambda: datetime.utcnow(), onupdate=lambda: datetime.utcnow())


class EmailCampaign(Base):
    __tablename__ = "email_campaigns"
    id = Column(Integer, primary_key=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    name = Column(String(200), nullable=False)
    subject = Column(String(200))
    preview_text = Column(String(200))
    body_html = Column(Text)
    segment = Column(String(100))
    status = Column(String(50), default="draft")
    sent_count = Column(Integer, default=0)
    open_count = Column(Integer, default=0)
    click_count = Column(Integer, default=0)
    bounce_count = Column(Integer, default=0)
    unsubscribe_count = Column(Integer, default=0)
    open_rate = Column(Float, default=0.0)
    click_rate = Column(Float, default=0.0)
    scheduled_at = Column(DateTime)
    sent_at = Column(DateTime)
    created_at = Column(DateTime, default=lambda: datetime.utcnow())


class WorkflowRun(Base):
    __tablename__ = "workflow_runs"
    id = Column(Integer, primary_key=True)
    workflow_name = Column(String(100), nullable=False, index=True)
    status = Column(SAEnum(WorkflowStatus), default=WorkflowStatus.PENDING)
    current_step_id = Column(String(100))
    trigger = Column(String(50), default="scheduled")
    context = Column(MutableDict.as_mutable(JSON))
    error_message = Column(Text)
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    created_at = Column(DateTime, default=lambda: datetime.utcnow())

    steps = relationship("WorkflowStep", back_populates="run")


class WorkflowStep(Base):
    __tablename__ = "workflow_steps"
    id = Column(Integer, primary_key=True)
    run_id = Column(Integer, ForeignKey("workflow_runs.id"), nullable=False, index=True)
    step_id = Column(String(100), nullable=False)
    agent_slug = Column(String(50))
    action = Column(String(100))
    status = Column(SAEnum(StepStatus), default=StepStatus.PENDING)
    input_data = Column(JSON)
    output_data = Column(JSON)
    cost_usd = Column(Float, default=0.0)
    duration_ms = Column(Integer, default=0)
    retry_count = Column(Integer, default=0)
    error_message = Column(Text)
    started_at = Column(DateTime)
    completed_at = Column(DateTime)

    run = relationship("WorkflowRun", back_populates="steps")


class Invoice(Base):
    __tablename__ = "invoices"
    id = Column(Integer, primary_key=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    amount_usd = Column(Float, nullable=False)
    amount_mxn = Column(Float)
    period_start = Column(DateTime, nullable=False)
    period_end = Column(DateTime, nullable=False)
    status = Column(String(20), default="pending")
    paid_at = Column(DateTime)
    created_at = Column(DateTime, default=lambda: datetime.utcnow())

    client = relationship("Client", back_populates="invoices")


class BudgetTracking(Base):
    __tablename__ = "budget_tracking"
    id = Column(Integer, primary_key=True)
    month = Column(String(7), nullable=False, index=True)
    category = Column(String(100), nullable=False)
    budgeted_usd = Column(Float, default=0.0)
    actual_usd = Column(Float, default=0.0)
    variance_usd = Column(Float, default=0.0)
    notes = Column(Text)
    created_at = Column(DateTime, default=lambda: datetime.utcnow())
    updated_at = Column(DateTime, default=lambda: datetime.utcnow(), onupdate=lambda: datetime.utcnow())


class RevenueEvent(Base):
    __tablename__ = "revenue_events"
    id = Column(Integer, primary_key=True)
    client_id = Column(Integer, ForeignKey("clients.id"), index=True)
    amount_usd = Column(Float, nullable=False)
    amount_mxn = Column(Float)
    description = Column(String(300))
    event_type = Column(String(50))
    created_at = Column(DateTime, default=lambda: datetime.utcnow())
