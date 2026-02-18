import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Bot, FileText, Users, Search, Megaphone,
  BarChart3, GitBranch, Settings, Network, MessagesSquare, Command, Joystick, Target
} from 'lucide-react';

interface CommandItem {
  id: string;
  label: string;
  section: string;
  icon: React.ReactNode;
  action: () => void;
  keywords?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const commands = useMemo<CommandItem[]>(() => [
    { id: 'dashboard', label: 'Dashboard', section: 'Pages', icon: <LayoutDashboard className="w-4 h-4" />, action: () => navigate('/'), keywords: 'home command center' },
    { id: 'control-panel', label: 'Control Panel', section: 'Pages', icon: <Joystick className="w-4 h-4" />, action: () => navigate('/control-panel'), keywords: 'actions run fire execute pipeline fleet' },
    { id: 'agents', label: 'Agents', section: 'Pages', icon: <Bot className="w-4 h-4" />, action: () => navigate('/agents'), keywords: 'ai bots' },
    { id: 'workflows', label: 'Workflows', section: 'Pages', icon: <GitBranch className="w-4 h-4" />, action: () => navigate('/workflows'), keywords: 'pipelines automation' },
    { id: 'leads', label: 'Leads', section: 'Pages', icon: <Target className="w-4 h-4" />, action: () => navigate('/leads'), keywords: 'prospects pipeline outreach sales' },
    { id: 'content', label: 'Content', section: 'Pages', icon: <FileText className="w-4 h-4" />, action: () => navigate('/content'), keywords: 'kanban writing' },
    { id: 'analytics', label: 'Analytics', section: 'Pages', icon: <BarChart3 className="w-4 h-4" />, action: () => navigate('/analytics'), keywords: 'costs revenue' },
    { id: 'seo', label: 'SEO', section: 'Pages', icon: <Search className="w-4 h-4" />, action: () => navigate('/seo'), keywords: 'keywords rankings' },
    { id: 'campaigns', label: 'Campaigns', section: 'Pages', icon: <Megaphone className="w-4 h-4" />, action: () => navigate('/campaigns'), keywords: 'ads email' },
    { id: 'clients', label: 'Clients', section: 'Pages', icon: <Users className="w-4 h-4" />, action: () => navigate('/clients'), keywords: 'customers' },
    { id: 'organization', label: 'Organization', section: 'Pages', icon: <Network className="w-4 h-4" />, action: () => navigate('/organization'), keywords: 'org chart team' },
    { id: 'team-chat', label: 'Team Chat', section: 'Pages', icon: <MessagesSquare className="w-4 h-4" />, action: () => navigate('/team-chat'), keywords: 'group discussion' },
    { id: 'settings', label: 'Settings', section: 'Pages', icon: <Settings className="w-4 h-4" />, action: () => navigate('/settings'), keywords: 'config preferences' },
  ], [navigate]);

  const filtered = useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase();
    return commands.filter(c =>
      c.label.toLowerCase().includes(q) ||
      c.section.toLowerCase().includes(q) ||
      c.keywords?.toLowerCase().includes(q)
    );
  }, [query, commands]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && filtered.length > 0) {
        e.preventDefault();
        filtered[selectedIndex]?.action();
        onClose();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, filtered, selectedIndex, onClose]);

  if (!open) return null;

  // Group by section
  const sections: Record<string, CommandItem[]> = {};
  filtered.forEach(item => {
    if (!sections[item.section]) sections[item.section] = [];
    sections[item.section].push(item);
  });

  let globalIdx = -1;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="relative w-full max-w-lg bg-chispa-card border border-chispa-border rounded-xl shadow-2xl overflow-hidden animate-slideDown"
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-chispa-border">
          <Command className="w-4 h-4 text-chispa-text-muted" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent text-sm text-chispa-text-primary placeholder-chispa-text-muted focus:outline-none"
          />
          <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-chispa-input border border-chispa-border text-chispa-text-muted font-mono">ESC</kbd>
        </div>

        {/* Results */}
        <div role="listbox" className="max-h-80 overflow-y-auto py-2">
          {filtered.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-chispa-text-muted">No results found</div>
          )}
          {Object.entries(sections).map(([section, items]) => (
            <div key={section}>
              <div className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-chispa-text-muted">{section}</div>
              {items.map(item => {
                globalIdx++;
                const isSelected = globalIdx === selectedIndex;
                const idx = globalIdx;
                return (
                  <button
                    key={item.id}
                    role="option"
                    onClick={() => { item.action(); onClose(); }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-left text-sm transition-colors ${
                      isSelected ? 'bg-chispa-orange/10 text-chispa-orange' : 'text-chispa-text-secondary hover:bg-chispa-card-hover'
                    }`}
                  >
                    <span className={isSelected ? 'text-chispa-orange' : 'text-chispa-text-muted'}>{item.icon}</span>
                    <span className="flex-1">{item.label}</span>
                    {isSelected && <span className="text-[10px] text-chispa-text-muted">Enter</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-chispa-border flex items-center gap-4 text-[10px] text-chispa-text-muted">
          <span><kbd className="font-mono px-1 py-0.5 rounded bg-chispa-input border border-chispa-border">↑↓</kbd> Navigate</span>
          <span><kbd className="font-mono px-1 py-0.5 rounded bg-chispa-input border border-chispa-border">↵</kbd> Open</span>
          <span><kbd className="font-mono px-1 py-0.5 rounded bg-chispa-input border border-chispa-border">esc</kbd> Close</span>
        </div>
      </div>
    </div>
  );
}
