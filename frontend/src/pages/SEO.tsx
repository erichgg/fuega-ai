import { useEffect, useState, useMemo } from 'react';
import { Search, TrendingUp, TrendingDown, Minus, Globe, BarChart3, ArrowUpRight, ArrowDownRight, Play, X } from 'lucide-react';
import { Bar } from 'react-chartjs-2';
import { api } from '../lib/api';
import { useToast } from '../lib/ToastContext';
import { PageHeader } from '../components/PageHeader';
import { ChartCard } from '../components/ChartCard';
import { StatCard } from '../components/StatCard';
import { EmptyState } from '../components/EmptyState';
import { DataTable, type Column } from '../components/DataTable';
import { Sparkline } from '../components/Sparkline';
import { defaultChartOptions } from '../lib/chartConfig';

export default function SEO() {
  const [keywords, setKeywords] = useState<any[]>([]);
  const [audits, setAudits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [auditRunning, setAuditRunning] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const toast = useToast();

  useEffect(() => {
    Promise.all([
      api.seo.keywords().catch(() => []),
      api.seo.audits().catch(() => []),
    ]).then(([k, a]) => {
      setKeywords(k);
      setAudits(a);
    }).finally(() => setLoading(false));
  }, []);

  // ALL hooks must be above early returns — React requires consistent hook count
  const filteredKeywords = useMemo(() => {
    if (!searchQuery.trim()) return keywords;
    const q = searchQuery.toLowerCase();
    return keywords.filter(k => (k.keyword || '').toLowerCase().includes(q));
  }, [keywords, searchQuery]);

  const handleRunAudit = async () => {
    setAuditRunning(true);
    try {
      await api.workflows.runStep('seo_analyst', 'audit_client_site');
      // Reload data after audit
      const [k, a] = await Promise.all([
        api.seo.keywords().catch(() => []),
        api.seo.audits().catch(() => []),
      ]);
      setKeywords(k);
      setAudits(a);
    } catch {
      toast.error('SEO audit failed — is the backend running?');
    } finally {
      setAuditRunning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-chispa-orange border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (keywords.length === 0 && audits.length === 0) {
    return (
      <div className="animate-fadeIn">
        <PageHeader
          title="SEO"
          subtitle="Search engine optimization tracking"
          action={
            <button
              onClick={handleRunAudit}
              disabled={auditRunning}
              className="flex items-center gap-1.5 bg-chispa-orange hover:bg-chispa-orange/80 text-white px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5" /> Run audit
            </button>
          }
        />
        <EmptyState title="No SEO data yet" description="Run the SEO pipeline to generate keyword research and site audits." />
      </div>
    );
  }

  const avgRank = keywords.length ? (keywords.reduce((s, k) => s + k.current_rank, 0) / keywords.length).toFixed(1) : '0';
  const improved = keywords.filter(k => k.current_rank < k.previous_rank).length;
  const declined = keywords.filter(k => k.current_rank > k.previous_rank).length;

  const rankDistribution = {
    labels: ['Top 3', 'Top 10', 'Top 20', '20+'],
    datasets: [{
      label: 'Keywords',
      data: [
        keywords.filter(k => k.current_rank <= 3).length,
        keywords.filter(k => k.current_rank > 3 && k.current_rank <= 10).length,
        keywords.filter(k => k.current_rank > 10 && k.current_rank <= 20).length,
        keywords.filter(k => k.current_rank > 20).length,
      ],
      backgroundColor: ['#22C55E', '#00D4AA', '#EAB308', '#EF4444'],
      borderRadius: 6,
      borderSkipped: false,
    }],
  };

  const keywordColumns: Column<any>[] = [
    {
      key: 'keyword',
      label: 'Keyword',
      sortable: true,
      getValue: (row) => row.keyword,
      render: (row) => (
        <div>
          <span className="text-[12px] text-chispa-text-primary">{row.keyword}</span>
          <span className="ml-2 text-[10px] text-chispa-text-muted">{row.language}</span>
        </div>
      ),
    },
    {
      key: 'position',
      label: 'Position',
      sortable: true,
      getValue: (row) => row.current_rank,
      render: (row) => <span className="num text-[12px] font-bold text-chispa-text-primary">#{row.current_rank}</span>,
    },
    {
      key: 'trend',
      label: 'Trend',
      render: (row) => {
        const history: number[] = row.rank_history || (row.previous_rank ? [row.previous_rank, row.current_rank] : []);
        return <Sparkline data={history} color={history.length >= 2 && history[history.length - 1] <= history[0] ? '#22C55E' : '#EF4444'} />;
      },
    },
    {
      key: 'change',
      label: 'Change',
      sortable: true,
      getValue: (row) => row.previous_rank - row.current_rank,
      render: (row) => {
        const change = row.previous_rank - row.current_rank;
        return (
          <div className="flex items-center gap-1">
            {change > 0 && <ArrowUpRight className="w-3.5 h-3.5 text-green-400" />}
            {change < 0 && <ArrowDownRight className="w-3.5 h-3.5 text-red-400" />}
            {change === 0 && <Minus className="w-3.5 h-3.5 text-chispa-text-muted" />}
            <span className={`num text-[12px] font-medium ${change > 0 ? 'text-green-400' : change < 0 ? 'text-red-400' : 'text-chispa-text-muted'}`}>
              {change > 0 ? `+${change}` : change === 0 ? '\u2014' : change}
            </span>
          </div>
        );
      },
    },
    {
      key: 'volume',
      label: 'Volume',
      sortable: true,
      getValue: (row) => row.search_volume || 0,
      render: (row) => <span className="text-[12px] num text-chispa-text-secondary">{row.search_volume?.toLocaleString()}</span>,
    },
    {
      key: 'difficulty',
      label: 'Difficulty',
      sortable: true,
      getValue: (row) => row.difficulty || 0,
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="w-14 h-1.5 bg-chispa-input rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{
              width: `${row.difficulty * 100}%`,
              backgroundColor: row.difficulty > 0.7 ? '#EF4444' : row.difficulty > 0.4 ? '#EAB308' : '#22C55E',
            }} />
          </div>
          <span className="num text-[10px] text-chispa-text-muted">{(row.difficulty * 100).toFixed(0)}</span>
        </div>
      ),
    },
    {
      key: 'opportunity',
      label: 'Opportunity',
      sortable: true,
      getValue: (row) => row.opportunity_score || 0,
      render: (row) => (
        <span className={`num text-[12px] font-semibold ${row.opportunity_score >= 8 ? 'text-green-400' : row.opportunity_score >= 6 ? 'text-yellow-400' : 'text-red-400'}`}>
          {row.opportunity_score}/10
        </span>
      ),
    },
  ];

  return (
    <div className="animate-fadeIn">
      <PageHeader
        title="SEO"
        subtitle="Search engine optimization tracking"
        action={
          <button
            onClick={handleRunAudit}
            disabled={auditRunning}
            className="flex items-center gap-1.5 bg-chispa-orange hover:bg-chispa-orange/80 text-white px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors disabled:opacity-50"
          >
            {auditRunning ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
            Run audit
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
        <StatCard label="Tracked Keywords" value={keywords.length} icon={<Search className="w-5 h-5" />} color="orange" />
        <StatCard label="Avg Position" value={<span className="num">{avgRank}</span>} icon={<BarChart3 className="w-5 h-5" />} color="teal" />
        <StatCard label="Improved" value={improved} trend="up" trendValue={`${improved} keywords`} icon={<TrendingUp className="w-5 h-5" />} color="teal" />
        <StatCard label="Declined" value={declined} trend={declined > 0 ? 'down' : 'neutral'} trendValue={`${declined} keywords`} icon={<TrendingDown className="w-5 h-5" />} color="pink" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 mb-3">
        {keywords.length > 0 && (
          <ChartCard title="Rank Distribution" subtitle="Current keyword positions" className="lg:col-span-1">
            <div className="h-52">
              <Bar data={rankDistribution} options={{
                ...defaultChartOptions,
                plugins: { ...defaultChartOptions.plugins, legend: { display: false } },
              } as any} />
            </div>
          </ChartCard>
        )}

        {audits.length > 0 && (
          <ChartCard title="Site Audits" subtitle={`${audits.length} audits`} className={keywords.length > 0 ? 'lg:col-span-2' : 'lg:col-span-3'}>
            <div className="space-y-2">
              {audits.map(audit => (
                <div key={audit.id} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-chispa-input border border-chispa-border/50">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{
                    backgroundColor: audit.overall_score >= 70 ? '#22C55E20' : audit.overall_score >= 50 ? '#EAB30820' : '#EF444420',
                  }}>
                    <span className="num text-base font-bold" style={{
                      color: audit.overall_score >= 70 ? '#22C55E' : audit.overall_score >= 50 ? '#EAB308' : '#EF4444',
                    }}>{audit.overall_score}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Globe className="w-3.5 h-3.5 text-chispa-text-muted" />
                      <span className="text-sm font-medium text-chispa-text-primary">{audit.url}</span>
                    </div>
                    <div className="flex gap-3 mt-0.5">
                      <span className="text-xs text-chispa-text-muted">Technical: <span className="num">{audit.technical_score}</span></span>
                      <span className="text-xs text-chispa-text-muted">Content: <span className="num">{audit.content_score}</span></span>
                    </div>
                  </div>
                  <span className="text-xs text-chispa-text-muted">{audit.created_at}</span>
                </div>
              ))}
            </div>
          </ChartCard>
        )}
      </div>

      {keywords.length > 0 && (
        <>
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-sm bg-chispa-input border border-chispa-border rounded-lg px-2.5 py-1.5">
              <Search className="w-3.5 h-3.5 text-chispa-text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search keywords..."
                className="flex-1 bg-transparent text-[12px] text-chispa-text-primary placeholder-chispa-text-muted focus:outline-none"
              />
              {searchQuery && <button onClick={() => setSearchQuery('')} className="text-chispa-text-muted hover:text-chispa-text-primary"><X className="w-3 h-3" /></button>}
            </div>
            {searchQuery && (
              <span className="text-[11px] text-chispa-text-muted">{filteredKeywords.length} result{filteredKeywords.length !== 1 ? 's' : ''}</span>
            )}
          </div>

          <DataTable
            columns={keywordColumns}
            data={filteredKeywords}
            getRowKey={(row) => row.id}
            compact
            emptyMessage="No keywords match your search"
          />
        </>
      )}
    </div>
  );
}
