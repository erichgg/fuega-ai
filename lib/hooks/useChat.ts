"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api/client";

export interface ChatMessage {
  id: string;
  campfire_id: string;
  room_id: string | null;
  author_id: string;
  body: string;
  created_at: string;
  author_username?: string;
}

export interface ChatRoom {
  id: string;
  campfire_id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  position: number;
  created_at: string;
}

// ─── useChatRooms ────────────────────────────────────────────

interface UseChatRoomsReturn {
  rooms: ChatRoom[];
  loading: boolean;
  error: string | null;
  createRoom: (name: string, description?: string) => Promise<ChatRoom>;
  refetch: () => void;
}

export function useChatRooms(campfireId: string): UseChatRoomsReturn {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchCount, setFetchCount] = useState(0);

  useEffect(() => {
    if (!campfireId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    api.get<{ rooms: ChatRoom[] }>(`/api/campfires/${campfireId}/chat/rooms`)
      .then((data) => {
        if (!cancelled) setRooms(data.rooms);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Failed to load rooms");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [campfireId, fetchCount]);

  const createRoom = useCallback(async (name: string, description?: string): Promise<ChatRoom> => {
    const data = await api.post<{ room: ChatRoom }>(
      `/api/campfires/${campfireId}/chat/rooms`,
      { name, description }
    );
    setRooms((prev) => [...prev, data.room]);
    return data.room;
  }, [campfireId]);

  const refetch = useCallback(() => setFetchCount((c) => c + 1), []);

  return { rooms, loading, error, createRoom, refetch };
}

// ─── useChat (room-aware) ────────────────────────────────────

interface UseChatOptions {
  campfireId: string;
  roomId?: string;
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

export function useChat({ campfireId, roomId, enabled = true }: UseChatOptions): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Build the API base path (memoized to prevent unnecessary re-renders)
  const basePath = useMemo(
    () => roomId
      ? `/api/campfires/${campfireId}/chat/rooms/${roomId}/messages`
      : `/api/campfires/${campfireId}/chat`,
    [campfireId, roomId]
  );

  // Fetch initial messages
  useEffect(() => {
    if (!enabled || !campfireId) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    setMessages([]);

    api.get<{ messages: ChatMessage[] }>(basePath, { limit: 50 })
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
  }, [campfireId, roomId, enabled, basePath]);

  // SSE stream for real-time updates
  useEffect(() => {
    if (!enabled || !campfireId) return;

    const url = `${basePath}?stream=true`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onopen = () => setConnected(true);

    es.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as ChatMessage;
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      } catch { /* ignore parse errors */ }
    };

    es.onerror = () => {
      setConnected(false);
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
      setConnected(false);
    };
  }, [campfireId, roomId, enabled, basePath]);

  const sendMessage = useCallback(async (body: string) => {
    setSending(true);
    setError(null);
    try {
      const data = await api.post<{ message: ChatMessage }>(basePath, { body });
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
  }, [basePath]);

  return { messages, loading, error, sendMessage, sending, connected };
}
