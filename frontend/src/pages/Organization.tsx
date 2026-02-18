import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { api } from '../lib/api';
import { useToast } from '../lib/ToastContext';
import { PageHeader } from '../components/PageHeader';
import { StatusDot } from '../components/StatusDot';

interface Agent {
  id: number;
  slug: string;
  name: string;
  role: string;
  model: string;
  status: string;
  monthly_budget_usd: number;
  month_spend_usd: number;
  budget_usage_pct: number;
}

// Define the org hierarchy: slug -> children slugs
const hierarchy: Record<string, string[]> = {
  ceo: ['cfo_agent', 'editor', 'ads_manager', 'legal_bot'],
  cfo_agent: ['sales_agent', 'fulfillment_agent'],
  editor: ['content_writer', 'social_media_manager'],
  ads_manager: ['seo_analyst', 'analytics_agent', 'email_marketing_agent'],
  legal_bot: ['prospector', 'local_outreach', 'smb_researcher'],
};

function modelShort(model: string): string {
  if (model.includes('sonnet')) return 'Sonnet';
  if (model.includes('haiku')) return 'Haiku';
  if (model.includes('opus')) return 'Opus';
  return model;
}

function OrgNode({ agent, agents, onChat, chatTitle }: { agent: Agent; agents: Agent[]; onChat: (slug: string) => void; chatTitle: (name: string) => string }) {
  const children = (hierarchy[agent.slug] || [])
    .map(slug => agents.find(a => a.slug === slug))
    .filter(Boolean) as Agent[];

  return (
    <div className="flex flex-col items-center">
      {/* Card */}
      <div className="relative group">
        <Link
          to={`/agents/${agent.slug}`}
          className="block bg-fuega-card border border-fuega-border rounded-xl p-2 w-48 hover:border-fuega-orange/50 transition-colors card-glow"
        >
          <div className="flex items-center justify-between mb-1.5">
            <StatusDot status={agent.status} pulse={agent.status === 'active'} label={agent.status} />
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-fuega-surface text-fuega-text-muted">
              {modelShort(agent.model)}
            </span>
          </div>
          <p className="text-sm font-semibold text-fuega-text-primary group-hover:text-fuega-orange transition-colors truncate">
            {agent.name}
          </p>
          <p className="text-[10px] text-fuega-text-muted mt-0.5 truncate">{agent.role}</p>
          <div className="mt-2 flex items-center justify-between text-[10px] text-fuega-text-muted">
            <span className="num">${(agent.month_spend_usd || 0).toFixed(2)} / ${agent.monthly_budget_usd}</span>
            <span className="num">{agent.budget_usage_pct}%</span>
          </div>
          <div className="mt-1 h-1 rounded-full bg-fuega-surface overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                agent.budget_usage_pct > 80 ? 'bg-red-500' : 'bg-fuega-orange'
              }`}
              style={{ width: `${Math.min(agent.budget_usage_pct, 100)}%` }}
            />
          </div>
        </Link>
        {/* Chat button overlay */}
        <button
          onClick={(e) => { e.stopPropagation(); onChat(agent.slug); }}
          className="absolute -bottom-2 right-2 bg-fuega-orange text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-fuega-orange/80"
          title={chatTitle(agent.name)}
        >
          <MessageCircle className="w-3 h-3" />
        </button>
      </div>

      {/* Children */}
      {children.length > 0 && (
        <>
          {/* Vertical connector from parent */}
          <div className="w-px h-6 bg-fuega-border" />

          {/* Horizontal line + children */}
          <div className="relative flex items-start">
            {/* Horizontal connector spanning children */}
            {children.length > 1 && (
              <div
                className="absolute top-0 h-px bg-fuega-border"
                style={{
                  left: `${100 / (children.length * 2)}%`,
                  right: `${100 / (children.length * 2)}%`,
                }}
              />
            )}

            <div className="flex gap-2">
              {children.map(child => (
                <div key={child.slug} className="flex flex-col items-center">
                  {/* Vertical connector from horizontal line to child */}
                  <div className="w-px h-6 bg-fuega-border" />
                  <OrgNode agent={child} agents={agents} onChat={onChat} chatTitle={chatTitle} />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function Organization() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const navigate = useNavigate();
  const { t } = useTranslation(['organization', 'common']);

  useEffect(() => {
    api.agents.list()
      .then(setAgents)
      .catch(() => {
        toast.error(t('common:errors.failedToLoad', { resource: t('organization:title').toLowerCase() }) + ' ' + t('common:errors.backendCheck'));
        setAgents([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleChat = (_slug: string) => {
    navigate('/team-chat');
  };

  const chatTitle = (name: string) => t('organization:chatWith', { name });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-fuega-orange border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const ceo = agents.find(a => a.slug === 'ceo');

  // Agents not in the hierarchy tree (orphans)
  const inTree = new Set<string>();
  function collectTree(slug: string) {
    inTree.add(slug);
    (hierarchy[slug] || []).forEach(collectTree);
  }
  if (ceo) collectTree('ceo');
  const orphans = agents.filter(a => !inTree.has(a.slug));

  return (
    <div className="animate-fadeIn">
      <PageHeader
        title={t('organization:title')}
        subtitle={t('organization:subtitle')}
      />

      {/* Org Chart */}
      <div className="mt-2 overflow-x-auto pb-4">
        <div className="inline-flex justify-center min-w-full">
          {ceo ? (
            <OrgNode agent={ceo} agents={agents} onChat={handleChat} chatTitle={chatTitle} />
          ) : (
            <p className="text-fuega-text-muted text-sm">{t('organization:noAgentsFound')}</p>
          )}
        </div>
      </div>

      {/* Orphan agents (not in hierarchy) */}
      {orphans.length > 0 && (
        <div className="mt-4">
          <h3 className="text-[10px] font-semibold uppercase tracking-widest text-fuega-text-muted mb-2">
            {t('organization:otherTeamMembers')}
          </h3>
          <div className="flex flex-wrap gap-2">
            {orphans.map(agent => (
              <div key={agent.slug} className="relative group">
                <Link
                  to={`/agents/${agent.slug}`}
                  className="block bg-fuega-card border border-fuega-border rounded-xl p-2 w-48 hover:border-fuega-orange/50 transition-colors card-glow"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <StatusDot status={agent.status} pulse={agent.status === 'active'} label={agent.status} />
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-fuega-surface text-fuega-text-muted">
                      {modelShort(agent.model)}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-fuega-text-primary group-hover:text-fuega-orange transition-colors truncate">
                    {agent.name}
                  </p>
                  <p className="text-[10px] text-fuega-text-muted mt-0.5 truncate">{agent.role}</p>
                </Link>
                <button
                  onClick={() => handleChat(agent.slug)}
                  className="absolute -bottom-2 right-2 bg-fuega-orange text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-fuega-orange/80"
                  title={chatTitle(agent.name)}
                >
                  <MessageCircle className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
