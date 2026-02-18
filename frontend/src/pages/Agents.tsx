import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bot, Cpu, Search, Pause, X } from 'lucide-react';
import { api } from '../lib/api';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { DataTable, type Column } from '../components/DataTable';
import { Sparkline } from '../components/Sparkline';
import { InlineEdit } from '../components/InlineEdit';
import { useToast } from '../lib/ToastContext';

function modelShort(model: string): string {
  if (model.includes('sonnet')) return 'Sonnet';
  if (model.includes('haiku')) return 'Haiku';
  if (model.includes('opus')) return 'Opus';
  return model;
}

function modelColor(model: string): string {
  if (model.includes('sonnet')) return 'bg-purple-500/15 text-purple-400';
  if (model.includes('haiku')) return 'bg-teal-500/15 text-teal-400';
  if (model.includes('opus')) return 'bg-orange-500/15 text-orange-400';
  return 'bg-fuega-text-muted/10 text-fuega-text-muted';
}

export default function Agents() {
  const { t } = useTranslation(['agents', 'common']);
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [modelFilter, setModelFilter] = useState<string>('all');
  const [selectedKeys, setSelectedKeys] = useState<Set<string | number>>(new Set());
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    api.agents.list()
      .then(setAgents)
      .catch(() => toast.error(t('common:errors.failedToLoad', { resource: t('agents:title').toLowerCase() }) + ' ' + t('common:errors.backendCheck')))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return agents.filter(a => {
      if (searchQuery && !a.name.toLowerCase().includes(searchQuery.toLowerCase()) && !a.role?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      if (modelFilter !== 'all' && !a.model?.includes(modelFilter)) return false;
      return true;
    });
  }, [agents, searchQuery, statusFilter, modelFilter]);

  const toggleStatus = async (slug: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    try {
      const updated = await api.agents.update(slug, { status: newStatus });
      setAgents(prev => prev.map(a => a.slug === slug ? { ...a, ...updated } : a));
    } catch {
      toast.error(t('common:errors.failedToUpdate', { resource: slug }));
    }
  };

  const saveBudget = async (slug: string, value: string) => {
    const val = parseFloat(value);
    if (isNaN(val) || val < 0) return;
    try {
      const updated = await api.agents.update(slug, { monthly_budget_usd: val });
      setAgents(prev => prev.map(a => a.slug === slug ? { ...a, ...updated } : a));
    } catch {
      toast.error(t('common:errors.failedToUpdate', { resource: t('common:labels.budget').toLowerCase() }));
    }
  };

  const bulkPause = async () => {
    for (const key of selectedKeys) {
      const agent = agents.find(a => a.slug === key);
      if (agent && agent.status === 'active') {
        try {
          const updated = await api.agents.update(String(key), { status: 'paused' });
          setAgents(prev => prev.map(a => a.slug === key ? { ...a, ...updated } : a));
        } catch { /* continue */ }
      }
    }
    setSelectedKeys(new Set());
  };

  // Generate fake sparkline data from spend (would come from real 7-day API)
  const getSparkline = useCallback((agent: any): number[] => {
    const base = agent.month_spend_usd || 0;
    return Array.from({ length: 7 }, (_, i) => Math.max(0, base * (0.5 + Math.sin(i + agent.slug.length) * 0.5)));
  }, []);

  const columns: Column<any>[] = [
    {
      key: 'status',
      label: t('agents:columns.status'),
      width: '60px',
      render: (row) => (
        <button
          onClick={(e) => { e.stopPropagation(); toggleStatus(row.slug, row.status); }}
          role="switch"
          aria-checked={row.status === 'active'}
          className={`relative w-9 h-5 rounded-full transition-colors ${row.status === 'active' ? 'bg-green-500' : 'bg-fuega-border'}`}
          title={row.status === 'active' ? t('agents:togglePause') : t('agents:toggleActivate')}
        >
          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${row.status === 'active' ? 'left-[18px]' : 'left-0.5'}`} />
        </button>
      ),
    },
    {
      key: 'name',
      label: t('agents:columns.agent'),
      sortable: true,
      getValue: (row) => row.name,
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="p-1 rounded-md bg-fuega-orange/10">
            <Bot className="w-3.5 h-3.5 text-fuega-orange" />
          </div>
          <div>
            <p className="text-[12px] font-semibold text-fuega-text-primary">{row.name}</p>
            <p className="text-[10px] text-fuega-text-muted">{row.role}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'model',
      label: t('agents:columns.model'),
      sortable: true,
      getValue: (row) => row.model,
      render: (row) => (
        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${modelColor(row.model)}`}>
          <Cpu className="w-2.5 h-2.5" />
          {modelShort(row.model)}
        </span>
      ),
    },
    {
      key: 'calls',
      label: t('agents:columns.calls'),
      sortable: true,
      getValue: (row) => row.total_calls || 0,
      render: (row) => <span className="text-[12px] text-fuega-text-secondary num">{(row.total_calls || 0).toLocaleString()}</span>,
    },
    {
      key: 'spend',
      label: t('agents:columns.spendBudget'),
      sortable: true,
      getValue: (row) => row.month_spend_usd || 0,
      render: (row) => {
        const pct = row.budget_usage_pct || 0;
        return (
          <div onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-1.5 text-[12px]">
              <span className="text-fuega-text-primary num">${(row.month_spend_usd || 0).toFixed(2)}</span>
              <span className="text-fuega-text-muted">/</span>
              <InlineEdit
                value={String(row.monthly_budget_usd || 0)}
                onSave={(v) => saveBudget(row.slug, v)}
                type="number"
                displayClassName="text-fuega-text-secondary num text-[12px]"
                className="w-16 text-[12px] num"
              />
              <span className="text-[10px] text-fuega-text-muted">{pct.toFixed(0)}%</span>
            </div>
            <div className="mt-1 w-full h-1 bg-fuega-surface rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: pct > 80 ? '#EF4444' : pct > 50 ? '#EAB308' : '#00D4AA' }} />
            </div>
          </div>
        );
      },
    },
    {
      key: 'trend',
      label: t('agents:columns.trend'),
      render: (row) => <Sparkline data={getSparkline(row)} color={row.budget_usage_pct > 80 ? '#EF4444' : '#00D4AA'} />,
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-fuega-orange border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const models = [...new Set(agents.map(a => {
    if (a.model?.includes('sonnet')) return 'sonnet';
    if (a.model?.includes('haiku')) return 'haiku';
    if (a.model?.includes('opus')) return 'opus';
    return a.model;
  }))];

  return (
    <div className="animate-fadeIn">
      <PageHeader title={t('agents:title')} subtitle={t('agents:subtitle', { count: agents.length })} />

      {/* Filter bar */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] bg-fuega-input border border-fuega-border rounded-lg px-2.5 py-1.5">
          <Search className="w-3.5 h-3.5 text-fuega-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t('agents:searchPlaceholder')}
            className="flex-1 bg-transparent text-[12px] text-fuega-text-primary placeholder-fuega-text-muted focus:outline-none"
          />
          {searchQuery && <button onClick={() => setSearchQuery('')} className="text-fuega-text-muted hover:text-fuega-text-primary"><X className="w-3 h-3" /></button>}
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="bg-fuega-input border border-fuega-border rounded-lg px-2.5 py-1.5 text-[12px] text-fuega-text-secondary focus:outline-none"
        >
          <option value="all">{t('agents:filters.allStatus')}</option>
          <option value="active">{t('agents:filters.active')}</option>
          <option value="paused">{t('agents:filters.paused')}</option>
        </select>
        <select
          value={modelFilter}
          onChange={e => setModelFilter(e.target.value)}
          className="bg-fuega-input border border-fuega-border rounded-lg px-2.5 py-1.5 text-[12px] text-fuega-text-secondary focus:outline-none"
        >
          <option value="all">{t('agents:filters.allModels')}</option>
          {models.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {/* Bulk action bar */}
      {selectedKeys.size > 0 && (
        <div className="flex items-center gap-3 mb-3 bg-fuega-orange/5 border border-fuega-orange/20 rounded-lg px-3 py-2 animate-slideUp">
          <span className="text-[12px] text-fuega-text-primary font-medium">{t('agents:bulk.selected', { count: selectedKeys.size })}</span>
          <button onClick={bulkPause} className="flex items-center gap-1 text-[11px] text-yellow-400 bg-yellow-500/10 hover:bg-yellow-500/20 px-2 py-1 rounded transition-colors">
            <Pause className="w-3 h-3" /> {t('agents:bulk.pauseAll')}
          </button>
          <button onClick={() => setSelectedKeys(new Set())} className="text-[11px] text-fuega-text-muted hover:text-fuega-text-primary ml-auto">{t('common:actions.clear')}</button>
        </div>
      )}

      {filtered.length === 0 && agents.length > 0 ? (
        <EmptyState title={t('agents:empty.noMatching')} description={t('agents:empty.noMatchingDesc')} />
      ) : filtered.length === 0 ? (
        <EmptyState title={t('agents:empty.noAgents')} description={t('agents:empty.noAgentsDesc')} />
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          getRowKey={(row) => row.slug}
          onRowClick={(row) => navigate(`/agents/${row.slug}`)}
          selectable
          selectedKeys={selectedKeys}
          onSelectionChange={setSelectedKeys}
          compact
        />
      )}
    </div>
  );
}
