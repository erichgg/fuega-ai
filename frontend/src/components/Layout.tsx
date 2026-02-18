// @refresh reset
import { useState, useCallback } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Bot, FileText, Users, Search, Megaphone,
  BarChart3, GitBranch, Settings, ChevronRight, Network, MessagesSquare,
  Sun, Moon, PanelLeftClose, PanelLeft, Command, Joystick, Target,
  Terminal, PanelRightClose, PanelRight,
} from 'lucide-react';
import clsx from 'clsx';
import { useWebSocket } from '../lib/useWebSocket';
import { useTheme } from '../lib/ThemeContext';
import { useKeyboardShortcuts } from '../lib/useKeyboardShortcuts';
import { ChispaLogo } from './ChispaLogo';
import { CommandPalette } from './CommandPalette';
import { ConsolePanel } from './ConsolePanel';
import { StatusDot } from './StatusDot';

const navSections = [
  {
    label: 'Overview',
    items: [
      { path: '/', icon: LayoutDashboard, label: 'Dashboard', shortcut: 'G D' },
      { path: '/control-panel', icon: Joystick, label: 'Control Panel', shortcut: 'G X' },
      { path: '/analytics', icon: BarChart3, label: 'Analytics', shortcut: 'G N' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { path: '/leads', icon: Target, label: 'Leads', shortcut: 'G R' },
      { path: '/content', icon: FileText, label: 'Content', shortcut: 'G C' },
      { path: '/campaigns', icon: Megaphone, label: 'Campaigns', shortcut: 'G P' },
      { path: '/seo', icon: Search, label: 'SEO', shortcut: 'G E' },
      { path: '/workflows', icon: GitBranch, label: 'Workflows', shortcut: 'G W' },
    ],
  },
  {
    label: 'Team',
    items: [
      { path: '/organization', icon: Network, label: 'Organization', shortcut: 'G O' },
      { path: '/agents', icon: Bot, label: 'Agents', shortcut: 'G A' },
      { path: '/team-chat', icon: MessagesSquare, label: 'Team Chat', shortcut: 'G T' },
    ],
  },
  {
    label: 'Business',
    items: [
      { path: '/clients', icon: Users, label: 'Clients', shortcut: 'G L' },
      { path: '/settings', icon: Settings, label: 'Settings', shortcut: 'G S' },
    ],
  },
];

const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.platform);
const modKey = isMac ? '\u2318' : 'Ctrl+';

export function Layout() {
  const location = useLocation();
  const { connected } = useWebSocket();
  const { theme, toggle } = useTheme();

  const [sidebarPinned, setSidebarPinned] = useState(() => {
    const saved = localStorage.getItem('chispa-sidebar-pinned');
    return saved !== 'false';
  });
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [consoleOpen, setConsoleOpen] = useState(() => {
    const saved = localStorage.getItem('chispa-console-open');
    return saved !== 'false'; // Open by default
  });

  const toggleConsole = useCallback(() => {
    setConsoleOpen(prev => {
      const next = !prev;
      localStorage.setItem('chispa-console-open', String(next));
      return next;
    });
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarPinned(prev => {
      const next = !prev;
      localStorage.setItem('chispa-sidebar-pinned', String(next));
      return next;
    });
  }, []);

  const openPalette = useCallback(() => setPaletteOpen(true), []);

  useKeyboardShortcuts(openPalette, toggleSidebar);

  return (
    <div className="flex h-screen bg-chispa-surface">
      {/* Sidebar — all navigation lives here */}
      <aside
        className={clsx(
          'bg-chispa-sidebar border-r border-chispa-border flex flex-col transition-all duration-200 flex-shrink-0',
          sidebarPinned ? 'w-52' : 'w-12'
        )}
      >
        {/* Logo */}
        <div className="h-11 flex items-center px-3 border-b border-chispa-border">
          <ChispaLogo size={22} />
          {sidebarPinned && (
            <span className="ml-2 text-sm font-bold tracking-tight">
              <span className="gradient-text">Chispa</span> <span className="text-chispa-text-secondary font-normal">Digital</span>
            </span>
          )}
        </div>

        {/* Search trigger */}
        <div className="px-2 pt-2 pb-1">
          <button
            onClick={openPalette}
            className={clsx(
              'flex items-center gap-2 rounded-lg text-[11px] text-chispa-text-muted hover:text-chispa-text-secondary hover:bg-chispa-card-hover transition-colors w-full',
              sidebarPinned ? 'px-2.5 py-1.5 bg-chispa-input border border-chispa-border' : 'justify-center py-1.5'
            )}
            title={`Search (${modKey}K)`}
          >
            <Command className="w-3.5 h-3.5 flex-shrink-0" />
            {sidebarPinned && (
              <>
                <span className="flex-1 text-left">Search...</span>
                <kbd className="text-[9px] px-1 py-0.5 rounded bg-chispa-surface border border-chispa-border font-mono">{modKey}K</kbd>
              </>
            )}
          </button>
        </div>

        {/* Nav */}
        <nav aria-label="Main navigation" className="flex-1 py-1 px-1.5 space-y-3 overflow-y-auto">
          {navSections.map((section) => (
            <div key={section.label}>
              {sidebarPinned && (
                <p className="px-2 mb-1 text-[9px] font-bold uppercase tracking-[0.15em] text-chispa-text-muted">
                  {section.label}
                </p>
              )}
              <div className="space-y-0.5">
                {section.items.map(({ path, icon: Icon, label }) => {
                  const isActive = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);
                  return (
                    <NavLink
                      key={path}
                      to={path}
                      title={!sidebarPinned ? label : undefined}
                      className={clsx(
                        'flex items-center gap-2 px-2 py-1.5 rounded-lg text-[12px] font-medium transition-colors duration-150',
                        sidebarPinned ? '' : 'justify-center',
                        isActive
                          ? 'bg-chispa-orange/10 text-chispa-orange'
                          : 'text-chispa-text-secondary hover:text-chispa-text-primary hover:bg-chispa-card-hover'
                      )}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      {sidebarPinned && (
                        <>
                          <span className="flex-1 truncate">{label}</span>
                          {isActive && <ChevronRight className="w-3 h-3 opacity-40" />}
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom controls: status, theme, collapse */}
        <div className="border-t border-chispa-border p-2 space-y-1">
          {/* Connection status */}
          <div className={clsx('flex items-center gap-2 px-2 py-1.5 rounded-lg', sidebarPinned ? '' : 'justify-center')}>
            <StatusDot status={connected ? 'active' : 'error'} pulse={connected} size="sm" />
            {sidebarPinned && (
              <span className="text-[11px] text-chispa-text-muted">{connected ? 'Live' : 'Offline'}</span>
            )}
          </div>

          {/* Theme toggle */}
          <button
            onClick={toggle}
            className={clsx(
              'flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] text-chispa-text-muted hover:text-chispa-text-primary hover:bg-chispa-card-hover transition-colors w-full',
              sidebarPinned ? '' : 'justify-center'
            )}
            title={theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {sidebarPinned && <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>}
          </button>

          {/* Console toggle */}
          <button
            onClick={toggleConsole}
            className={clsx(
              'flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] transition-colors w-full',
              consoleOpen
                ? 'text-chispa-orange bg-chispa-orange/10'
                : 'text-chispa-text-muted hover:text-chispa-text-primary hover:bg-chispa-card-hover',
              sidebarPinned ? '' : 'justify-center'
            )}
            title={consoleOpen ? 'Hide console' : 'Show console'}
          >
            {consoleOpen ? <PanelRightClose className="w-4 h-4" /> : <Terminal className="w-4 h-4" />}
            {sidebarPinned && <span>{consoleOpen ? 'Hide Console' : 'Console'}</span>}
          </button>

          {/* Collapse toggle */}
          <button
            onClick={toggleSidebar}
            className={clsx(
              'flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] text-chispa-text-muted hover:text-chispa-text-primary hover:bg-chispa-card-hover transition-colors w-full',
              sidebarPinned ? '' : 'justify-center'
            )}
            title={sidebarPinned ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {sidebarPinned ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
            {sidebarPinned && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Main area — no top bar, just content */}
      <main className="flex-1 overflow-y-auto min-w-0">
        <div className="p-3">
          <Outlet />
        </div>
      </main>

      {/* Console Panel — persistent right sidebar */}
      <ConsolePanel open={consoleOpen} onClose={toggleConsole} />

      {/* Command Palette */}
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
