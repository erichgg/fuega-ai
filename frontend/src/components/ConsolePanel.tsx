// @refresh reset
import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Terminal, X, ChevronDown, Trash2, Bot, GitBranch, Zap,
  AlertCircle, CheckCircle2, Globe, ArrowRight, Clock, Wifi,
} from 'lucide-react';
import clsx from 'clsx';
import { useWebSocket } from '../lib/useWebSocket';
import { activityBus, type ActivityEntry } from '../lib/activityBus';

interface ConsoleEntry {
  id: string;
  timestamp: Date;
  type: 'api' | 'agent' | 'workflow' | 'action' | 'success' | 'error' | 'info';
  title: string;
  detail?: string;
}

/** Agent slug → first name for the console. */
const AGENT_NAMES: Record<string, string> = {
  ceo: 'Sofia',
  content_writer: 'Valentina',
  editor: 'Camila',
  seo_analyst: 'Diego',
  social_media_manager: 'Isabella',
  analytics_agent: 'Mateo',
  ads_manager: 'Andrés',
  email_marketing_agent: 'Lucía',
  sales_agent: 'Carlos',
  cfo_agent: 'Daniela',
  fulfillment_agent: 'Rafael',
  legal_bot: 'Gabriela',
  prospector: 'Marco',
  local_outreach: 'Elena',
  smb_researcher: 'Tomás',
};

const WORKFLOW_NAMES: Record<string, string> = {
  outreach_pipeline: 'Outreach Pipeline',
  content_pipeline: 'Content Pipeline',
  seo_pipeline: 'SEO Pipeline',
  ads_pipeline: 'Ads Pipeline',
  email_pipeline: 'Email Pipeline',
  onboarding_pipeline: 'Onboarding',
  reporting_pipeline: 'Reporting',
};

function agentName(slug: string): string {
  return AGENT_NAMES[slug] || slug.replace(/_/g, ' ');
}

function workflowName(slug: string): string {
  return WORKFLOW_NAMES[slug] || slug.replace(/_/g, ' ');
}

/** Convert a WebSocket event into a ConsoleEntry (or null to skip). */
function wsToEntry(evt: any): ConsoleEntry | null {
  const id = `ws-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const ts = new Date();
  const eventName: string = evt.event || '';
  const data = evt.data || evt;

  // Agent events
  if (eventName.startsWith('agent.') && eventName.endsWith('.running')) {
    const slug = eventName.split('.')[1] || 'agent';
    const name = agentName(slug);
    const actionLabel = data.action?.replace(/_/g, ' ');
    return { id, timestamp: ts, type: 'agent', title: `${name} working`, detail: actionLabel };
  }
  if (eventName.startsWith('agent.') && eventName.endsWith('.completed')) {
    const slug = eventName.split('.')[1] || 'agent';
    const name = agentName(slug);
    const cost = data.cost_usd ? `$${Number(data.cost_usd).toFixed(4)}` : '';
    const dur = data.duration_ms ? `${(Number(data.duration_ms) / 1000).toFixed(1)}s` : '';
    return { id, timestamp: ts, type: 'success', title: `${name} finished`, detail: [data.action?.replace(/_/g, ' '), cost, dur].filter(Boolean).join(' · ') };
  }

  // Workflow events
  if (eventName.includes('workflow.') && eventName.endsWith('.started')) {
    const slug = eventName.split('.')[1] || 'workflow';
    return { id, timestamp: ts, type: 'workflow', title: `${workflowName(slug)} started`, detail: data.run_id ? `Run #${data.run_id}` : undefined };
  }
  if (eventName.includes('workflow.') && eventName.endsWith('.completed')) {
    const slug = eventName.split('.')[1] || 'workflow';
    return { id, timestamp: ts, type: 'success', title: `${workflowName(slug)} done` };
  }
  if (eventName === 'workflow.approval_needed') {
    const wfName = workflowName(data.workflow || '');
    return { id, timestamp: ts, type: 'action', title: `${wfName}: your approval needed`, detail: `Go to Workflows page to review and approve` };
  }

  // Skip noise
  if (eventName === 'connected' || eventName === 'ping' || !eventName) return null;

  // Catch-all
  return { id, timestamp: ts, type: 'info', title: eventName.replace(/[._]/g, ' '), detail: typeof data === 'object' ? JSON.stringify(data).slice(0, 100) : String(data) };
}

const ICON_MAP: Record<string, typeof Bot> = {
  api: Globe,
  agent: Bot,
  workflow: GitBranch,
  action: ArrowRight,
  success: CheckCircle2,
  error: AlertCircle,
  info: Zap,
};

const COLOR_MAP: Record<string, string> = {
  api: 'text-cyan-400',
  agent: 'text-blue-400',
  workflow: 'text-purple-400',
  action: 'text-fuega-orange',
  success: 'text-green-400',
  error: 'text-red-400',
  info: 'text-fuega-text-muted',
};

interface ConsolePanelProps {
  open: boolean;
  onClose: () => void;
}

export function ConsolePanel({ open, onClose }: ConsolePanelProps) {
  const { t } = useTranslation(['nav', 'common']);
  const { events: wsEvents, connected } = useWebSocket();
  const [entries, setEntries] = useState<ConsoleEntry[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevWsCountRef = useRef(0);

  // Subscribe to activityBus (API-level events from every page)
  useEffect(() => {
    // Load existing entries on mount
    const existing = activityBus.getAll().map(a => ({ ...a } as ConsoleEntry));
    if (existing.length > 0) {
      setEntries(prev => [...existing, ...prev].slice(0, 300));
    }

    const unsub = activityBus.subscribe((entry: ActivityEntry) => {
      setEntries(prev => [entry as ConsoleEntry, ...prev].slice(0, 300));
    });
    return unsub;
  }, []);

  // Convert WebSocket events to entries
  useEffect(() => {
    if (wsEvents.length === 0 || wsEvents.length === prevWsCountRef.current) return;

    const newWs = wsEvents.slice(0, wsEvents.length - prevWsCountRef.current);
    prevWsCountRef.current = wsEvents.length;

    const newEntries = newWs.map(wsToEntry).filter((e): e is ConsoleEntry => e !== null);
    if (newEntries.length > 0) {
      setEntries(prev => [...newEntries, ...prev].slice(0, 300));
    }
  }, [wsEvents]);

  // Auto-scroll to top (newest first)
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [entries, autoScroll]);

  const handleClear = useCallback(() => {
    setEntries([]);
    activityBus.clear();
  }, []);

  if (!open) return null;

  return (
    <aside className="w-72 border-l border-fuega-border bg-fuega-sidebar flex flex-col flex-shrink-0 h-full">
      {/* Header */}
      <div className="h-11 flex items-center justify-between px-3 border-b border-fuega-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-fuega-orange" />
          <span className="text-xs font-semibold text-fuega-text-primary">{t('nav:console')}</span>
          <span className={clsx('w-1.5 h-1.5 rounded-full', connected ? 'bg-green-400 animate-pulse' : 'bg-red-400')} />
        </div>
        <div className="flex items-center gap-0.5">
          <button onClick={handleClear} className="p-1 rounded text-fuega-text-muted hover:text-fuega-text-primary hover:bg-fuega-card-hover transition-colors" title={t('common:actions.clear')}>
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={clsx('p-1 rounded transition-colors', autoScroll ? 'text-fuega-orange' : 'text-fuega-text-muted hover:text-fuega-text-primary hover:bg-fuega-card-hover')}
            title={autoScroll ? 'Auto-scroll on' : 'Auto-scroll off'}
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <button onClick={onClose} className="p-1 rounded text-fuega-text-muted hover:text-fuega-text-primary hover:bg-fuega-card-hover transition-colors" title={t('common:actions.close')}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Stream — newest at top */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-1 font-mono text-[10px]">
        {entries.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-fuega-text-muted">
            <Terminal className="w-8 h-8 mb-2 opacity-20" />
            <p className="text-[11px]">{t('common:status.loading')}</p>
            <p className="text-[9px] mt-1 opacity-60">{t('common:empty.description')}</p>
          </div>
        )}
        {entries.map(entry => {
          const Icon = ICON_MAP[entry.type] || Zap;
          return (
            <div key={entry.id} className="flex items-start gap-1.5 px-1.5 py-[3px] rounded hover:bg-fuega-card-hover/50 transition-colors">
              <Icon className={clsx('w-3 h-3 flex-shrink-0 mt-[2px]', COLOR_MAP[entry.type])} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-1">
                  <span className={clsx('font-medium leading-tight', COLOR_MAP[entry.type])} style={{ wordBreak: 'break-word' }}>
                    {entry.title}
                  </span>
                  <span className="text-[8px] text-fuega-text-muted ml-auto flex-shrink-0 tabular-nums">
                    {entry.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
                {entry.detail && (
                  <p className="text-[9px] text-fuega-text-muted leading-tight truncate">{entry.detail}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="border-t border-fuega-border px-3 py-1.5 flex items-center justify-between text-[9px] text-fuega-text-muted flex-shrink-0">
        <span>{entries.length} {t('common:labels.calls')}</span>
        <div className="flex items-center gap-1">
          <Wifi className={clsx('w-3 h-3', connected ? 'text-green-400' : 'text-red-400')} />
          <span>{connected ? t('common:status.live') : t('common:status.offline')}</span>
        </div>
      </div>
    </aside>
  );
}
