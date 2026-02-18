"""Initial schema - all existing tables.

Revision ID: 001
Revises: None
Create Date: 2026-02-17

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Enum types used across tables
agent_status_enum = sa.Enum("active", "paused", "budget_exceeded", "error", name="agentstatus")
workflow_status_enum = sa.Enum(
    "pending", "running", "paused_for_approval", "completed", "failed", "cancelled",
    name="workflowstatus",
)
step_status_enum = sa.Enum(
    "pending", "running", "completed", "failed", "skipped", "awaiting_approval",
    name="stepstatus",
)
content_status_enum = sa.Enum(
    "idea", "approved", "writing", "review", "revision", "ready",
    "scheduled", "published", "rejected",
    name="contentstatus",
)
lead_stage_enum = sa.Enum(
    "prospect", "researched", "qualified", "outreach_drafted",
    "outreach_sent", "responded", "won", "lost",
    name="leadstage",
)
deliverable_status_enum = sa.Enum(
    "pending", "in_progress", "review", "delivered", "overdue",
    name="deliverablestatus",
)
user_role_enum = sa.Enum("admin", "operator", "viewer", name="userrole")
subscription_status_enum = sa.Enum(
    "active", "past_due", "canceled", "trialing", "incomplete",
    name="subscriptionstatus",
)
hitl_mode_enum = sa.Enum("auto", "approve", "manual", name="hitlmode")
approval_status_enum = sa.Enum("pending", "approved", "rejected", "expired", name="approvalstatus")


def upgrade() -> None:
    # ── agents ────────────────────────────────────────────────────────────
    op.create_table(
        "agents",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("slug", sa.String(50), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("role", sa.String(100), nullable=False),
        sa.Column("description", sa.Text),
        sa.Column("model", sa.String(100), nullable=False),
        sa.Column("status", agent_status_enum, server_default="active"),
        sa.Column("monthly_budget_usd", sa.Float, server_default="0.0"),
        sa.Column("month_spend_usd", sa.Float, server_default="0.0"),
        sa.Column("total_calls", sa.Integer, server_default="0"),
        sa.Column("total_tokens", sa.Integer, server_default="0"),
        sa.Column("success_rate", sa.Float, server_default="1.0"),
        sa.Column("created_at", sa.DateTime),
        sa.Column("updated_at", sa.DateTime),
    )
    op.create_index("ix_agents_slug", "agents", ["slug"], unique=True)

    # ── agent_logs ────────────────────────────────────────────────────────
    op.create_table(
        "agent_logs",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("agent_id", sa.Integer, sa.ForeignKey("agents.id"), nullable=False),
        sa.Column("action", sa.String(100), nullable=False),
        sa.Column("input_summary", sa.Text),
        sa.Column("output_summary", sa.Text),
        sa.Column("input_tokens", sa.Integer, server_default="0"),
        sa.Column("output_tokens", sa.Integer, server_default="0"),
        sa.Column("cost_usd", sa.Float, server_default="0.0"),
        sa.Column("duration_ms", sa.Integer, server_default="0"),
        sa.Column("success", sa.Boolean, server_default="true"),
        sa.Column("error_message", sa.Text),
        sa.Column("metadata", sa.JSON),
        sa.Column("created_at", sa.DateTime),
    )
    op.create_index("ix_agent_logs_agent_id", "agent_logs", ["agent_id"])
    op.create_index("ix_agent_logs_created_at", "agent_logs", ["created_at"])

    # ── agent_memory ──────────────────────────────────────────────────────
    op.create_table(
        "agent_memory",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("agent_id", sa.Integer, sa.ForeignKey("agents.id"), nullable=False),
        sa.Column("category", sa.String(50), nullable=False),
        sa.Column("key", sa.String(200), nullable=False),
        sa.Column("value", sa.JSON),
        sa.Column("confidence", sa.Float, server_default="0.5"),
        sa.Column("created_at", sa.DateTime),
        sa.Column("updated_at", sa.DateTime),
    )
    op.create_index("ix_agent_memory_agent_id", "agent_memory", ["agent_id"])
    op.create_index("ix_agent_memory_lookup", "agent_memory", ["agent_id", "category", "key"])

    # ── clients ───────────────────────────────────────────────────────────
    op.create_table(
        "clients",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("business_name", sa.String(200)),
        sa.Column("business_type", sa.String(100)),
        sa.Column("country", sa.String(50), server_default="MX"),
        sa.Column("language", sa.String(10), server_default="es"),
        sa.Column("email", sa.String(200)),
        sa.Column("phone", sa.String(50)),
        sa.Column("plan_tier", sa.String(50)),
        sa.Column("monthly_rate_usd", sa.Float, server_default="0.0"),
        sa.Column("monthly_rate_mxn", sa.Float, server_default="0.0"),
        sa.Column("brand_voice_notes", sa.Text),
        sa.Column("website_url", sa.String(500)),
        sa.Column("social_profiles", sa.JSON),
        sa.Column("status", sa.String(20), server_default="active"),
        sa.Column("start_date", sa.DateTime),
        sa.Column("created_at", sa.DateTime),
        sa.Column("updated_at", sa.DateTime),
    )

    # ── leads ─────────────────────────────────────────────────────────────
    op.create_table(
        "leads",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("business_name", sa.String(200), nullable=False),
        sa.Column("contact_name", sa.String(200)),
        sa.Column("email", sa.String(200)),
        sa.Column("phone", sa.String(50)),
        sa.Column("website_url", sa.String(500)),
        sa.Column("industry", sa.String(100)),
        sa.Column("location", sa.String(200)),
        sa.Column("country", sa.String(50), server_default="MX"),
        sa.Column("language", sa.String(10), server_default="es"),
        sa.Column("stage", lead_stage_enum, server_default="prospect"),
        sa.Column("score", sa.Integer, server_default="0"),
        sa.Column("source", sa.String(200)),
        sa.Column("digital_gap_score", sa.Float),
        sa.Column("google_rating", sa.Float),
        sa.Column("review_count", sa.Integer),
        sa.Column("has_website", sa.Boolean),
        sa.Column("has_social", sa.Boolean),
        sa.Column("outreach_draft", sa.Text),
        sa.Column("outreach_channel", sa.String(50)),
        sa.Column("recommended_service_tier", sa.String(50)),
        sa.Column("followup_count", sa.Integer, server_default="0"),
        sa.Column("last_followup_at", sa.DateTime),
        sa.Column("agent_research", sa.JSON),
        sa.Column("notes", sa.Text),
        sa.Column("assigned_agent", sa.String(50)),
        sa.Column("client_id", sa.Integer, sa.ForeignKey("clients.id")),
        sa.Column("created_at", sa.DateTime),
        sa.Column("updated_at", sa.DateTime),
    )
    op.create_index("ix_leads_stage", "leads", ["stage"])
    op.create_index("ix_leads_client_id", "leads", ["client_id"])

    # ── client_deliverables ───────────────────────────────────────────────
    op.create_table(
        "client_deliverables",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("client_id", sa.Integer, sa.ForeignKey("clients.id"), nullable=False),
        sa.Column("title", sa.String(300), nullable=False),
        sa.Column("service_type", sa.String(50), nullable=False),
        sa.Column("description", sa.Text),
        sa.Column("status", deliverable_status_enum, server_default="pending"),
        sa.Column("due_date", sa.DateTime),
        sa.Column("delivered_date", sa.DateTime),
        sa.Column("created_at", sa.DateTime),
    )
    op.create_index("ix_client_deliverables_client_id", "client_deliverables", ["client_id"])

    # ── content_ideas ─────────────────────────────────────────────────────
    op.create_table(
        "content_ideas",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("client_id", sa.Integer, sa.ForeignKey("clients.id")),
        sa.Column("title", sa.String(300), nullable=False),
        sa.Column("description", sa.Text),
        sa.Column("keywords", sa.JSON),
        sa.Column("target_platform", sa.String(50)),
        sa.Column("target_language", sa.String(10), server_default="es"),
        sa.Column("category", sa.String(100)),
        sa.Column("ceo_score", sa.Float),
        sa.Column("ceo_feedback", sa.Text),
        sa.Column("source_agent", sa.String(50)),
        sa.Column("status", content_status_enum, server_default="idea"),
        sa.Column("created_at", sa.DateTime),
    )
    op.create_index("ix_content_ideas_client_id", "content_ideas", ["client_id"])

    # ── content_drafts ────────────────────────────────────────────────────
    op.create_table(
        "content_drafts",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("idea_id", sa.Integer, sa.ForeignKey("content_ideas.id")),
        sa.Column("client_id", sa.Integer, sa.ForeignKey("clients.id")),
        sa.Column("title", sa.String(300), nullable=False),
        sa.Column("body", sa.Text, nullable=False),
        sa.Column("platform", sa.String(50)),
        sa.Column("language", sa.String(10), server_default="es"),
        sa.Column("hashtags", sa.JSON),
        sa.Column("cta", sa.String(500)),
        sa.Column("seo_keywords", sa.JSON),
        sa.Column("word_count", sa.Integer, server_default="0"),
        sa.Column("editor_score", sa.Float),
        sa.Column("editor_feedback", sa.Text),
        sa.Column("editor_scores_detail", sa.JSON),
        sa.Column("revision_count", sa.Integer, server_default="0"),
        sa.Column("status", content_status_enum),
        sa.Column("created_at", sa.DateTime),
        sa.Column("updated_at", sa.DateTime),
    )
    op.create_index("ix_content_drafts_idea_id", "content_drafts", ["idea_id"])
    op.create_index("ix_content_drafts_client_id", "content_drafts", ["client_id"])

    # ── published_content ─────────────────────────────────────────────────
    op.create_table(
        "published_content",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("draft_id", sa.Integer, sa.ForeignKey("content_drafts.id")),
        sa.Column("client_id", sa.Integer, sa.ForeignKey("clients.id")),
        sa.Column("platform", sa.String(50), nullable=False),
        sa.Column("platform_post_id", sa.String(200)),
        sa.Column("url", sa.String(500)),
        sa.Column("published_at", sa.DateTime),
    )
    op.create_index("ix_published_content_draft_id", "published_content", ["draft_id"])
    op.create_index("ix_published_content_client_id", "published_content", ["client_id"])

    # ── content_metrics ───────────────────────────────────────────────────
    op.create_table(
        "content_metrics",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("content_id", sa.Integer, sa.ForeignKey("published_content.id"), nullable=False),
        sa.Column("impressions", sa.Integer, server_default="0"),
        sa.Column("engagements", sa.Integer, server_default="0"),
        sa.Column("clicks", sa.Integer, server_default="0"),
        sa.Column("shares", sa.Integer, server_default="0"),
        sa.Column("likes", sa.Integer, server_default="0"),
        sa.Column("comments", sa.Integer, server_default="0"),
        sa.Column("reach", sa.Integer, server_default="0"),
        sa.Column("engagement_rate", sa.Float, server_default="0.0"),
        sa.Column("collected_at", sa.DateTime),
    )
    op.create_index("ix_content_metrics_content_id", "content_metrics", ["content_id"])

    # ── seo_audits ────────────────────────────────────────────────────────
    op.create_table(
        "seo_audits",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("client_id", sa.Integer, sa.ForeignKey("clients.id"), nullable=False),
        sa.Column("url", sa.String(500), nullable=False),
        sa.Column("overall_score", sa.Float),
        sa.Column("technical_score", sa.Float),
        sa.Column("content_score", sa.Float),
        sa.Column("backlink_score", sa.Float),
        sa.Column("findings", sa.JSON),
        sa.Column("recommendations", sa.JSON),
        sa.Column("created_at", sa.DateTime),
    )
    op.create_index("ix_seo_audits_client_id", "seo_audits", ["client_id"])

    # ── seo_keywords ──────────────────────────────────────────────────────
    op.create_table(
        "seo_keywords",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("client_id", sa.Integer, sa.ForeignKey("clients.id"), nullable=False),
        sa.Column("keyword", sa.String(200), nullable=False),
        sa.Column("language", sa.String(10), server_default="es"),
        sa.Column("current_rank", sa.Integer),
        sa.Column("previous_rank", sa.Integer),
        sa.Column("search_volume", sa.Integer),
        sa.Column("difficulty", sa.Float),
        sa.Column("opportunity_score", sa.Float),
        sa.Column("tracked_since", sa.DateTime),
        sa.Column("last_checked", sa.DateTime),
    )
    op.create_index("ix_seo_keywords_client_id", "seo_keywords", ["client_id"])

    # ── ad_campaigns ──────────────────────────────────────────────────────
    op.create_table(
        "ad_campaigns",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("client_id", sa.Integer, sa.ForeignKey("clients.id"), nullable=False),
        sa.Column("platform", sa.String(50), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("objective", sa.String(100)),
        sa.Column("status", sa.String(50), server_default="draft"),
        sa.Column("budget_daily_usd", sa.Float, server_default="0.0"),
        sa.Column("total_spend_usd", sa.Float, server_default="0.0"),
        sa.Column("impressions", sa.Integer, server_default="0"),
        sa.Column("clicks", sa.Integer, server_default="0"),
        sa.Column("conversions", sa.Integer, server_default="0"),
        sa.Column("ctr", sa.Float, server_default="0.0"),
        sa.Column("cpc", sa.Float, server_default="0.0"),
        sa.Column("roas", sa.Float, server_default="0.0"),
        sa.Column("ad_copy", sa.JSON),
        sa.Column("targeting", sa.JSON),
        sa.Column("start_date", sa.DateTime),
        sa.Column("end_date", sa.DateTime),
        sa.Column("created_at", sa.DateTime),
        sa.Column("updated_at", sa.DateTime),
    )
    op.create_index("ix_ad_campaigns_client_id", "ad_campaigns", ["client_id"])

    # ── email_campaigns ───────────────────────────────────────────────────
    op.create_table(
        "email_campaigns",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("client_id", sa.Integer, sa.ForeignKey("clients.id"), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("subject", sa.String(200)),
        sa.Column("preview_text", sa.String(200)),
        sa.Column("body_html", sa.Text),
        sa.Column("segment", sa.String(100)),
        sa.Column("status", sa.String(50), server_default="draft"),
        sa.Column("sent_count", sa.Integer, server_default="0"),
        sa.Column("open_count", sa.Integer, server_default="0"),
        sa.Column("click_count", sa.Integer, server_default="0"),
        sa.Column("bounce_count", sa.Integer, server_default="0"),
        sa.Column("unsubscribe_count", sa.Integer, server_default="0"),
        sa.Column("open_rate", sa.Float, server_default="0.0"),
        sa.Column("click_rate", sa.Float, server_default="0.0"),
        sa.Column("scheduled_at", sa.DateTime),
        sa.Column("sent_at", sa.DateTime),
        sa.Column("created_at", sa.DateTime),
    )
    op.create_index("ix_email_campaigns_client_id", "email_campaigns", ["client_id"])

    # ── workflow_runs ─────────────────────────────────────────────────────
    op.create_table(
        "workflow_runs",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("workflow_name", sa.String(100), nullable=False),
        sa.Column("status", workflow_status_enum, server_default="pending"),
        sa.Column("current_step_id", sa.String(100)),
        sa.Column("trigger", sa.String(50), server_default="scheduled"),
        sa.Column("context", sa.JSON),
        sa.Column("error_message", sa.Text),
        sa.Column("started_at", sa.DateTime),
        sa.Column("completed_at", sa.DateTime),
        sa.Column("created_at", sa.DateTime),
    )
    op.create_index("ix_workflow_runs_workflow_name", "workflow_runs", ["workflow_name"])

    # ── workflow_steps ────────────────────────────────────────────────────
    op.create_table(
        "workflow_steps",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("run_id", sa.Integer, sa.ForeignKey("workflow_runs.id"), nullable=False),
        sa.Column("step_id", sa.String(100), nullable=False),
        sa.Column("agent_slug", sa.String(50)),
        sa.Column("action", sa.String(100)),
        sa.Column("status", step_status_enum, server_default="pending"),
        sa.Column("input_data", sa.JSON),
        sa.Column("output_data", sa.JSON),
        sa.Column("cost_usd", sa.Float, server_default="0.0"),
        sa.Column("duration_ms", sa.Integer, server_default="0"),
        sa.Column("retry_count", sa.Integer, server_default="0"),
        sa.Column("error_message", sa.Text),
        sa.Column("approval_id", sa.Integer, nullable=True),
        sa.Column("started_at", sa.DateTime),
        sa.Column("completed_at", sa.DateTime),
    )
    op.create_index("ix_workflow_steps_run_id", "workflow_steps", ["run_id"])

    # ── invoices ──────────────────────────────────────────────────────────
    op.create_table(
        "invoices",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("client_id", sa.Integer, sa.ForeignKey("clients.id"), nullable=False),
        sa.Column("amount_usd", sa.Float, nullable=False),
        sa.Column("amount_mxn", sa.Float),
        sa.Column("period_start", sa.DateTime, nullable=False),
        sa.Column("period_end", sa.DateTime, nullable=False),
        sa.Column("status", sa.String(20), server_default="pending"),
        sa.Column("paid_at", sa.DateTime),
        sa.Column("created_at", sa.DateTime),
    )
    op.create_index("ix_invoices_client_id", "invoices", ["client_id"])

    # ── budget_tracking ───────────────────────────────────────────────────
    op.create_table(
        "budget_tracking",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("month", sa.String(7), nullable=False),
        sa.Column("category", sa.String(100), nullable=False),
        sa.Column("budgeted_usd", sa.Float, server_default="0.0"),
        sa.Column("actual_usd", sa.Float, server_default="0.0"),
        sa.Column("variance_usd", sa.Float, server_default="0.0"),
        sa.Column("notes", sa.Text),
        sa.Column("created_at", sa.DateTime),
        sa.Column("updated_at", sa.DateTime),
    )
    op.create_index("ix_budget_tracking_month", "budget_tracking", ["month"])

    # ── revenue_events ────────────────────────────────────────────────────
    op.create_table(
        "revenue_events",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("client_id", sa.Integer, sa.ForeignKey("clients.id")),
        sa.Column("amount_usd", sa.Float, nullable=False),
        sa.Column("amount_mxn", sa.Float),
        sa.Column("description", sa.String(300)),
        sa.Column("event_type", sa.String(50)),
        sa.Column("created_at", sa.DateTime),
    )
    op.create_index("ix_revenue_events_client_id", "revenue_events", ["client_id"])

    # ── users ─────────────────────────────────────────────────────────────
    op.create_table(
        "users",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("email", sa.String, nullable=False),
        sa.Column("hashed_password", sa.String, nullable=False),
        sa.Column("full_name", sa.String, server_default=""),
        sa.Column("role", user_role_enum, server_default="operator"),
        sa.Column("is_active", sa.Boolean, server_default="true"),
        sa.Column("created_at", sa.DateTime),
        sa.Column("last_login", sa.DateTime),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    # ── audit_log ─────────────────────────────────────────────────────────
    op.create_table(
        "audit_log",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id"), nullable=True),
        sa.Column("action", sa.String, nullable=False),
        sa.Column("resource", sa.String),
        sa.Column("details", sa.JSON),
        sa.Column("ip_address", sa.String),
        sa.Column("created_at", sa.DateTime),
    )

    # ── api_keys ──────────────────────────────────────────────────────────
    op.create_table(
        "api_keys",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id")),
        sa.Column("name", sa.String, nullable=False),
        sa.Column("key_hash", sa.String, nullable=False),
        sa.Column("key_prefix", sa.String(8)),
        sa.Column("is_active", sa.Boolean, server_default="true"),
        sa.Column("created_at", sa.DateTime),
        sa.Column("last_used", sa.DateTime),
    )

    # ── subscriptions ─────────────────────────────────────────────────────
    op.create_table(
        "subscriptions",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id")),
        sa.Column("client_id", sa.Integer, sa.ForeignKey("clients.id"), nullable=True),
        sa.Column("stripe_customer_id", sa.String),
        sa.Column("stripe_subscription_id", sa.String),
        sa.Column("plan", sa.String, nullable=False),
        sa.Column("status", subscription_status_enum, server_default="incomplete"),
        sa.Column("current_period_start", sa.DateTime),
        sa.Column("current_period_end", sa.DateTime),
        sa.Column("cancel_at_period_end", sa.Boolean, server_default="false"),
        sa.Column("created_at", sa.DateTime),
        sa.Column("updated_at", sa.DateTime),
    )
    op.create_index("ix_subscriptions_user_id", "subscriptions", ["user_id"])
    op.create_index("ix_subscriptions_client_id", "subscriptions", ["client_id"])
    op.create_index("ix_subscriptions_stripe_customer_id", "subscriptions", ["stripe_customer_id"], unique=True)
    op.create_index("ix_subscriptions_stripe_subscription_id", "subscriptions", ["stripe_subscription_id"], unique=True)

    # ── agent_action_configs ──────────────────────────────────────────────
    op.create_table(
        "agent_action_configs",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("agent_slug", sa.String, nullable=False),
        sa.Column("action_name", sa.String, nullable=False),
        sa.Column("mode", hitl_mode_enum, server_default="approve"),
        sa.Column("updated_by", sa.Integer, sa.ForeignKey("users.id"), nullable=True),
        sa.Column("updated_at", sa.DateTime),
    )
    op.create_index("ix_agent_action_configs_agent_slug", "agent_action_configs", ["agent_slug"])
    op.create_index("ix_agent_action", "agent_action_configs", ["agent_slug", "action_name"], unique=True)

    # ── approval_queue ────────────────────────────────────────────────────
    op.create_table(
        "approval_queue",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("agent_slug", sa.String, nullable=False),
        sa.Column("action_name", sa.String, nullable=False),
        sa.Column("payload", sa.JSON, nullable=False),
        sa.Column("context", sa.JSON),
        sa.Column("status", approval_status_enum, server_default="pending"),
        sa.Column("decided_by", sa.Integer, sa.ForeignKey("users.id"), nullable=True),
        sa.Column("decided_at", sa.DateTime),
        sa.Column("rejection_reason", sa.Text),
        sa.Column("modified_payload", sa.JSON),
        sa.Column("created_at", sa.DateTime),
        sa.Column("expires_at", sa.DateTime),
    )
    op.create_index("ix_approval_queue_agent_slug", "approval_queue", ["agent_slug"])
    op.create_index("ix_approval_queue_status", "approval_queue", ["status"])

    # ── billing_events ────────────────────────────────────────────────────
    op.create_table(
        "billing_events",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("stripe_event_id", sa.String),
        sa.Column("event_type", sa.String, nullable=False),
        sa.Column("subscription_id", sa.Integer, sa.ForeignKey("subscriptions.id"), nullable=True),
        sa.Column("data", sa.JSON),
        sa.Column("created_at", sa.DateTime),
    )
    op.create_index("ix_billing_events_stripe_event_id", "billing_events", ["stripe_event_id"], unique=True)


def downgrade() -> None:
    # Drop in reverse dependency order
    op.drop_table("billing_events")
    op.drop_table("approval_queue")
    op.drop_table("agent_action_configs")
    op.drop_table("subscriptions")
    op.drop_table("api_keys")
    op.drop_table("audit_log")
    op.drop_table("users")
    op.drop_table("revenue_events")
    op.drop_table("budget_tracking")
    op.drop_table("invoices")
    op.drop_table("workflow_steps")
    op.drop_table("workflow_runs")
    op.drop_table("email_campaigns")
    op.drop_table("ad_campaigns")
    op.drop_table("seo_keywords")
    op.drop_table("seo_audits")
    op.drop_table("content_metrics")
    op.drop_table("published_content")
    op.drop_table("content_drafts")
    op.drop_table("content_ideas")
    op.drop_table("client_deliverables")
    op.drop_table("leads")
    op.drop_table("clients")
    op.drop_table("agent_memory")
    op.drop_table("agent_logs")
    op.drop_table("agents")

    # Drop enum types
    approval_status_enum.drop(op.get_bind(), checkfirst=True)
    hitl_mode_enum.drop(op.get_bind(), checkfirst=True)
    subscription_status_enum.drop(op.get_bind(), checkfirst=True)
    user_role_enum.drop(op.get_bind(), checkfirst=True)
    deliverable_status_enum.drop(op.get_bind(), checkfirst=True)
    lead_stage_enum.drop(op.get_bind(), checkfirst=True)
    content_status_enum.drop(op.get_bind(), checkfirst=True)
    step_status_enum.drop(op.get_bind(), checkfirst=True)
    workflow_status_enum.drop(op.get_bind(), checkfirst=True)
    agent_status_enum.drop(op.get_bind(), checkfirst=True)
