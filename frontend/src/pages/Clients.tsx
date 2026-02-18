import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Building2, MapPin, DollarSign, TrendingUp, Search, Plus } from 'lucide-react';
import { Doughnut } from 'react-chartjs-2';
import { api } from '../lib/api';
import { useToast } from '../lib/ToastContext';
import { PageHeader } from '../components/PageHeader';
import { Badge } from '../components/Badge';
import { StatCard } from '../components/StatCard';
import { EmptyState } from '../components/EmptyState';
import { DataTable, type Column } from '../components/DataTable';
import { defaultChartOptions } from '../lib/chartConfig';

const tierLabels: Record<string, string> = {
  fuega_starter: 'Starter',
  fuega_growth: 'Growth',
  fuega_pro: 'Pro',
  fuega_enterprise: 'Enterprise',
};

const tierColors: Record<string, string> = {
  fuega_starter: '#6366F1',
  fuega_growth: '#FF6B2C',
  fuega_pro: '#00D4AA',
  fuega_enterprise: '#EC4899',
};

export default function Clients() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClient, setNewClient] = useState({ name: '', business_name: '', country: 'MX', plan_tier: 'fuega_starter', monthly_rate_usd: 149 });
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    api.clients.list()
      .then(setClients)
      .catch(() => toast.error('Failed to load clients. Check that the backend is running.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return clients;
    const q = query.toLowerCase();
    return clients.filter(c =>
      (c.name || '').toLowerCase().includes(q) ||
      (c.business_name || '').toLowerCase().includes(q) ||
      (c.country || '').toLowerCase().includes(q) ||
      (c.plan_tier || '').toLowerCase().includes(q) ||
      (c.status || '').toLowerCase().includes(q)
    );
  }, [clients, query]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-chispa-orange border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const totalRevenue = clients.reduce((s, c) => s + (c.monthly_rate_usd || 0), 0);
  const tierCounts: Record<string, number> = {};
  clients.forEach(c => {
    const t = c.plan_tier || 'unknown';
    tierCounts[t] = (tierCounts[t] || 0) + 1;
  });

  const tierChartData = {
    labels: Object.keys(tierCounts).map(k => tierLabels[k] || k),
    datasets: [{
      data: Object.values(tierCounts),
      backgroundColor: Object.keys(tierCounts).map(k => (tierColors[k] || '#6B6B80') + 'CC'),
      borderWidth: 0,
    }],
  };

  const clientColumns: Column<any>[] = [
    {
      key: 'client',
      label: 'Client',
      sortable: true,
      getValue: (row) => row.name,
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-chispa-orange/10 flex items-center justify-center">
            <span className="text-sm font-bold text-chispa-orange">{row.name?.charAt(0)}</span>
          </div>
          <div>
            <p className="text-[12px] font-medium text-chispa-text-primary">{row.name}</p>
            <p className="text-[10px] text-chispa-text-muted flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {row.country}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'business',
      label: 'Business',
      sortable: true,
      getValue: (row) => row.business_name,
      render: (row) => (
        <div className="flex items-center gap-2">
          <Building2 className="w-3.5 h-3.5 text-chispa-text-muted" />
          <div>
            <p className="text-[12px] text-chispa-text-primary">{row.business_name}</p>
            <p className="text-[10px] text-chispa-text-muted">{row.business_type}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'plan',
      label: 'Plan',
      sortable: true,
      getValue: (row) => row.plan_tier,
      render: (row) => (
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{
          backgroundColor: (tierColors[row.plan_tier] || '#6B6B80') + '20',
          color: tierColors[row.plan_tier] || '#6B6B80',
        }}>
          {tierLabels[row.plan_tier] || row.plan_tier}
        </span>
      ),
    },
    {
      key: 'revenue',
      label: 'Revenue',
      sortable: true,
      getValue: (row) => row.monthly_rate_usd || 0,
      render: (row) => (
        <p className="num text-[12px] font-semibold text-chispa-text-primary">${row.monthly_rate_usd}/mo</p>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      getValue: (row) => row.status,
      render: (row) => <Badge variant={row.status} />,
    },
  ];

  return (
    <div className="animate-fadeIn">
      <PageHeader
        title="Clients"
        subtitle={`${clients.length} client${clients.length !== 1 ? 's' : ''} \u00b7 $${totalRevenue}/mo revenue`}
        action={
          <button
            onClick={() => setShowNewClient(true)}
            className="flex items-center gap-1.5 bg-chispa-orange hover:bg-chispa-orange/80 text-white px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> New Client
          </button>
        }
      />

      {showNewClient && (
        <div className="mb-3 bg-chispa-card border border-chispa-border rounded-lg p-3 animate-slideUp">
          <h3 className="text-[12px] font-semibold text-chispa-text-primary mb-2">New Client</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            <input value={newClient.name} onChange={e => setNewClient(p => ({ ...p, name: e.target.value }))} placeholder="Contact name *" className="bg-chispa-input border border-chispa-border rounded px-2 py-1.5 text-sm text-chispa-text-primary placeholder:text-chispa-text-muted focus:outline-none focus:border-chispa-orange/50" />
            <input value={newClient.business_name} onChange={e => setNewClient(p => ({ ...p, business_name: e.target.value }))} placeholder="Business name" className="bg-chispa-input border border-chispa-border rounded px-2 py-1.5 text-sm text-chispa-text-primary placeholder:text-chispa-text-muted focus:outline-none focus:border-chispa-orange/50" />
            <select value={newClient.plan_tier} onChange={e => setNewClient(p => ({ ...p, plan_tier: e.target.value, monthly_rate_usd: { fuega_starter: 149, fuega_growth: 349, fuega_pro: 699, fuega_enterprise: 1299 }[e.target.value] || 149 }))} className="bg-chispa-input border border-chispa-border rounded px-2 py-1.5 text-sm text-chispa-text-primary focus:outline-none focus:border-chispa-orange/50">
              <option value="fuega_starter">Starter ($149)</option>
              <option value="fuega_growth">Growth ($349)</option>
              <option value="fuega_pro">Pro ($699)</option>
              <option value="fuega_enterprise">Enterprise ($1299)</option>
            </select>
            <input value={newClient.country} onChange={e => setNewClient(p => ({ ...p, country: e.target.value }))} placeholder="Country (MX)" className="bg-chispa-input border border-chispa-border rounded px-2 py-1.5 text-sm text-chispa-text-primary placeholder:text-chispa-text-muted focus:outline-none focus:border-chispa-orange/50" />
          </div>
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={async () => {
                if (!newClient.name.trim()) { toast.error('Name is required'); return; }
                setCreating(true);
                try {
                  const result = await api.clients.create(newClient);
                  setClients(prev => [{ ...newClient, id: result.id, status: 'active' }, ...prev]);
                  setShowNewClient(false);
                  setNewClient({ name: '', business_name: '', country: 'MX', plan_tier: 'fuega_starter', monthly_rate_usd: 149 });
                } catch { toast.error('Failed to create client'); }
                setCreating(false);
              }}
              disabled={creating}
              className="px-3 py-1.5 rounded bg-chispa-orange text-white text-[11px] font-medium hover:bg-chispa-orange/90 transition-colors disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create Client'}
            </button>
            <button onClick={() => setShowNewClient(false)} className="px-3 py-1.5 rounded text-[11px] text-chispa-text-muted hover:text-chispa-text-primary transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {clients.length === 0 ? (
        <EmptyState title="No clients yet" description="Clients will appear here once onboarded through the sales pipeline." />
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-2 mb-3">
            <StatCard label="Total Clients" value={clients.length} icon={<Users className="w-5 h-5" />} color="orange" />
            <StatCard label="Monthly Revenue" value={<span className="num">${totalRevenue}</span>} subValue={`\u2248 MXN ${(totalRevenue * 17.5).toLocaleString(undefined, {maximumFractionDigits: 0})}`} icon={<DollarSign className="w-5 h-5" />} color="teal" />
            <StatCard label="Avg Revenue/Client" value={<span className="num">${clients.length ? (totalRevenue / clients.length).toFixed(0) : 0}</span>} icon={<TrendingUp className="w-5 h-5" />} color="indigo" />
            <div className="bg-chispa-card border border-chispa-border rounded-lg p-2">
              <p className="text-[10px] font-medium text-chispa-text-muted uppercase tracking-wider mb-2">Plan Distribution</p>
              <div className="h-24">
                <Doughnut data={tierChartData} options={{
                  responsive: true, maintainAspectRatio: false, cutout: '60%',
                  plugins: { legend: { display: false }, tooltip: defaultChartOptions.plugins.tooltip },
                }} />
              </div>
            </div>
          </div>

          {/* Search / filter */}
          <div className="flex items-center gap-2 mb-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-chispa-text-muted" />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search clients..."
                className="w-full bg-chispa-input border border-chispa-border rounded-lg pl-8 pr-3 py-1.5 text-sm text-chispa-text-primary placeholder-chispa-text-muted focus:outline-none focus:border-chispa-orange/50"
              />
            </div>
            {query && (
              <span className="text-[11px] text-chispa-text-muted">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
            )}
          </div>

          <DataTable
            columns={clientColumns}
            data={filtered}
            getRowKey={(row) => row.id}
            onRowClick={(row) => navigate(`/clients/${row.id}`)}
            compact
            emptyMessage="No clients match your search"
          />
        </>
      )}
    </div>
  );
}
