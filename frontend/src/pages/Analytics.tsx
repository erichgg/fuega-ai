import { useEffect, useState } from 'react';
import { DollarSign, TrendingUp, Zap, Bot, PhoneCall } from 'lucide-react';
import { Line, Bar } from 'react-chartjs-2';
import { api } from '../lib/api';
import { useToast } from '../lib/ToastContext';
import { PageHeader } from '../components/PageHeader';
import { ChartCard } from '../components/ChartCard';
import { StatCard } from '../components/StatCard';
import { EmptyState } from '../components/EmptyState';
import { defaultChartOptions, CHART_COLORS } from '../lib/chartConfig';

type Range = '7d' | '30d' | '90d';

export default function Analytics() {
  const [costs, setCosts] = useState<any>(null);
  const [costChart, setCostChart] = useState<any>(null);
  const [kpis, setKpis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<Range>('30d');
  const toast = useToast();

  useEffect(() => {
    setLoading(true);
    const days = range === '7d' ? 7 : range === '90d' ? 90 : 30;
    Promise.all([
      api.analytics.costs().catch(() => null),
      api.dashboard.costChart(days).catch(() => null),
      api.dashboard.kpis().catch(() => null),
    ]).then(([c, cc, k]) => {
      setCosts(c);
      setCostChart(cc);
      setKpis(k);
    }).catch(() => toast.error('Failed to load analytics. Check that the backend is running.'))
    .finally(() => setLoading(false));
  }, [range]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-chispa-orange border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!costs && !kpis) {
    return (
      <div className="animate-fadeIn">
        <PageHeader title="Analytics" subtitle="Financial performance and cost tracking" />
        <EmptyState title="No analytics data" description="Run some workflows so agents generate cost and revenue data." />
      </div>
    );
  }

  const revenue = kpis?.revenue?.monthly_usd || 0;
  const profit = kpis?.profit?.monthly_usd || 0;
  const prevRevenue = kpis?.revenue?.prev_monthly_usd || 0;
  const prevProfit = kpis?.profit?.prev_monthly_usd || 0;
  const agents = costs?.agents || [];
  const totalBudget = agents.reduce((s: number, a: any) => s + (a.monthly_budget_usd || 0), 0);
  const totalSpent = agents.reduce((s: number, a: any) => s + (a.month_spend_usd || 0), 0);
  const prevSpent = agents.reduce((s: number, a: any) => s + (a.prev_month_spend_usd || 0), 0);
  const usagePct = totalBudget > 0 ? ((totalSpent / totalBudget) * 100).toFixed(1) : '0.0';
  const totalCalls = kpis?.calls?.total || 0;
  const costPerCall = totalCalls > 0 ? (totalSpent / totalCalls) : 0;

  const delta = (curr: number, prev: number) => {
    if (!prev || prev === 0) return null;
    const pct = ((curr - prev) / prev) * 100;
    return pct;
  };

  const fmtDelta = (val: number | null) => {
    if (val === null) return undefined;
    const sign = val >= 0 ? '+' : '';
    return `${sign}${val.toFixed(1)}% vs last period`;
  };

  const costBreakdownData = agents.length > 0 ? {
    labels: agents.map((a: any) => a.name),
    datasets: [{
      label: 'Spend (USD)',
      data: agents.map((a: any) => a.month_spend_usd || 0),
      backgroundColor: CHART_COLORS.concat(CHART_COLORS).map(c => c + 'BB'),
      borderColor: CHART_COLORS.concat(CHART_COLORS),
      borderWidth: 1,
      borderRadius: 6,
      borderSkipped: false,
    }],
  } : null;

  const costTrendData = costChart?.labels?.length ? {
    labels: costChart.labels,
    datasets: [
      {
        label: 'API Costs',
        data: costChart.costs,
        borderColor: '#FF6B2C',
        backgroundColor: 'rgba(255,107,44,0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: '#FF6B2C',
        borderWidth: 2,
      },
    ],
  } : null;

  const rangeButtons: { key: Range; label: string }[] = [
    { key: '7d', label: '7d' },
    { key: '30d', label: '30d' },
    { key: '90d', label: '90d' },
  ];

  return (
    <div className="animate-fadeIn">
      <PageHeader
        title="Analytics"
        subtitle="Financial performance and cost tracking"
        action={
          <div className="flex gap-1 bg-chispa-card border border-chispa-border rounded-lg p-0.5">
            {rangeButtons.map(r => (
              <button
                key={r.key}
                onClick={() => setRange(r.key)}
                className={`px-3 py-1 rounded-md text-[12px] font-medium transition-colors ${
                  range === r.key
                    ? 'bg-chispa-orange text-white'
                    : 'text-chispa-text-secondary hover:text-chispa-text-primary'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 mb-3">
        <StatCard
          label="Monthly Revenue"
          value={<span className="num">${revenue.toLocaleString()}</span>}
          subValue={fmtDelta(delta(revenue, prevRevenue))}
          icon={<DollarSign className="w-5 h-5" />}
          color="teal"
          trend={delta(revenue, prevRevenue) !== null ? (delta(revenue, prevRevenue)! >= 0 ? 'up' : 'down') : undefined}
          trendValue={fmtDelta(delta(revenue, prevRevenue))}
        />
        <StatCard
          label="Total API Costs"
          value={<span className="num">${totalSpent.toFixed(2)}</span>}
          subValue={`${usagePct}% of $${totalBudget} budget`}
          icon={<Zap className="w-5 h-5" />}
          color="orange"
          trend={delta(totalSpent, prevSpent) !== null ? (delta(totalSpent, prevSpent)! >= 0 ? 'up' : 'down') : undefined}
          trendValue={fmtDelta(delta(totalSpent, prevSpent))}
        />
        <StatCard
          label="Net Profit"
          value={<span className="num">${profit.toFixed(2)}</span>}
          subValue={revenue > 0 ? `${((profit / revenue) * 100).toFixed(0)}% margin` : undefined}
          trend={profit >= 0 ? 'up' : 'down'}
          trendValue={fmtDelta(delta(profit, prevProfit)) || (profit >= 0 ? 'Profitable' : 'Loss')}
          icon={<TrendingUp className="w-5 h-5" />}
          color="teal"
        />
        <StatCard
          label="Cost per Call"
          value={<span className="num">${costPerCall.toFixed(4)}</span>}
          subValue={totalCalls > 0 ? `${totalCalls} calls total` : 'No calls yet'}
          icon={<PhoneCall className="w-5 h-5" />}
          color="pink"
        />
        <StatCard label="Active Agents" value={agents.length} icon={<Bot className="w-5 h-5" />} color="indigo" />
      </div>

      {/* Cost trend */}
      {costTrendData ? (
        <ChartCard title="Cost Trend" subtitle={`Daily API costs (${range})`} className="mb-4">
          <div className="h-72">
            <Line data={costTrendData} options={{
              ...defaultChartOptions,
              plugins: { ...defaultChartOptions.plugins, legend: { ...defaultChartOptions.plugins.legend, position: 'top' as const } },
            } as any} />
          </div>
        </ChartCard>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 mb-3">
        {/* Cost per agent */}
        {costBreakdownData ? (
          <ChartCard title="Cost per Agent" subtitle="API spend breakdown" className="lg:col-span-2">
            <div className="h-64">
              <Bar data={costBreakdownData} options={{
                ...defaultChartOptions,
                plugins: { ...defaultChartOptions.plugins, legend: { display: false } },
              } as any} />
            </div>
          </ChartCard>
        ) : (
          <ChartCard title="Cost per Agent" subtitle="API spend breakdown" className="lg:col-span-2">
            <EmptyState title="No agent costs yet" />
          </ChartCard>
        )}

        {/* P&L */}
        <ChartCard title="P&L Breakdown" subtitle="This month">
          <div className="space-y-3 py-2">
            {[
              { label: 'Revenue', value: `$${revenue.toFixed(2)}`, color: '#00D4AA' },
              { label: 'API Costs', value: `-$${totalSpent.toFixed(2)}`, color: '#FF6B2C' },
              { label: 'Net Profit', value: `$${profit.toFixed(2)}`, color: profit >= 0 ? '#22C55E' : '#EF4444' },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm text-chispa-text-secondary">{item.label}</span>
                </div>
                <span className="num text-sm font-bold" style={{ color: item.color }}>{item.value}</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
