// @refresh reset
import { useEffect, useState, useMemo } from 'react';
import { GitBranch, Play, CheckCircle, XCircle, Clock, AlertTriangle, ChevronDown, ChevronRight, ThumbsUp, ThumbsDown, Zap, Bot, Info } from 'lucide-react';
import { api } from '../lib/api';
import { PageHeader } from '../components/PageHeader';
import { Badge } from '../components/Badge';
import { ChartCard } from '../components/ChartCard';
import { StatCard } from '../components/StatCard';
import { EmptyState } from '../components/EmptyState';
import { Tabs } from '../components/Tabs';
import { useToast } from '../lib/ToastContext';
import { useWebSocket } from '../lib/useWebSocket';

const WORKFLOW_ICONS: Record<string, string> = {
  content_pipeline: '\u{1F4DD}',
  seo_pipeline: '\u{1F50D}',
  ads_pipeline: '\u{1F4E2}',
  email_pipeline: '\u{1F4E7}',
  onboarding_pipeline: '\u{1F91D}',
  reporting_pipeline: '\u{1F4CA}',
  outreach_pipeline: '\u{1F4E1}',
};

const stepStatusIcon: Record<string, React.ReactNode> = {
  completed: <CheckCircle className="w-3.5 h-3.5 text-green-400" />,
  running: <div className="w-3.5 h-3.5 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />,
  pending: <Clock className="w-3.5 h-3.5 text-chispa-text-muted" />,
  failed: <XCircle className="w-3.5 h-3.5 text-red-400" />,
  awaiting_approval: <AlertTriangle className="w-3.5 h-3.5 text-chispa-orange" />,
};

function modelShort(model: string): string {
  if (model?.includes('sonnet')) return 'Sonnet';
  if (model?.includes('haiku')) return 'Haiku';
  if (model?.includes('opus')) return 'Opus';
  return model || '';
}

export default function Workflows() {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [definitions, setDefinitions] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedRun, setExpandedRun] = useState<number | null>(null);
  const [expandedDef, setExpandedDef] = useState<string | null>(null);
  const [triggerLoading, setTriggerLoading] = useState(false);
  const [stepRunning, setStepRunning] = useState<string | null>(null);
  const [stepResult, setStepResult] = useState<any>(null);
  const [tab, setTab] = useState('pipelines');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>('all');
  const toast = useToast();
  const { events } = useWebSocket();

  useEffect(() => {
    Promise.all([
      api.workflows.list().catch(() => []),
      api.workflows.definitions().catch(() => null),
    ]).then(([wf, defs]) => {
      setWorkflows(wf);
      setDefinitions(defs);
    })
    .catch(() => toast.error('Failed to load workflows.'))
    .finally(() => setLoading(false));
  }, []);

  // Wire WebSocket for live run status
  useEffect(() => {
    if (events.length > 0) {
      const latest = events[0];
      if (latest.event === 'workflow_update') {
        api.workflows.list().then(setWorkflows).catch(() => {});
      }
    }
  }, [events]);

  // ALL hooks must be above this line — React requires consistent hook count across renders
  const filteredWorkflows = useMemo(() => {
    if (historyStatusFilter === 'all') return workflows;
    return workflows.filter(w => w.status === historyStatusFilter);
  }, [workflows, historyStatusFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-chispa-orange border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const completed = workflows.filter(w => w.status === 'completed').length;
  const running = workflows.filter(w => w.status === 'running').length;
  const approvals = workflows.filter(w => w.status === 'paused_for_approval').length;
  const totalCost = workflows.reduce((s, w) => s + (w.steps?.reduce((ss: number, st: any) => ss + (st.cost_usd || 0), 0) || 0), 0);

  const handleTrigger = async (name: string) => {
    setTriggerLoading(true);
    const pipelineName = definitions?.[name]?.name || name;
    try {
      const result = await api.workflows.trigger(name);
      const updated = await api.workflows.list();
      setWorkflows(updated);
    } catch (err) {
      toast.error(`Failed to trigger "${pipelineName}" — Is the backend running? Check agent registration.`);
    }
    setTriggerLoading(false);
  };

  const handleRunStep = async (agentSlug: string, action: string) => {
    const stepKey = `${agentSlug}:${action}`;
    setStepRunning(stepKey);
    setStepResult(null);
    const agentLabel = agentSlug.replace(/_/g, ' ');
    const actionLabel = action.replace(/_/g, ' ');
    const startTime = Date.now();
    try {
      const result = await api.workflows.runStep(agentSlug, action);
      const duration = Date.now() - startTime;
      setStepResult(result);
    } catch (err) {
      const duration = Date.now() - startTime;
      toast.error(`Step FAILED: ${actionLabel} via ${agentLabel} — ${duration}ms elapsed. Check backend logs.`);
    }
    setStepRunning(null);
  };

  const handleApproval = async (runId: number, stepId: string, approved: boolean) => {
    const action = approved ? 'Approving' : 'Rejecting';
    try {
      await api.workflows.approve(runId, stepId, approved);
      setWorkflows(prev => prev.map(w => w.id === runId ? { ...w, status: approved ? 'running' : 'cancelled' } : w));
    } catch {
      toast.error(`Failed to ${action.toLowerCase()} step on run #${runId}. Backend may be down.`);
    }
  };

  const handleExpand = async (runId: number) => {
    if (expandedRun === runId) { setExpandedRun(null); return; }
    setExpandedRun(runId);
    const wf = workflows.find(w => w.id === runId);
    if (wf && (!wf.steps || wf.steps.length === 0)) {
      try {
        const full = await api.workflows.get(runId);
        setWorkflows(prev => prev.map(w => w.id === runId ? { ...w, steps: full.steps } : w));
      } catch {
        toast.error(`Could not load step details for run #${runId}`);
      }
    }
  };

  const tabItems = [
    { key: 'pipelines', label: 'Full Pipelines' },
    { key: 'steps', label: 'Individual Steps' },
    { key: 'history', label: 'Run History', count: workflows.length },
  ];

  return (
    <div className="animate-fadeIn">
      <PageHeader
        title="Workflows"
        subtitle="Pipeline execution and manual controls"
        tabs={<Tabs tabs={tabItems} active={tab} onChange={setTab} />}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
        <StatCard label="Completed" value={completed} icon={<CheckCircle className="w-4 h-4" />} color="teal" />
        <StatCard label="Running" value={running} icon={<Play className="w-4 h-4" />} color="indigo" />
        <StatCard label="Needs Approval" value={approvals} icon={<AlertTriangle className="w-4 h-4" />} color="orange" />
        <StatCard label="Total Cost" value={`$${totalCost.toFixed(3)}`} icon={<GitBranch className="w-4 h-4" />} color="pink" />
      </div>

      {/* Approval Queue — shows what the agents produced so you know what you're approving */}
      {approvals > 0 && (
        <div className="mb-3 bg-chispa-orange/5 border-l-2 border-chispa-orange rounded-r-lg p-3">
          <h3 className="text-[12px] font-semibold text-chispa-orange flex items-center gap-2 mb-2">
            <AlertTriangle className="w-3.5 h-3.5" /> Pending Approvals ({approvals})
          </h3>
          {workflows.filter(w => w.status === 'paused_for_approval').map(wf => {
            // Extract completed step outputs so we can show what was produced
            const completedSteps = (wf.steps || []).filter((s: any) => s.status === 'completed' && s.output_data);
            const lastOutput = completedSteps.length > 0 ? completedSteps[completedSteps.length - 1] : null;

            // Try to extract human-readable summaries from step outputs
            const summaryItems: { label: string; content: string }[] = [];
            for (const step of completedSteps) {
              const data = step.output_data;
              if (!data) continue;
              const action = step.action || step.step_id;

              // Outreach messages
              if (data.outreach_messages) {
                for (const msg of data.outreach_messages) {
                  summaryItems.push({
                    label: `${msg.business_name || 'Lead'} — ${msg.channel || 'outreach'}`,
                    content: msg.subject ? `Subject: ${msg.subject}\n${msg.message}` : msg.message || '',
                  });
                }
              }
              // Reviews
              else if (data.reviews) {
                for (const rev of data.reviews) {
                  summaryItems.push({
                    label: `Review: ${rev.business_name || 'Lead'} — ${rev.decision || 'pending'}`,
                    content: `Score: ${rev.score}/10 · ${rev.feedback || ''}${rev.revised_message ? `\n\nRevised:\n${rev.revised_message}` : ''}`,
                  });
                }
              }
              // Compliance
              else if (data.compliance_results) {
                for (const cr of data.compliance_results) {
                  summaryItems.push({
                    label: `Compliance: ${cr.business_name || 'Lead'} — ${cr.status}`,
                    content: cr.issues?.length ? `Issues: ${cr.issues.join(', ')}` : 'No issues found',
                  });
                }
              }
              // Qualified leads
              else if (data.qualified_leads) {
                summaryItems.push({
                  label: `${data.qualified_leads.length} leads scored`,
                  content: data.qualified_leads.map((l: any) => `${l.business_name}: ${l.score}/100 ${l.qualified ? '✓' : '✗'}`).join('\n'),
                });
              }
              // Content
              else if (data.content) {
                summaryItems.push({
                  label: `Content: ${data.content.title || action}`,
                  content: data.content.body?.slice(0, 300) || JSON.stringify(data.content).slice(0, 300),
                });
              }
            }

            return (
              <div key={wf.id} className="bg-chispa-card border border-chispa-border rounded-lg mb-2 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-2.5">
                  <div>
                    <p className="text-[12px] font-medium text-chispa-text-primary">
                      {WORKFLOW_ICONS[wf.workflow_name]} {definitions?.[wf.workflow_name]?.name || wf.workflow_name}
                    </p>
                    <p className="text-[10px] text-chispa-text-muted">
                      Run #{wf.id} · Waiting at: <span className="text-chispa-orange">{wf.current_step_id?.replace(/_/g, ' ')}</span>
                      {completedSteps.length > 0 && ` · ${completedSteps.length} steps completed`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleApproval(wf.id, wf.current_step_id, true)} className="flex items-center gap-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 px-2.5 py-1.5 rounded text-[11px] font-medium transition-colors">
                      <ThumbsUp className="w-3 h-3" /> Approve & Continue
                    </button>
                    <button onClick={() => handleApproval(wf.id, wf.current_step_id, false)} className="flex items-center gap-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 px-2.5 py-1.5 rounded text-[11px] font-medium transition-colors">
                      <ThumbsDown className="w-3 h-3" /> Reject
                    </button>
                  </div>
                </div>

                {/* Show what was produced — the actual outreach messages, reviews, etc. */}
                {summaryItems.length > 0 && (
                  <div className="border-t border-chispa-border/50 p-2.5 space-y-2 max-h-64 overflow-y-auto">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-chispa-text-muted">What the agents produced:</p>
                    {summaryItems.map((item, i) => (
                      <div key={i} className="bg-chispa-surface rounded-lg p-2 border border-chispa-border/30">
                        <p className="text-[11px] font-medium text-chispa-text-primary mb-1">{item.label}</p>
                        <pre className="text-[10px] text-chispa-text-secondary whitespace-pre-wrap font-mono leading-relaxed">{item.content}</pre>
                      </div>
                    ))}
                  </div>
                )}

                {/* Fallback if no parsed summaries but steps exist */}
                {summaryItems.length === 0 && lastOutput?.output_data && (
                  <div className="border-t border-chispa-border/50 p-2.5 max-h-48 overflow-y-auto">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-chispa-text-muted mb-1">Latest step output:</p>
                    <pre className="text-[10px] text-chispa-text-secondary whitespace-pre-wrap font-mono bg-chispa-surface rounded-lg p-2 border border-chispa-border/30">
                      {JSON.stringify(lastOutput.output_data, null, 2).slice(0, 1000)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Full Pipelines Tab */}
      {tab === 'pipelines' && !definitions && (
        <EmptyState title="No pipeline definitions" description="Start the backend to load workflow definitions from config." />
      )}
      {tab === 'pipelines' && definitions && (
        <div className="space-y-3">
          {Object.entries(definitions).map(([key, wf]: [string, any]) => (
            <div key={key} className="bg-chispa-card border border-chispa-border rounded-lg overflow-hidden">
              <div className="flex items-center gap-3 px-3 py-2.5">
                <span className="text-base">{WORKFLOW_ICONS[key] || '\u2699\uFE0F'}</span>
                <div className="flex-1">
                  <p className="text-[12px] font-semibold text-chispa-text-primary">{wf.name}</p>
                  <p className="text-[10px] text-chispa-text-muted">{wf.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  {wf.schedule && <span className="text-[9px] num text-chispa-text-muted px-1.5 py-0.5 bg-chispa-input rounded">{wf.schedule}</span>}
                  <span className="text-[10px] text-chispa-text-muted">{wf.steps.length} steps</span>
                  <button
                    onClick={() => handleTrigger(key)}
                    disabled={triggerLoading}
                    className="flex items-center gap-1 bg-chispa-orange hover:bg-chispa-orange/80 text-white px-2.5 py-1 rounded text-[11px] font-medium transition-colors disabled:opacity-50"
                  >
                    <Play className="w-3 h-3" /> Run All
                  </button>
                  <button
                    onClick={() => setExpandedDef(expandedDef === key ? null : key)}
                    className="text-chispa-text-muted hover:text-chispa-text-primary transition-colors"
                  >
                    {expandedDef === key ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {expandedDef === key && (
                <div className="px-3 pb-3 border-t border-chispa-border/50 pt-2 animate-slideDown">
                  <div className="relative pl-6">
                    <div className="absolute left-[7px] top-1 bottom-1 w-0.5 bg-chispa-border" />
                    {wf.steps.map((step: any, i: number) => (
                      <div key={step.id} className="relative flex items-start gap-3 py-1.5">
                        <div className="absolute -left-6 top-2 z-10 bg-chispa-card">
                          <div className="w-4 h-4 rounded-full border-2 border-chispa-border bg-chispa-card flex items-center justify-center text-[8px] font-bold text-chispa-text-muted">
                            {i + 1}
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[12px] text-chispa-text-primary font-medium">{step.id.replace(/_/g, ' ')}</span>
                            {step.agent && (
                              <Badge variant="active" label={step.agent_name} />
                            )}
                            {step.model && <Badge variant="running" label={modelShort(step.model)} />}
                            {step.requires_approval && <Badge variant="paused_for_approval" label="approval" />}
                          </div>
                          <p className="text-[10px] text-chispa-text-muted mt-0.5">{step.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Individual Steps Tab */}
      {tab === 'steps' && !definitions && (
        <EmptyState title="No steps available" description="Pipeline definitions must be loaded from the backend to show individual steps." />
      )}
      {tab === 'steps' && definitions && (
        <div>
          <div className="flex items-start gap-2 mb-3 bg-chispa-purple/5 border border-chispa-purple/20 rounded-lg p-2.5">
            <Info className="w-3.5 h-3.5 text-chispa-purple flex-shrink-0 mt-0.5" />
            <div className="text-[11px] text-chispa-text-secondary">
              <strong className="text-chispa-text-primary">Save tokens by running individual steps.</strong> Each button fires a single agent action. Haiku steps cost ~$0.001-0.003, Sonnet ~$0.005-0.015.
            </div>
          </div>

          <div className="space-y-3">
            {Object.entries(definitions).map(([key, wf]: [string, any]) => (
              <div key={key}>
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-chispa-text-muted mb-1.5 flex items-center gap-2">
                  <span>{WORKFLOW_ICONS[key]}</span> {wf.name}
                </h3>
                <div className="bg-chispa-card border border-chispa-border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-chispa-border">
                        <th className="text-left text-[10px] font-semibold text-chispa-text-muted uppercase tracking-wider px-3 py-1.5">Step</th>
                        <th className="text-left text-[10px] font-semibold text-chispa-text-muted uppercase tracking-wider px-3 py-1.5">Agent</th>
                        <th className="text-left text-[10px] font-semibold text-chispa-text-muted uppercase tracking-wider px-3 py-1.5">Model</th>
                        <th className="px-3 py-1.5 w-20"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {wf.steps.filter((s: any) => s.agent).map((step: any) => {
                        const stepKey = `${step.agent}:${step.action}`;
                        const isRunning = stepRunning === stepKey;
                        return (
                          <tr key={step.id} className="border-b border-chispa-border/30 hover:bg-chispa-card-hover transition-colors">
                            <td className="px-3 py-1.5">
                              <p className="text-[12px] font-medium text-chispa-text-primary">{step.id.replace(/_/g, ' ')}</p>
                              <p className="text-[10px] text-chispa-text-muted">{step.description}</p>
                            </td>
                            <td className="px-3 py-1.5">
                              <span className="flex items-center gap-1 text-[10px] text-chispa-orange">
                                <Bot className="w-2.5 h-2.5" /> {step.agent_name}
                              </span>
                            </td>
                            <td className="px-3 py-1.5">
                              {step.model && <span className="text-[10px] text-chispa-purple">{modelShort(step.model)}</span>}
                            </td>
                            <td className="px-3 py-1.5">
                              <button
                                onClick={() => handleRunStep(step.agent, step.action)}
                                disabled={!!stepRunning}
                                className="flex items-center gap-1 bg-chispa-input border border-chispa-border hover:border-chispa-orange/50 text-chispa-text-secondary hover:text-chispa-orange px-2 py-1 rounded text-[11px] font-medium transition-all disabled:opacity-50"
                              >
                                {isRunning ? <div className="w-3 h-3 border-2 border-chispa-orange border-t-transparent rounded-full animate-spin" /> : <Zap className="w-3 h-3" />}
                                {isRunning ? 'Running...' : 'Run'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>

          {stepResult && (
            <div className="mt-3 bg-chispa-card border border-chispa-border rounded-lg p-3 animate-slideUp">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[12px] font-semibold text-chispa-text-primary">Step Result</h3>
                <div className="flex items-center gap-3 text-[10px] text-chispa-text-muted num">
                  <span>Cost: ${stepResult.cost_usd?.toFixed(4) || '0'}</span>
                  <span>{stepResult.duration_ms || 0}ms</span>
                  <button onClick={() => setStepResult(null)} className="hover:text-chispa-text-primary">dismiss</button>
                </div>
              </div>
              <pre className="text-[11px] text-chispa-text-secondary whitespace-pre-wrap font-mono bg-chispa-input rounded-lg p-2.5 border border-chispa-border max-h-48 overflow-y-auto">
                {stepResult.parsed ? JSON.stringify(stepResult.parsed, null, 2) : stepResult.response}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Run History Tab */}
      {tab === 'history' && (
        <>
          <div className="flex items-center gap-2 mb-3">
            <select
              value={historyStatusFilter}
              onChange={e => setHistoryStatusFilter(e.target.value)}
              className="bg-chispa-input border border-chispa-border rounded-lg px-2.5 py-1.5 text-[12px] text-chispa-text-secondary focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="running">Running</option>
              <option value="failed">Failed</option>
              <option value="paused_for_approval">Paused for Approval</option>
            </select>
            {historyStatusFilter !== 'all' && (
              <span className="text-[11px] text-chispa-text-muted">{filteredWorkflows.length} result{filteredWorkflows.length !== 1 ? 's' : ''}</span>
            )}
          </div>
          <ChartCard title="Run History" subtitle={`${filteredWorkflows.length} of ${workflows.length} runs`}>
          {filteredWorkflows.length === 0 ? (
            <EmptyState title={historyStatusFilter === 'all' ? 'No workflow runs yet' : `No ${historyStatusFilter.replace(/_/g, ' ')} runs`} description={historyStatusFilter === 'all' ? 'Trigger a workflow above or wait for the scheduler to run one.' : 'Try selecting a different status filter.'} />
          ) : (
            <div className="space-y-1.5">
              {filteredWorkflows.map(wf => {
                const isExpanded = expandedRun === wf.id;
                const runCost = wf.steps?.reduce((s: number, st: any) => s + (st.cost_usd || 0), 0) || 0;
                return (
                  <div key={wf.id} className="border border-chispa-border rounded-lg overflow-hidden">
                    <button
                      onClick={() => handleExpand(wf.id)}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-chispa-card-hover transition-colors"
                    >
                      {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-chispa-text-muted" /> : <ChevronRight className="w-3.5 h-3.5 text-chispa-text-muted" />}
                      <span className="text-base">{WORKFLOW_ICONS[wf.workflow_name] || '\u2699\uFE0F'}</span>
                      <div className="flex-1 text-left">
                        <span className="text-[12px] font-medium text-chispa-text-primary">{definitions?.[wf.workflow_name]?.name || wf.workflow_name}</span>
                        <span className="text-[10px] text-chispa-text-muted ml-2">#{wf.id}</span>
                      </div>
                      <span className="text-[10px] text-chispa-text-muted num">${runCost.toFixed(3)}</span>
                      <Badge variant={wf.status} />
                      <span className="text-[10px] text-chispa-text-muted">
                        {wf.started_at ? new Date(wf.started_at).toLocaleString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </button>

                    {isExpanded && wf.steps && (
                      <div className="px-3 pb-3 pt-1 border-t border-chispa-border/50 animate-slideDown">
                        <div className="relative pl-6">
                          <div className="absolute left-[7px] top-1 bottom-1 w-0.5 bg-chispa-border" />
                          {wf.steps.map((step: any) => (
                            <div key={step.step_id} className="relative flex items-start gap-2 py-1.5">
                              <div className="absolute -left-6 top-2 z-10 bg-chispa-card">
                                {stepStatusIcon[step.status] || stepStatusIcon.pending}
                              </div>
                              <div className="flex-1 ml-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-[12px] text-chispa-text-primary font-medium">{(step.step_id || 'unknown').replace(/_/g, ' ')}</span>
                                  {step.agent_slug && <span className="text-[10px] text-chispa-text-muted">({step.agent_slug.replace(/_/g, ' ')})</span>}
                                </div>
                                {(step.cost_usd > 0 || step.duration_ms > 0) && (
                                  <p className="text-[10px] text-chispa-text-muted mt-0.5 num">
                                    {step.duration_ms}ms · ${step.cost_usd.toFixed(4)}
                                    {step.retry_count > 0 && <span className="text-yellow-400"> · {step.retry_count} retries</span>}
                                  </p>
                                )}
                              </div>
                              <Badge variant={step.status} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ChartCard>
        </>
      )}
    </div>
  );
}
