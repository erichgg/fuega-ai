import { useEffect, useState } from 'react';
import {
  PenTool, CheckCircle, Eye, Send, RotateCcw, Lightbulb, Bot,
  LayoutGrid, Table2, Plus, X, Mic, Image, Camera,
} from 'lucide-react';
import { Bar } from 'react-chartjs-2';
import { api } from '../lib/api';
import { PageHeader } from '../components/PageHeader';
import { ChartCard } from '../components/ChartCard';
import { StatCard } from '../components/StatCard';
import { Tabs } from '../components/Tabs';
import { StatusDot } from '../components/StatusDot';
import { DataTable, type Column } from '../components/DataTable';
import { useToast } from '../lib/ToastContext';
import { defaultChartOptions, CHART_COLORS } from '../lib/chartConfig';

const PIPELINE_STAGES = [
  { key: 'ideas', label: 'Ideas', icon: Lightbulb, color: '#6366F1', agent: 'SEO Analyst' },
  { key: 'approved', label: 'Approved', icon: CheckCircle, color: '#EAB308', agent: 'CEO' },
  { key: 'writing', label: 'Writing', icon: PenTool, color: '#FF6B2C', agent: 'Content Writer' },
  { key: 'review', label: 'Review', icon: Eye, color: '#EC4899', agent: 'Editor' },
  { key: 'revision', label: 'Revision', icon: RotateCcw, color: '#F97316', agent: 'Content Writer' },
  { key: 'ready', label: 'Ready to Publish', icon: Send, color: '#00D4AA', agent: 'Social Media Manager' },
  { key: 'published', label: 'Published', icon: CheckCircle, color: '#22C55E', agent: 'Analytics Agent' },
];

const emptyKanban = { ideas: [], approved: [], writing: [], review: [], revision: [], ready: [], published: [] };

export default function Content() {
  const [kanban, setKanban] = useState<any>(emptyKanban);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'kanban' | 'table'>('kanban');
  const [showNewIdea, setShowNewIdea] = useState(false);
  const [newIdeaTitle, setNewIdeaTitle] = useState('');
  const [newIdeaPlatform, setNewIdeaPlatform] = useState('');
  const toast = useToast();

  // Integration states — ALL hooks must be before any early return
  const [mediaLoading, setMediaLoading] = useState<string | null>(null);
  const [voiceoverResult, setVoiceoverResult] = useState<{ itemId: string; audio_url: string } | null>(null);
  const [stockPhotos, setStockPhotos] = useState<{ itemId: string; photos: any[] } | null>(null);
  const [generatedImage, setGeneratedImage] = useState<{ itemId: string; image_url: string } | null>(null);

  useEffect(() => {
    api.content.kanban()
      .then(d => setKanban(d))
      .catch(() => toast.error('Failed to load content pipeline. Check that the backend is running.'))
      .finally(() => setLoading(false));
  }, []);

  const [addingIdea, setAddingIdea] = useState(false);

  const handleAddIdea = async () => {
    const title = newIdeaTitle.trim();
    if (!title) { toast.error('Please enter a title'); return; }
    setAddingIdea(true);
    try {
      const created = await api.content.createIdea({ title, target_platform: newIdeaPlatform || undefined });
      setKanban((prev: any) => ({ ...prev, ideas: [...(prev.ideas || []), { id: created.id, title: created.title, platform: created.target_platform, score: null, type: 'idea' }] }));
      setNewIdeaTitle('');
      setNewIdeaPlatform('');
      setShowNewIdea(false);
    } catch {
      toast.error('Failed to save idea');
    }
    setAddingIdea(false);
  };

  const handleVoiceover = async (itemId: string, text: string) => {
    const key = `voiceover-${itemId}`;
    setMediaLoading(key);
    try {
      const result = await api.integrations.elevenlabs.generate(text);
      setVoiceoverResult({ itemId, audio_url: result.audio_url });
    } catch {
      toast.error('Voiceover generation failed');
    }
    setMediaLoading(null);
  };

  const handleStockPhotos = async (itemId: string, query: string) => {
    const key = `photos-${itemId}`;
    setMediaLoading(key);
    try {
      const result = await api.integrations.pexels.searchPhotos(query);
      setStockPhotos({ itemId, photos: result.photos || [] });
    } catch {
      toast.error('Stock photo search failed');
    }
    setMediaLoading(null);
  };

  const handleGenerateImage = async (itemId: string, prompt: string) => {
    const key = `image-${itemId}`;
    setMediaLoading(key);
    try {
      const result = await api.integrations.openai.generateImage(prompt);
      setGeneratedImage({ itemId, image_url: result.image_url || result.url });
    } catch {
      toast.error('Image generation failed');
    }
    setMediaLoading(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-fuega-orange border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const totalItems = Object.values(kanban).reduce((s: number, col: any) => s + (col?.length || 0), 0);
  const platformCounts: Record<string, number> = {};
  const allItems: { stage: string; stageLabel: string; item: any }[] = [];
  Object.values(kanban).flat().forEach((item: any) => {
    const p = item.platform || 'other';
    platformCounts[p] = (platformCounts[p] || 0) + 1;
  });
  PIPELINE_STAGES.forEach(stage => {
    (kanban[stage.key] || []).forEach((item: any) => {
      allItems.push({ stage: stage.key, stageLabel: stage.label, item });
    });
  });

  const platformChartData = {
    labels: Object.keys(platformCounts),
    datasets: [{
      label: 'Content pieces',
      data: Object.values(platformCounts),
      backgroundColor: CHART_COLORS.map(c => c + '99'),
      borderColor: CHART_COLORS,
      borderWidth: 1,
      borderRadius: 6,
      borderSkipped: false,
    }],
  };

  const contentColumns: Column<{ stage: string; stageLabel: string; item: any }>[] = [
    {
      key: 'title',
      label: 'Title',
      sortable: true,
      getValue: (row) => row.item.title || 'Untitled',
      render: (row) => <span className="text-[12px] text-fuega-text-primary font-medium">{row.item.title || 'Untitled'}</span>,
    },
    {
      key: 'stage',
      label: 'Stage',
      sortable: true,
      getValue: (row) => row.stageLabel,
      render: (row) => {
        const stageInfo = PIPELINE_STAGES.find(s => s.key === row.stage);
        return (
          <span
            className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded"
            style={{ backgroundColor: (stageInfo?.color || '#666') + '20', color: stageInfo?.color || '#666' }}
          >
            <StatusDot
              status={row.stage === 'published' ? 'active' : row.stage === 'revision' ? 'error' : 'running'}
              size="sm"
            />
            {row.stageLabel}
          </span>
        );
      },
    },
    {
      key: 'platform',
      label: 'Platform',
      sortable: true,
      getValue: (row) => row.item.platform || '',
      render: (row) => row.item.platform ? (
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-fuega-input text-fuega-text-secondary">
          {row.item.platform}
        </span>
      ) : (
        <span className="text-[10px] text-fuega-text-muted">--</span>
      ),
    },
    {
      key: 'score',
      label: 'Score',
      sortable: true,
      getValue: (row) => row.item.score ?? -1,
      render: (row) => row.item.score !== null && row.item.score !== undefined ? (
        <span className={`num text-[11px] ${row.item.score >= 7 ? 'text-green-400' : row.item.score >= 5 ? 'text-yellow-400' : 'text-red-400'}`}>
          {row.item.score}/10
        </span>
      ) : (
        <span className="text-[10px] text-fuega-text-muted">--</span>
      ),
    },
  ];

  const viewTabs = [
    { key: 'kanban', label: 'Kanban', icon: <LayoutGrid className="w-3.5 h-3.5" /> },
    { key: 'table', label: 'Table', icon: <Table2 className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="animate-fadeIn">
      <PageHeader
        title="Content Pipeline"
        subtitle={`${totalItems} items across all stages`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Content' },
        ]}
        action={
          <div className="flex items-center gap-2">
            <Tabs tabs={viewTabs} active={view} onChange={(k) => setView(k as 'kanban' | 'table')} />
            <button
              onClick={() => setShowNewIdea(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-fuega-orange text-white text-[12px] font-medium hover:bg-fuega-orange/90 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              New Idea
            </button>
          </div>
        }
      />

      {/* Inline New Idea Form */}
      {showNewIdea && (
        <div className="mb-2 flex items-center gap-2 bg-fuega-card border border-fuega-border rounded-lg p-2">
          <input
            autoFocus
            value={newIdeaTitle}
            onChange={e => setNewIdeaTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddIdea()}
            placeholder="Idea title..."
            className="flex-1 bg-fuega-input border border-fuega-border rounded px-2 py-1 text-sm text-fuega-text-primary placeholder:text-fuega-text-muted focus:outline-none focus:border-fuega-orange/50"
          />
          <input
            value={newIdeaPlatform}
            onChange={e => setNewIdeaPlatform(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddIdea()}
            placeholder="Platform"
            className="w-28 bg-fuega-input border border-fuega-border rounded px-2 py-1 text-sm text-fuega-text-primary placeholder:text-fuega-text-muted focus:outline-none focus:border-fuega-orange/50"
          />
          <button
            onClick={handleAddIdea}
            className="px-3 py-1 rounded bg-fuega-orange text-white text-xs font-medium hover:bg-fuega-orange/90 transition-colors"
          >
            Add
          </button>
          <button
            onClick={() => { setShowNewIdea(false); setNewIdeaTitle(''); setNewIdeaPlatform(''); }}
            className="p-1 rounded text-fuega-text-muted hover:text-fuega-text-primary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-2">
        <StatCard label="Ideas" value={kanban.ideas?.length || 0} icon={<Lightbulb className="w-5 h-5" />} color="indigo" />
        <StatCard label="In Production" value={(kanban.writing?.length || 0) + (kanban.review?.length || 0) + (kanban.revision?.length || 0)} icon={<PenTool className="w-5 h-5" />} color="orange" />
        <StatCard label="Ready to Publish" value={kanban.ready?.length || 0} icon={<Send className="w-5 h-5" />} color="teal" />
        <StatCard label="Published" value={kanban.published?.length || 0} icon={<CheckCircle className="w-5 h-5" />} color="pink" />
      </div>

      {/* Platform breakdown */}
      {Object.keys(platformCounts).length > 0 && (
        <ChartCard title="Content by Platform" subtitle="Distribution across channels" className="mb-2">
          <div className="h-48">
            <Bar data={platformChartData} options={{
              ...defaultChartOptions,
              plugins: { ...defaultChartOptions.plugins, legend: { display: false } },
            } as any} />
          </div>
        </ChartCard>
      )}

      {/* Kanban View */}
      {view === 'kanban' && (
        <div className="overflow-x-auto pb-2 -mx-1 px-1">
          <div className="flex gap-2" style={{ minWidth: `${PIPELINE_STAGES.length * 220}px` }}>
            {PIPELINE_STAGES.map(stage => {
              const items = kanban[stage.key] || [];
              const Icon = stage.icon;
              return (
                <div
                  key={stage.key}
                  className="flex-1 min-w-[200px] bg-fuega-card border border-fuega-border rounded-lg flex flex-col"
                >
                  {/* Column header */}
                  <div className="p-2 border-b border-fuega-border">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: stage.color }} />
                      <span className="text-xs font-semibold text-fuega-text-primary truncate">{stage.label}</span>
                      <span
                        className="num text-[10px] px-1.5 py-0.5 rounded-full ml-auto flex-shrink-0"
                        style={{ backgroundColor: stage.color + '20', color: stage.color }}
                      >
                        {items.length}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-fuega-text-muted">
                      <Bot className="w-3 h-3" />
                      <span className="truncate">{stage.agent}</span>
                    </div>
                  </div>

                  {/* Cards */}
                  <div className="p-1.5 flex-1 space-y-1.5 overflow-y-auto max-h-[calc(100vh-380px)]">
                    {items.length === 0 && (
                      <div className="text-[10px] text-fuega-text-muted text-center py-4 opacity-50">
                        No items
                      </div>
                    )}
                    {items.map((item: any) => (
                      <div
                        key={`${stage.key}-${item.id}`}
                        className="bg-fuega-bg border border-fuega-border rounded-md p-2 hover:border-fuega-orange/30 transition-all cursor-default group"
                      >
                        <p className="text-[11px] font-medium text-fuega-text-primary leading-tight mb-1.5 line-clamp-2">
                          {item.title || 'Untitled'}
                        </p>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {item.platform && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-fuega-input text-fuega-text-secondary">
                              {item.platform}
                            </span>
                          )}
                          {item.score !== null && item.score !== undefined && (
                            <span className={`num text-[10px] flex-shrink-0 ${item.score >= 7 ? 'text-green-400' : item.score >= 5 ? 'text-yellow-400' : 'text-red-400'}`}>
                              {item.score}/10
                            </span>
                          )}
                          {item.revision !== undefined && item.revision > 0 && (
                            <span className="text-[9px] text-fuega-text-muted">
                              Rev <span className="num">{item.revision}</span>
                            </span>
                          )}
                        </div>

                        {/* Integration buttons — only for items with content (writing+) */}
                        {['writing', 'review', 'revision', 'ready', 'published'].includes(stage.key) && item.title && (
                          <div className="flex items-center gap-1 mt-1.5 pt-1.5 border-t border-fuega-border/50 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleVoiceover(`${stage.key}-${item.id}`, item.title); }}
                              disabled={!!mediaLoading}
                              className="flex items-center gap-0.5 text-[8px] px-1.5 py-0.5 rounded bg-fuega-surface border border-fuega-border text-fuega-text-muted hover:text-purple-400 hover:border-purple-400/30 transition-colors disabled:opacity-40"
                              title="Generate Voiceover"
                            >
                              {mediaLoading === `voiceover-${stage.key}-${item.id}` ? (
                                <div className="w-2.5 h-2.5 border border-current border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Mic className="w-2.5 h-2.5" />
                              )}
                              Voice
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleStockPhotos(`${stage.key}-${item.id}`, item.title); }}
                              disabled={!!mediaLoading}
                              className="flex items-center gap-0.5 text-[8px] px-1.5 py-0.5 rounded bg-fuega-surface border border-fuega-border text-fuega-text-muted hover:text-teal-400 hover:border-teal-400/30 transition-colors disabled:opacity-40"
                              title="Find Stock Photos"
                            >
                              {mediaLoading === `photos-${stage.key}-${item.id}` ? (
                                <div className="w-2.5 h-2.5 border border-current border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Camera className="w-2.5 h-2.5" />
                              )}
                              Photos
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleGenerateImage(`${stage.key}-${item.id}`, item.title); }}
                              disabled={!!mediaLoading}
                              className="flex items-center gap-0.5 text-[8px] px-1.5 py-0.5 rounded bg-fuega-surface border border-fuega-border text-fuega-text-muted hover:text-pink-400 hover:border-pink-400/30 transition-colors disabled:opacity-40"
                              title="Generate Image"
                            >
                              {mediaLoading === `image-${stage.key}-${item.id}` ? (
                                <div className="w-2.5 h-2.5 border border-current border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Image className="w-2.5 h-2.5" />
                              )}
                              AI Img
                            </button>
                          </div>
                        )}

                        {/* Inline voiceover result */}
                        {voiceoverResult?.itemId === `${stage.key}-${item.id}` && (
                          <div className="mt-1.5 pt-1.5 border-t border-fuega-border/50">
                            <audio controls src={voiceoverResult.audio_url} className="w-full h-6" style={{ minWidth: 0 }} />
                          </div>
                        )}

                        {/* Inline stock photos */}
                        {stockPhotos?.itemId === `${stage.key}-${item.id}` && stockPhotos.photos.length > 0 && (
                          <div className="mt-1.5 pt-1.5 border-t border-fuega-border/50">
                            <div className="grid grid-cols-3 gap-1">
                              {stockPhotos.photos.slice(0, 6).map((photo: any, idx: number) => (
                                <img
                                  key={idx}
                                  src={photo.src?.tiny || photo.src?.small || photo.url}
                                  alt={photo.alt || 'Stock photo'}
                                  className="w-full h-12 object-cover rounded"
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Inline generated image */}
                        {generatedImage?.itemId === `${stage.key}-${item.id}` && (
                          <div className="mt-1.5 pt-1.5 border-t border-fuega-border/50">
                            <img
                              src={generatedImage.image_url}
                              alt="AI generated"
                              className="w-full rounded"
                            />
                          </div>
                        )}
                      </div>
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
          columns={contentColumns}
          data={allItems}
          getRowKey={(row) => `${row.stage}-${row.item.id}`}
          compact
          emptyMessage="No content items found"
        />
      )}
    </div>
  );
}
