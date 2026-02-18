import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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

const STAGE_KEYS = [
  { key: 'prospect', labelKey: 'stages.prospect', color: '#6366F1' },
  { key: 'researched', labelKey: 'stages.researched', color: '#8B5CF6' },
  { key: 'qualified', labelKey: 'stages.qualified', color: '#EAB308' },
  { key: 'outreach_drafted', labelKey: 'stages.outreach_drafted', color: '#F97316' },
  { key: 'outreach_sent', labelKey: 'stages.outreach_sent', color: '#FF6B2C' },
  { key: 'responded', labelKey: 'stages.responded', color: '#00D4AA' },
  { key: 'won', labelKey: 'stages.won', color: '#22C55E' },
  { key: 'lost', labelKey: 'stages.lost', color: '#EF4444' },
];

const CHANNELS = ['email', 'dm', 'phone', 'whatsapp'];

export default function LeadDetail() {
  const { t } = useTranslation(['leadDetail', 'leads', 'common']);
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
      .catch(() => toast.error(t('common:errors.failedToLoad', { resource: t('leadDetail:title').toLowerCase() })))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { loadLead(); }, [loadLead]);

  const handleStageChange = async (stage: string) => {
    setStageOpen(false);
    try {
      const updated = await api.leads.update(Number(id), { stage });
      setLead(updated);
    } catch { toast.error(t('common:errors.failedToUpdate', { resource: t('leadDetail:labels.stage') })); }
  };

  const handleSaveNotes = async () => {
    setSaving(true);
    try {
      const updated = await api.leads.update(Number(id), { notes });
      setLead(updated);
    } catch { toast.error(t('common:errors.failedAction', { action: t('leadDetail:notes.saveNotes') })); }
    setSaving(false);
  };

  const handleSaveOutreach = async () => {
    setSaving(true);
    try {
      const updated = await api.leads.update(Number(id), { outreach_draft: outreach, outreach_channel: channel });
      setLead(updated);
    } catch { toast.error(t('common:errors.failedAction', { action: t('leadDetail:outreach.saveOutreach') })); }
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
      toast.error(t('common:errors.failedToSend', { resource: t('leadDetail:outreach.sendEmail') }));
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
      toast.error(t('common:errors.failedAction', { action: label }));
    }
    setRunningAgent(null);
  };

  const handleConvert = async () => {
    try {
      const result = await api.leads.convert(Number(id));
      toast.success(t('leadDetail:convertedSuccess', { id: result.client_id }));
      navigate(`/clients/${result.client_id}`);
    } catch { toast.error(t('leadDetail:errors.convertFailed')); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-fuega-orange border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const STAGES = STAGE_KEYS.map(s => ({ ...s, label: t(`leads:${s.labelKey}`) }));

  if (!lead) {
    return (
      <div className="animate-fadeIn">
        <PageHeader title={t('leadDetail:title')} breadcrumbs={[{ label: t('leads:title'), href: '/leads' }, { label: t('leadDetail:notFound') }]} />
        <EmptyState title={t('leadDetail:notFound')} description={t('leadDetail:notFoundDesc')} />
      </div>
    );
  }

  const stageInfo = STAGES.find(s => s.key === lead.stage) || STAGES[0];
  const scoreColor = (lead.score || 0) >= 70 ? 'text-green-400' : (lead.score || 0) >= 40 ? 'text-yellow-400' : 'text-fuega-text-muted';

  const agentActions = [
    { label: t('leadDetail:agentActions.deepResearch'), agent: 'smb_researcher', action: 'research_businesses', icon: <Search className="w-3 h-3" />, color: '#8B5CF6' },
    { label: t('leadDetail:agentActions.scoreLead'), agent: 'prospector', action: 'score_and_qualify', icon: <Target className="w-3 h-3" />, color: '#EAB308' },
    { label: t('leadDetail:agentActions.draftOutreach'), agent: 'local_outreach', action: 'draft_outreach', icon: <PenTool className="w-3 h-3" />, color: '#FF6B2C' },
  ];

  return (
    <div className="animate-fadeIn">
      <PageHeader
        title={lead.business_name}
        subtitle={lead.contact_name || lead.industry || t('leadDetail:title')}
        breadcrumbs={[
          { label: t('common:breadcrumbs.dashboard'), href: '/' },
          { label: t('leads:title'), href: '/leads' },
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
              <div className="absolute top-full mt-1 right-0 z-10 bg-fuega-card border border-fuega-border rounded-lg shadow-lg py-1 min-w-[160px]">
                {STAGES.map(s => (
                  <button
                    key={s.key}
                    onClick={() => handleStageChange(s.key)}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-left transition-colors ${
                      s.key === lead.stage ? 'bg-fuega-orange/10 text-fuega-orange' : 'text-fuega-text-secondary hover:bg-fuega-card-hover'
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
      <div className="flex items-center gap-4 mb-3 text-[11px] text-fuega-text-secondary flex-wrap">
        <div className="w-10 h-10 rounded-xl bg-fuega-orange/10 flex items-center justify-center flex-shrink-0">
          <span className="text-lg font-bold text-fuega-orange">{lead.business_name?.charAt(0)}</span>
        </div>
        {lead.score > 0 && <span className={`num text-sm font-bold ${scoreColor}`}>{t('leadDetail:labels.score')}: {lead.score}</span>}
        {lead.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{lead.location}</span>}
        {lead.country && <span className="flex items-center gap-1">{lead.country}</span>}
        {lead.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{lead.email}</span>}
        {lead.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{lead.phone}</span>}
        {lead.website_url && (
          <a href={lead.website_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-fuega-orange hover:underline">
            <Globe className="w-3 h-3" />{lead.website_url}
          </a>
        )}
        {lead.source && <span className="text-[10px] px-1.5 py-0.5 rounded bg-fuega-input text-fuega-text-muted">{t('leadDetail:labels.source')}: {lead.source}</span>}
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-medium transition-all disabled:opacity-50 hover:bg-fuega-card-hover"
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
          {t('leadDetail:agentActions.convertToClient')}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        {/* Digital Presence Audit */}
        <ChartCard title={t('leadDetail:digitalPresence.title')} subtitle={t('leadDetail:digitalPresence.subtitle')}>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-fuega-input border border-fuega-border">
              <Star className="w-4 h-4 text-yellow-400" />
              <div>
                <p className="text-[10px] text-fuega-text-muted">{t('leadDetail:digitalPresence.googleRating')}</p>
                <p className="text-sm font-semibold text-fuega-text-primary num">{lead.google_rating ?? '--'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-fuega-input border border-fuega-border">
              <MessageSquare className="w-4 h-4 text-blue-400" />
              <div>
                <p className="text-[10px] text-fuega-text-muted">{t('leadDetail:digitalPresence.reviews')}</p>
                <p className="text-sm font-semibold text-fuega-text-primary num">{lead.review_count ?? '--'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-fuega-input border border-fuega-border">
              {lead.has_website ? <CheckCircle className="w-4 h-4 text-green-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
              <div>
                <p className="text-[10px] text-fuega-text-muted">{t('leadDetail:digitalPresence.website')}</p>
                <p className="text-sm font-semibold text-fuega-text-primary">{lead.has_website ? t('common:labels.yes') : lead.has_website === false ? t('common:labels.no') : '--'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-fuega-input border border-fuega-border">
              {lead.has_social ? <CheckCircle className="w-4 h-4 text-green-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
              <div>
                <p className="text-[10px] text-fuega-text-muted">{t('leadDetail:digitalPresence.socialMedia')}</p>
                <p className="text-sm font-semibold text-fuega-text-primary">{lead.has_social ? t('common:labels.yes') : lead.has_social === false ? t('common:labels.no') : '--'}</p>
              </div>
            </div>
          </div>
          {lead.digital_gap_score != null && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[10px] text-fuega-text-muted">{t('leadDetail:digitalPresence.digitalGapScore')}:</span>
              <div className="flex-1 h-2 bg-fuega-surface rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-fuega-orange" style={{ width: `${lead.digital_gap_score}%` }} />
              </div>
              <span className="num text-[11px] text-fuega-orange">{lead.digital_gap_score}%</span>
            </div>
          )}
          {lead.recommended_service_tier && (
            <div className="mt-2 text-[10px] text-fuega-text-muted">
              {t('leadDetail:digitalPresence.recommendedTier')}: <span className="text-fuega-text-primary font-medium">{lead.recommended_service_tier}</span>
            </div>
          )}
        </ChartCard>

        {/* Outreach Section */}
        <ChartCard title={t('leadDetail:outreach.title')} subtitle={lead.outreach_channel || t('leadDetail:outreach.title')}>
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] text-fuega-text-muted">{t('leadDetail:outreach.channel')}:</span>
              {CHANNELS.map(ch => (
                <button
                  key={ch}
                  onClick={() => setChannel(ch)}
                  className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                    channel === ch ? 'bg-fuega-orange/10 border-fuega-orange/40 text-fuega-orange' : 'border-fuega-border text-fuega-text-muted hover:text-fuega-text-primary'
                  }`}
                >
                  {ch}
                </button>
              ))}
            </div>
            <textarea
              value={outreach}
              onChange={e => setOutreach(e.target.value)}
              placeholder={t('leadDetail:outreach.placeholder')}
              rows={6}
              className="w-full bg-fuega-input border border-fuega-border rounded-lg px-2.5 py-1.5 text-[12px] text-fuega-text-primary placeholder-fuega-text-muted resize-none focus:outline-none focus:border-fuega-orange/50"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveOutreach}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1 rounded bg-fuega-orange text-white text-[11px] font-medium hover:bg-fuega-orange/90 transition-colors disabled:opacity-50"
              >
                <Save className="w-3 h-3" />
                {t('leadDetail:outreach.saveOutreach')}
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
                  {t('leadDetail:outreach.sendEmail')}
                </button>
              )}
            </div>
          </div>
        </ChartCard>

        {/* Research Panel */}
        <ChartCard title={t('leadDetail:research.title')} subtitle={t('leadDetail:research.subtitle')} collapsible>
          {lead.agent_research ? (
            <div className="space-y-2">
              {typeof lead.agent_research === 'object' ? (
                Object.entries(lead.agent_research).map(([key, val]) => (
                  <div key={key} className="text-[11px]">
                    <span className="font-semibold text-fuega-text-primary capitalize">{key.replace(/_/g, ' ')}:</span>{' '}
                    <span className="text-fuega-text-secondary">
                      {typeof val === 'string' ? val : JSON.stringify(val, null, 2)}
                    </span>
                  </div>
                ))
              ) : (
                <pre className="text-[10px] text-fuega-text-secondary whitespace-pre-wrap">{String(lead.agent_research)}</pre>
              )}
            </div>
          ) : (
            <EmptyState title={t('leadDetail:research.noResearch')} description={t('leadDetail:research.noResearchDesc')} />
          )}
        </ChartCard>

        {/* Notes */}
        <ChartCard title={t('leadDetail:notes.title')} subtitle={t('leadDetail:notes.subtitle')}>
          <div className="space-y-2">
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder={t('leadDetail:notes.placeholder')}
              rows={5}
              className="w-full bg-fuega-input border border-fuega-border rounded-lg px-2.5 py-1.5 text-[12px] text-fuega-text-primary placeholder-fuega-text-muted resize-none focus:outline-none focus:border-fuega-orange/50"
            />
            <button
              onClick={handleSaveNotes}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1 rounded bg-fuega-orange text-white text-[11px] font-medium hover:bg-fuega-orange/90 transition-colors disabled:opacity-50"
            >
              <Save className="w-3 h-3" />
              {t('leadDetail:notes.saveNotes')}
            </button>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
