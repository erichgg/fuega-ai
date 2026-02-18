import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import all namespace files eagerly — small JSON, no need for lazy loading
import enCommon from '../locales/en/common.json';
import enNav from '../locales/en/nav.json';
import enDashboard from '../locales/en/dashboard.json';
import enAgents from '../locales/en/agents.json';
import enAgentDetail from '../locales/en/agentDetail.json';
import enAnalytics from '../locales/en/analytics.json';
import enCampaigns from '../locales/en/campaigns.json';
import enClients from '../locales/en/clients.json';
import enClientDetail from '../locales/en/clientDetail.json';
import enContent from '../locales/en/content.json';
import enControlPanel from '../locales/en/controlPanel.json';
import enLeads from '../locales/en/leads.json';
import enLeadDetail from '../locales/en/leadDetail.json';
import enSeo from '../locales/en/seo.json';
import enSettings from '../locales/en/settings.json';
import enWorkflows from '../locales/en/workflows.json';
import enTeamChat from '../locales/en/teamChat.json';
import enApprovals from '../locales/en/approvals.json';
import enBilling from '../locales/en/billing.json';
import enOrganization from '../locales/en/organization.json';
import enAuth from '../locales/en/auth.json';

import esCommon from '../locales/es/common.json';
import esNav from '../locales/es/nav.json';
import esDashboard from '../locales/es/dashboard.json';
import esAgents from '../locales/es/agents.json';
import esAgentDetail from '../locales/es/agentDetail.json';
import esAnalytics from '../locales/es/analytics.json';
import esCampaigns from '../locales/es/campaigns.json';
import esClients from '../locales/es/clients.json';
import esClientDetail from '../locales/es/clientDetail.json';
import esContent from '../locales/es/content.json';
import esControlPanel from '../locales/es/controlPanel.json';
import esLeads from '../locales/es/leads.json';
import esLeadDetail from '../locales/es/leadDetail.json';
import esSeo from '../locales/es/seo.json';
import esSettings from '../locales/es/settings.json';
import esWorkflows from '../locales/es/workflows.json';
import esTeamChat from '../locales/es/teamChat.json';
import esApprovals from '../locales/es/approvals.json';
import esBilling from '../locales/es/billing.json';
import esOrganization from '../locales/es/organization.json';
import esAuth from '../locales/es/auth.json';

import ptCommon from '../locales/pt/common.json';
import ptNav from '../locales/pt/nav.json';
import ptDashboard from '../locales/pt/dashboard.json';
import ptAgents from '../locales/pt/agents.json';
import ptAgentDetail from '../locales/pt/agentDetail.json';
import ptAnalytics from '../locales/pt/analytics.json';
import ptCampaigns from '../locales/pt/campaigns.json';
import ptClients from '../locales/pt/clients.json';
import ptClientDetail from '../locales/pt/clientDetail.json';
import ptContent from '../locales/pt/content.json';
import ptControlPanel from '../locales/pt/controlPanel.json';
import ptLeads from '../locales/pt/leads.json';
import ptLeadDetail from '../locales/pt/leadDetail.json';
import ptSeo from '../locales/pt/seo.json';
import ptSettings from '../locales/pt/settings.json';
import ptWorkflows from '../locales/pt/workflows.json';
import ptTeamChat from '../locales/pt/teamChat.json';
import ptApprovals from '../locales/pt/approvals.json';
import ptBilling from '../locales/pt/billing.json';
import ptOrganization from '../locales/pt/organization.json';
import ptAuth from '../locales/pt/auth.json';

const ns = [
  'common', 'nav', 'dashboard', 'agents', 'agentDetail', 'analytics',
  'campaigns', 'clients', 'clientDetail', 'content', 'controlPanel',
  'leads', 'leadDetail', 'seo', 'settings', 'workflows', 'teamChat',
  'approvals', 'billing', 'organization', 'auth',
] as const;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: enCommon, nav: enNav, dashboard: enDashboard, agents: enAgents,
        agentDetail: enAgentDetail, analytics: enAnalytics, campaigns: enCampaigns,
        clients: enClients, clientDetail: enClientDetail, content: enContent,
        controlPanel: enControlPanel, leads: enLeads, leadDetail: enLeadDetail,
        seo: enSeo, settings: enSettings, workflows: enWorkflows, teamChat: enTeamChat,
        approvals: enApprovals, billing: enBilling, organization: enOrganization, auth: enAuth,
      },
      es: {
        common: esCommon, nav: esNav, dashboard: esDashboard, agents: esAgents,
        agentDetail: esAgentDetail, analytics: esAnalytics, campaigns: esCampaigns,
        clients: esClients, clientDetail: esClientDetail, content: esContent,
        controlPanel: esControlPanel, leads: esLeads, leadDetail: esLeadDetail,
        seo: esSeo, settings: esSettings, workflows: esWorkflows, teamChat: esTeamChat,
        approvals: esApprovals, billing: esBilling, organization: esOrganization, auth: esAuth,
      },
      pt: {
        common: ptCommon, nav: ptNav, dashboard: ptDashboard, agents: ptAgents,
        agentDetail: ptAgentDetail, analytics: ptAnalytics, campaigns: ptCampaigns,
        clients: ptClients, clientDetail: ptClientDetail, content: ptContent,
        controlPanel: ptControlPanel, leads: ptLeads, leadDetail: ptLeadDetail,
        seo: ptSeo, settings: ptSettings, workflows: ptWorkflows, teamChat: ptTeamChat,
        approvals: ptApprovals, billing: ptBilling, organization: ptOrganization, auth: ptAuth,
      },
    },
    ns: [...ns],
    defaultNS: 'common',
    fallbackLng: ['es', 'en'],
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'fuega-lang',
      caches: ['localStorage'],
    },
    interpolation: { escapeValue: false },
  });

export default i18n;
