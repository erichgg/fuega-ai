"""Resend email integration for transactional and marketing email."""
import os
import resend
from backend.app.config import get_settings
import structlog

logger = structlog.get_logger()

RESEND_FROM_DOMAIN = os.getenv("RESEND_FROM_DOMAIN", "fuega.ai")

AGENT_EMAILS = {
    "ceo": ("Marco", "marco@fuega.ai"),
    "sales_agent": ("Carlos", "carlos@fuega.ai"),
    "local_outreach": ("Ana", "ana@fuega.ai"),
    "prospector": ("Diego", "diego@fuega.ai"),
    "smb_researcher": ("Lucia", "lucia@fuega.ai"),
    "content_writer": ("Valentina", "valentina@fuega.ai"),
    "editor": ("Sofia", "sofia@fuega.ai"),
    "seo_analyst": ("Rafael", "rafael@fuega.ai"),
    "social_media_manager": ("Camila", "camila@fuega.ai"),
    "ads_manager": ("Miguel", "miguel@fuega.ai"),
    "email_marketing_agent": ("Isabella", "isabella@fuega.ai"),
    "analytics_agent": ("Andres", "andres@fuega.ai"),
    "cfo_agent": ("Gabriela", "gabriela@fuega.ai"),
    "legal_bot": ("Roberto", "roberto@fuega.ai"),
    "fulfillment_agent": ("Paula", "paula@fuega.ai"),
}


def _init():
    resend.api_key = get_settings().resend_api_key


async def send_email(
    to: str | list[str],
    subject: str,
    html_body: str,
    from_name: str = "Fuega AI",
    from_email: str | None = None,
    reply_to: str | None = None,
) -> dict:
    """Send a transactional or marketing email via Resend."""
    _init()

    if from_email is None:
        from_email = f"{from_name.lower().replace(' ', '')}@{RESEND_FROM_DOMAIN}"

    params = {
        "from": f"{from_name} <{from_email}>",
        "to": [to] if isinstance(to, str) else to,
        "subject": subject,
        "html": html_body,
    }
    if reply_to:
        params["reply_to"] = reply_to

    result = resend.Emails.send(params)
    email_id = result.get("id", "") if isinstance(result, dict) else getattr(result, "id", "")
    logger.info("resend_email_sent", to=to, subject=subject, email_id=email_id)
    return {"id": email_id, "status": "sent", "to": to, "subject": subject}


async def send_outreach(
    lead_email: str,
    subject: str,
    body: str,
    from_name: str = "Fuega AI",
    agent_slug: str | None = None,
) -> dict:
    """Send outreach email to a lead. Wraps body in simple HTML template."""
    html_body = f"""
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        {body.replace(chr(10), '<br>')}
        <hr style="margin-top: 30px; border: none; border-top: 1px solid #eee;">
        <p style="font-size: 12px; color: #999;">
            Fuega AI — Marketing que enciende tu negocio
        </p>
    </div>
    """

    # Look up agent identity if slug provided
    from_email = None
    if agent_slug and agent_slug in AGENT_EMAILS:
        from_name, from_email = AGENT_EMAILS[agent_slug]

    return await send_email(
        to=lead_email,
        subject=subject,
        html_body=html_body,
        from_name=from_name,
        from_email=from_email,
    )
