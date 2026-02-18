import { useEffect, useState, useRef, useCallback } from 'react';
import { Palette, Package, Bot, GitBranch, DollarSign, Monitor, Check, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useToast } from '../lib/ToastContext';
import { PageHeader } from '../components/PageHeader';
import { Tabs } from '../components/Tabs';

type TabKey = 'brand' | 'services' | 'agents' | 'workflows' | 'budget' | 'platforms';

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'brand', label: 'Brand', icon: <Palette className="w-3.5 h-3.5" /> },
  { key: 'services', label: 'Services', icon: <Package className="w-3.5 h-3.5" /> },
  { key: 'agents', label: 'Agents', icon: <Bot className="w-3.5 h-3.5" /> },
  { key: 'workflows', label: 'Workflows', icon: <GitBranch className="w-3.5 h-3.5" /> },
  { key: 'budget', label: 'Budget', icon: <DollarSign className="w-3.5 h-3.5" /> },
  { key: 'platforms', label: 'Platforms', icon: <Monitor className="w-3.5 h-3.5" /> },
];

function InputField({ label, value, onChange, multiline = false }: { label: string; value: string; onChange: (v: string) => void; multiline?: boolean }) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-chispa-text-muted uppercase tracking-wider mb-1">{label}</label>
      {multiline ? (
        <textarea value={value || ''} onChange={e => onChange(e.target.value)} rows={3} className="w-full bg-chispa-input border border-chispa-border rounded-lg px-3 py-1.5 text-sm text-chispa-text-primary focus:outline-none focus:border-chispa-orange/50 resize-none" />
      ) : (
        <input type="text" value={value || ''} onChange={e => onChange(e.target.value)} className="w-full bg-chispa-input border border-chispa-border rounded-lg px-3 py-1.5 text-sm text-chispa-text-primary focus:outline-none focus:border-chispa-orange/50" />
      )}
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-chispa-text-muted uppercase tracking-wider mb-1">{label}</label>
      <input type="number" step="0.01" value={value ?? 0} onChange={e => onChange(parseFloat(e.target.value) || 0)} className="w-full bg-chispa-input border border-chispa-border rounded-lg px-3 py-1.5 text-sm text-chispa-text-primary num font-mono focus:outline-none focus:border-chispa-orange/50" />
    </div>
  );
}

function BrandForm({ config, setConfig }: { config: any; setConfig: (c: any) => void }) {
  const brand = config?.brand || config || {};
  const update = (key: string, val: any) => setConfig({ ...config, brand: { ...brand, [key]: val } });
  const social = brand.social_media || {};
  const voice = brand.brand_voice || {};

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <InputField label="Agency Name" value={brand.name || ''} onChange={v => update('name', v)} />
        <InputField label="Tagline (EN)" value={brand.tagline?.en || brand.tagline || ''} onChange={v => update('tagline', { ...(brand.tagline || {}), en: v })} />
      </div>
      <InputField label="Mission" value={brand.mission || ''} onChange={v => update('mission', v)} multiline />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {Object.entries(social).map(([platform, handle]) => (
          <InputField key={platform} label={platform} value={handle as string} onChange={v => update('social_media', { ...social, [platform]: v })} />
        ))}
      </div>
      <InputField label="Brand Voice Guidelines" value={typeof voice === 'string' ? voice : JSON.stringify(voice, null, 2)} onChange={v => update('brand_voice', v)} multiline />
    </div>
  );
}

function ServicesForm({ config, setConfig }: { config: any; setConfig: (c: any) => void }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const services = config?.services || config?.tiers || {};

  return (
    <div className="space-y-2">
      {Object.entries(services).map(([key, svc]: [string, any]) => (
        <div key={key} className="border border-chispa-border rounded-lg overflow-hidden">
          <button
            onClick={() => setExpanded(expanded === key ? null : key)}
            className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-chispa-card-hover transition-colors"
          >
            <span className="text-sm font-medium text-chispa-text-primary">{svc?.name || key}</span>
            {expanded === key ? <ChevronDown className="w-3.5 h-3.5 text-chispa-text-muted" /> : <ChevronRight className="w-3.5 h-3.5 text-chispa-text-muted" />}
          </button>
          {expanded === key && (
            <div className="px-3 pb-3 border-t border-chispa-border/50 pt-2.5 space-y-2.5">
              {typeof svc === 'object' && svc !== null && Object.entries(svc).map(([field, val]) => (
                <div key={field}>
                  {typeof val === 'number' ? (
                    <NumberField label={field.replace(/_/g, ' ')} value={val} onChange={v => {
                      const updated = { ...services, [key]: { ...svc, [field]: v } };
                      setConfig({ ...config, services: updated });
                    }} />
                  ) : typeof val === 'string' ? (
                    <InputField label={field.replace(/_/g, ' ')} value={val} onChange={v => {
                      const updated = { ...services, [key]: { ...svc, [field]: v } };
                      setConfig({ ...config, services: updated });
                    }} />
                  ) : (
                    <div>
                      <label className="block text-[11px] font-medium text-chispa-text-muted uppercase tracking-wider mb-1">{field.replace(/_/g, ' ')}</label>
                      <pre className="text-xs text-chispa-text-secondary bg-chispa-input rounded p-2 overflow-auto max-h-32">{JSON.stringify(val, null, 2)}</pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function BudgetForm({ config, setConfig }: { config: any; setConfig: (c: any) => void }) {
  const budget = config?.budget || config || {};
  const agentBudgets = budget.agent_budgets || {};
  const fixedCosts = budget.monthly_fixed_costs || {};

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xs font-semibold text-chispa-text-primary mb-2">Agent Budgets (USD/month)</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
          {Object.entries(agentBudgets).filter(([k]) => k !== 'total_agent_budget').map(([agent, amount]) => (
            <NumberField key={agent} label={agent.replace(/_/g, ' ')} value={amount as number} onChange={v => {
              const updated = { ...agentBudgets, [agent]: v };
              setConfig({ ...config, budget: { ...budget, agent_budgets: updated } });
            }} />
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-xs font-semibold text-chispa-text-primary mb-2">Fixed Costs (USD/month)</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
          {Object.entries(fixedCosts).filter(([k]) => k !== 'total_fixed').map(([item, amount]) => (
            <NumberField key={item} label={item.replace(/_/g, ' ')} value={amount as number} onChange={v => {
              const updated = { ...fixedCosts, [item]: v };
              setConfig({ ...config, budget: { ...budget, monthly_fixed_costs: updated } });
            }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function PlatformsForm({ config, setConfig }: { config: any; setConfig: (c: any) => void }) {
  const platforms = config?.platforms || config || {};

  return (
    <div className="space-y-2">
      {Object.entries(platforms).map(([key, plat]: [string, any]) => {
        if (typeof plat !== 'object' || plat === null) return null;
        const enabled = plat.enabled !== false;
        return (
          <div key={key} className="flex items-center gap-3 bg-chispa-input border border-chispa-border rounded-lg px-3 py-2.5">
            <button
              onClick={() => {
                const updated = { ...platforms, [key]: { ...plat, enabled: !enabled } };
                setConfig({ ...config, platforms: updated });
              }}
              role="switch"
              aria-checked={enabled}
              className={`relative w-10 h-5 rounded-full transition-colors ${enabled ? 'bg-green-500' : 'bg-chispa-border'}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${enabled ? 'left-[22px]' : 'left-0.5'}`} />
            </button>
            <div className="flex-1">
              <p className="text-sm font-medium text-chispa-text-primary">{plat.name || key}</p>
              {plat.content_types && (
                <p className="text-[11px] text-chispa-text-muted">{Array.isArray(plat.content_types) ? plat.content_types.join(', ') : plat.content_types}</p>
              )}
            </div>
            {plat.max_posts_per_day !== undefined && (
              <div className="w-24">
                <NumberField label="Posts/day" value={plat.max_posts_per_day} onChange={v => {
                  const updated = { ...platforms, [key]: { ...plat, max_posts_per_day: v } };
                  setConfig({ ...config, platforms: updated });
                }} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function WorkflowsView({ config }: { config: any }) {
  const workflows = config?.workflows || {};

  return (
    <div className="space-y-3">
      {Object.entries(workflows).map(([key, wf]: [string, any]) => (
        <div key={key} className="border border-chispa-border rounded-lg overflow-hidden">
          <div className="px-3 py-2.5 border-b border-chispa-border/50">
            <p className="text-sm font-semibold text-chispa-text-primary">{wf.name || key}</p>
            <p className="text-[11px] text-chispa-text-muted mt-0.5">{wf.description}</p>
            {wf.schedule && <p className="text-[11px] text-chispa-text-muted mt-0.5 num font-mono">Schedule: {wf.schedule}</p>}
          </div>
          {wf.steps && (
            <div className="px-3 py-2.5 space-y-1.5">
              {wf.steps.map((step: any, i: number) => (
                <div key={step.id} className="flex items-center gap-2.5">
                  <span className="text-[11px] text-chispa-text-muted num font-mono w-5">{i + 1}.</span>
                  <span className="text-sm text-chispa-text-primary">{step.id.replace(/_/g, ' ')}</span>
                  {step.agent && <span className="text-[11px] px-1.5 py-0.5 rounded bg-chispa-orange/10 text-chispa-orange">{step.agent.replace(/_/g, ' ')}</span>}
                  {step.requires_human_approval && <span className="text-[11px] px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400">needs approval</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

type SaveStatus = 'idle' | 'saving' | 'saved';

export default function Settings() {
  const [tab, setTab] = useState<TabKey>('brand');
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const toast = useToast();

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const configRef = useRef<any>(null);
  const tabRef = useRef<TabKey>(tab);

  // Keep refs in sync
  configRef.current = config;
  tabRef.current = tab;

  const doSave = useCallback(async () => {
    const currentTab = tabRef.current;
    const currentConfig = configRef.current;
    if (!currentConfig) return;

    setSaveStatus('saving');
    try {
      await api.settings.update(currentTab, currentConfig);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(prev => (prev === 'saved' ? 'idle' : prev)), 2000);
    } catch {
      setSaveStatus('idle');
      toast.error('Failed to save settings. Check the backend.');
    }
  }, [toast]);

  const scheduleAutoSave = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      doSave();
    }, 1000);
  }, [doSave]);

  // Wrap setConfig so edits trigger auto-save
  const handleSetConfig = useCallback((newConfig: any) => {
    setConfig(newConfig);
    scheduleAutoSave();
  }, [scheduleAutoSave]);

  // Flush pending save on tab change
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [tab]);

  // Fetch config when tab changes
  useEffect(() => {
    setLoading(true);
    setSaveStatus('idle');
    const fetchers: Record<TabKey, () => Promise<any>> = {
      brand: api.settings.brand,
      services: api.settings.services,
      agents: api.settings.agents,
      workflows: api.settings.workflows,
      budget: api.settings.budget,
      platforms: api.settings.platforms,
    };
    fetchers[tab]()
      .then(setConfig)
      .catch(() => toast.error('Failed to load settings. Check that the backend is running.'))
      .finally(() => setLoading(false));
  }, [tab, toast]);

  const isEditable = tab !== 'agents' && tab !== 'workflows';

  return (
    <div className="animate-fadeIn">
      <PageHeader
        title="Settings"
        subtitle="Configuration management"
        status={
          isEditable && saveStatus !== 'idle' ? (
            <span className="flex items-center gap-1.5 text-[11px] ml-3">
              {saveStatus === 'saving' && (
                <>
                  <Loader2 className="w-3 h-3 animate-spin text-chispa-text-muted" />
                  <span className="text-chispa-text-muted">Saving...</span>
                </>
              )}
              {saveStatus === 'saved' && (
                <>
                  <Check className="w-3 h-3 text-green-400" />
                  <span className="text-green-400">Saved</span>
                </>
              )}
            </span>
          ) : undefined
        }
        tabs={
          <Tabs
            tabs={TABS}
            active={tab}
            onChange={key => setTab(key as TabKey)}
            variant="underline"
          />
        }
      />

      <div className="bg-chispa-card border border-chispa-border rounded-lg p-3">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-5 h-5 border-2 border-chispa-orange border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {tab === 'brand' && <BrandForm config={config} setConfig={handleSetConfig} />}
            {tab === 'services' && <ServicesForm config={config} setConfig={handleSetConfig} />}
            {tab === 'budget' && <BudgetForm config={config} setConfig={handleSetConfig} />}
            {tab === 'platforms' && <PlatformsForm config={config} setConfig={handleSetConfig} />}
            {tab === 'workflows' && <WorkflowsView config={config} />}
            {tab === 'agents' && (
              <div className="text-center py-6">
                <Bot className="w-7 h-7 text-chispa-orange mx-auto mb-2" />
                <p className="text-sm text-chispa-text-secondary mb-2">Agent configuration is managed on the Agents page.</p>
                <Link to="/agents" className="text-sm text-chispa-orange hover:underline">Go to Agents</Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
