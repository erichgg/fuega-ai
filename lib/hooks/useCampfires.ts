"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, type Campfire, ApiError } from "@/lib/api/client";

// ---------------------------------------------------------------------------
// List campfires
// ---------------------------------------------------------------------------

interface UseCampfiresOptions {
  sort?: "members" | "newest" | "active";
  limit?: number;
}

interface UseCampfiresReturn {
  campfires: Campfire[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useCampfires(opts: UseCampfiresOptions = {}): UseCampfiresReturn {
  const { sort = "members", limit = 25 } = opts;
  const [campfires, setCampfires] = useState<Campfire[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  const fetchCampfires = useCallback(
    async (reset: boolean) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const currentOffset = reset ? 0 : offset;
      setLoading(true);
      setError(null);

      try {
        const data = await api.get<{ campfires: Campfire[]; count: number }>(
          "/api/campfires",
          { sort, limit, offset: currentOffset },
          controller.signal,
        );

        if (reset) {
          setCampfires(data.campfires);
        } else {
          setCampfires((prev) => [...prev, ...data.campfires]);
        }

        setHasMore(data.count >= limit);
        setOffset(currentOffset + data.count);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof ApiError ? err.message : "Failed to load campfires");
      } finally {
        setLoading(false);
      }
    },
    [sort, limit, offset],
  );

  useEffect(() => {
    setOffset(0);
    setHasMore(true);
    fetchCampfires(true);
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort, limit]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    await fetchCampfires(false);
  }, [hasMore, loading, fetchCampfires]);

  const refresh = useCallback(async () => {
    setOffset(0);
    setHasMore(true);
    await fetchCampfires(true);
  }, [fetchCampfires]);

  return { campfires, loading, error, hasMore, loadMore, refresh };
}

// ---------------------------------------------------------------------------
// Single campfire
// ---------------------------------------------------------------------------

interface UseCampfireReturn {
  campfire: Campfire | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useCampfire(campfireId: string | undefined): UseCampfireReturn {
  const [campfire, setCampfire] = useState<Campfire | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!campfireId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<{ campfire: Campfire }>(`/api/campfires/${campfireId}`);
      setCampfire(data.campfire);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load campfire");
    } finally {
      setLoading(false);
    }
  }, [campfireId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { campfire, loading, error, refresh };
}

// ---------------------------------------------------------------------------
// Join / Leave campfire
// ---------------------------------------------------------------------------

interface UseCampfireMembershipReturn {
  join: (campfireId: string) => Promise<void>;
  leave: (campfireId: string) => Promise<void>;
  loading: boolean;
  error: string | null;
}

export function useCampfireMembership(): UseCampfireMembershipReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const join = useCallback(async (campfireId: string) => {
    setLoading(true);
    setError(null);
    try {
      await api.post(`/api/campfires/${campfireId}/join`);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to join campfire";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const leave = useCallback(async (campfireId: string) => {
    setLoading(true);
    setError(null);
    try {
      await api.post(`/api/campfires/${campfireId}/leave`);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to leave campfire";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { join, leave, loading, error };
}

// ---------------------------------------------------------------------------
// Create campfire
// ---------------------------------------------------------------------------

interface CreateCampfireInput {
  name: string;
  description: string;
}

interface UseCreateCampfireReturn {
  createCampfire: (input: CreateCampfireInput) => Promise<{ campfire: Campfire }>;
  creating: boolean;
  error: string | null;
}

export function useCreateCampfire(): UseCreateCampfireReturn {
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createCampfire = useCallback(async (input: CreateCampfireInput) => {
    setCreating(true);
    setError(null);
    try {
      const data = await api.post<{ campfire: Campfire }>("/api/campfires", input);
      return data;
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to create campfire";
      setError(msg);
      throw err;
    } finally {
      setCreating(false);
    }
  }, []);

  return { createCampfire, creating, error };
}
