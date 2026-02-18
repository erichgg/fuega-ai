import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Target, Users, Send, Trophy, LayoutGrid, Table2, Plus, X,
  Globe, Search, MapPin, Play, CheckCircle2, AlertCircle, Loader2,
} from 'lucide-react';
import { api } from '../lib/api';
import { activityBus } from '../lib/activityBus';
import { PageHeader } from '../components/PageHeader';
import { StatCard } from '../components/StatCard';
import { Tabs } from '../components/Tabs';
import { StatusDot } from '../components/StatusDot';
import { DataTable, type Column } from '../components/DataTable';
import { useToast } from '../lib/ToastContext';

const PIPELINE_STAGES = [
  { key: 'prospect', label: 'Prospects', color: '#6366F1' },
  { key: 'researched', label: 'Researched', color: '#8B5CF6' },
  { key: 'qualified', label: 'Qualified', color: '#EAB308' },
  { key: 'outreach_drafted', label: 'Outreach Drafted', color: '#F97316' },
  { key: 'outreach_sent', label: 'Outreach Sent', color: '#FF6B2C' },
  { key: 'responded', label: 'Responded', color: '#00D4AA' },
  { key: 'won', label: 'Won', color: '#22C55E' },
  { key: 'lost', label: 'Lost', color: '#EF4444' },
];

export default function Leads() {
  const navigate = useNavigate();
  const toast = useToast();
  const [kanban, setKanban] = useState<any>({ stages: {}, counts: {}, total: 0 });
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'kanban' | 'table'>('kanban');
  const [showNewLead, setShowNewLead] = useState(false);
  const [newLead, setNewLead] = useState({ business_name: '', industry: '', location: '', email: '' });
  const [scouting, setScouting] = useState(false);
  const [showScoutForm, setShowScoutForm] = useState(false);
  const [scoutLocation, setScoutLocation] = useState('');
  const [scoutIndustry, setScoutIndustry] = useState('');
  const [showPipelineForm, setShowPipelineForm] = useState(false);
  const [pipelineLocation, setPipelineLocation] = useState('');
  const [pipelineIndustry, setPipelineIndustry] = useState('');
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [pipelineStatus, setPipelineStatus] = useState<{ step: string; status: string } | null>(null);

  const loadData = () => {
    api.leads.kanban()
      .then(d => setKanban(d))
      .catch(() => toast.error('Failed to load leads pipeline.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const handleAddLead = async () => {
    const name = newLead.business_name.trim();
    if (!name) { toast.error('Business name is required'); return; }
    try {
      await api.leads.create(newLead);
      setNewLead({ business_name: '', industry: '', location: '', email: '' });
      setShowNewLead(false);
      loadData();
    } catch { toast.error('Failed to create lead'); }
  };

  const handleScout = async () => {
    const location = scoutLocation.trim();
    if (!location) { toast.error('Please enter a location to scout'); return; }
    setScouting(true);
    setShowScoutForm(false);
    try {
      const context: any = { location };
      if (scoutIndustry.trim()) context.industry = scoutIndustry.trim();
      const result = await api.workflows.runStep('local_outreach', 'scout_local_businesses', context);
      const parsed = result.parsed || {};
      if (parsed && typeof parsed === 'object') {
        const imported = await api.leads.fromAgentOutput({
          agent_output: parsed,
          source: 'local_outreach:scout_local_businesses',
        });
        loadData();
      } else {
        loadData();
      }
    } catch {
      toast.error('Scout action failed');
    }
    setScouting(false);
    setScoutLocation('');
    setScoutIndustry('');
  };

  const handleRunPipeline = async () => {
    const location = pipelineLocation.trim();
    if (!location) { toast.error('Please enter a target location'); return; }
    setPipelineRunning(true);
    setShowPipelineForm(false);
    setPipelineStatus({ step: 'Starting pipeline...', status: 'running' });
    activityBus.push('workflow', 'Outreach pipeline launched', `Target: ${location}`);
    try {
      const context: Record<string, string> = { location };
      if (pipelineIndustry.trim()) context.industry = pipelineIndustry.trim();

      const result = await api.workflows.trigger('outreach_pipeline', context);
      const runId = result.run_id;

      // Poll for progress
      const poll = async () => {
        try {
          const run = await api.workflows.get(runId);
          const steps = run.steps || [];
          const currentStep = steps.find((s: any) => s.status === 'running') || steps.find((s: any) => s.status === 'awaiting_approval');
          const completedCount = steps.filter((s: any) => s.status === 'completed').length;

          if (currentStep) {
            const agentName = currentStep.agent_slug?.replace(/_/g, ' ') || 'System';
            const stepLabel = `Step ${completedCount + 1}/${steps.length}: ${agentName} — ${currentStep.action?.replace(/_/g, ' ')}`;
            setPipelineStatus({ step: stepLabel, status: 'running' });
            activityBus.push('agent', stepLabel, `Run #${runId}`);
          }

          if (run.status === 'completed') {
            setPipelineStatus({ step: `All ${steps.length} steps completed!`, status: 'completed' });
            activityBus.push('success', `Pipeline complete — ${steps.length} steps done`);
            loadData();
            setTimeout(() => { setPipelineRunning(false); setPipelineStatus(null); }, 4000);
            return;
          } else if (run.status === 'failed') {
            setPipelineStatus({ step: run.error_message || 'Pipeline failed', status: 'failed' });
            activityBus.push('error', 'Pipeline failed', run.error_message);
            setTimeout(() => { setPipelineRunning(false); setPipelineStatus(null); }, 5000);
            return;
          } else if (run.status === 'paused_for_approval') {
            setPipelineStatus({ step: 'Waiting for your approval', status: 'approval' });
            activityBus.push('action', 'Approval needed', 'Pipeline paused for human review');
            loadData();
            setTimeout(() => { setPipelineRunning(false); setPipelineStatus(null); }, 5000);
            return;
          }

          setTimeout(poll, 3000);
        } catch {
          setPipelineRunning(false);
          setPipelineStatus(null);
        }
      };

      // Start polling after a short delay
      setTimeout(poll, 2000);
    } catch {
      toast.error('Failed to launch pipeline');
      setPipelineRunning(false);
      setPipelineStatus(null);
    }
    setPipelineLocation('');
    setPipelineIndustry('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-fuega-orange border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const stages = kanban.stages || {};
  const counts = kanban.counts || {};
  const allItems: { stage: string; stageLabel: string; lead: any }[] = [];
  PIPELINE_STAGES.forEach(s => {
    (stages[s.key] || []).forEach((lead: any) => {
      allItems.push({ stage: s.key, stageLabel: s.label, lead });
    });
  });

  const scoreColor = (score: number) =>
    score >= 70 ? 'text-green-400' : score >= 40 ? 'text-yellow-400' : 'text-fuega-text-muted';

  const columns: Column<{ stage: string; stageLabel: string; lead: any }>[] = [
    {
      key: 'business',
      label: 'Business',
      sortable: true,
      getValue: (row) => row.lead.business_name,
      render: (row) => (
        <button onClick={() => navigate(`/leads/${row.lead.id}`)} className="text-left">
          <span className="text-[12px] text-fuega-text-primary font-medium hover:text-fuega-orange transition-colors">{row.lead.business_name}</span>
        </button>
      ),
    },
    {
      key: 'stage',
      label: 'Stage',
      sortable: true,
      getValue: (row) => row.stageLabel,
      render: (row) => {
        const info = PIPELINE_STAGES.find(s => s.key === row.stage);
        return (
          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: (info?.color || '#666') + '20', color: info?.color }}>
            <StatusDot status={row.stage === 'won' ? 'active' : row.stage === 'lost' ? 'error' : 'running'} size="sm" />
            {row.stageLabel}
          </span>
        );
      },
    },
    {
      key: 'score',
      label: 'Score',
      sortable: true,
      getValue: (row) => row.lead.score ?? 0,
      render: (row) => <span className={`num text-[11px] ${scoreColor(row.lead.score || 0)}`}>{row.lead.score || 0}</span>,
    },
    {
      key: 'location',
      label: 'Location',
      sortable: true,
      getValue: (row) => row.lead.location || '',
      render: (row) => row.lead.location ? <span className="text-[10px] text-fuega-text-secondary">{row.lead.location}</span> : <span className="text-[10px] text-fuega-text-muted">--</span>,
    },
    {
      key: 'industry',
      label: 'Industry',
      sortable: true,
      getValue: (row) => row.lead.industry || '',
      render: (row) => row.lead.industry ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-fuega-input text-fuega-text-secondary">{row.lead.industry}</span> : <span className="text-[10px] text-fuega-text-muted">--</span>,
    },
    {
      key: 'source',
      label: 'Source',
      sortable: true,
      getValue: (row) => row.lead.source || '',
      render: (row) => row.lead.source ? <span className="text-[9px] text-fuega-text-muted">{row.lead.source}</span> : <span className="text-[10px] text-fuega-text-muted">--</span>,
    },
  ];

  const viewTabs = [
    { key: 'kanban', label: 'Pipeline', icon: <LayoutGrid className="w-3.5 h-3.5" /> },
    { key: 'table', label: 'Table', icon: <Table2 className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="animate-fadeIn">
      <PageHeader
        title="Leads Pipeline"
        subtitle={`${kanban.total || 0} leads across all stages`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Leads' },
        ]}
        action={
          <div className="flex items-center gap-2">
            <Tabs tabs={viewTabs} active={view} onChange={(k) => setView(k as 'kanban' | 'table')} />
            <button
              onClick={() => setShowPipelineForm(!showPipelineForm)}
              disabled={pipelineRunning}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-fuega-orange to-orange-500 text-white text-[12px] font-bold hover:from-fuega-orange/90 hover:to-orange-500/90 transition-all shadow-lg shadow-fuega-orange/20 disabled:opacity-50"
            >
              {pipelineRunning ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
              {pipelineRunning ? 'Running...' : 'Run Full Pipeline'}
            </button>
            <button
              onClick={() => setShowScoutForm(!showScoutForm)}
              disabled={scouting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-[12px] font-medium hover:bg-green-500/20 transition-colors disabled:opacity-50"
            >
              {scouting ? (
                <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <Globe className="w-3.5 h-3.5" />
              )}
              {scouting ? 'Scouting...' : 'Scout Only'}
            </button>
            <button
              onClick={() => setShowNewLead(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-fuega-orange text-white text-[12px] font-medium hover:bg-fuega-orange/90 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Lead
            </button>
          </div>
        }
      />

      {/* Inline New Lead Form */}
      {showNewLead && (
        <div className="mb-2 flex items-center gap-2 bg-fuega-card border border-fuega-border rounded-lg p-2">
          <input
            autoFocus
            value={newLead.business_name}
            onChange={e => setNewLead(prev => ({ ...prev, business_name: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && handleAddLead()}
            placeholder="Business name..."
            className="flex-1 bg-fuega-input border border-fuega-border rounded px-2 py-1 text-sm text-fuega-text-primary placeholder:text-fuega-text-muted focus:outline-none focus:border-fuega-orange/50"
          />
          <input
            value={newLead.industry}
            onChange={e => setNewLead(prev => ({ ...prev, industry: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && handleAddLead()}
            placeholder="Industry"
            className="w-28 bg-fuega-input border border-fuega-border rounded px-2 py-1 text-sm text-fuega-text-primary placeholder:text-fuega-text-muted focus:outline-none focus:border-fuega-orange/50"
          />
          <input
            value={newLead.location}
            onChange={e => setNewLead(prev => ({ ...prev, location: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && handleAddLead()}
            placeholder="Location"
            className="w-28 bg-fuega-input border border-fuega-border rounded px-2 py-1 text-sm text-fuega-text-primary placeholder:text-fuega-text-muted focus:outline-none focus:border-fuega-orange/50"
          />
          <input
            value={newLead.email}
            onChange={e => setNewLead(prev => ({ ...prev, email: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && handleAddLead()}
            placeholder="Email"
            className="w-36 bg-fuega-input border border-fuega-border rounded px-2 py-1 text-sm text-fuega-text-primary placeholder:text-fuega-text-muted focus:outline-none focus:border-fuega-orange/50"
          />
          <button onClick={handleAddLead} className="px-3 py-1 rounded bg-fuega-orange text-white text-xs font-medium hover:bg-fuega-orange/90 transition-colors">Add</button>
          <button onClick={() => { setShowNewLead(false); setNewLead({ business_name: '', industry: '', location: '', email: '' }); }} className="p-1 rounded text-fuega-text-muted hover:text-fuega-text-primary transition-colors"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Scout Form */}
      {showScoutForm && (
        <div className="mb-2 flex items-center gap-2 bg-green-500/5 border border-green-500/20 rounded-lg p-2">
          <Globe className="w-4 h-4 text-green-400 flex-shrink-0" />
          <input
            autoFocus
            value={scoutLocation}
            onChange={e => setScoutLocation(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleScout()}
            placeholder="Location (e.g. Mexico City, Condesa)"
            className="flex-1 bg-fuega-input border border-fuega-border rounded px-2 py-1 text-sm text-fuega-text-primary placeholder:text-fuega-text-muted focus:outline-none focus:border-green-500/50"
          />
          <input
            value={scoutIndustry}
            onChange={e => setScoutIndustry(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleScout()}
            placeholder="Industry (optional)"
            className="w-36 bg-fuega-input border border-fuega-border rounded px-2 py-1 text-sm text-fuega-text-primary placeholder:text-fuega-text-muted focus:outline-none focus:border-green-500/50"
          />
          <button onClick={handleScout} className="px-3 py-1 rounded bg-green-500 text-white text-xs font-medium hover:bg-green-600 transition-colors">Scout</button>
          <button onClick={() => setShowScoutForm(false)} className="p-1 rounded text-fuega-text-muted hover:text-fuega-text-primary transition-colors"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Pipeline Form */}
      {showPipelineForm && (
        <div className="mb-2 bg-gradient-to-r from-fuega-orange/5 to-orange-500/5 border border-fuega-orange/20 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Play className="w-4 h-4 text-fuega-orange flex-shrink-0" />
            <span className="text-xs font-semibold text-fuega-text-primary">Run Full Outreach Pipeline</span>
            <span className="text-[10px] text-fuega-text-muted ml-1">Scout → Research → Score → Draft Outreach → Review → Compliance → Approval</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={pipelineLocation}
              onChange={e => setPipelineLocation(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleRunPipeline()}
              placeholder="Target location (e.g. Monterrey, Mexico)"
              className="flex-1 bg-fuega-input border border-fuega-border rounded px-2 py-1.5 text-sm text-fuega-text-primary placeholder:text-fuega-text-muted focus:outline-none focus:border-fuega-orange/50"
            />
            <input
              value={pipelineIndustry}
              onChange={e => setPipelineIndustry(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleRunPipeline()}
              placeholder="Industry (optional)"
              className="w-40 bg-fuega-input border border-fuega-border rounded px-2 py-1.5 text-sm text-fuega-text-primary placeholder:text-fuega-text-muted focus:outline-none focus:border-fuega-orange/50"
            />
            <button onClick={handleRunPipeline} className="px-4 py-1.5 rounded bg-gradient-to-r from-fuega-orange to-orange-500 text-white text-xs font-bold hover:from-fuega-orange/90 hover:to-orange-500/90 transition-all shadow-lg shadow-fuega-orange/20">
              Launch
            </button>
            <button onClick={() => setShowPipelineForm(false)} className="p-1 rounded text-fuega-text-muted hover:text-fuega-text-primary transition-colors"><X className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {/* Pipeline Progress Banner */}
      {pipelineStatus && (
        <div className={`mb-2 flex items-center gap-2 rounded-lg p-2.5 border ${
          pipelineStatus.status === 'completed' ? 'bg-green-500/5 border-green-500/20' :
          pipelineStatus.status === 'failed' ? 'bg-red-500/5 border-red-500/20' :
          pipelineStatus.status === 'approval' ? 'bg-yellow-500/5 border-yellow-500/20' :
          'bg-fuega-orange/5 border-fuega-orange/20'
        }`}>
          {pipelineStatus.status === 'completed' ? <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" /> :
           pipelineStatus.status === 'failed' ? <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" /> :
           pipelineStatus.status === 'approval' ? <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0" /> :
           <Loader2 className="w-4 h-4 text-fuega-orange animate-spin flex-shrink-0" />}
          <span className={`text-xs font-medium ${
            pipelineStatus.status === 'completed' ? 'text-green-400' :
            pipelineStatus.status === 'failed' ? 'text-red-400' :
            pipelineStatus.status === 'approval' ? 'text-yellow-400' :
            'text-fuega-orange'
          }`}>
            {pipelineStatus.step}
          </span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-2">
        <StatCard label="Prospects" value={counts.prospect || 0} icon={<Search className="w-5 h-5" />} color="indigo" />
        <StatCard label="Qualified" value={counts.qualified || 0} icon={<Target className="w-5 h-5" />} color="yellow" />
        <StatCard label="Outreach" value={(counts.outreach_drafted || 0) + (counts.outreach_sent || 0)} icon={<Send className="w-5 h-5" />} color="orange" />
        <StatCard label="Won" value={counts.won || 0} icon={<Trophy className="w-5 h-5" />} color="teal" />
      </div>

      {/* Kanban View */}
      {view === 'kanban' && (
        <div className="overflow-x-auto pb-2 -mx-1 px-1">
          <div className="flex gap-2" style={{ minWidth: `${PIPELINE_STAGES.length * 200}px` }}>
            {PIPELINE_STAGES.map(stage => {
              const items = stages[stage.key] || [];
              return (
                <div key={stage.key} className="flex-1 min-w-[180px] bg-fuega-card border border-fuega-border rounded-lg flex flex-col">
                  {/* Column header */}
                  <div className="p-2 border-b border-fuega-border">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: stage.color }} />
                      <span className="text-xs font-semibold text-fuega-text-primary truncate">{stage.label}</span>
                      <span className="num text-[10px] px-1.5 py-0.5 rounded-full ml-auto flex-shrink-0" style={{ backgroundColor: stage.color + '20', color: stage.color }}>
                        {items.length}
                      </span>
                    </div>
                  </div>

                  {/* Cards */}
                  <div className="p-1.5 flex-1 space-y-1.5 overflow-y-auto max-h-[calc(100vh-340px)]">
                    {items.length === 0 && (
                      <div className="text-[10px] text-fuega-text-muted text-center py-4 opacity-50">No leads</div>
                    )}
                    {items.map((lead: any) => (
                      <button
                        key={lead.id}
                        onClick={() => navigate(`/leads/${lead.id}`)}
                        className="w-full text-left bg-fuega-bg border border-fuega-border rounded-md p-2 hover:border-fuega-orange/30 transition-all cursor-pointer group"
                      >
                        <p className="text-[11px] font-medium text-fuega-text-primary leading-tight mb-1 line-clamp-2">
                          {lead.business_name}
                        </p>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {lead.industry && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-fuega-input text-fuega-text-secondary">{lead.industry}</span>
                          )}
                          {lead.score > 0 && (
                            <span className={`num text-[10px] font-semibold ${scoreColor(lead.score)}`}>{lead.score}</span>
                          )}
                        </div>
                        {lead.location && (
                          <div className="flex items-center gap-1 mt-1 text-[9px] text-fuega-text-muted">
                            <MapPin className="w-2.5 h-2.5" />
                            <span className="truncate">{lead.location}</span>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Table View */}
      {view === 'table' && (
        <DataTable
          columns={columns}
          data={allItems}
          getRowKey={(row) => `${row.stage}-${row.lead.id}`}
          compact
          emptyMessage="No leads found. Scout for prospects or add a lead manually."
        />
      )}
    </div>
  );
}
