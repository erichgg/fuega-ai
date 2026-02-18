import { useEffect, useState, useRef } from 'react';
import { Send, Bot, CheckSquare, Square } from 'lucide-react';
import { api } from '../lib/api';
import { useToast } from '../lib/ToastContext';
import { PageHeader } from '../components/PageHeader';
import { Badge } from '../components/Badge';
import { StatusDot } from '../components/StatusDot';

const DIVISIONS: Record<string, string[]> = {
  'Content': ['editor', 'content_writer', 'social_media_manager'],
  'Growth': ['ads_manager', 'seo_analyst', 'analytics_agent', 'email_marketing_agent'],
  'Finance': ['cfo_agent', 'sales_agent', 'fulfillment_agent'],
  'Outreach': ['local_outreach', 'smb_researcher', 'prospector'],
  'Operations': ['legal_bot'],
};

const MESSAGE_PRESETS = [
  { label: 'Status report', text: 'Give me a brief status report on your current tasks, blockers, and priorities.' },
  { label: 'Weekly summary', text: 'Provide a weekly summary of accomplishments, metrics, and next steps.' },
  { label: 'Budget check', text: 'Report your current budget usage and any concerns about spend.' },
];

interface ChatResponse {
  slug: string;
  name: string;
  response: string;
  cost_usd?: number;
  error?: boolean;
}

interface ChatSession {
  message: string;
  agents: string[];
  responses: ChatResponse[];
}

const SESSION_KEY = 'chispa_teamchat_sessions';

function loadSessions(): ChatSession[] {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSessions(sessions: ChatSession[]) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessions));
  } catch {
    // storage full, silently ignore
  }
}

export default function TeamChat() {
  const [agents, setAgents] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState('');
  const [sessions, setSessions] = useState<ChatSession[]>(loadSessions);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.agents.list()
      .then(setAgents)
      .catch(() => toast.error('Failed to load agents. Check that the backend is running.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sessions]);

  const toggleAgent = (slug: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(agents.map(a => a.slug)));
  const clearAll = () => setSelected(new Set());
  const selectDivision = (slugs: string[]) => {
    setSelected(prev => {
      const next = new Set(prev);
      slugs.forEach(s => next.add(s));
      return next;
    });
  };

  const handleSend = async (text?: string) => {
    const msg = (text || message).trim();
    if (!msg || selected.size === 0) return;
    setSending(true);
    try {
      const result = await api.agents.teamChat(Array.from(selected), msg);
      const session: ChatSession = { message: msg, agents: Array.from(selected), responses: result };
      const updated = [...sessions, session];
      setSessions(updated);
      saveSessions(updated);
      setMessage('');
    } catch {
      toast.error('Failed to send message. Check that the backend is running.');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-chispa-orange border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      <PageHeader title="Team Chat" subtitle="Multi-agent group discussion" />

      {/* Agent selector */}
      <div className="bg-chispa-card border border-chispa-border rounded-xl p-2 mb-2 card-glow">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-chispa-text-primary">Select Agents for Meeting</h3>
          <div className="flex gap-1 flex-wrap">
            <button onClick={selectAll} className="text-[10px] px-2 py-1 rounded-lg bg-chispa-input border border-chispa-border text-chispa-text-secondary hover:text-chispa-text-primary transition-colors">Select All</button>
            <button onClick={clearAll} className="text-[10px] px-2 py-1 rounded-lg bg-chispa-input border border-chispa-border text-chispa-text-secondary hover:text-chispa-text-primary transition-colors">Clear</button>
            {Object.entries(DIVISIONS).map(([name, slugs]) => (
              <button key={name} onClick={() => selectDivision(slugs)} className="text-[10px] px-2 py-1 rounded-lg bg-chispa-input border border-chispa-border text-chispa-text-secondary hover:text-chispa-text-primary transition-colors">{name}</button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1.5">
          {agents.map(agent => {
            const isSelected = selected.has(agent.slug);
            return (
              <button
                key={agent.slug}
                onClick={() => toggleAgent(agent.slug)}
                className={`flex items-center gap-2 p-2 rounded-lg border text-left text-sm transition-all ${
                  isSelected
                    ? 'bg-chispa-orange/10 border-chispa-orange/40 text-chispa-text-primary'
                    : 'bg-chispa-input border-chispa-border text-chispa-text-secondary hover:border-chispa-border/80'
                } ${agent.status !== 'active' ? 'opacity-50' : ''}`}
              >
                {isSelected ? <CheckSquare className="w-3.5 h-3.5 text-chispa-orange flex-shrink-0" /> : <Square className="w-3.5 h-3.5 text-chispa-text-muted flex-shrink-0" />}
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate text-[12px]">{agent.name}</p>
                  <p className="text-[10px] text-chispa-text-muted truncate">{agent.role}</p>
                </div>
                <StatusDot status={agent.status} size="sm" />
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-chispa-text-muted mt-2">{selected.size} agent{selected.size !== 1 ? 's' : ''} selected</p>
      </div>

      {/* Message presets */}
      <div className="flex gap-1.5 mb-2">
        {MESSAGE_PRESETS.map(preset => (
          <button
            key={preset.label}
            onClick={() => {
              setMessage(preset.text);
            }}
            disabled={sending}
            className="text-[10px] px-2.5 py-1 rounded-lg bg-chispa-card border border-chispa-border text-chispa-text-secondary hover:text-chispa-text-primary hover:border-chispa-orange/40 transition-colors disabled:opacity-50"
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Message input */}
      <div className="bg-chispa-card border border-chispa-border rounded-xl p-2 mb-2 card-glow">
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Type your message to the team..."
          rows={3}
          className="w-full bg-chispa-input border border-chispa-border rounded-lg p-2 text-sm text-chispa-text-primary placeholder-chispa-text-muted resize-none focus:outline-none focus:border-chispa-orange/50"
          onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleSend(); }}
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-[10px] text-chispa-text-muted">Ctrl+Enter to send</span>
          <button
            onClick={() => handleSend()}
            disabled={sending || !message.trim() || selected.size === 0}
            className="flex items-center gap-1.5 bg-chispa-orange hover:bg-chispa-orange/80 text-white px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            {sending ? 'Agents thinking...' : 'Send to Team'}
          </button>
        </div>
      </div>

      {/* Session history */}
      {sessions.length > 0 && (
        <div className="space-y-3">
          {sessions.map((session, si) => {
            const totalCost = session.responses.reduce((s, r) => s + (r.cost_usd || 0), 0);
            return (
              <div key={si}>
                {/* User message */}
                <div className="mb-2 bg-chispa-input border border-chispa-border rounded-xl p-2">
                  <p className="text-[10px] text-chispa-text-muted mb-1">You &mdash; to {session.agents.length} agent{session.agents.length !== 1 ? 's' : ''}</p>
                  <p className="text-sm text-chispa-text-primary whitespace-pre-wrap">{session.message}</p>
                </div>
                {/* Responses */}
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-[11px] font-semibold text-chispa-text-primary">Responses</h3>
                  {totalCost > 0 && (
                    <span className="num text-[10px] text-chispa-text-muted">Total cost: ${totalCost.toFixed(4)}</span>
                  )}
                </div>
                <div className="space-y-2">
                  {session.responses.map((r, i) => (
                    <div key={i} className={`bg-chispa-card border rounded-xl p-2 card-glow ${r.error ? 'border-red-500/30' : 'border-chispa-border'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1 rounded-lg bg-chispa-orange/10">
                          <Bot className="w-3.5 h-3.5 text-chispa-orange" />
                        </div>
                        <span className="text-sm font-semibold text-chispa-text-primary">{r.name}</span>
                        <Badge variant={r.error ? 'error' : 'active'} label={r.error ? 'skipped' : 'responded'} />
                        {r.cost_usd !== undefined && r.cost_usd > 0 && (
                          <span className="num text-[10px] text-chispa-text-muted ml-auto">${r.cost_usd.toFixed(4)}</span>
                        )}
                      </div>
                      <div className="text-sm text-chispa-text-secondary whitespace-pre-wrap leading-relaxed pl-8">
                        {r.response}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}
