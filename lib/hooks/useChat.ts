"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api/client";

export interface ChatMessage {
  id: string;
  campfire_id: string;
  author_id: string;
  body: string;
  created_at: string;
  author_username?: string;
}

interface UseChatOptions {
  campfireId: string;
  enabled?: boolean;
}

interface UseChatReturn {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  sendMessage: (body: string) => Promise<void>;
  sending: boolean;
  connected: boolean;
}

export function useChat({ campfireId, enabled = true }: UseChatOptions): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Fetch initial messages
  useEffect(() => {
    if (!enabled || !campfireId) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    api.get<{ messages: ChatMessage[] }>(`/api/campfires/${campfireId}/chat`, { limit: 50 })
      .then((data) => {
        if (!cancelled) setMessages(data.messages);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Failed to load messages");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [campfireId, enabled]);

  // SSE stream for real-time updates
  useEffect(() => {
    if (!enabled || !campfireId) return;

    const url = `/api/campfires/${campfireId}/chat?stream=true`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onopen = () => setConnected(true);

    es.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as ChatMessage;
        setMessages((prev) => {
          // Deduplicate (in case we get our own message back)
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      } catch { /* ignore parse errors */ }
    };

    es.onerror = () => {
      setConnected(false);
      // EventSource auto-reconnects
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
      setConnected(false);
    };
  }, [campfireId, enabled]);

  const sendMessage = useCallback(async (body: string) => {
    setSending(true);
    setError(null);
    try {
      const data = await api.post<{ message: ChatMessage }>(
        `/api/campfires/${campfireId}/chat`,
        { body }
      );
      // Add optimistically (SSE will deduplicate)
      setMessages((prev) => {
        if (prev.some((m) => m.id === data.message.id)) return prev;
        return [...prev, data.message];
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to send message");
      throw err;
    } finally {
      setSending(false);
    }
  }, [campfireId]);

  return { messages, loading, error, sendMessage, sending, connected };
}
