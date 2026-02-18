// @refresh reset
import { useEffect, useRef, useState, useCallback } from 'react';

interface WebSocketEvent {
  event: string;
  data?: unknown;
  [key: string]: unknown;
}

// Singleton WebSocket connection — shared across all hook consumers
// Prevents multiple WS connections and reduces cascading re-renders
let globalWs: WebSocket | null = null;
let globalConnected = false;
let globalEvents: WebSocketEvent[] = [];
let subscribers = new Set<() => void>();
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

function notifyAll() {
  subscribers.forEach(fn => fn());
}

function connectGlobal() {
  if (globalWs && (globalWs.readyState === WebSocket.OPEN || globalWs.readyState === WebSocket.CONNECTING)) {
    return;
  }

  try {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    globalWs = ws;

    ws.onopen = () => {
      globalConnected = true;
      notifyAll();
    };
    ws.onerror = (err) => {
      console.warn('WebSocket error:', err);
    };
    ws.onclose = () => {
      globalConnected = false;
      globalWs = null;
      notifyAll();
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(() => {
        if (subscribers.size > 0) connectGlobal();
      }, 3000);
    };
    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as WebSocketEvent;
        globalEvents = [data, ...globalEvents].slice(0, 100);
        notifyAll();
      } catch (err) {
        console.warn('WebSocket: failed to parse message', err);
      }
    };
  } catch {
    globalConnected = false;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(() => {
      if (subscribers.size > 0) connectGlobal();
    }, 3000);
  }
}

export function useWebSocket() {
  // Keep the same hook count and order as original to avoid HMR issues
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [events, setEvents] = useState<WebSocketEvent[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Sync local state from global singleton
    const listener = () => {
      setEvents([...globalEvents]);
      setConnected(globalConnected);
    };
    subscribers.add(listener);

    // Keep refs for compatibility
    wsRef.current = globalWs;
    reconnectTimerRef.current = reconnectTimer;

    // Connect if first subscriber
    if (subscribers.size === 1) {
      connectGlobal();
    }

    // Sync initial state
    listener();

    return () => {
      subscribers.delete(listener);
      if (subscribers.size === 0) {
        if (reconnectTimer) clearTimeout(reconnectTimer);
        globalWs?.close();
        globalWs = null;
        globalConnected = false;
        globalEvents = [];
      }
    };
  }, []);

  const send = useCallback((event: string, data?: unknown) => {
    if (globalWs?.readyState === WebSocket.OPEN) {
      globalWs.send(JSON.stringify({ event, data }));
    }
  }, []);

  return { events, connected, send };
}
