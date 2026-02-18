import { useEffect, useState, useMemo } from 'react';
import { Mail, MousePointerClick, DollarSign, TrendingUp, Search, X } from 'lucide-react';
import { Bar } from 'react-chartjs-2';
import { api } from '../lib/api';
import { useToast } from '../lib/ToastContext';
import { PageHeader } from '../components/PageHeader';
import { ChartCard } from '../components/ChartCard';
import { StatCard } from '../components/StatCard';
import { Badge } from '../components/Badge';
import { EmptyState } from '../components/EmptyState';
import { Tabs } from '../components/Tabs';
import { DataTable, type Column } from '../components/DataTable';
import { defaultChartOptions } from '../lib/chartConfig';

export default function Campaigns() {
  const [ads, setAds] = useState<any[]>([]);
  const [emails, setEmails] = useState<any[]>([]);
  const [tab, setTab] = useState('ads');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const toast = useToast();

  useEffect(() => {
    Promise.all([
      api.campaigns.ads().catch(() => []),
      api.campaigns.email().catch(() => []),
    ]).then(([a, e]) => {
      setAds(a);
      setEmails(e);
    }).catch(() => toast.error('Failed to load campaigns. Check that the backend is running.'))
    .finally(() => setLoading(false));
  }, []);

  const filteredAds = useMemo(() => {
    if (!searchQuery.trim()) return ads;
    const q = searchQuery.toLowerCase();
    return ads.filter(a => (a.name || '').toLowerCase().includes(q));
  }, [ads, searchQuery]);

  const filteredEmails = useMemo(() => {
    if (!searchQuery.trim()) return emails;
    const q = searchQuery.toLowerCase();
    return emails.filter(e => (e.name || '').toLowerCase().includes(q));
  }, [emails, searchQuery]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-fuega-orange border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const totalAdSpend = ads.reduce((s, a) => s + (a.total_spend_usd || 0), 0);
  const totalClicks = ads.reduce((s, a) => s + (a.clicks || 0), 0);
  const avgRoas = ads.length ? (ads.reduce((s, a) => s + (a.roas || 0), 0) / ads.length) : 0;

  const adColumns: Column<any>[] = [
    {
      key: 'name',
      label: 'Campaign',
      sortable: true,
      getValue: (row) => row.name,
      render: (row) => <span className="text-[12px] text-fuega-text-primary font-medium">{row.name}</span>,
    },
    {
      key: 'platform',
      label: 'Platform',
      sortable: true,
      getValue: (row) => row.platform,
      render: (row) => <span className="text-[10px] px-1.5 py-0.5 rounded bg-fuega-input text-fuega-text-secondary">{row.platform?.replace(/_/g, ' ')}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <Badge variant={row.status} />,
    },
    {
      key: 'spend',
      label: 'Spend',
      sortable: true,
      getValue: (row) => row.total_spend_usd || 0,
      render: (row) => <span className="num text-[12px] text-fuega-text-primary">${(row.total_spend_usd || 0).toFixed(2)}</span>,
    },
    {
      key: 'clicks',
      label: 'Clicks',
      sortable: true,
      getValue: (row) => row.clicks || 0,
      render: (row) => <span className="num text-[12px] text-fuega-text-primary">{(row.clicks || 0).toLocaleString()}</span>,
    },
    {
      key: 'ctr',
      label: 'CTR',
      sortable: true,
      getValue: (row) => row.ctr || 0,
      render: (row) => <span className="num text-[12px] text-fuega-text-secondary">{row.ctr != null && row.ctr > 0 ? `${row.ctr}%` : '\u2014'}</span>,
    },
    {
      key: 'cpc',
      label: 'CPC',
      sortable: true,
      getValue: (row) => row.cpc || 0,
      render: (row) => <span className="num text-[12px] text-fuega-text-secondary">{row.cpc != null && row.cpc > 0 ? `$${row.cpc}` : '\u2014'}</span>,
    },
    {
      key: 'roas',
      label: 'ROAS',
      sortable: true,
      getValue: (row) => row.roas || 0,
      render: (row) => row.roas != null && row.roas > 0 ? <span className={`num text-[12px] font-bold ${row.roas >= 4 ? 'text-green-400' : row.roas >= 2 ? 'text-yellow-400' : 'text-red-400'}`}>{row.roas}x</span> : <span className="text-[12px] text-fuega-text-muted">{'\u2014'}</span>,
    },
  ];

  const emailColumns: Column<any>[] = [
    {
      key: 'name',
      label: 'Campaign',
      sortable: true,
      getValue: (row) => row.name,
      render: (row) => <span className="text-[12px] text-fuega-text-primary font-medium">{row.name}</span>,
    },
    {
      key: 'subject',
      label: 'Subject',
      render: (row) => <span className="text-[12px] text-fuega-text-secondary max-w-xs truncate block">{row.subject}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <Badge variant={row.status === 'sent' ? 'completed' : row.status === 'draft' ? 'pending' : row.status} label={row.status} />,
    },
    {
      key: 'sent',
      label: 'Sent',
      sortable: true,
      getValue: (row) => row.sent_count || 0,
      render: (row) => <span className="num text-[12px] text-fuega-text-primary">{row.sent_count}</span>,
    },
    {
      key: 'open_rate',
      label: 'Open Rate',
      sortable: true,
      getValue: (row) => row.open_rate || 0,
      render: (row) => <span className={`num text-[12px] font-medium ${(row.open_rate || 0) >= 30 ? 'text-green-400' : (row.open_rate || 0) >= 20 ? 'text-yellow-400' : 'text-fuega-text-muted'}`}>{row.open_rate}%</span>,
    },
    {
      key: 'click_rate',
      label: 'Click Rate',
      sortable: true,
      getValue: (row) => row.click_rate || 0,
      render: (row) => <span className={`num text-[12px] font-medium ${(row.click_rate || 0) >= 5 ? 'text-green-400' : (row.click_rate || 0) >= 2 ? 'text-yellow-400' : 'text-fuega-text-muted'}`}>{row.click_rate}%</span>,
    },
  ];

  const adPerformanceData = ads.length > 0 ? {
    labels: ads.map(a => a.name.length > 25 ? a.name.slice(0, 25) + '...' : a.name),
    datasets: [
      {
        label: 'Clicks',
        data: ads.map(a => a.clicks),
        backgroundColor: '#FF6B2C99',
        borderColor: '#FF6B2C',
        borderWidth: 1,
        borderRadius: 4,
      },
      {
        label: 'Impressions (\u00f7100)',
        data: ads.map(a => Math.round((a.impressions || 0) / 100)),
        backgroundColor: '#00D4AA55',
        borderColor: '#00D4AA',
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  } : null;

  const campaignTabs = [
    { key: 'ads', label: 'Paid Ads', count: ads.length },
    { key: 'email', label: 'Email', count: emails.length },
  ];

  return (
    <div className="animate-fadeIn">
      <PageHeader title="Campaigns" subtitle="Paid ads and email marketing" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
        <StatCard label="Total Ad Spend" value={<span className="num">${totalAdSpend.toFixed(0)}</span>} icon={<DollarSign className="w-5 h-5" />} color="orange" />
        <StatCard label="Total Clicks" value={<span className="num">{totalClicks.toLocaleString()}</span>} icon={<MousePointerClick className="w-5 h-5" />} color="teal" />
        <StatCard label="Avg ROAS" value={<span className="num">{avgRoas.toFixed(1)}x</span>} icon={<TrendingUp className="w-5 h-5" />} color="indigo" />
        <StatCard label="Email Campaigns" value={emails.length} icon={<Mail className="w-5 h-5" />} color="pink" />
      </div>

      {/* Search bar */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-sm bg-fuega-input border border-fuega-border rounded-lg px-2.5 py-1.5">
          <Search className="w-3.5 h-3.5 text-fuega-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search campaigns..."
            className="flex-1 bg-transparent text-[12px] text-fuega-text-primary placeholder-fuega-text-muted focus:outline-none"
          />
          {searchQuery && <button onClick={() => setSearchQuery('')} className="text-fuega-text-muted hover:text-fuega-text-primary"><X className="w-3 h-3" /></button>}
        </div>
        {searchQuery && (
          <span className="text-[11px] text-fuega-text-muted">{tab === 'ads' ? filteredAds.length : filteredEmails.length} result{(tab === 'ads' ? filteredAds.length : filteredEmails.length) !== 1 ? 's' : ''}</span>
        )}
      </div>

      <Tabs tabs={campaignTabs} active={tab} onChange={setTab} className="mb-3" />

      {tab === 'ads' && (
        ads.length === 0 ? (
          <EmptyState title="No ad campaigns" description="Ad campaigns will appear after running the ads pipeline." />
        ) : (
          <>
            {adPerformanceData && (
              <ChartCard title="Ad Performance" subtitle="Clicks and impressions by campaign" className="mb-3">
                <div className="h-64">
                  <Bar data={adPerformanceData} options={{
                    ...defaultChartOptions,
                    plugins: { ...defaultChartOptions.plugins, legend: { ...defaultChartOptions.plugins.legend, position: 'top' as const } },
                  } as any} />
                </div>
              </ChartCard>
            )}

            <DataTable
              columns={adColumns}
              data={filteredAds}
              getRowKey={(row) => row.id}
              compact
              emptyMessage="No ad campaigns match your search"
            />
          </>
        )
      )}

      {tab === 'email' && (
        emails.length === 0 ? (
          <EmptyState title="No email campaigns" description="Email campaigns will appear after running the email pipeline." />
        ) : (
          <DataTable
            columns={emailColumns}
            data={filteredEmails}
            getRowKey={(row) => row.id}
            compact
            emptyMessage="No email campaigns match your search"
          />
        )
      )}
    </div>
  );
}
