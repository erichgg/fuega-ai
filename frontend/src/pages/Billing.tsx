import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Line } from 'react-chartjs-2';
import {
  CreditCard, ExternalLink, ArrowUpCircle, DollarSign,
  Cpu, Zap, TrendingUp, Bot,
} from 'lucide-react';
import { api } from '../lib/api';
import { defaultChartOptions } from '../lib/chartConfig';
import { PageHeader } from '../components/PageHeader';
import { StatCard } from '../components/StatCard';
import { ChartCard } from '../components/ChartCard';
import { Badge } from '../components/Badge';
import { Spinner } from '../components/Spinner';
import { EmptyState } from '../components/EmptyState';
import { useToast } from '../lib/ToastContext';

export default function Billing() {
  const [billingStatus, setBillingStatus] = useState<any>(null);
  const [usage, setUsage] = useState<any>(null);
  const [costChart, setCostChart] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const toast = useToast();
  const { t } = useTranslation(['billing', 'common']);

  // Usage is an array of per-agent breakdowns from /billing/usage
  const perAgentCosts: { agent: string; calls: number; tokens: number; cost: number }[] = useMemo(() => {
    if (!Array.isArray(usage)) return [];
    return usage.map((u: any) => ({
      agent: u.agent_name || u.agent_slug || 'unknown',
      calls: u.api_calls || 0,
      tokens: u.tokens || 0,
      cost: u.cost_usd || 0,
    }));
  }, [usage]);

  const costTrendData = useMemo(() => {
    if (!costChart?.labels?.length) return null;
    return {
      labels: costChart.labels,
      datasets: [{
        label: t('billing:charts.daily'),
        data: costChart.costs,
        borderColor: '#FF6B2C',
        backgroundColor: '#FF6B2C15',
        fill: true,
        tension: 0.4,
        pointRadius: 2,
        borderWidth: 2,
      }],
    };
  }, [costChart, t]);

  useEffect(() => {
    Promise.all([
      api.billing.status().catch(() => null),
      api.billing.usage().catch(() => null),
      api.dashboard.costChart(30).catch(() => null),
    ]).then(([status, usageData, chart]) => {
      setBillingStatus(status);
      setUsage(usageData);
      setCostChart(chart);
    }).finally(() => setLoading(false));
  }, []);

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const res = await api.billing.portal();
      if (res.portal_url) {
        window.open(res.portal_url, '_blank');
      }
    } catch {
      toast.error(t('billing:errors.portalFailed'));
    }
    setPortalLoading(false);
  };

  const handleUpgrade = async (plan: string) => {
    setCheckoutLoading(true);
    try {
      const res = await api.billing.checkout(
        plan,
        `${window.location.origin}/billing?success=true`,
        `${window.location.origin}/billing?canceled=true`
      );
      if (res.checkout_url) {
        window.location.href = res.checkout_url;
      }
    } catch {
      toast.error(t('billing:errors.checkoutFailed'));
    }
    setCheckoutLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner />
      </div>
    );
  }

  const rawPlan = billingStatus?.plan || 'free';
  const plan = rawPlan.replace(/^fuega_/, '');
  const planStatus = billingStatus?.status || 'active';
  const renewalDate = billingStatus?.current_period_end
    ? new Date(billingStatus.current_period_end).toLocaleDateString('en', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  const totalCalls = billingStatus?.usage?.api_calls || 0;
  const totalTokens = billingStatus?.usage?.tokens || 0;
  const estimatedCost = billingStatus?.usage?.estimated_cost || 0;

  return (
    <div className="animate-fadeIn">
      <PageHeader title={t('billing:title')} subtitle={t('billing:subtitle')} />

      {/* Current Plan */}
      <div className="bg-fuega-card border border-fuega-border rounded-lg p-4 mb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-fuega-orange/10 text-fuega-orange">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-fuega-text-primary capitalize">{t('billing:currentPlan', { plan })}</h2>
                <Badge variant={planStatus === 'active' ? 'active' : planStatus === 'trialing' ? 'running' : 'paused'} label={planStatus} />
              </div>
              {renewalDate && (
                <p className="text-[11px] text-fuega-text-muted mt-0.5">{t('billing:renews', { date: renewalDate })}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleManageSubscription}
              disabled={portalLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-fuega-input border border-fuega-border text-[12px] font-medium text-fuega-text-secondary hover:text-fuega-text-primary hover:border-fuega-orange/50 transition-colors disabled:opacity-50"
            >
              {portalLoading ? <Spinner size="sm" /> : <ExternalLink className="w-3.5 h-3.5" />}
              {t('billing:manageSubscription')}
            </button>
          </div>
        </div>
      </div>

      {/* Upgrade section */}
      {(plan === 'free' || plan === 'starter') && (
        <div className="bg-gradient-to-r from-fuega-orange/5 to-fuega-teal/5 border border-fuega-orange/20 rounded-lg p-4 mb-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[13px] font-semibold text-fuega-text-primary flex items-center gap-2">
                <ArrowUpCircle className="w-4 h-4 text-fuega-orange" />
                {t('billing:upgrade.title')}
              </h3>
              <p className="text-[11px] text-fuega-text-muted mt-0.5">
                {t('billing:upgrade.description')}
              </p>
            </div>
            <div className="flex gap-2">
              {plan === 'free' && (
                <button
                  onClick={() => handleUpgrade('fuega_starter')}
                  disabled={checkoutLoading}
                  className="px-3 py-1.5 rounded-lg bg-fuega-input border border-fuega-border text-[12px] font-medium text-fuega-text-secondary hover:border-fuega-orange/50 transition-colors disabled:opacity-50"
                >
                  {t('billing:upgrade.starter')}
                </button>
              )}
              <button
                onClick={() => handleUpgrade('fuega_pro')}
                disabled={checkoutLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-fuega-orange text-white text-[12px] font-medium hover:bg-fuega-orange/90 transition-colors disabled:opacity-50"
              >
                {checkoutLoading ? <Spinner size="sm" /> : <Zap className="w-3.5 h-3.5" />}
                {t('billing:upgrade.upgradeToPro')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Usage KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
        <StatCard label={t('billing:stats.apiCalls')} value={totalCalls.toLocaleString()} icon={<Zap className="w-4 h-4" />} color="orange" />
        <StatCard label={t('billing:stats.tokensUsed')} value={totalTokens >= 1_000_000 ? `${(totalTokens / 1_000_000).toFixed(1)}M` : totalTokens.toLocaleString()} icon={<Cpu className="w-4 h-4" />} color="indigo" />
        <StatCard label={t('billing:stats.estCost')} value={`$${estimatedCost.toFixed(2)}`} icon={<DollarSign className="w-4 h-4" />} color="pink" />
        <StatCard label={t('billing:stats.avgCostPerCall')} value={totalCalls > 0 ? `$${(estimatedCost / totalCalls).toFixed(4)}` : '$0'} icon={<TrendingUp className="w-4 h-4" />} color="teal" />
      </div>

      {/* Charts + Per-Agent table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Cost trend chart */}
        <ChartCard title={t('billing:charts.costTrend')} subtitle={t('billing:charts.daily')}>
          <div className="h-48">
            {costTrendData ? (
              <Line data={costTrendData} options={{ ...defaultChartOptions, plugins: { ...defaultChartOptions.plugins, legend: { display: false } } } as any} />
            ) : (
              <EmptyState title={t('billing:empty.noCostData')} />
            )}
          </div>
        </ChartCard>

        {/* Per-agent cost table */}
        <ChartCard title={t('billing:charts.costByAgent')} subtitle={t('billing:charts.thisPeriod')}>
          <div className="max-h-48 overflow-y-auto">
            {perAgentCosts.length === 0 ? (
              <EmptyState title={t('billing:empty.noAgentCostData')} />
            ) : (
              <div className="space-y-1">
                {perAgentCosts.map(row => (
                  <div key={row.agent} className="flex items-center gap-2 py-1.5 px-1 rounded hover:bg-fuega-card-hover transition-colors">
                    <Bot className="w-3.5 h-3.5 text-fuega-text-muted flex-shrink-0" />
                    <span className="text-[11px] text-fuega-text-primary flex-1 truncate">{row.agent.replace(/_/g, ' ')}</span>
                    <span className="text-[10px] text-fuega-text-muted num">{row.calls} {t('common:labels.calls').toLowerCase()}</span>
                    <span className="text-[10px] text-fuega-text-muted num w-16 text-right">{row.tokens >= 1000 ? `${(row.tokens / 1000).toFixed(0)}K` : row.tokens} {t('billing:tok')}</span>
                    <span className="text-[11px] font-medium text-fuega-text-primary num w-16 text-right">${row.cost.toFixed(4)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
