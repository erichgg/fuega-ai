import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

function isInput(el: EventTarget | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

export function useKeyboardShortcuts(onCommandPalette: () => void, onToggleSidebar: () => void) {
  const navigate = useNavigate();
  const gPressedRef = useRef(false);
  const gTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handler = useCallback((e: KeyboardEvent) => {
    if (isInput(e.target)) return;

    // Cmd+K / Ctrl+K — command palette
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      onCommandPalette();
      return;
    }

    // Cmd+/ or Ctrl+/ — toggle sidebar
    if ((e.metaKey || e.ctrlKey) && e.key === '/') {
      e.preventDefault();
      onToggleSidebar();
      return;
    }

    // ? — show help (handled by command palette)
    if (e.key === '?') {
      onCommandPalette();
      return;
    }

    // G then X navigation
    if (e.key === 'g' || e.key === 'G') {
      if (!gPressedRef.current) {
        gPressedRef.current = true;
        if (gTimerRef.current) clearTimeout(gTimerRef.current);
        gTimerRef.current = setTimeout(() => { gPressedRef.current = false; }, 800);
        return;
      }
    }

    if (gPressedRef.current) {
      gPressedRef.current = false;
      if (gTimerRef.current) clearTimeout(gTimerRef.current);
      const routes: Record<string, string> = {
        d: '/',
        x: '/control-panel',
        a: '/agents',
        w: '/workflows',
        c: '/content',
        r: '/leads',
        s: '/settings',
        o: '/organization',
        t: '/team-chat',
        e: '/seo',
        p: '/campaigns',
        l: '/clients',
        n: '/analytics',
      };
      const route = routes[e.key.toLowerCase()];
      if (route) {
        e.preventDefault();
        navigate(route);
      }
    }
  }, [navigate, onCommandPalette, onToggleSidebar]);

  useEffect(() => {
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [handler]);
}
