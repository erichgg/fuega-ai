import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Send, Bot, User, ChevronDown, ChevronUp, Cpu, Wrench, ArrowDownToLine, ArrowUpFromLine, Zap, Play, DollarSign, Activity, Download, Upload, Shield, ShieldCheck, ShieldAlert } from 'lucide-react';
import { api } from '../lib/api';
import { Badge } from '../components/Badge';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';
import { Tabs } from '../components/Tabs';
import { StatusDot } from '../components/StatusDot';
import { useToast } from '../lib/ToastContext';

type ActionMode = 'auto' | 'approve' | 'manual';

interface AgentAction {
  name: string;
  mode: ActionMode;
}

function ActionModeToggle({ action, onModeChange }: { action: AgentAction; onModeChange: (name: string, mode: ActionMode) => void }) {
  const modes: { value: ActionMode; label: string; color: string; icon: React.ReactNode }[] = [
    { value: 'auto', label: 'Auto', color: 'bg-green-500', icon: <ShieldCheck className="w-3 h-3" /> },
    { value: 'approve', label: 'Approve', color: 'bg-yellow-500', icon: <Shield className="w-3 h-3" /> },
    { value: 'manual', label: 'Manual', color: 'bg-red-500', icon: <ShieldAlert className="w-3 h-3" /> },
  ];

  return (
    <div className="flex items-center gap-3 px-2.5 py-2 rounded-md border border-fuega-border/50 hover:border-fuega-border transition-colors">
      <span className="text-[12px] font-medium text-fuega-text-primary flex-1">{action.name.replace(/_/g, ' ')}</span>
      <div className="flex bg-fuega-input border border-fuega-border rounded-lg overflow-hidden">
        {modes.map(m => (
          <button
            key={m.value}
            onClick={() => onModeChange(action.name, m.value)}
            className={`flex items-center gap-1 px-2 py-1 text-[10px] font-medium transition-colors ${
              action.mode === m.value
                ? `${m.color} text-white`
                : 'text-fuega-text-muted hover:text-fuega-text-secondary'
            }`}
            title={m.label}
          >
            {m.icon}
            {m.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function AgentDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [agent, setAgent] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [definitions, setDefinitions] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [chatMessages, setChatMessages] = useState<{ id: number; role: string; content: string; cost?: number }[]>([]);
  const nextIdRef = useRef(0);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [promptExpanded, setPromptExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  const [actionRunning, setActionRunning] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<any>(null);
  const [hitlActions, setHitlActions] = useState<AgentAction[]>([]);
  const [hitlLoading, setHitlLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  // Fetch HITL actions for this agent
  const fetchHitlActions = useCallback(async () => {
    if (!slug) return;
    setHitlLoading(true);
    try {
      const data = await api.agents.actions(slug);
      const mapped = (Array.isArray(data) ? data : []).map((a: any) => ({
        name: a.action_name ?? a.name,
        mode: a.mode ?? 'approve',
      }));
      setHitlActions(mapped);
    } catch {
      // API may not be available yet
    }
    setHitlLoading(false);
  }, [slug]);

  const handleActionModeChange = useCallback(async (actionName: string, mode: ActionMode) => {
    if (!slug) return;
    try {
      await api.agents.updateAction(slug, actionName, mode);
      setHitlActions(prev => prev.map(a => a.name === actionName ? { ...a, mode } : a));
      toast.success(`${actionName.replace(/_/g, ' ')} set to ${mode}`);
    } catch {
      toast.error('Failed to update action mode');
    }
  }, [slug, toast]);

  const handleExportConfig = useCallback(async () => {
    if (!slug) return;
    try {
      const data = await api.agents.exportConfig(slug);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${slug}-config.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Config exported');
    } catch {
      toast.error('Failed to export config');
    }
  }, [slug, toast]);

  const handleImportConfig = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportLoading(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await api.agents.importConfig(data);
      toast.success('Config imported successfully');
      // Refresh agent data
      if (slug) {
        const updated = await api.agents.get(slug);
        setAgent(updated);
      }
    } catch {
      toast.error('Failed to import config');
    }
    setImportLoading(false);
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [slug, toast]);

  useEffect(() => {
    if (!slug) return;
    Promise.all([
      api.agents.get(slug).catch(() => null),
      api.agents.logs(slug).catch(() => []),
      api.workflows.definitions().catch(() => null),
    ]).then(([a, l, d]) => {
      setAgent(a);
      setLogs(l);
      setDefinitions(d);
    }).finally(() => setLoading(false));
    fetchHitlActions();
  }, [slug, fetchHitlActions]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSend = async () => {
    if (!input.trim() || !slug) return;
    const message = input.trim();
    setInput('');
    const userId = nextIdRef.current++;
    setChatMessages(prev => [...prev, { id: userId, role: 'user', content: message }]);
    setSending(true);
    try {
      const res = await api.agents.chat(slug, message);
      const assistantId = nextIdRef.current++;
      setChatMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: res.response || 'Done.', cost: res.cost_usd }]);
    } catch {
      const errorId = nextIdRef.current++;
      setChatMessages(prev => [...prev, { id: errorId, role: 'assistant', content: 'Request failed. Check the backend.' }]);
    } finally {
      setSending(false);
    }
  };

  const handleRunAction = async (action: string) => {
    if (!slug) return;
    setActionRunning(action);
    setActionResult(null);
    try {
      const result = await api.workflows.runStep(slug, action);
      setActionResult(result);
    } catch {
      setActionResult({ error: 'Action failed. Check the backend.' });
      toast.error('Action failed');
    }
    setActionRunning(null);
  };

  const toggleStatus = async () => {
    if (!slug || !agent) return;
    const newStatus = agent.status === 'active' ? 'paused' : 'active';
    try {
      const updated = await api.agents.update(slug, { status: newStatus });
      setAgent((prev: any) => ({ ...prev, ...updated }));
    } catch { toast.error('Failed to update status'); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-fuega-orange border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="animate-fadeIn">
        <Link to="/agents" className="inline-flex items-center gap-1.5 text-[12px] text-fuega-text-secondary hover:text-fuega-text-primary transition-colors mb-3">
          Back
        </Link>
        <EmptyState title="Agent not found" description="This agent doesn't exist or the backend is unavailable." />
      </div>
    );
  }

  const agentActions: { action: string; workflow: string; description: string; stepId: string }[] = [];
  if (definitions) {
    for (const [, wf] of Object.entries(definitions) as [string, any][]) {
      for (const step of wf.steps || []) {
        if (step.agent === slug) {
          agentActions.push({ action: step.action, workflow: wf.name, description: step.description, stepId: step.id });
        }
      }
    }
  }

  const systemPrompt = agent.system_prompt || '';
  const budgetPct = agent.monthly_budget_usd ? Math.round(((agent.month_spend_usd || 0) / agent.monthly_budget_usd) * 100) : 0;
  const isActive = agent.status === 'active';
  const totalChatCost = chatMessages.filter(m => m.cost).reduce((s, m) => s + (m.cost || 0), 0);
  const totalLogCost = logs.reduce((s, l) => s + (l.cost_usd || 0), 0);

  const tabItems = [
    { key: 'chat', label: 'Chat', icon: <Send className="w-3 h-3" /> },
    { key: 'actions', label: 'Actions', icon: <Zap className="w-3 h-3" />, count: agentActions.length },
    { key: 'hitl', label: 'HITL Controls', icon: <Shield className="w-3 h-3" />, count: hitlActions.length },
    { key: 'logs', label: 'Logs', icon: <Activity className="w-3 h-3" />, count: logs.length },
  ];

  return (
    <div className="animate-fadeIn">
      <PageHeader
        title={agent.name}
        breadcrumbs={[{ label: 'Agents', href: '/agents' }, { label: agent.name }]}
        status={
          <div className="flex items-center gap-2">
            <Badge variant={agent.status} />
            <button
              onClick={toggleStatus}
              role="switch"
              aria-checked={isActive}
              className={`relative w-8 h-4 rounded-full transition-colors ${isActive ? 'bg-green-500' : 'bg-fuega-border'}`}
              title={isActive ? 'Pause agent' : 'Activate agent'}
            >
              <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${isActive ? 'left-[16px]' : 'left-0.5'}`} />
            </button>
          </div>
        }
        subtitle={`${agent.role} · ${agent.model}`}
        action={
          <div className="hidden md:flex items-center gap-4">
            <button
              onClick={handleExportConfig}
              className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium bg-fuega-input border border-fuega-border text-fuega-text-secondary hover:border-fuega-orange/50 hover:text-fuega-orange transition-colors"
              title="Export agent config as JSON"
            >
              <Download className="w-3 h-3" />
              Export
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importLoading}
              className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium bg-fuega-input border border-fuega-border text-fuega-text-secondary hover:border-fuega-orange/50 hover:text-fuega-orange transition-colors disabled:opacity-50"
              title="Import agent config from JSON"
            >
              <Upload className="w-3 h-3" />
              Import
            </button>
            <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImportConfig} />
            <div className="text-right">
              <p className="text-[10px] text-fuega-text-muted uppercase">Spend</p>
              <p className="text-[13px] num font-bold text-fuega-text-primary">${(agent.month_spend_usd || 0).toFixed(3)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-fuega-text-muted uppercase">Budget</p>
              <p className="text-[13px] num text-fuega-text-primary">${agent.monthly_budget_usd || 0}/mo</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-fuega-text-muted uppercase">Calls</p>
              <p className="text-[13px] num text-fuega-text-primary">{agent.total_calls || 0}</p>
            </div>
            <div className="w-20">
              <div className="flex items-center justify-between text-[10px] text-fuega-text-muted mb-0.5">
                <span>Usage</span><span>{budgetPct}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-fuega-surface overflow-hidden">
                <div className={`h-full rounded-full ${budgetPct > 80 ? 'bg-red-500' : 'bg-fuega-orange'}`} style={{ width: `${Math.min(budgetPct, 100)}%` }} />
              </div>
            </div>
          </div>
        }
      />

      {/* Profile Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
        <div className="bg-fuega-card border border-fuega-border rounded-lg p-2.5">
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-fuega-text-muted mb-1.5 flex items-center gap-1">
            <Cpu className="w-3 h-3" /> Model & Tools
          </h4>
          <p className="text-[11px] text-fuega-text-primary num mb-1">{agent.model}</p>
          {agent.tools?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {agent.tools.map((tool: string) => (
                <span key={tool} className="text-[9px] px-1.5 py-0.5 rounded bg-fuega-input text-fuega-text-secondary border border-fuega-border">
                  <Wrench className="w-2 h-2 inline mr-0.5" />{tool}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="bg-fuega-card border border-fuega-border rounded-lg p-2.5">
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-fuega-text-muted mb-1.5 flex items-center gap-1">
            <ArrowDownToLine className="w-3 h-3" /> Inputs
          </h4>
          {agent.inputs?.length > 0 ? (
            <ul className="space-y-0.5">
              {agent.inputs.map((item: string, i: number) => (
                <li key={i} className="text-[10px] text-fuega-text-secondary leading-tight">- {item}</li>
              ))}
            </ul>
          ) : <p className="text-[10px] text-fuega-text-muted">None specified</p>}
        </div>
        <div className="bg-fuega-card border border-fuega-border rounded-lg p-2.5">
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-fuega-text-muted mb-1.5 flex items-center gap-1">
            <ArrowUpFromLine className="w-3 h-3" /> Outputs
          </h4>
          {agent.outputs?.length > 0 ? (
            <ul className="space-y-0.5">
              {agent.outputs.map((item: string, i: number) => (
                <li key={i} className="text-[10px] text-fuega-text-secondary leading-tight">- {item}</li>
              ))}
            </ul>
          ) : <p className="text-[10px] text-fuega-text-muted">None specified</p>}
        </div>
        <div className="bg-fuega-card border border-fuega-border rounded-lg p-2.5">
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-fuega-text-muted mb-1.5 flex items-center gap-1">
            <Activity className="w-3 h-3" /> Performance
          </h4>
          <div className="space-y-1">
            <div className="flex justify-between text-[10px]"><span className="text-fuega-text-muted">Success</span><span className="text-fuega-text-primary">{agent.success_rate != null ? `${agent.success_rate}%` : 'N/A'}</span></div>
            <div className="flex justify-between text-[10px]"><span className="text-fuega-text-muted">Calls</span><span className="text-fuega-text-primary num">{agent.total_calls || 0}</span></div>
            <div className="flex justify-between text-[10px]"><span className="text-fuega-text-muted">Spend</span><span className="text-fuega-text-primary num">${(agent.month_spend_usd || 0).toFixed(4)}</span></div>
            <div className="flex justify-between text-[10px]"><span className="text-fuega-text-muted">Budget</span><span className="text-fuega-text-primary num">${agent.monthly_budget_usd || 0}/mo</span></div>
          </div>
        </div>
      </div>

      {/* System Prompt (collapsed) */}
      {systemPrompt && (
        <div className="mb-3">
          <button
            onClick={() => setPromptExpanded(!promptExpanded)}
            className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-fuega-text-muted hover:text-fuega-text-primary transition-colors"
          >
            System Prompt
            {promptExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          {promptExpanded && (
            <pre className="mt-1.5 text-[11px] text-fuega-text-secondary whitespace-pre-wrap font-mono bg-fuega-card border border-fuega-border rounded-lg p-3 max-h-48 overflow-y-auto animate-slideDown">
              {systemPrompt}
            </pre>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="mb-3">
        <Tabs tabs={tabItems} active={activeTab} onChange={setActiveTab} />
      </div>

      {/* Chat Tab */}
      {activeTab === 'chat' && (
        <div className="bg-fuega-card border border-fuega-border rounded-lg flex flex-col" style={{ height: 'calc(100vh - 380px)', minHeight: '300px' }}>
          <div className="px-3 py-2 border-b border-fuega-border flex items-center justify-between">
            <h3 className="text-[11px] uppercase tracking-wider font-mono font-semibold text-fuega-text-primary">Direct Chat</h3>
            <div className="flex items-center gap-3">
              {totalChatCost > 0 && <span className="text-[10px] text-fuega-text-muted num">Session: ${totalChatCost.toFixed(4)}</span>}
              {chatMessages.length > 0 && (
                <button onClick={() => setChatMessages([])} className="text-[10px] text-fuega-text-muted hover:text-fuega-text-primary">Clear</button>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {chatMessages.length === 0 && (
              <div className="flex items-center justify-center h-full text-fuega-text-muted text-[11px]">
                Send a message to chat with {agent.name}
              </div>
            )}
            {chatMessages.map((msg) => (
              <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-slideUp`}>
                {msg.role === 'assistant' && (
                  <div className="p-1 rounded bg-fuega-orange/10 text-fuega-orange h-fit"><Bot className="w-3.5 h-3.5" /></div>
                )}
                <div className={`max-w-[80%] px-2.5 py-1.5 rounded-lg text-[12px] ${
                  msg.role === 'user' ? 'bg-fuega-orange text-white' : 'bg-fuega-card-hover text-fuega-text-secondary'
                }`}>
                  {msg.content}
                  {msg.cost != null && msg.cost > 0 && <span className="block text-[9px] mt-0.5 opacity-60 num">${msg.cost.toFixed(4)}</span>}
                </div>
                {msg.role === 'user' && (
                  <div className="p-1 rounded bg-fuega-card-hover text-fuega-text-secondary h-fit"><User className="w-3.5 h-3.5" /></div>
                )}
              </div>
            ))}
            {sending && (
              <div className="flex gap-2 justify-start">
                <div className="p-1 rounded bg-fuega-orange/10 text-fuega-orange h-fit"><Bot className="w-3.5 h-3.5" /></div>
                <div className="px-2.5 py-1.5 rounded-lg bg-fuega-card-hover">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-fuega-text-muted animate-pulse" />
                    <div className="w-1.5 h-1.5 rounded-full bg-fuega-text-muted animate-pulse" style={{ animationDelay: '0.2s' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-fuega-text-muted animate-pulse" style={{ animationDelay: '0.4s' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          <div className="p-2 border-t border-fuega-border">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder={`Ask ${agent.name}...`}
                className="flex-1 bg-fuega-input border border-fuega-border rounded-lg px-2.5 py-1.5 text-[12px] text-fuega-text-primary placeholder-fuega-text-muted focus:outline-none focus:border-fuega-orange/50"
              />
              <button onClick={handleSend} disabled={sending || !input.trim()} aria-label="Send" className="px-2.5 py-1.5 bg-fuega-orange text-white rounded-lg hover:bg-fuega-orange/90 disabled:opacity-50 transition-colors">
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Actions Tab */}
      {activeTab === 'actions' && (
        <div className="bg-fuega-card border border-fuega-border rounded-lg overflow-hidden">
          <div className="px-3 py-2 border-b border-fuega-border">
            <h3 className="text-[11px] uppercase tracking-wider font-mono font-semibold text-fuega-text-primary">Available Actions for {agent.name}</h3>
            <p className="text-[10px] text-fuega-text-muted mt-0.5">Run individual workflow steps. Each fires a single API call to this agent.</p>
          </div>
          {agentActions.length === 0 ? (
            <EmptyState title="No workflow actions mapped" />
          ) : (
            <div className="p-2 space-y-1.5">
              {agentActions.map(act => {
                const isRunning = actionRunning === act.action;
                return (
                  <div key={act.stepId} className="flex items-center gap-3 px-2.5 py-2 rounded-md border border-fuega-border/50 hover:border-fuega-border transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] font-medium text-fuega-text-primary">{act.stepId.replace(/_/g, ' ')}</span>
                        <Badge variant="pending" label={act.workflow} />
                      </div>
                      <p className="text-[10px] text-fuega-text-muted mt-0.5">{act.description}</p>
                    </div>
                    <button
                      onClick={() => handleRunAction(act.action)}
                      disabled={!!actionRunning}
                      className="flex items-center gap-1 bg-fuega-input border border-fuega-border hover:border-fuega-orange/50 text-fuega-text-secondary hover:text-fuega-orange px-2 py-1 rounded text-[11px] font-medium transition-all disabled:opacity-50 flex-shrink-0"
                    >
                      {isRunning ? <div className="w-3 h-3 border-2 border-fuega-orange border-t-transparent rounded-full animate-spin" /> : <Play className="w-3 h-3" />}
                      {isRunning ? 'Running...' : 'Run'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {actionResult && (
            <div className="mx-2 mb-2 bg-fuega-input border border-fuega-border rounded-lg p-2.5 animate-slideUp">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold text-fuega-text-primary">Result</span>
                <div className="flex items-center gap-2 text-[10px] text-fuega-text-muted num">
                  {actionResult.cost_usd != null && <span><DollarSign className="w-2.5 h-2.5 inline" />${actionResult.cost_usd?.toFixed(4)}</span>}
                  {actionResult.duration_ms != null && <span>{actionResult.duration_ms}ms</span>}
                </div>
              </div>
              <pre className="text-[11px] text-fuega-text-secondary whitespace-pre-wrap font-mono max-h-48 overflow-y-auto">
                {actionResult.error || (actionResult.parsed ? JSON.stringify(actionResult.parsed, null, 2) : actionResult.response)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* HITL Controls Tab */}
      {activeTab === 'hitl' && (
        <div className="bg-fuega-card border border-fuega-border rounded-lg overflow-hidden">
          <div className="px-3 py-2 border-b border-fuega-border">
            <h3 className="text-[11px] uppercase tracking-wider font-mono font-semibold text-fuega-text-primary">Human-in-the-Loop Controls</h3>
            <p className="text-[10px] text-fuega-text-muted mt-0.5">
              Configure which actions require human approval before execution.
              <span className="ml-2 inline-flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-sm bg-green-500" /> Auto</span>
              <span className="ml-2 inline-flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-sm bg-yellow-500" /> Approve</span>
              <span className="ml-2 inline-flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-sm bg-red-500" /> Manual</span>
            </p>
          </div>
          {hitlLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 border-2 border-fuega-orange border-t-transparent rounded-full animate-spin" />
            </div>
          ) : hitlActions.length === 0 ? (
            <EmptyState title="No actions configured" description="Agent actions will appear here once the backend provides them." />
          ) : (
            <div className="p-2 space-y-1.5">
              {hitlActions.map(action => (
                <ActionModeToggle
                  key={action.name}
                  action={action}
                  onModeChange={handleActionModeChange}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Logs Tab */}
      {activeTab === 'logs' && (
        <div className="bg-fuega-card border border-fuega-border rounded-lg overflow-hidden">
          <div className="px-3 py-2 border-b border-fuega-border flex items-center justify-between">
            <h3 className="text-[11px] uppercase tracking-wider font-mono font-semibold text-fuega-text-primary">Activity Log ({logs.length})</h3>
            {totalLogCost > 0 && <span className="text-[10px] text-fuega-text-muted num">Total: ${totalLogCost.toFixed(4)}</span>}
          </div>
          {logs.length === 0 ? (
            <EmptyState title="No activity yet" />
          ) : (
            <div className="max-h-[420px] overflow-y-auto">
              {logs.map(log => (
                <div key={log.id} className="flex items-center gap-3 px-3 py-2 border-b border-fuega-border/30 hover:bg-fuega-card-hover transition-colors">
                  <StatusDot status="active" size="sm" />
                  <span className="text-[11px] text-fuega-text-primary flex-1 truncate">{log.action || log.output_summary || 'Action'}</span>
                  <span className="text-[10px] text-fuega-text-muted num">{log.duration_ms != null ? `${log.duration_ms}ms` : ''}</span>
                  <span className="text-[10px] text-fuega-text-muted num">${log.cost_usd?.toFixed(4) ?? '0.0000'}</span>
                  <span className="text-[10px] text-fuega-text-muted">{log.created_at ? new Date(log.created_at).toLocaleTimeString() : ''}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
