// @refresh reset
import { useEffect, useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Play, Zap, Bot, Send, MessageSquare,
  PenTool, Search, Megaphone, Mail, BarChart3,
  Users, Shield, FileText, RefreshCw, PauseCircle,
  PlayCircle, AlertTriangle, Globe, Phone, Target,
  Briefcase, DollarSign, TrendingUp, ClipboardList,
  Radio, Trash2, Share2,
} from 'lucide-react';
import { api } from '../lib/api';
import { activityBus } from '../lib/activityBus';
import { PageHeader } from '../components/PageHeader';
import { StatusDot } from '../components/StatusDot';
import { Kbd } from '../components/Kbd';
import { Tabs } from '../components/Tabs';
import { useToast } from '../lib/ToastContext';
import { useWebSocket } from '../lib/useWebSocket';

interface AgentAction {
  label: string;
  agent: string;
  action: string;
  icon: React.ReactNode;
  description: string;
  cost?: string;
}

const ACTION_CATEGORIES: { label: string; icon: React.ReactNode; color: string; actions: AgentAction[] }[] = [
  {
    label: 'Content Operations',
    icon: <PenTool className="w-3.5 h-3.5" />,
    color: '#FF6B2C',
    actions: [
      { label: 'Research Keywords', agent: 'seo_analyst', action: 'research_keywords', icon: <Search className="w-3 h-3" />, description: 'Find keyword opportunities for clients', cost: '~$0.002' },
      { label: 'Write Content', agent: 'content_writer', action: 'write_content', icon: <PenTool className="w-3 h-3" />, description: 'Generate a content piece from approved topic', cost: '~$0.003' },
      { label: 'Review Content', agent: 'editor', action: 'review_and_score', icon: <FileText className="w-3 h-3" />, description: 'QA review and scoring (1-10)', cost: '~$0.008' },
      { label: 'Schedule Posts', agent: 'social_media_manager', action: 'format_and_publish', icon: <Send className="w-3 h-3" />, description: 'Format and schedule approved content', cost: '~$0.001' },
      { label: 'Post to Twitter', agent: 'twitter_integration', action: 'post_tweet', icon: <Share2 className="w-3 h-3" />, description: 'Publish a post to Twitter/X via API', cost: 'free' },
    ],
  },
  {
    label: 'SEO & Analytics',
    icon: <Search className="w-3.5 h-3.5" />,
    color: '#6366F1',
    actions: [
      { label: 'Site Audit', agent: 'seo_analyst', action: 'audit_client_site', icon: <Globe className="w-3 h-3" />, description: 'Technical SEO audit for a client site', cost: '~$0.003' },
      { label: 'Find Opportunities', agent: 'seo_analyst', action: 'find_opportunities', icon: <Target className="w-3 h-3" />, description: 'Keyword gap and opportunity analysis', cost: '~$0.002' },
      { label: 'Collect Metrics', agent: 'analytics_agent', action: 'collect_all_metrics', icon: <BarChart3 className="w-3 h-3" />, description: 'Pull all platform metrics', cost: '~$0.002' },
      { label: 'Generate Report', agent: 'analytics_agent', action: 'generate_report', icon: <ClipboardList className="w-3 h-3" />, description: 'Build performance report', cost: '~$0.003' },
    ],
  },
  {
    label: 'Sales & Outreach',
    icon: <Phone className="w-3.5 h-3.5" />,
    color: '#00D4AA',
    actions: [
      { label: 'Find New Prospects', agent: 'local_outreach', action: 'scout_local_businesses', icon: <Globe className="w-3 h-3" />, description: 'Scout local mom & pop shops, restaurants, salons — businesses needing digital help', cost: '~$0.003' },
      { label: 'Deep-Dive Research', agent: 'smb_researcher', action: 'research_businesses', icon: <Search className="w-3 h-3" />, description: 'Analyze a prospect\'s online presence, competitors, and service gaps', cost: '~$0.003' },
      { label: 'Score & Qualify Leads', agent: 'prospector', action: 'score_and_qualify', icon: <Target className="w-3 h-3" />, description: 'Rank all current leads by fit, budget potential, and urgency', cost: '~$0.002' },
      { label: 'Draft Outreach Messages', agent: 'local_outreach', action: 'draft_outreach', icon: <Mail className="w-3 h-3" />, description: 'Write personalized ES/EN pitch emails for top-scored leads', cost: '~$0.002' },
    ],
  },
  {
    label: 'Advertising',
    icon: <Megaphone className="w-3.5 h-3.5" />,
    color: '#FF6B8A',
    actions: [
      { label: 'Research Audience', agent: 'ads_manager', action: 'research_and_plan', icon: <Users className="w-3 h-3" />, description: 'Audience research and targeting plan', cost: '~$0.002' },
      { label: 'Create Ad Copy', agent: 'ads_manager', action: 'create_ad_copy', icon: <PenTool className="w-3 h-3" />, description: 'Generate ad variations', cost: '~$0.003' },
      { label: 'Track Ad Metrics', agent: 'analytics_agent', action: 'track_ad_metrics', icon: <TrendingUp className="w-3 h-3" />, description: 'Campaign performance tracking', cost: '~$0.002' },
    ],
  },
  {
    label: 'Email & Campaigns',
    icon: <Mail className="w-3.5 h-3.5" />,
    color: '#A855F7',
    actions: [
      { label: 'Design Campaign', agent: 'email_marketing_agent', action: 'design_campaign', icon: <Mail className="w-3 h-3" />, description: 'Build email campaign from scratch', cost: '~$0.002' },
      { label: 'Review Email', agent: 'editor', action: 'review_email', icon: <FileText className="w-3 h-3" />, description: 'QA review on email content', cost: '~$0.005' },
      { label: 'Track Email Metrics', agent: 'analytics_agent', action: 'track_email_metrics', icon: <BarChart3 className="w-3 h-3" />, description: 'Open/click/unsubscribe tracking', cost: '~$0.002' },
    ],
  },
  {
    label: 'Finance & Compliance',
    icon: <DollarSign className="w-3.5 h-3.5" />,
    color: '#EAB308',
    actions: [
      { label: 'Budget Status', agent: 'cfo_agent', action: 'budget_report', icon: <DollarSign className="w-3 h-3" />, description: 'Current budget usage and forecast', cost: '~$0.002' },
      { label: 'Client Profitability', agent: 'cfo_agent', action: 'client_profitability', icon: <TrendingUp className="w-3 h-3" />, description: 'Revenue vs cost per client', cost: '~$0.002' },
      { label: 'Compliance Check', agent: 'legal_bot', action: 'compliance_review', icon: <Shield className="w-3 h-3" />, description: 'Review content for legal compliance', cost: '~$0.002' },
      { label: 'Delivery Status', agent: 'fulfillment_agent', action: 'delivery_status', icon: <Briefcase className="w-3 h-3" />, description: 'Check all deliverable deadlines', cost: '~$0.002' },
    ],
  },
  {
    label: 'Strategic',
    icon: <Briefcase className="w-3.5 h-3.5" />,
    color: '#FF9F43',
    actions: [
      { label: 'CEO Assessment', agent: 'ceo', action: 'strategic_assessment', icon: <Briefcase className="w-3 h-3" />, description: 'Portfolio health and strategic priorities', cost: '~$0.010' },
      { label: 'Score Ideas', agent: 'ceo', action: 'score_and_approve', icon: <Target className="w-3 h-3" />, description: 'Score and prioritize content ideas', cost: '~$0.008' },
      { label: 'Resource Allocation', agent: 'ceo', action: 'allocate_resources', icon: <Users className="w-3 h-3" />, description: 'Optimize team workload allocation', cost: '~$0.010' },
    ],
  },
];

interface ActionLog {
  id: number;
  timestamp: Date;
  type: 'action' | 'pipeline' | 'prompt' | 'toggle' | 'ws_event';
  label: string;
  agent?: string;
  status: 'running' | 'success' | 'error';
  cost?: number;
  duration?: number;
  result?: string;
}

let logIdCounter = 0;

export default function ControlPanel() {
  const toast = useToast();
  const { events, connected } = useWebSocket();
  const [agents, setAgents] = useState<any[]>([]);
  const [definitions, setDefinitions] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('actions');
  const [runningAction, setRunningAction] = useState<string | null>(null);
  const [actionResults, setActionResults] = useState<ActionLog[]>([]);
  const [quickRunning, setQuickRunning] = useState<string | null>(null);
  const [promptAgent, setPromptAgent] = useState<string | null>(null);
  const [promptText, setPromptText] = useState('');
  const [promptSending, setPromptSending] = useState(false);
  const [promptResponse, setPromptResponse] = useState<{ agent: string; response: string; cost?: number } | null>(null);
  const promptInputRef = useRef<HTMLTextAreaElement>(null);
  const feedEndRef = useRef<HTMLDivElement>(null);

  const activeAgents = useMemo(() => agents.filter(a => a.status === 'active'), [agents]);
  const defEntries = useMemo(() => definitions ? Object.entries(definitions) : [], [definitions]);

  // Track WebSocket events in the action log
  useEffect(() => {
    if (events.length > 0) {
      const latest = events[0];
      const log: ActionLog = {
        id: ++logIdCounter,
        timestamp: new Date(),
        type: 'ws_event',
        label: `${latest.event}: ${(latest.data as any)?.action || (latest.data as any)?.output_summary || JSON.stringify(latest.data).slice(0, 80)}`,
        agent: (latest.data as any)?.agent_slug,
        status: 'success',
        cost: (latest.data as any)?.cost_usd,
      };
      setActionResults(prev => [log, ...prev].slice(0, 50));
    }
  }, [events]);

  // Auto-scroll feed
  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [actionResults]);

  const addLog = (log: Omit<ActionLog, 'id' | 'timestamp'>) => {
    const entry: ActionLog = { ...log, id: ++logIdCounter, timestamp: new Date() };
    setActionResults(prev => [entry, ...prev].slice(0, 50));
    return entry.id;
  };

  const updateLog = (id: number, updates: Partial<ActionLog>) => {
    setActionResults(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
  };

  useEffect(() => {
    Promise.all([
      api.agents.list().catch(() => []),
      api.workflows.definitions().catch(() => null),
    ]).then(([ag, defs]) => {
      setAgents(ag);
      setDefinitions(defs);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (promptAgent) {
      setTimeout(() => promptInputRef.current?.focus(), 100);
    }
  }, [promptAgent]);

  const toggleAgentStatus = async (slug: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    const agentName = agents.find(a => a.slug === slug)?.name || slug;
    const logId = addLog({ type: 'toggle', label: `${agentName} → ${newStatus}`, agent: slug, status: 'running' });
    try {
      const updated = await api.agents.update(slug, { status: newStatus });
      setAgents(prev => prev.map(a => a.slug === slug ? { ...a, ...updated } : a));
      updateLog(logId, { status: 'success' });
    } catch {
      updateLog(logId, { status: 'error' });
      toast.error(`Failed to update ${agentName}`);
    }
  };

  const bulkToggle = async (toStatus: 'active' | 'paused') => {
    const toUpdate = agents.filter(a => a.status !== toStatus);
    const logId = addLog({ type: 'toggle', label: `Bulk ${toStatus} (${toUpdate.length} agents)`, status: 'running' });
    let successCount = 0;
    for (const agent of toUpdate) {
      try {
        const updated = await api.agents.update(agent.slug, { status: toStatus });
        setAgents(prev => prev.map(a => a.slug === agent.slug ? { ...a, ...updated } : a));
        successCount++;
      } catch { /* logged in feed */ }
    }
    updateLog(logId, { status: 'success', result: `${successCount}/${toUpdate.length} updated` });
  };

  const handleRunAction = async (action: AgentAction) => {
    const key = `${action.agent}:${action.action}`;
    setRunningAction(key);
    const agentName = agents.find(a => a.slug === action.agent)?.name || action.agent;
    activityBus.push('agent', `${agentName}: ${action.label}`, action.description);
    const logId = addLog({ type: 'action', label: action.label, agent: action.agent, status: 'running' });
    const startTime = Date.now();
    try {
      // Special case: Twitter posting goes through integrations API, not agent workflow
      if (action.agent === 'twitter_integration' && action.action === 'post_tweet') {
        const text = prompt('Enter tweet text:');
        if (!text) { setRunningAction(null); updateLog(logId, { status: 'error', result: 'Cancelled' }); return; }
        const result = await api.integrations.twitter.post(text);
        const duration = Date.now() - startTime;
        updateLog(logId, { status: 'success', duration, result: result.tweet_id ? `Tweet posted (ID: ${result.tweet_id})` : 'Tweet posted' });
        activityBus.push('success', 'Tweet posted', `${duration}ms`);
        setRunningAction(null);
        return;
      }
      const result = await api.workflows.runStep(action.agent, action.action);
      const duration = Date.now() - startTime;
      const resultText = result.parsed ? JSON.stringify(result.parsed, null, 2) : result.response;
      updateLog(logId, {
        status: 'success',
        cost: result.cost_usd,
        duration,
        result: resultText?.slice(0, 500),
      });
      activityBus.push('success', `${action.label} done`, `$${result.cost_usd?.toFixed(4) || '0'} · ${duration}ms`);

      // Auto-persist leads from scout/prospect actions
      if (result.parsed && (action.action === 'scout_local_businesses' || action.action === 'score_and_qualify' || action.action === 'research_businesses')) {
        try {
          await api.leads.fromAgentOutput({ agent_output: result.parsed, source: `${action.agent}:${action.action}` });
          addLog({ type: 'action', label: 'Leads persisted to pipeline', status: 'success' });
        } catch {
          // Non-critical — log but don't block
          addLog({ type: 'action', label: 'Lead persistence failed (non-critical)', status: 'error' });
        }
      }
    } catch (err) {
      updateLog(logId, { status: 'error', duration: Date.now() - startTime });
      toast.error(`${action.label} FAILED — ${agentName} could not complete the action`);
    }
    setRunningAction(null);
  };

  const handleQuickRun = async (name: string) => {
    setQuickRunning(name);
    const pipelineName = (definitions as any)?.[name]?.name || name;
    activityBus.push('workflow', `Pipeline launched: ${pipelineName}`);
    const logId = addLog({ type: 'pipeline', label: `Pipeline: ${pipelineName}`, status: 'running' });
    try {
      const result = await api.workflows.trigger(name);
      updateLog(logId, { status: 'success', result: `Run #${result.run_id} started` });
    } catch {
      updateLog(logId, { status: 'error' });
      toast.error(`Failed to trigger "${pipelineName}" — Is the backend running?`);
    }
    setQuickRunning(null);
  };

  const handleSendPrompt = async () => {
    if (!promptAgent || !promptText.trim()) return;
    setPromptSending(true);
    setPromptResponse(null);
    const agentName = agents.find(a => a.slug === promptAgent)?.name || promptAgent;
    const logId = addLog({ type: 'prompt', label: `Prompt → ${agentName}: "${promptText.trim().slice(0, 60)}"`, agent: promptAgent, status: 'running' });
    const startTime = Date.now();
    try {
      const res = await api.agents.chat(promptAgent, promptText.trim());
      const duration = Date.now() - startTime;
      setPromptResponse({
        agent: promptAgent,
        response: res.response || 'Done.',
        cost: res.cost_usd,
      });
      updateLog(logId, {
        status: 'success',
        cost: res.cost_usd,
        duration,
        result: (res.response || 'Done.').slice(0, 500),
      });
      setPromptText('');
    } catch {
      updateLog(logId, { status: 'error', duration: Date.now() - startTime });
      toast.error(`Failed to reach ${agentName} — Is the agent active and backend running?`);
    } finally {
      setPromptSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-chispa-orange border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const tabItems = [
    { key: 'actions', label: 'Actions', icon: <Zap className="w-3.5 h-3.5" /> },
    { key: 'fleet', label: 'Agent Fleet', icon: <Bot className="w-3.5 h-3.5" /> },
    { key: 'pipelines', label: 'Pipelines', icon: <Play className="w-3.5 h-3.5" /> },
    { key: 'prompt', label: 'Direct Prompt', icon: <MessageSquare className="w-3.5 h-3.5" /> },
  ];

  const totalSessionCost = actionResults.reduce((s, l) => s + (l.cost || 0), 0);

  return (
    <div className="animate-fadeIn">
      <PageHeader
        title="Control Panel"
        subtitle={`${activeAgents.length}/${agents.length} agents active — Fire commands, run operations, control the fleet`}
        tabs={<Tabs tabs={tabItems} active={tab} onChange={setTab} />}
        action={
          <div className="flex items-center gap-2 text-[10px]">
            <StatusDot status={connected ? 'active' : 'error'} pulse={connected} label={connected ? 'Live' : 'Offline'} size="sm" />
            {totalSessionCost > 0 && <span className="text-chispa-text-muted num">Session: ${totalSessionCost.toFixed(4)}</span>}
          </div>
        }
      />

      {/* Two-column layout: controls left, live feed right */}
      <div className="flex gap-3">
        {/* Main controls area */}
        <div className="flex-1 min-w-0">

      {/* === ACTIONS TAB === */}
      {tab === 'actions' && (
        <div className="space-y-3">
          {ACTION_CATEGORIES.map(cat => (
            <div key={cat.label} className="bg-chispa-card border border-chispa-border rounded-lg overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-chispa-border">
                <span style={{ color: cat.color }}>{cat.icon}</span>
                <h3 className="text-[11px] uppercase tracking-wider font-mono font-semibold text-chispa-text-primary">{cat.label}</h3>
                <span className="text-[10px] text-chispa-text-muted">{cat.actions.length} actions</span>
              </div>
              <div className="p-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-1.5">
                {cat.actions.map(action => {
                  const key = `${action.agent}:${action.action}`;
                  const isRunning = runningAction === key;
                  return (
                    <button
                      key={key}
                      onClick={() => handleRunAction(action)}
                      disabled={!!runningAction}
                      className="flex items-start gap-2 p-2 rounded-lg bg-chispa-input border border-chispa-border hover:border-chispa-orange/30 text-left transition-all disabled:opacity-50 group"
                    >
                      <div className="p-1 rounded bg-chispa-surface group-hover:bg-chispa-orange/10 transition-colors mt-0.5" style={{ color: cat.color }}>
                        {isRunning ? (
                          <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                          action.icon
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold text-chispa-text-primary truncate">{action.label}</p>
                        <p className="text-[9px] text-chispa-text-muted leading-tight">{action.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] text-chispa-text-muted num">{action.cost}</span>
                          <span className="text-[9px] text-chispa-text-muted">via {action.agent.replace(/_/g, ' ')}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Results now show in the Live Feed panel on the right → */}
        </div>
      )}

      {/* === FLEET TAB === */}
      {tab === 'fleet' && (
        <div>
          {/* Bulk controls */}
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={() => bulkToggle('active')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-[11px] font-medium hover:bg-green-500/20 transition-colors"
            >
              <PlayCircle className="w-3.5 h-3.5" /> Activate All
            </button>
            <button
              onClick={() => bulkToggle('paused')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-[11px] font-medium hover:bg-yellow-500/20 transition-colors"
            >
              <PauseCircle className="w-3.5 h-3.5" /> Pause All
            </button>
            <Link
              to="/agents"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-chispa-input border border-chispa-border text-chispa-text-secondary text-[11px] font-medium hover:text-chispa-text-primary transition-colors"
            >
              <Bot className="w-3.5 h-3.5" /> Manage Agents
            </Link>
            <div className="ml-auto flex items-center gap-2 text-[11px]">
              <StatusDot status="active" label={`${activeAgents.length} active`} size="sm" />
              <StatusDot status="paused" label={`${agents.length - activeAgents.length} paused`} size="sm" />
            </div>
          </div>

          {/* Agent toggle grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
            {agents.map(agent => {
              const isActive = agent.status === 'active';
              const pct = agent.monthly_budget_usd ? ((agent.month_spend_usd || 0) / agent.monthly_budget_usd) * 100 : 0;
              return (
                <div
                  key={agent.slug}
                  className={`bg-chispa-card border rounded-lg p-2.5 transition-all ${
                    isActive ? 'border-green-500/30' : 'border-chispa-border opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <Bot className="w-3.5 h-3.5 text-chispa-orange flex-shrink-0" />
                      <p className="text-[11px] font-semibold text-chispa-text-primary truncate">{agent.name}</p>
                    </div>
                    <button
                      onClick={() => toggleAgentStatus(agent.slug, agent.status)}
                      role="switch"
                      aria-checked={isActive}
                      className={`relative w-8 h-[18px] rounded-full transition-colors flex-shrink-0 ${isActive ? 'bg-green-500' : 'bg-chispa-border'}`}
                    >
                      <span className={`absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white transition-transform ${isActive ? 'left-[16px]' : 'left-[2px]'}`} />
                    </button>
                  </div>
                  <p className="text-[9px] text-chispa-text-muted mb-1.5 truncate">{agent.role}</p>
                  <div className="flex items-center justify-between text-[9px] text-chispa-text-muted mb-1">
                    <span className="num">${(agent.month_spend_usd || 0).toFixed(2)} / ${agent.monthly_budget_usd || 0}</span>
                    <span className="num">{pct.toFixed(0)}%</span>
                  </div>
                  <div className="h-[3px] bg-chispa-surface rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: pct > 80 ? '#EF4444' : pct > 50 ? '#EAB308' : '#00D4AA' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* === PIPELINES TAB === */}
      {tab === 'pipelines' && (
        <div>
          <div className="flex items-start gap-2 mb-3 bg-chispa-purple/5 border border-chispa-purple/20 rounded-lg p-2.5">
            <AlertTriangle className="w-3.5 h-3.5 text-chispa-purple flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-chispa-text-secondary">
              Pipelines run multiple agents in sequence. Each pipeline triggers the full workflow end-to-end.
              <Link to="/workflows" className="text-chispa-orange hover:underline ml-1">View detailed workflow management →</Link>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {defEntries.map(([key, wf]: [string, any], i: number) => (
              <div key={key} className="bg-chispa-card border border-chispa-border rounded-lg p-3 hover:border-chispa-orange/20 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[12px] font-semibold text-chispa-text-primary">{wf.name}</h3>
                  <Kbd>{i + 1}</Kbd>
                </div>
                <p className="text-[10px] text-chispa-text-muted mb-2 leading-relaxed">{wf.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[9px] text-chispa-text-muted">
                    <span>{wf.steps?.length || 0} steps</span>
                    {wf.schedule && <span className="num">{wf.schedule}</span>}
                  </div>
                  <button
                    onClick={() => handleQuickRun(key)}
                    disabled={!!quickRunning}
                    className="flex items-center gap-1 bg-chispa-orange hover:bg-chispa-orange/80 text-white px-2.5 py-1 rounded text-[11px] font-medium transition-colors disabled:opacity-50"
                  >
                    {quickRunning === key ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <Play className="w-3 h-3" />
                    )}
                    Run
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* === DIRECT PROMPT TAB === */}
      {tab === 'prompt' && (
        <div>
          <p className="text-[11px] text-chispa-text-muted mb-3">Select an agent and send them a direct message. Use this for ad-hoc queries or custom instructions.</p>

          {/* Agent selector grid */}
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-1.5 mb-3">
            {agents.map(agent => (
              <button
                key={agent.slug}
                onClick={() => { setPromptAgent(agent.slug); setPromptResponse(null); }}
                className={`flex items-center gap-1.5 p-2 rounded-lg border text-left transition-all ${
                  promptAgent === agent.slug
                    ? 'bg-chispa-orange/10 border-chispa-orange/40'
                    : 'bg-chispa-input border-chispa-border hover:border-chispa-orange/20'
                } ${agent.status !== 'active' ? 'opacity-50' : ''}`}
              >
                <StatusDot status={agent.status === 'active' ? 'active' : 'paused'} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold text-chispa-text-primary truncate">{agent.name}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Prompt area */}
          {promptAgent && (
            <div className="bg-chispa-card border border-chispa-border rounded-lg p-3 animate-slideUp">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Bot className="w-3.5 h-3.5 text-chispa-orange" />
                  <span className="text-[12px] font-semibold text-chispa-text-primary">
                    {agents.find(a => a.slug === promptAgent)?.name || promptAgent}
                  </span>
                </div>
                <button
                  onClick={() => { setPromptAgent(null); setPromptResponse(null); }}
                  className="text-[10px] text-chispa-text-muted hover:text-chispa-text-primary"
                >
                  Close
                </button>
              </div>
              <div className="flex gap-2">
                <textarea
                  ref={promptInputRef}
                  value={promptText}
                  onChange={e => setPromptText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendPrompt(); } }}
                  placeholder="Ask anything... (Enter to send)"
                  rows={3}
                  className="flex-1 bg-chispa-input border border-chispa-border rounded-lg px-2.5 py-1.5 text-[12px] text-chispa-text-primary placeholder-chispa-text-muted resize-none focus:outline-none focus:border-chispa-orange/50"
                />
                <button
                  onClick={handleSendPrompt}
                  disabled={promptSending || !promptText.trim()}
                  className="px-3 py-1.5 bg-chispa-orange text-white rounded-lg hover:bg-chispa-orange/90 disabled:opacity-50 transition-colors self-end"
                >
                  {promptSending ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
              <div className="flex gap-1 mt-1.5 flex-wrap">
                {['Status report', 'What are you working on?', 'Budget check', 'Any blockers?', 'Weekly summary', 'Top priorities'].map(preset => (
                  <button
                    key={preset}
                    onClick={() => setPromptText(preset)}
                    className="text-[9px] px-2 py-0.5 rounded bg-chispa-input border border-chispa-border text-chispa-text-muted hover:text-chispa-orange hover:border-chispa-orange/30 transition-colors"
                  >
                    {preset}
                  </button>
                ))}
              </div>

              {promptResponse && (
                <div className="mt-2 bg-chispa-input border border-chispa-border rounded-lg p-2 animate-slideUp">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-semibold text-chispa-text-primary flex items-center gap-1">
                      <Bot className="w-3 h-3 text-chispa-orange" />
                      {agents.find(a => a.slug === promptResponse.agent)?.name}
                    </span>
                    {promptResponse.cost != null && promptResponse.cost > 0 && (
                      <span className="text-[9px] text-chispa-text-muted num">${promptResponse.cost.toFixed(4)}</span>
                    )}
                  </div>
                  <p className="text-[11px] text-chispa-text-secondary whitespace-pre-wrap leading-relaxed">
                    {promptResponse.response}
                  </p>
                </div>
              )}
            </div>
          )}

          {!promptAgent && (
            <div className="text-center py-8 text-chispa-text-muted text-[12px]">
              Select an agent above to send them a direct message
            </div>
          )}
        </div>
      )}
        </div>

        {/* Live Feed Panel — always visible */}
        <div className="w-72 xl:w-80 flex-shrink-0 hidden lg:block">
          <div className="bg-chispa-card border border-chispa-border rounded-lg sticky top-3 max-h-[calc(100vh-100px)] flex flex-col">
            <div className="flex items-center justify-between px-3 py-2 border-b border-chispa-border">
              <div className="flex items-center gap-2">
                <Radio className="w-3.5 h-3.5 text-chispa-orange" />
                <h3 className="text-[11px] uppercase tracking-wider font-mono font-semibold text-chispa-text-primary">Live Feed</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-chispa-text-muted num">{actionResults.length} events</span>
                {actionResults.length > 0 && (
                  <button
                    onClick={() => setActionResults([])}
                    className="text-chispa-text-muted hover:text-chispa-text-primary transition-colors"
                    title="Clear feed"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {actionResults.length === 0 && (
                <div className="text-center py-8 text-[10px] text-chispa-text-muted">
                  <Radio className="w-5 h-5 mx-auto mb-2 opacity-30" />
                  <p>No activity yet</p>
                  <p className="mt-1">Run an action to see progress here</p>
                </div>
              )}
              {actionResults.map(log => (
                <div
                  key={log.id}
                  className={`rounded-lg border p-2 text-[10px] transition-all ${
                    log.status === 'running'
                      ? 'border-chispa-orange/30 bg-chispa-orange/5 animate-pulse'
                      : log.status === 'error'
                      ? 'border-red-500/20 bg-red-500/5'
                      : 'border-chispa-border bg-chispa-input'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <StatusDot
                      status={log.status === 'running' ? 'running' : log.status === 'error' ? 'error' : 'active'}
                      pulse={log.status === 'running'}
                      size="sm"
                    />
                    <span className="font-semibold text-chispa-text-primary truncate flex-1">{log.label}</span>
                  </div>
                  <div className="flex items-center gap-2 text-chispa-text-muted">
                    <span>{log.timestamp.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                    {log.type !== 'ws_event' && (
                      <span className="px-1 py-px rounded bg-chispa-surface text-[8px] uppercase">{log.type}</span>
                    )}
                    {log.cost != null && log.cost > 0 && <span className="num text-chispa-orange">${log.cost.toFixed(4)}</span>}
                    {log.duration != null && <span className="num">{log.duration}ms</span>}
                  </div>
                  {log.result && (
                    <details className="mt-1">
                      <summary className="text-[9px] text-chispa-text-muted cursor-pointer hover:text-chispa-text-secondary">
                        View result
                      </summary>
                      <pre className="mt-1 text-[9px] text-chispa-text-secondary whitespace-pre-wrap font-mono bg-chispa-surface rounded p-1.5 max-h-32 overflow-y-auto border border-chispa-border/50">
                        {log.result}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
              <div ref={feedEndRef} />
            </div>

            {/* Feed footer with session totals */}
            {actionResults.length > 0 && (
              <div className="px-3 py-1.5 border-t border-chispa-border text-[9px] text-chispa-text-muted flex items-center justify-between">
                <span>
                  {actionResults.filter(l => l.status === 'success').length} ok /
                  {actionResults.filter(l => l.status === 'error').length} err /
                  {actionResults.filter(l => l.status === 'running').length} running
                </span>
                {totalSessionCost > 0 && <span className="num">Total: ${totalSessionCost.toFixed(4)}</span>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
