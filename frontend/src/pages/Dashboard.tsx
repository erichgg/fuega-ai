// @refresh reset
import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Line } from 'react-chartjs-2';
import {
  DollarSign, Users, Bot, TrendingUp, Activity, Clock,
  AlertTriangle, ThumbsUp, ThumbsDown, Joystick, Target,
} from 'lucide-react';
import { api } from '../lib/api';
import { defaultChartOptions } from '../lib/chartConfig';
import { StatCard } from '../components/StatCard';
import { ChartCard } from '../components/ChartCard';
import { PageHeader } from '../components/PageHeader';
import { StatusDot } from '../components/StatusDot';
import { useWebSocket } from '../lib/useWebSocket';
import { useToast } from '../lib/ToastContext';
import { EmptyState } from '../components/EmptyState';


export default function Dashboard() {
  const toast = useToast();
  const [kpis, setKpis] = useState<any>(null);
  const [activity, setActivity] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [revenueChart, setRevenueChart] = useState<any>(null);
  const [costChart, setCostChart] = useState<any>(null);
  const [leadsCount, setLeadsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { events } = useWebSocket();

  const activeAgents = useMemo(() => agents.filter(a => a.status === 'active'), [agents]);
  const pausedAgents = useMemo(() => agents.filter(a => a.status === 'paused'), [agents]);
  const overBudget = useMemo(() => agents.filter(a => a.budget_usage_pct > 80), [agents]);
  const totalBudget = useMemo(() => agents.reduce((s, a) => s + (a.monthly_budget_usd || 0), 0), [agents]);
  const totalSpent = useMemo(() => agents.reduce((s, a) => s + (a.month_spend_usd || 0), 0), [agents]);

  useEffect(() => {
    Promise.all([
      api.dashboard.kpis().catch(() => null),
      api.dashboard.activity(15).catch(() => []),
      api.agents.list().catch(() => []),
      api.workflows.pendingApprovals().catch(() => []),
      api.dashboard.revenueChart().catch(() => null),
      api.dashboard.costChart().catch(() => null),
      api.leads.kanban().catch(() => null),
    ]).then(([k, a, ag, pa, rev, cost, leadsData]) => {
      setKpis(k);
      setActivity(a);
      setAgents(ag);
      setPendingApprovals(pa);
      setRevenueChart(rev);
      setCostChart(cost);
      if (leadsData) setLeadsCount(leadsData.total || 0);
    }).finally(() => setLoading(false));
  }, []);

  // Wire WebSocket events into activity feed
  useEffect(() => {
    if (events.length > 0) {
      const latest = events[0];
      if (latest.event === 'activity' || latest.event === 'agent_action') {
        setActivity(prev => [{ ...(latest.data || latest) } as any, ...prev].slice(0, 30));
      }
    }
  }, [events]);

  const handleApproval = async (runId: number, stepId: string, approved: boolean) => {
    try {
      await api.workflows.approve(runId, stepId, approved);
      setPendingApprovals(prev => prev.filter(p => p.id !== runId));
    } catch { toast.error('Failed to process approval'); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-chispa-orange border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!kpis) {
    return (
      <div>
        <PageHeader title="Command Center" subtitle="Start the backend to populate data" />
        <div className="text-center py-12 text-chispa-text-muted text-sm animate-fadeIn">No data available. Start the backend API.</div>
      </div>
    );
  }

  const revenueChartData = revenueChart?.labels?.length ? {
    labels: revenueChart.labels,
    datasets: [{ label: 'Revenue', data: revenueChart.revenue, borderColor: '#00D4AA', backgroundColor: '#00D4AA20', fill: true, tension: 0.4, pointRadius: 2, borderWidth: 2 }],
  } : null;

  const costChartData = costChart?.labels?.length ? {
    labels: costChart.labels,
    datasets: [
      { label: 'Costs', data: costChart.costs, borderColor: '#FF6B2C', backgroundColor: '#FF6B2C15', fill: true, tension: 0.4, pointRadius: 2, borderWidth: 2 },
    ],
  } : null;

  return (
    <div className="animate-fadeIn">
      <PageHeader
        title="Command Center"
        action={
          <div className="flex items-center gap-3">
            <Link
              to="/control-panel"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-chispa-orange text-white text-[12px] font-medium hover:bg-chispa-orange/90 transition-colors"
            >
              <Joystick className="w-3.5 h-3.5" />
              Control Panel
            </Link>
            <span className="text-[11px] text-chispa-text-muted">
              <StatusDot status="active" pulse label={`${activeAgents.length}/${agents.length} active`} size="sm" />
            </span>
          </div>
        }
      />

      {/* Pending Approvals Banner */}
      {pendingApprovals.length > 0 && (
        <div className="mb-3 bg-chispa-orange/5 border-l-2 border-chispa-orange rounded-r-lg px-3 py-2 animate-slideUp">
          <div className="flex items-center gap-2 mb-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-chispa-orange" />
            <span className="text-[12px] font-semibold text-chispa-orange">{pendingApprovals.length} Pending Approval{pendingApprovals.length > 1 ? 's' : ''}</span>
          </div>
          {pendingApprovals.map(pa => (
            <div key={pa.id} className="flex items-center gap-2 py-1">
              <span className="text-[12px] text-chispa-text-primary flex-1">{pa.workflow_name?.replace(/_/g, ' ')} #{pa.id} — {pa.current_step_id?.replace(/_/g, ' ')}</span>
              <button onClick={() => handleApproval(pa.id, pa.current_step_id, true)} className="flex items-center gap-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 px-2 py-1 rounded text-[11px] font-medium transition-colors"><ThumbsUp className="w-3 h-3" /> Approve</button>
              <button onClick={() => handleApproval(pa.id, pa.current_step_id, false)} className="flex items-center gap-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 px-2 py-1 rounded text-[11px] font-medium transition-colors"><ThumbsDown className="w-3 h-3" /> Reject</button>
            </div>
          ))}
        </div>
      )}

      {/* KPIs — 6 columns tight */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-2 mb-3">
        <StatCard label="Revenue" value={`$${(kpis.revenue?.monthly_usd || 0).toLocaleString()}`} icon={<DollarSign className="w-4 h-4" />} color="teal" sparklineData={revenueChart?.revenue?.slice(-7)} />
        <StatCard label="Clients" value={kpis.clients?.total || 0} icon={<Users className="w-4 h-4" />} color="orange" />
        <StatCard label="Agents" value={`${kpis.agents?.active || 0}/${kpis.agents?.total || 0}`} icon={<Bot className="w-4 h-4" />} color="indigo" />
        <StatCard label="API Costs" value={`$${totalSpent.toFixed(2)}`} subValue={`/${totalBudget}`} icon={<TrendingUp className="w-4 h-4" />} color="pink" sparklineData={costChart?.costs?.slice(-7)} />
        <StatCard label="Profit" value={`$${(kpis.profit?.monthly_usd || 0).toFixed(0)}`} icon={<Activity className="w-4 h-4" />} color="yellow" />
        <Link to="/leads"><StatCard label="Leads" value={leadsCount} icon={<Target className="w-4 h-4" />} color="orange" /></Link>
      </div>

      {/* Fleet health summary — compact */}
      <div className="bg-chispa-card border border-chispa-border rounded-lg mb-3 overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b border-chispa-border">
          <h3 className="text-[11px] uppercase tracking-wider font-mono font-semibold text-chispa-text-primary">Agent Fleet</h3>
          <div className="flex items-center gap-4 text-[11px]">
            <StatusDot status="active" label={`${activeAgents.length} active`} size="sm" />
            <StatusDot status="paused" label={`${pausedAgents.length} paused`} size="sm" />
            {overBudget.length > 0 && <StatusDot status="error" label={`${overBudget.length} over-budget`} size="sm" />}
            <Link to="/agents" className="text-[10px] text-chispa-orange hover:underline">Manage</Link>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
          {agents.map(agent => {
            const pct = agent.monthly_budget_usd ? ((agent.month_spend_usd || 0) / agent.monthly_budget_usd) * 100 : 0;
            return (
              <Link
                key={agent.slug}
                to={`/agents/${agent.slug}`}
                className="flex items-center gap-2 px-2.5 py-2 border-r border-b border-chispa-border/50 hover:bg-chispa-card-hover transition-colors"
              >
                <StatusDot status={agent.status === 'active' ? 'active' : 'paused'} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium text-chispa-text-primary truncate">{agent.name}</p>
                  <div className="flex items-center gap-1">
                    <div className="flex-1 h-[3px] bg-chispa-surface rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: pct > 80 ? '#EF4444' : pct > 50 ? '#EAB308' : '#00D4AA' }} />
                    </div>
                    <span className="text-[9px] text-chispa-text-muted num">${(agent.month_spend_usd || 0).toFixed(2)}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-3">
        <ChartCard title="Revenue" subtitle="Monthly">
          <div className="h-40">
            {revenueChartData ? (
              <Line data={revenueChartData} options={{ ...defaultChartOptions, plugins: { ...defaultChartOptions.plugins, legend: { display: false } } } as any} />
            ) : (
              <div className="flex items-center justify-center h-full text-[11px] text-chispa-text-muted">No data</div>
            )}
          </div>
        </ChartCard>

        <ChartCard title="API Costs" subtitle="Daily">
          <div className="h-40">
            {costChartData ? (
              <Line data={costChartData} options={{ ...defaultChartOptions, plugins: { ...defaultChartOptions.plugins, legend: { display: false } } } as any} />
            ) : (
              <div className="flex items-center justify-center h-full text-[11px] text-chispa-text-muted">No data</div>
            )}
          </div>
        </ChartCard>

        <ChartCard title="Fleet" subtitle="Status">
          <div className="h-40 flex flex-col items-center justify-center gap-3">
            <div className="grid grid-cols-3 gap-4 w-full text-center">
              <div>
                <p className="text-2xl font-bold text-green-400 num">{activeAgents.length}</p>
                <p className="text-[10px] text-chispa-text-muted">Active</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-400 num">{pausedAgents.length}</p>
                <p className="text-[10px] text-chispa-text-muted">Paused</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-400 num">{overBudget.length}</p>
                <p className="text-[10px] text-chispa-text-muted">Over Budget</p>
              </div>
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Activity Feed + Budget Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <ChartCard title="Live Feed" subtitle={`${activity.length} recent`}>
          <div className="space-y-0.5 max-h-56 overflow-y-auto">
            {activity.length === 0 && <EmptyState title="No activity yet" />}
            {activity.map((item, i) => (
              <div key={item.id ?? i} className="flex items-center gap-2 py-1.5 px-1 rounded hover:bg-chispa-card-hover transition-colors">
                <StatusDot status="active" size="sm" />
                <span className="text-[11px] text-chispa-text-primary flex-1 truncate">{item.action || item.output_summary || 'Agent action'}</span>
                {item.cost_usd > 0 && <span className="text-[10px] text-chispa-text-muted num">${item.cost_usd.toFixed(4)}</span>}
                <span className="text-[10px] text-chispa-text-muted">{item.created_at ? new Date(item.created_at).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Budget Overview" subtitle={`$${totalSpent.toFixed(2)} / $${totalBudget} used`} collapsible>
          <div className="space-y-1 max-h-56 overflow-y-auto">
            {agents.map(agent => {
              const pct = agent.monthly_budget_usd ? ((agent.month_spend_usd || 0) / agent.monthly_budget_usd) * 100 : 0;
              return (
                <div key={agent.slug} className="flex items-center gap-2 py-1 px-1">
                  <span className="text-[11px] text-chispa-text-secondary w-28 truncate">{agent.name}</span>
                  <div className="flex-1 h-[5px] bg-chispa-surface rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: pct > 80 ? '#EF4444' : pct > 50 ? '#EAB308' : '#00D4AA' }} />
                  </div>
                  <span className="text-[10px] text-chispa-text-muted num w-20 text-right">${(agent.month_spend_usd || 0).toFixed(2)} / ${agent.monthly_budget_usd || 0}</span>
                </div>
              );
            })}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
