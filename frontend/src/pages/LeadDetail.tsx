import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Target, MapPin, Globe, Mail, Phone, Star, Search,
  PenTool, UserCheck, ChevronDown, Save, Send,
  CheckCircle, XCircle, MessageSquare,
} from 'lucide-react';
import { api } from '../lib/api';
import { activityBus } from '../lib/activityBus';
import { useToast } from '../lib/ToastContext';
import { PageHeader } from '../components/PageHeader';
import { ChartCard } from '../components/ChartCard';
import { EmptyState } from '../components/EmptyState';
import { StatusDot } from '../components/StatusDot';

const STAGES = [
  { key: 'prospect', label: 'Prospect', color: '#6366F1' },
  { key: 'researched', label: 'Researched', color: '#8B5CF6' },
  { key: 'qualified', label: 'Qualified', color: '#EAB308' },
  { key: 'outreach_drafted', label: 'Outreach Drafted', color: '#F97316' },
  { key: 'outreach_sent', label: 'Outreach Sent', color: '#FF6B2C' },
  { key: 'responded', label: 'Responded', color: '#00D4AA' },
  { key: 'won', label: 'Won', color: '#22C55E' },
  { key: 'lost', label: 'Lost', color: '#EF4444' },
];

const CHANNELS = ['email', 'dm', 'phone', 'whatsapp'];

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [lead, setLead] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stageOpen, setStageOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [outreach, setOutreach] = useState('');
  const [channel, setChannel] = useState('email');
  const [saving, setSaving] = useState(false);
  const [runningAgent, setRunningAgent] = useState<string | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);

  const loadLead = useCallback(() => {
    if (!id) return;
    api.leads.get(Number(id))
      .then(data => {
        setLead(data);
        setNotes(data.notes || '');
        setOutreach(data.outreach_draft || '');
        setChannel(data.outreach_channel || 'email');
      })
      .catch(() => toast.error('Failed to load lead details.'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { loadLead(); }, [loadLead]);

  const handleStageChange = async (stage: string) => {
    setStageOpen(false);
    try {
      const updated = await api.leads.update(Number(id), { stage });
      setLead(updated);
    } catch { toast.error('Failed to update stage'); }
  };

  const handleSaveNotes = async () => {
    setSaving(true);
    try {
      const updated = await api.leads.update(Number(id), { notes });
      setLead(updated);
    } catch { toast.error('Failed to save notes'); }
    setSaving(false);
  };

  const handleSaveOutreach = async () => {
    setSaving(true);
    try {
      const updated = await api.leads.update(Number(id), { outreach_draft: outreach, outreach_channel: channel });
      setLead(updated);
    } catch { toast.error('Failed to save outreach'); }
    setSaving(false);
  };

  const handleSendEmail = async () => {
    if (!lead?.email || !outreach.trim()) return;
    setSendingEmail(true);
    try {
      const subject = `${lead.business_name} — Fuega AI`;
      await api.integrations.resend.sendEmail(lead.email, subject, outreach, 'local_outreach');
      const updated = await api.leads.update(Number(id), { stage: 'outreach_sent' });
      setLead(updated);
    } catch {
      toast.error('Failed to send email');
    }
    setSendingEmail(false);
  };

  const handleRunAgent = async (agentSlug: string, action: string, label: string) => {
    const key = `${agentSlug}:${action}`;
    setRunningAgent(key);
    activityBus.push('agent', `${label} on ${lead?.business_name || 'lead'}`, `${agentSlug}: ${action}`);
    try {
      const result = await api.leads.runAgent(Number(id), agentSlug, action);
      setLead(result.lead);
      setNotes(result.lead.notes || notes);
      setOutreach(result.lead.outreach_draft || outreach);
      setChannel(result.lead.outreach_channel || channel);
      activityBus.push('success', `${label} done`, `$${result.cost_usd?.toFixed(4) || '0'}`);
    } catch {
      toast.error(`${label} failed`);
    }
    setRunningAgent(null);
  };

  const handleConvert = async () => {
    try {
      const result = await api.leads.convert(Number(id));
      toast.success(`Lead converted to Client #${result.client_id}!`);
      navigate(`/clients/${result.client_id}`);
    } catch { toast.error('Failed to convert lead'); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-chispa-orange border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="animate-fadeIn">
        <PageHeader title="Lead" breadcrumbs={[{ label: 'Leads', href: '/leads' }, { label: 'Not found' }]} />
        <EmptyState title="Lead not found" description="This lead doesn't exist or the backend is unavailable." />
      </div>
    );
  }

  const stageInfo = STAGES.find(s => s.key === lead.stage) || STAGES[0];
  const scoreColor = (lead.score || 0) >= 70 ? 'text-green-400' : (lead.score || 0) >= 40 ? 'text-yellow-400' : 'text-chispa-text-muted';

  const agentActions = [
    { label: 'Deep Research', agent: 'smb_researcher', action: 'research_businesses', icon: <Search className="w-3 h-3" />, color: '#8B5CF6' },
    { label: 'Score Lead', agent: 'prospector', action: 'score_and_qualify', icon: <Target className="w-3 h-3" />, color: '#EAB308' },
    { label: 'Draft Outreach', agent: 'local_outreach', action: 'draft_outreach', icon: <PenTool className="w-3 h-3" />, color: '#FF6B2C' },
  ];

  return (
    <div className="animate-fadeIn">
      <PageHeader
        title={lead.business_name}
        subtitle={lead.contact_name || lead.industry || 'Lead'}
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Leads', href: '/leads' },
          { label: lead.business_name },
        ]}
        status={
          <div className="relative">
            <button
              onClick={() => setStageOpen(!stageOpen)}
              className="inline-flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-lg border transition-colors"
              style={{ backgroundColor: stageInfo.color + '15', borderColor: stageInfo.color + '40', color: stageInfo.color }}
            >
              <StatusDot status={lead.stage === 'won' ? 'active' : lead.stage === 'lost' ? 'error' : 'running'} size="sm" />
              {stageInfo.label}
              <ChevronDown className="w-3 h-3" />
            </button>
            {stageOpen && (
              <div className="absolute top-full mt-1 right-0 z-10 bg-chispa-card border border-chispa-border rounded-lg shadow-lg py-1 min-w-[160px]">
                {STAGES.map(s => (
                  <button
                    key={s.key}
                    onClick={() => handleStageChange(s.key)}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-left transition-colors ${
                      s.key === lead.stage ? 'bg-chispa-orange/10 text-chispa-orange' : 'text-chispa-text-secondary hover:bg-chispa-card-hover'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        }
      />

      {/* Lead info bar */}
      <div className="flex items-center gap-4 mb-3 text-[11px] text-chispa-text-secondary flex-wrap">
        <div className="w-10 h-10 rounded-xl bg-chispa-orange/10 flex items-center justify-center flex-shrink-0">
          <span className="text-lg font-bold text-chispa-orange">{lead.business_name?.charAt(0)}</span>
        </div>
        {lead.score > 0 && <span className={`num text-sm font-bold ${scoreColor}`}>Score: {lead.score}</span>}
        {lead.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{lead.location}</span>}
        {lead.country && <span className="flex items-center gap-1">{lead.country}</span>}
        {lead.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{lead.email}</span>}
        {lead.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{lead.phone}</span>}
        {lead.website_url && (
          <a href={lead.website_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-chispa-orange hover:underline">
            <Globe className="w-3 h-3" />{lead.website_url}
          </a>
        )}
        {lead.source && <span className="text-[10px] px-1.5 py-0.5 rounded bg-chispa-input text-chispa-text-muted">Source: {lead.source}</span>}
      </div>

      {/* Agent Actions Bar */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {agentActions.map(a => {
          const key = `${a.agent}:${a.action}`;
          const isRunning = runningAgent === key;
          return (
            <button
              key={key}
              onClick={() => handleRunAgent(a.agent, a.action, a.label)}
              disabled={!!runningAgent}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-medium transition-all disabled:opacity-50 hover:bg-chispa-card-hover"
              style={{ borderColor: a.color + '40', color: a.color }}
            >
              {isRunning ? (
                <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                a.icon
              )}
              {a.label}
            </button>
          );
        })}
        <button
          onClick={handleConvert}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-[11px] font-medium hover:bg-green-500/20 transition-colors ml-auto"
        >
          <UserCheck className="w-3.5 h-3.5" />
          Convert to Client
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        {/* Digital Presence Audit */}
        <ChartCard title="Digital Presence" subtitle="Scout data">
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-chispa-input border border-chispa-border">
              <Star className="w-4 h-4 text-yellow-400" />
              <div>
                <p className="text-[10px] text-chispa-text-muted">Google Rating</p>
                <p className="text-sm font-semibold text-chispa-text-primary num">{lead.google_rating ?? '--'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-chispa-input border border-chispa-border">
              <MessageSquare className="w-4 h-4 text-blue-400" />
              <div>
                <p className="text-[10px] text-chispa-text-muted">Reviews</p>
                <p className="text-sm font-semibold text-chispa-text-primary num">{lead.review_count ?? '--'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-chispa-input border border-chispa-border">
              {lead.has_website ? <CheckCircle className="w-4 h-4 text-green-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
              <div>
                <p className="text-[10px] text-chispa-text-muted">Website</p>
                <p className="text-sm font-semibold text-chispa-text-primary">{lead.has_website ? 'Yes' : lead.has_website === false ? 'No' : '--'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-chispa-input border border-chispa-border">
              {lead.has_social ? <CheckCircle className="w-4 h-4 text-green-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
              <div>
                <p className="text-[10px] text-chispa-text-muted">Social Media</p>
                <p className="text-sm font-semibold text-chispa-text-primary">{lead.has_social ? 'Yes' : lead.has_social === false ? 'No' : '--'}</p>
              </div>
            </div>
          </div>
          {lead.digital_gap_score != null && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[10px] text-chispa-text-muted">Digital Gap Score:</span>
              <div className="flex-1 h-2 bg-chispa-surface rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-chispa-orange" style={{ width: `${lead.digital_gap_score}%` }} />
              </div>
              <span className="num text-[11px] text-chispa-orange">{lead.digital_gap_score}%</span>
            </div>
          )}
          {lead.recommended_service_tier && (
            <div className="mt-2 text-[10px] text-chispa-text-muted">
              Recommended tier: <span className="text-chispa-text-primary font-medium">{lead.recommended_service_tier}</span>
            </div>
          )}
        </ChartCard>

        {/* Outreach Section */}
        <ChartCard title="Outreach" subtitle={lead.outreach_channel || 'Draft your pitch'}>
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] text-chispa-text-muted">Channel:</span>
              {CHANNELS.map(ch => (
                <button
                  key={ch}
                  onClick={() => setChannel(ch)}
                  className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                    channel === ch ? 'bg-chispa-orange/10 border-chispa-orange/40 text-chispa-orange' : 'border-chispa-border text-chispa-text-muted hover:text-chispa-text-primary'
                  }`}
                >
                  {ch}
                </button>
              ))}
            </div>
            <textarea
              value={outreach}
              onChange={e => setOutreach(e.target.value)}
              placeholder="Outreach message draft... Use 'Draft Outreach' agent action to auto-generate."
              rows={6}
              className="w-full bg-chispa-input border border-chispa-border rounded-lg px-2.5 py-1.5 text-[12px] text-chispa-text-primary placeholder-chispa-text-muted resize-none focus:outline-none focus:border-chispa-orange/50"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveOutreach}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1 rounded bg-chispa-orange text-white text-[11px] font-medium hover:bg-chispa-orange/90 transition-colors disabled:opacity-50"
              >
                <Save className="w-3 h-3" />
                Save Outreach
              </button>
              {lead.email && outreach.trim() && (
                <button
                  onClick={handleSendEmail}
                  disabled={sendingEmail || saving}
                  className="flex items-center gap-1.5 px-3 py-1 rounded bg-green-500/10 border border-green-500/30 text-green-400 text-[11px] font-medium hover:bg-green-500/20 transition-colors disabled:opacity-50"
                >
                  {sendingEmail ? (
                    <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="w-3 h-3" />
                  )}
                  Send Email
                </button>
              )}
            </div>
          </div>
        </ChartCard>

        {/* Research Panel */}
        <ChartCard title="Agent Research" subtitle="Deep-dive brief" collapsible>
          {lead.agent_research ? (
            <div className="space-y-2">
              {typeof lead.agent_research === 'object' ? (
                Object.entries(lead.agent_research).map(([key, val]) => (
                  <div key={key} className="text-[11px]">
                    <span className="font-semibold text-chispa-text-primary capitalize">{key.replace(/_/g, ' ')}:</span>{' '}
                    <span className="text-chispa-text-secondary">
                      {typeof val === 'string' ? val : JSON.stringify(val, null, 2)}
                    </span>
                  </div>
                ))
              ) : (
                <pre className="text-[10px] text-chispa-text-secondary whitespace-pre-wrap">{String(lead.agent_research)}</pre>
              )}
            </div>
          ) : (
            <EmptyState title="No research yet" description='Click "Deep Research" to generate a research brief.' />
          )}
        </ChartCard>

        {/* Notes */}
        <ChartCard title="Notes" subtitle="Internal notes">
          <div className="space-y-2">
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add notes about this lead..."
              rows={5}
              className="w-full bg-chispa-input border border-chispa-border rounded-lg px-2.5 py-1.5 text-[12px] text-chispa-text-primary placeholder-chispa-text-muted resize-none focus:outline-none focus:border-chispa-orange/50"
            />
            <button
              onClick={handleSaveNotes}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1 rounded bg-chispa-orange text-white text-[11px] font-medium hover:bg-chispa-orange/90 transition-colors disabled:opacity-50"
            >
              <Save className="w-3 h-3" />
              Save Notes
            </button>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
