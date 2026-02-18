import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
  return 'bg-chispa-text-muted/10 text-chispa-text-muted';
}

export default function Agents() {
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
      .catch(() => toast.error('Failed to load agents. Check that the backend is running.'))
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
      toast.error(`Failed to update ${slug}`);
    }
  };

  const saveBudget = async (slug: string, value: string) => {
    const val = parseFloat(value);
    if (isNaN(val) || val < 0) return;
    try {
      const updated = await api.agents.update(slug, { monthly_budget_usd: val });
      setAgents(prev => prev.map(a => a.slug === slug ? { ...a, ...updated } : a));
    } catch {
      toast.error('Failed to update budget');
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
      label: 'Status',
      width: '60px',
      render: (row) => (
        <button
          onClick={(e) => { e.stopPropagation(); toggleStatus(row.slug, row.status); }}
          role="switch"
          aria-checked={row.status === 'active'}
          className={`relative w-9 h-5 rounded-full transition-colors ${row.status === 'active' ? 'bg-green-500' : 'bg-chispa-border'}`}
          title={row.status === 'active' ? 'Click to pause' : 'Click to activate'}
        >
          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${row.status === 'active' ? 'left-[18px]' : 'left-0.5'}`} />
        </button>
      ),
    },
    {
      key: 'name',
      label: 'Agent',
      sortable: true,
      getValue: (row) => row.name,
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="p-1 rounded-md bg-chispa-orange/10">
            <Bot className="w-3.5 h-3.5 text-chispa-orange" />
          </div>
          <div>
            <p className="text-[12px] font-semibold text-chispa-text-primary">{row.name}</p>
            <p className="text-[10px] text-chispa-text-muted">{row.role}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'model',
      label: 'Model',
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
      label: 'Calls',
      sortable: true,
      getValue: (row) => row.total_calls || 0,
      render: (row) => <span className="text-[12px] text-chispa-text-secondary num">{(row.total_calls || 0).toLocaleString()}</span>,
    },
    {
      key: 'spend',
      label: 'Spend / Budget',
      sortable: true,
      getValue: (row) => row.month_spend_usd || 0,
      render: (row) => {
        const pct = row.budget_usage_pct || 0;
        return (
          <div onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-1.5 text-[12px]">
              <span className="text-chispa-text-primary num">${(row.month_spend_usd || 0).toFixed(2)}</span>
              <span className="text-chispa-text-muted">/</span>
              <InlineEdit
                value={String(row.monthly_budget_usd || 0)}
                onSave={(v) => saveBudget(row.slug, v)}
                type="number"
                displayClassName="text-chispa-text-secondary num text-[12px]"
                className="w-16 text-[12px] num"
              />
              <span className="text-[10px] text-chispa-text-muted">{pct.toFixed(0)}%</span>
            </div>
            <div className="mt-1 w-full h-1 bg-chispa-surface rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: pct > 80 ? '#EF4444' : pct > 50 ? '#EAB308' : '#00D4AA' }} />
            </div>
          </div>
        );
      },
    },
    {
      key: 'trend',
      label: '7d Trend',
      render: (row) => <Sparkline data={getSparkline(row)} color={row.budget_usage_pct > 80 ? '#EF4444' : '#00D4AA'} />,
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-chispa-orange border-t-transparent rounded-full animate-spin" />
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
      <PageHeader title="AI Agents" subtitle={`${agents.length} agents — Your real team, real budget, real results`} />

      {/* Filter bar */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] bg-chispa-input border border-chispa-border rounded-lg px-2.5 py-1.5">
          <Search className="w-3.5 h-3.5 text-chispa-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search agents..."
            className="flex-1 bg-transparent text-[12px] text-chispa-text-primary placeholder-chispa-text-muted focus:outline-none"
          />
          {searchQuery && <button onClick={() => setSearchQuery('')} className="text-chispa-text-muted hover:text-chispa-text-primary"><X className="w-3 h-3" /></button>}
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="bg-chispa-input border border-chispa-border rounded-lg px-2.5 py-1.5 text-[12px] text-chispa-text-secondary focus:outline-none"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
        </select>
        <select
          value={modelFilter}
          onChange={e => setModelFilter(e.target.value)}
          className="bg-chispa-input border border-chispa-border rounded-lg px-2.5 py-1.5 text-[12px] text-chispa-text-secondary focus:outline-none"
        >
          <option value="all">All Models</option>
          {models.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {/* Bulk action bar */}
      {selectedKeys.size > 0 && (
        <div className="flex items-center gap-3 mb-3 bg-chispa-orange/5 border border-chispa-orange/20 rounded-lg px-3 py-2 animate-slideUp">
          <span className="text-[12px] text-chispa-text-primary font-medium">{selectedKeys.size} selected</span>
          <button onClick={bulkPause} className="flex items-center gap-1 text-[11px] text-yellow-400 bg-yellow-500/10 hover:bg-yellow-500/20 px-2 py-1 rounded transition-colors">
            <Pause className="w-3 h-3" /> Pause All
          </button>
          <button onClick={() => setSelectedKeys(new Set())} className="text-[11px] text-chispa-text-muted hover:text-chispa-text-primary ml-auto">Clear</button>
        </div>
      )}

      {filtered.length === 0 && agents.length > 0 ? (
        <EmptyState title="No matching agents" description="Try adjusting your search or filters." />
      ) : filtered.length === 0 ? (
        <EmptyState title="No agents" description="Agents will appear once the backend seeds them from config." />
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
