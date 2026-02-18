"""All 13 agent implementations."""
from backend.app.core.agent_base import BaseAgent


class CEOAgent(BaseAgent):
    slug = "ceo"

class ContentWriterAgent(BaseAgent):
    slug = "content_writer"

class EditorAgent(BaseAgent):
    slug = "editor"

class SEOAnalystAgent(BaseAgent):
    slug = "seo_analyst"

class SocialMediaManagerAgent(BaseAgent):
    slug = "social_media_manager"

class AnalyticsAgent(BaseAgent):
    slug = "analytics_agent"

class AdsManagerAgent(BaseAgent):
    slug = "ads_manager"

class EmailMarketingAgent(BaseAgent):
    slug = "email_marketing_agent"

class SalesAgent(BaseAgent):
    slug = "sales_agent"

class CFOAgent(BaseAgent):
    slug = "cfo_agent"

class FulfillmentAgent(BaseAgent):
    slug = "fulfillment_agent"

class LegalBotAgent(BaseAgent):
    slug = "legal_bot"

class ProspectorAgent(BaseAgent):
    slug = "prospector"

class LocalOutreachAgent(BaseAgent):
    slug = "local_outreach"

class SMBResearcherAgent(BaseAgent):
    slug = "smb_researcher"


ALL_AGENTS = [
    CEOAgent,
    ContentWriterAgent,
    EditorAgent,
    SEOAnalystAgent,
    SocialMediaManagerAgent,
    AnalyticsAgent,
    AdsManagerAgent,
    EmailMarketingAgent,
    SalesAgent,
    CFOAgent,
    FulfillmentAgent,
    LegalBotAgent,
    ProspectorAgent,
    LocalOutreachAgent,
    SMBResearcherAgent,
]


def create_all_agents() -> dict[str, BaseAgent]:
    """Instantiate all agents and return a slug->agent mapping."""
    return {cls.slug: cls() for cls in ALL_AGENTS}
