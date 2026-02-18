import { activityBus } from './activityBus';
import { getAccessToken } from './auth';

const API_BASE = '/api';

/** Human-readable labels for API paths so the console shows meaningful names. */
const PATH_LABELS: Record<string, string> = {
  '/dashboard/kpis': 'Loading KPIs',
  '/dashboard/activity': 'Loading activity feed',
  '/dashboard/cost-chart': 'Loading cost chart',
  '/dashboard/revenue-chart': 'Loading revenue chart',
  '/agents/': 'Loading agents',
  '/agents/team-chat': 'Team chat message',
  '/content/ideas': 'Loading content ideas',
  '/content/drafts': 'Loading drafts',
  '/content/published': 'Loading published content',
  '/content/kanban': 'Loading content board',
  '/content/metrics': 'Loading content metrics',
  '/clients/': 'Loading clients',
  '/leads/': 'Loading leads',
  '/leads/kanban': 'Loading leads pipeline',
  '/leads/from-agent-output': 'Importing agent results \u2192 leads',
  '/seo/audits': 'Loading SEO audits',
  '/seo/keywords': 'Loading keywords',
  '/campaigns/ads': 'Loading ad campaigns',
  '/campaigns/email': 'Loading email campaigns',
  '/workflows/': 'Loading workflows',
  '/workflows/trigger': 'Triggering pipeline',
  '/workflows/run-step': 'Running agent step',
  '/workflows/pending-approvals': 'Checking approvals',
  '/workflows/definitions': 'Loading workflow definitions',
  '/analytics/costs': 'Loading cost analytics',
  '/analytics/performance': 'Loading performance data',
  '/analytics/revenue': 'Loading revenue data',
  '/settings/brand': 'Loading brand settings',
  '/settings/services': 'Loading service tiers',
  '/settings/agents': 'Loading agent config',
  '/settings/workflows': 'Loading workflow config',
  '/settings/budget': 'Loading budget config',
  '/settings/platforms': 'Loading platform config',
  '/integrations/status': 'Checking integration status',
  '/integrations/elevenlabs/generate': 'Generating voiceover',
  '/integrations/elevenlabs/voices': 'Loading voices',
  '/integrations/pexels/search-photos': 'Searching stock photos',
  '/integrations/pexels/search-videos': 'Searching stock videos',
  '/integrations/openai/generate-image': 'Generating image',
  '/integrations/resend/send-email': 'Sending email',
  '/integrations/twitter/post': 'Posting to Twitter',
  '/auth/login': 'Logging in',
  '/auth/register': 'Registering',
  '/auth/refresh': 'Refreshing token',
  '/auth/me': 'Loading user profile',
  '/approvals/': 'Loading approvals',
  '/approvals/bulk-approve': 'Bulk approving',
  '/approvals/count': 'Loading approval count',
  '/billing/checkout': 'Starting checkout',
  '/billing/portal': 'Opening billing portal',
  '/billing/status': 'Loading billing status',
  '/billing/usage': 'Loading usage data',
  '/outreach/voice-clip': 'Generating voice clip',
  '/outreach/voice-clips': 'Loading voice clips',
  '/outreach/pending-followups': 'Loading pending follow-ups',
};

function labelForPath(method: string, path: string): string {
  // Exact match
  if (PATH_LABELS[path]) return PATH_LABELS[path];

  // Strip query params for matching
  const cleanPath = path.split('?')[0];
  if (PATH_LABELS[cleanPath]) return PATH_LABELS[cleanPath];

  // Dynamic path patterns
  if (method === 'POST' && cleanPath.match(/\/leads\/\d+\/run-agent/)) return 'Running agent on lead';
  if (method === 'POST' && cleanPath.match(/\/leads\/\d+\/convert/)) return 'Converting lead \u2192 client';
  if (method === 'PATCH' && cleanPath.match(/\/leads\/\d+/)) return 'Updating lead';
  if (method === 'GET' && cleanPath.match(/\/leads\/\d+/)) return 'Loading lead detail';
  if (method === 'POST' && cleanPath.match(/\/workflows\/\d+\/approve/)) return 'Approving workflow step';
  if (method === 'GET' && cleanPath.match(/\/workflows\/\d+/)) return 'Loading workflow run';
  if (method === 'GET' && cleanPath.match(/\/agents\/[a-z_]+\/logs/)) return 'Loading agent logs';
  if (method === 'POST' && cleanPath.match(/\/agents\/[a-z_]+\/chat/)) return 'Chatting with agent';
  if (method === 'PATCH' && cleanPath.match(/\/agents\/[a-z_]+/)) return 'Updating agent';
  if (method === 'GET' && cleanPath.match(/\/agents\/[a-z_]+/)) return 'Loading agent detail';
  if (method === 'GET' && cleanPath.match(/\/clients\/\d+/)) return 'Loading client detail';
  if (method === 'PUT' && cleanPath.match(/\/settings\//)) return 'Saving settings';
  if (method === 'POST' && cleanPath.match(/\/approvals\/\d+\/approve/)) return 'Approving action';
  if (method === 'POST' && cleanPath.match(/\/approvals\/\d+\/reject/)) return 'Rejecting action';
  if (method === 'GET' && cleanPath.match(/\/approvals\/\d+/)) return 'Loading approval detail';
  if (method === 'PUT' && cleanPath.match(/\/agents\/[a-z_-]+\/actions\//)) return 'Updating action mode';
  if (method === 'GET' && cleanPath.match(/\/agents\/[a-z_-]+\/actions/)) return 'Loading agent actions';
  if (method === 'GET' && cleanPath.match(/\/agents\/[a-z_-]+\/export/)) return 'Exporting agent config';
  if (method === 'POST' && cleanPath.match(/\/agents\/import/)) return 'Importing agent config';
  if (method === 'POST' && cleanPath.match(/\/outreach\/send-followup\/\d+/)) return 'Sending follow-up';
  if (method === 'GET' && cleanPath.match(/\/outreach\/sequence\/\d+/)) return 'Loading follow-up sequence';

  // Fallback
  return `${method} ${cleanPath}`;
}

async function fetchJSON<T>(path: string, options?: RequestInit): Promise<T> {
  const { headers: optHeaders, ...restOptions } = options || {};
  const method = (restOptions.method || 'GET').toUpperCase();
  const label = labelForPath(method, path);
  const isWrite = method !== 'GET';

  // Log start for write operations (POST/PATCH/PUT/DELETE) -- skip noisy GETs
  if (isWrite) {
    activityBus.push('action', label, path);
  }

  // Inject Authorization header if token is available
  const authHeaders: Record<string, string> = {};
  const token = getAccessToken();
  if (token) {
    authHeaders['Authorization'] = `Bearer ${token}`;
  }

  const start = performance.now();
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...restOptions,
      headers: { 'Content-Type': 'application/json', ...authHeaders, ...(optHeaders as Record<string, string>) },
    });
    const durationMs = Math.round(performance.now() - start);

    if (!res.ok) {
      const errMsg = `${res.status} ${res.statusText}`;
      activityBus.push('error', `Failed: ${label}`, `${errMsg} \u00b7 ${durationMs}ms`);
      throw new Error(`API error: ${errMsg}`);
    }

    // Log completion for write operations, or slow GETs (>2s)
    if (isWrite) {
      activityBus.push('success', `Done: ${label}`, `${durationMs}ms`);
    } else if (durationMs > 2000) {
      activityBus.push('info', `Slow: ${label}`, `${durationMs}ms`);
    }

    return res.json();
  } catch (err) {
    const durationMs = Math.round(performance.now() - start);
    if (!(err instanceof Error && err.message.startsWith('API error'))) {
      activityBus.push('error', `Network error: ${label}`, `${durationMs}ms \u2014 ${err}`);
    }
    throw err;
  }
}

export const api = {
  // Auth
  auth: {
    login: (email: string, password: string) =>
      fetchJSON<any>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
    register: (email: string, password: string, full_name: string) =>
      fetchJSON<any>('/auth/register', { method: 'POST', body: JSON.stringify({ email, password, full_name }) }),
    refresh: (refresh_token: string) =>
      fetchJSON<any>('/auth/refresh', { method: 'POST', body: JSON.stringify({ refresh_token }) }),
    me: () => fetchJSON<any>('/auth/me'),
  },

  // Approvals
  approvals: {
    list: (params?: { status?: string; agent?: string }) => {
      const qs = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
      return fetchJSON<any>(`/approvals/${qs}`);
    },
    get: (id: number) => fetchJSON<any>(`/approvals/${id}`),
    approve: (id: number, modified_payload?: any) =>
      fetchJSON<any>(`/approvals/${id}/approve`, { method: 'POST', body: JSON.stringify({ modified_payload }) }),
    reject: (id: number, reason: string) =>
      fetchJSON<any>(`/approvals/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),
    bulkApprove: (ids: number[]) =>
      fetchJSON<any>('/approvals/bulk-approve', { method: 'POST', body: JSON.stringify({ ids }) }),
    count: () => fetchJSON<{ count: number }>('/approvals/count'),
  },

  // Billing
  billing: {
    checkout: (plan: string, success_url: string, cancel_url: string) =>
      fetchJSON<any>('/billing/checkout', { method: 'POST', body: JSON.stringify({ plan, success_url, cancel_url }) }),
    portal: () =>
      fetchJSON<any>('/billing/portal', { method: 'POST' }),
    status: () => fetchJSON<any>('/billing/status'),
    usage: () => fetchJSON<any>('/billing/usage'),
  },

  dashboard: {
    kpis: () => fetchJSON<any>('/dashboard/kpis'),
    activity: (limit = 20) => fetchJSON<any[]>(`/dashboard/activity?limit=${limit}`),
    costChart: (days = 30) => fetchJSON<any>(`/dashboard/cost-chart?days=${days}`),
    revenueChart: (months = 6) => fetchJSON<any>(`/dashboard/revenue-chart?months=${months}`),
  },
  agents: {
    list: () => fetchJSON<any[]>('/agents/'),
    get: (slug: string) => fetchJSON<any>(`/agents/${slug}`),
    logs: (slug: string, limit = 50) => fetchJSON<any[]>(`/agents/${slug}/logs?limit=${limit}`),
    chat: (slug: string, message: string) =>
      fetchJSON<any>(`/agents/${slug}/chat`, { method: 'POST', body: JSON.stringify({ message }) }),
    update: (slug: string, data: { status?: string; monthly_budget_usd?: number }) =>
      fetchJSON<any>(`/agents/${slug}`, { method: 'PATCH', body: JSON.stringify(data) }),
    teamChat: (slugs: string[], message: string) =>
      fetchJSON<any[]>('/agents/team-chat', { method: 'POST', body: JSON.stringify({ slugs, message }) }),
    actions: (slug: string) => fetchJSON<any[]>(`/agents/${slug}/actions`),
    updateAction: (slug: string, action: string, mode: string) =>
      fetchJSON<any>(`/agents/${slug}/actions/${action}`, { method: 'PUT', body: JSON.stringify({ mode }) }),
    exportConfig: (slug: string) => fetchJSON<any>(`/agents/${slug}/export`),
    importConfig: (data: any) =>
      fetchJSON<any>('/agents/import', { method: 'POST', body: JSON.stringify(data) }),
  },
  content: {
    ideas: (status?: string) => fetchJSON<any[]>(`/content/ideas${status ? `?status=${status}` : ''}`),
    drafts: (status?: string) => fetchJSON<any[]>(`/content/drafts${status ? `?status=${status}` : ''}`),
    published: () => fetchJSON<any[]>('/content/published'),
    kanban: () => fetchJSON<any>('/content/kanban'),
    metrics: () => fetchJSON<any[]>('/content/metrics'),
    createIdea: (data: { title: string; target_platform?: string; description?: string; keywords?: string[] }) =>
      fetchJSON<any>('/content/ideas', { method: 'POST', body: JSON.stringify(data) }),
  },
  clients: {
    list: () => fetchJSON<any[]>('/clients/'),
    get: (id: number) => fetchJSON<any>(`/clients/${id}`),
    create: (data: any) => fetchJSON<any>('/clients/', { method: 'POST', body: JSON.stringify(data) }),
  },
  leads: {
    list: (stage?: string) => fetchJSON<any[]>(`/leads/${stage ? `?stage=${stage}` : ''}`),
    get: (id: number) => fetchJSON<any>(`/leads/${id}`),
    create: (data: any) => fetchJSON<any>('/leads/', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) => fetchJSON<any>(`/leads/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    kanban: () => fetchJSON<any>('/leads/kanban'),
    convert: (id: number) => fetchJSON<any>(`/leads/${id}/convert`, { method: 'POST' }),
    fromAgentOutput: (data: { agent_output: any; source: string }) =>
      fetchJSON<any>('/leads/from-agent-output', { method: 'POST', body: JSON.stringify(data) }),
    runAgent: (id: number, agentSlug: string, action: string) =>
      fetchJSON<any>(`/leads/${id}/run-agent`, { method: 'POST', body: JSON.stringify({ agent_slug: agentSlug, action }) }),
  },
  seo: {
    audits: (clientId?: number) => fetchJSON<any[]>(`/seo/audits${clientId ? `?client_id=${clientId}` : ''}`),
    keywords: (clientId?: number) => fetchJSON<any[]>(`/seo/keywords${clientId ? `?client_id=${clientId}` : ''}`),
  },
  campaigns: {
    ads: () => fetchJSON<any[]>('/campaigns/ads'),
    email: () => fetchJSON<any[]>('/campaigns/email'),
  },
  workflows: {
    list: (status?: string) => fetchJSON<any[]>(`/workflows/${status ? `?status=${status}` : ''}`),
    get: (id: number) => fetchJSON<any>(`/workflows/${id}`),
    trigger: (name: string, context?: any) =>
      fetchJSON<any>('/workflows/trigger', { method: 'POST', body: JSON.stringify({ workflow_name: name, context }) }),
    approve: (runId: number, stepId: string, approved = true) =>
      fetchJSON<any>(`/workflows/${runId}/approve/${stepId}`, { method: 'POST', body: JSON.stringify({ approved }) }),
    pendingApprovals: () => fetchJSON<any[]>('/workflows/pending-approvals'),
    definitions: () => fetchJSON<any>('/workflows/definitions'),
    runStep: (agentSlug: string, action: string, context?: any) =>
      fetchJSON<any>('/workflows/run-step', { method: 'POST', body: JSON.stringify({ agent_slug: agentSlug, action, context }) }),
  },
  analytics: {
    costs: () => fetchJSON<any>('/analytics/costs'),
    performance: () => fetchJSON<any>('/analytics/performance'),
    revenue: () => fetchJSON<any>('/analytics/revenue'),
  },
  integrations: {
    status: () => fetchJSON<any>('/integrations/status'),
    elevenlabs: {
      generate: (text: string, voice_id?: string) =>
        fetchJSON<any>('/integrations/elevenlabs/generate', { method: 'POST', body: JSON.stringify({ text, voice_id }) }),
      voices: () => fetchJSON<any[]>('/integrations/elevenlabs/voices'),
    },
    pexels: {
      searchPhotos: (query: string, per_page = 10) =>
        fetchJSON<any>('/integrations/pexels/search-photos', { method: 'POST', body: JSON.stringify({ query, per_page }) }),
      searchVideos: (query: string, per_page = 10) =>
        fetchJSON<any>('/integrations/pexels/search-videos', { method: 'POST', body: JSON.stringify({ query, per_page }) }),
    },
    openai: {
      generateImage: (prompt: string, size = '1024x1024') =>
        fetchJSON<any>('/integrations/openai/generate-image', { method: 'POST', body: JSON.stringify({ prompt, size }) }),
    },
    resend: {
      sendEmail: (to: string, subject: string, html_body: string, from_agent?: string) =>
        fetchJSON<any>('/integrations/resend/send-email', { method: 'POST', body: JSON.stringify({ to, subject, html_body, from_agent }) }),
    },
    twitter: {
      post: (text: string, media_url?: string) =>
        fetchJSON<any>('/integrations/twitter/post', { method: 'POST', body: JSON.stringify({ text, media_url }) }),
    },
  },
  outreach: {
    voiceClip: (business_name: string, language = 'es', greeting_type = 'introduction') =>
      fetchJSON<any>('/outreach/voice-clip', { method: 'POST', body: JSON.stringify({ business_name, language, greeting_type }) }),
    voiceClips: () => fetchJSON<any>('/outreach/voice-clips'),
    pendingFollowups: () => fetchJSON<any>('/outreach/pending-followups'),
    sendFollowup: (leadId: number, dry_run = false) =>
      fetchJSON<any>(`/outreach/send-followup/${leadId}`, { method: 'POST', body: JSON.stringify({ dry_run }) }),
    sequence: (leadId: number) => fetchJSON<any>(`/outreach/sequence/${leadId}`),
  },
  settings: {
    brand: () => fetchJSON<any>('/settings/brand'),
    services: () => fetchJSON<any>('/settings/services'),
    agents: () => fetchJSON<any>('/settings/agents'),
    workflows: () => fetchJSON<any>('/settings/workflows'),
    budget: () => fetchJSON<any>('/settings/budget'),
    platforms: () => fetchJSON<any>('/settings/platforms'),
    update: (section: string, data: any) =>
      fetchJSON<any>(`/settings/${section}`, { method: 'PUT', body: JSON.stringify(data) }),
  },
};
