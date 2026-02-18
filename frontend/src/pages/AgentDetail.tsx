import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Send, Bot, User, ChevronDown, ChevronUp, Cpu, Wrench, ArrowDownToLine, ArrowUpFromLine, Zap, Play, DollarSign, Activity } from 'lucide-react';
import { api } from '../lib/api';
import { Badge } from '../components/Badge';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';
import { Tabs } from '../components/Tabs';
import { StatusDot } from '../components/StatusDot';
import { useToast } from '../lib/ToastContext';

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
  const chatEndRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

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
  }, [slug]);

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
        <div className="w-6 h-6 border-2 border-chispa-orange border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="animate-fadeIn">
        <Link to="/agents" className="inline-flex items-center gap-1.5 text-[12px] text-chispa-text-secondary hover:text-chispa-text-primary transition-colors mb-3">
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
              className={`relative w-8 h-4 rounded-full transition-colors ${isActive ? 'bg-green-500' : 'bg-chispa-border'}`}
              title={isActive ? 'Pause agent' : 'Activate agent'}
            >
              <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${isActive ? 'left-[16px]' : 'left-0.5'}`} />
            </button>
          </div>
        }
        subtitle={`${agent.role} · ${agent.model}`}
        action={
          <div className="hidden md:flex items-center gap-4">
            <div className="text-right">
              <p className="text-[10px] text-chispa-text-muted uppercase">Spend</p>
              <p className="text-[13px] num font-bold text-chispa-text-primary">${(agent.month_spend_usd || 0).toFixed(3)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-chispa-text-muted uppercase">Budget</p>
              <p className="text-[13px] num text-chispa-text-primary">${agent.monthly_budget_usd || 0}/mo</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-chispa-text-muted uppercase">Calls</p>
              <p className="text-[13px] num text-chispa-text-primary">{agent.total_calls || 0}</p>
            </div>
            <div className="w-20">
              <div className="flex items-center justify-between text-[10px] text-chispa-text-muted mb-0.5">
                <span>Usage</span><span>{budgetPct}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-chispa-surface overflow-hidden">
                <div className={`h-full rounded-full ${budgetPct > 80 ? 'bg-red-500' : 'bg-chispa-orange'}`} style={{ width: `${Math.min(budgetPct, 100)}%` }} />
              </div>
            </div>
          </div>
        }
      />

      {/* Profile Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
        <div className="bg-chispa-card border border-chispa-border rounded-lg p-2.5">
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-chispa-text-muted mb-1.5 flex items-center gap-1">
            <Cpu className="w-3 h-3" /> Model & Tools
          </h4>
          <p className="text-[11px] text-chispa-text-primary num mb-1">{agent.model}</p>
          {agent.tools?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {agent.tools.map((tool: string) => (
                <span key={tool} className="text-[9px] px-1.5 py-0.5 rounded bg-chispa-input text-chispa-text-secondary border border-chispa-border">
                  <Wrench className="w-2 h-2 inline mr-0.5" />{tool}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="bg-chispa-card border border-chispa-border rounded-lg p-2.5">
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-chispa-text-muted mb-1.5 flex items-center gap-1">
            <ArrowDownToLine className="w-3 h-3" /> Inputs
          </h4>
          {agent.inputs?.length > 0 ? (
            <ul className="space-y-0.5">
              {agent.inputs.map((item: string, i: number) => (
                <li key={i} className="text-[10px] text-chispa-text-secondary leading-tight">- {item}</li>
              ))}
            </ul>
          ) : <p className="text-[10px] text-chispa-text-muted">None specified</p>}
        </div>
        <div className="bg-chispa-card border border-chispa-border rounded-lg p-2.5">
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-chispa-text-muted mb-1.5 flex items-center gap-1">
            <ArrowUpFromLine className="w-3 h-3" /> Outputs
          </h4>
          {agent.outputs?.length > 0 ? (
            <ul className="space-y-0.5">
              {agent.outputs.map((item: string, i: number) => (
                <li key={i} className="text-[10px] text-chispa-text-secondary leading-tight">- {item}</li>
              ))}
            </ul>
          ) : <p className="text-[10px] text-chispa-text-muted">None specified</p>}
        </div>
        <div className="bg-chispa-card border border-chispa-border rounded-lg p-2.5">
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-chispa-text-muted mb-1.5 flex items-center gap-1">
            <Activity className="w-3 h-3" /> Performance
          </h4>
          <div className="space-y-1">
            <div className="flex justify-between text-[10px]"><span className="text-chispa-text-muted">Success</span><span className="text-chispa-text-primary">{agent.success_rate != null ? `${agent.success_rate}%` : 'N/A'}</span></div>
            <div className="flex justify-between text-[10px]"><span className="text-chispa-text-muted">Calls</span><span className="text-chispa-text-primary num">{agent.total_calls || 0}</span></div>
            <div className="flex justify-between text-[10px]"><span className="text-chispa-text-muted">Spend</span><span className="text-chispa-text-primary num">${(agent.month_spend_usd || 0).toFixed(4)}</span></div>
            <div className="flex justify-between text-[10px]"><span className="text-chispa-text-muted">Budget</span><span className="text-chispa-text-primary num">${agent.monthly_budget_usd || 0}/mo</span></div>
          </div>
        </div>
      </div>

      {/* System Prompt (collapsed) */}
      {systemPrompt && (
        <div className="mb-3">
          <button
            onClick={() => setPromptExpanded(!promptExpanded)}
            className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-chispa-text-muted hover:text-chispa-text-primary transition-colors"
          >
            System Prompt
            {promptExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          {promptExpanded && (
            <pre className="mt-1.5 text-[11px] text-chispa-text-secondary whitespace-pre-wrap font-mono bg-chispa-card border border-chispa-border rounded-lg p-3 max-h-48 overflow-y-auto animate-slideDown">
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
        <div className="bg-chispa-card border border-chispa-border rounded-lg flex flex-col" style={{ height: 'calc(100vh - 380px)', minHeight: '300px' }}>
          <div className="px-3 py-2 border-b border-chispa-border flex items-center justify-between">
            <h3 className="text-[11px] uppercase tracking-wider font-mono font-semibold text-chispa-text-primary">Direct Chat</h3>
            <div className="flex items-center gap-3">
              {totalChatCost > 0 && <span className="text-[10px] text-chispa-text-muted num">Session: ${totalChatCost.toFixed(4)}</span>}
              {chatMessages.length > 0 && (
                <button onClick={() => setChatMessages([])} className="text-[10px] text-chispa-text-muted hover:text-chispa-text-primary">Clear</button>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {chatMessages.length === 0 && (
              <div className="flex items-center justify-center h-full text-chispa-text-muted text-[11px]">
                Send a message to chat with {agent.name}
              </div>
            )}
            {chatMessages.map((msg) => (
              <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-slideUp`}>
                {msg.role === 'assistant' && (
                  <div className="p-1 rounded bg-chispa-orange/10 text-chispa-orange h-fit"><Bot className="w-3.5 h-3.5" /></div>
                )}
                <div className={`max-w-[80%] px-2.5 py-1.5 rounded-lg text-[12px] ${
                  msg.role === 'user' ? 'bg-chispa-orange text-white' : 'bg-chispa-card-hover text-chispa-text-secondary'
                }`}>
                  {msg.content}
                  {msg.cost != null && msg.cost > 0 && <span className="block text-[9px] mt-0.5 opacity-60 num">${msg.cost.toFixed(4)}</span>}
                </div>
                {msg.role === 'user' && (
                  <div className="p-1 rounded bg-chispa-card-hover text-chispa-text-secondary h-fit"><User className="w-3.5 h-3.5" /></div>
                )}
              </div>
            ))}
            {sending && (
              <div className="flex gap-2 justify-start">
                <div className="p-1 rounded bg-chispa-orange/10 text-chispa-orange h-fit"><Bot className="w-3.5 h-3.5" /></div>
                <div className="px-2.5 py-1.5 rounded-lg bg-chispa-card-hover">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-chispa-text-muted animate-pulse" />
                    <div className="w-1.5 h-1.5 rounded-full bg-chispa-text-muted animate-pulse" style={{ animationDelay: '0.2s' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-chispa-text-muted animate-pulse" style={{ animationDelay: '0.4s' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          <div className="p-2 border-t border-chispa-border">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder={`Ask ${agent.name}...`}
                className="flex-1 bg-chispa-input border border-chispa-border rounded-lg px-2.5 py-1.5 text-[12px] text-chispa-text-primary placeholder-chispa-text-muted focus:outline-none focus:border-chispa-orange/50"
              />
              <button onClick={handleSend} disabled={sending || !input.trim()} aria-label="Send" className="px-2.5 py-1.5 bg-chispa-orange text-white rounded-lg hover:bg-chispa-orange/90 disabled:opacity-50 transition-colors">
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Actions Tab */}
      {activeTab === 'actions' && (
        <div className="bg-chispa-card border border-chispa-border rounded-lg overflow-hidden">
          <div className="px-3 py-2 border-b border-chispa-border">
            <h3 className="text-[11px] uppercase tracking-wider font-mono font-semibold text-chispa-text-primary">Available Actions for {agent.name}</h3>
            <p className="text-[10px] text-chispa-text-muted mt-0.5">Run individual workflow steps. Each fires a single API call to this agent.</p>
          </div>
          {agentActions.length === 0 ? (
            <EmptyState title="No workflow actions mapped" />
          ) : (
            <div className="p-2 space-y-1.5">
              {agentActions.map(act => {
                const isRunning = actionRunning === act.action;
                return (
                  <div key={act.stepId} className="flex items-center gap-3 px-2.5 py-2 rounded-md border border-chispa-border/50 hover:border-chispa-border transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] font-medium text-chispa-text-primary">{act.stepId.replace(/_/g, ' ')}</span>
                        <Badge variant="pending" label={act.workflow} />
                      </div>
                      <p className="text-[10px] text-chispa-text-muted mt-0.5">{act.description}</p>
                    </div>
                    <button
                      onClick={() => handleRunAction(act.action)}
                      disabled={!!actionRunning}
                      className="flex items-center gap-1 bg-chispa-input border border-chispa-border hover:border-chispa-orange/50 text-chispa-text-secondary hover:text-chispa-orange px-2 py-1 rounded text-[11px] font-medium transition-all disabled:opacity-50 flex-shrink-0"
                    >
                      {isRunning ? <div className="w-3 h-3 border-2 border-chispa-orange border-t-transparent rounded-full animate-spin" /> : <Play className="w-3 h-3" />}
                      {isRunning ? 'Running...' : 'Run'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {actionResult && (
            <div className="mx-2 mb-2 bg-chispa-input border border-chispa-border rounded-lg p-2.5 animate-slideUp">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold text-chispa-text-primary">Result</span>
                <div className="flex items-center gap-2 text-[10px] text-chispa-text-muted num">
                  {actionResult.cost_usd != null && <span><DollarSign className="w-2.5 h-2.5 inline" />${actionResult.cost_usd?.toFixed(4)}</span>}
                  {actionResult.duration_ms != null && <span>{actionResult.duration_ms}ms</span>}
                </div>
              </div>
              <pre className="text-[11px] text-chispa-text-secondary whitespace-pre-wrap font-mono max-h-48 overflow-y-auto">
                {actionResult.error || (actionResult.parsed ? JSON.stringify(actionResult.parsed, null, 2) : actionResult.response)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Logs Tab */}
      {activeTab === 'logs' && (
        <div className="bg-chispa-card border border-chispa-border rounded-lg overflow-hidden">
          <div className="px-3 py-2 border-b border-chispa-border flex items-center justify-between">
            <h3 className="text-[11px] uppercase tracking-wider font-mono font-semibold text-chispa-text-primary">Activity Log ({logs.length})</h3>
            {totalLogCost > 0 && <span className="text-[10px] text-chispa-text-muted num">Total: ${totalLogCost.toFixed(4)}</span>}
          </div>
          {logs.length === 0 ? (
            <EmptyState title="No activity yet" />
          ) : (
            <div className="max-h-[420px] overflow-y-auto">
              {logs.map(log => (
                <div key={log.id} className="flex items-center gap-3 px-3 py-2 border-b border-chispa-border/30 hover:bg-chispa-card-hover transition-colors">
                  <StatusDot status="active" size="sm" />
                  <span className="text-[11px] text-chispa-text-primary flex-1 truncate">{log.action || log.output_summary || 'Action'}</span>
                  <span className="text-[10px] text-chispa-text-muted num">{log.duration_ms != null ? `${log.duration_ms}ms` : ''}</span>
                  <span className="text-[10px] text-chispa-text-muted num">${log.cost_usd?.toFixed(4) ?? '0.0000'}</span>
                  <span className="text-[10px] text-chispa-text-muted">{log.created_at ? new Date(log.created_at).toLocaleTimeString() : ''}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
