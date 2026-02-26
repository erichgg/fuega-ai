"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, type Post, type ModerationResult, ApiError } from "@/lib/api/client";

interface UsePostsOptions {
  campfire?: string;
  sort?: "hot" | "new" | "top" | "rising" | "controversial";
  author?: string;
  limit?: number;
  timeRange?: "all" | "today" | "week" | "month";
  postType?: "all" | "text" | "link" | "image";
}

interface UsePostsReturn {
  posts: Post[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function usePosts(opts: UsePostsOptions = {}): UsePostsReturn {
  const { campfire, author, sort = "hot", limit = 25, timeRange = "all", postType = "all" } = opts;
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  const fetchPosts = useCallback(
    async (reset: boolean) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const currentOffset = reset ? 0 : offset;
      setLoading(true);
      setError(null);

      try {
        const data = await api.get<{ posts: Post[]; count: number }>(
          "/api/posts",
          {
            campfire,
            author,
            sort,
            limit,
            offset: currentOffset,
            ...(timeRange !== "all" && { time_range: timeRange }),
            ...(postType !== "all" && { post_type: postType }),
          },
          controller.signal,
        );

        if (reset) {
          setPosts(data.posts);
        } else {
          setPosts((prev) => [...prev, ...data.posts]);
        }

        setHasMore(data.count >= limit);
        setOffset(currentOffset + data.count);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof ApiError ? err.message : "Failed to load posts");
      } finally {
        setLoading(false);
      }
    },
    [campfire, author, sort, limit, offset, timeRange, postType],
  );

  useEffect(() => {
    setOffset(0);
    setHasMore(true);
    fetchPosts(true);
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campfire, author, sort, limit, timeRange, postType]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    await fetchPosts(false);
  }, [hasMore, loading, fetchPosts]);

  const refresh = useCallback(async () => {
    setOffset(0);
    setHasMore(true);
    await fetchPosts(true);
  }, [fetchPosts]);

  return { posts, loading, error, hasMore, loadMore, refresh };
}

// ---------------------------------------------------------------------------
// Single post hook
// ---------------------------------------------------------------------------

interface UsePostReturn {
  post: Post | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function usePost(postId: string | undefined): UsePostReturn {
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!postId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<{ post: Post }>(`/api/posts/${postId}`);
      setPost(data.post);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load post");
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    let cancelled = false;
    if (!postId) return;
    setLoading(true);
    setError(null);
    api.get<{ post: Post }>(`/api/posts/${postId}`)
      .then((data) => { if (!cancelled) setPost(data.post); })
      .catch((err) => { if (!cancelled) setError(err instanceof ApiError ? err.message : "Failed to load post"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [postId]);

  return { post, loading, error, refresh };
}

// ---------------------------------------------------------------------------
// Create post
// ---------------------------------------------------------------------------

interface CreatePostInput {
  campfire_id: string;
  title: string;
  body: string;
  post_type: "text" | "link" | "image";
  url?: string;
}

interface UseCreatePostReturn {
  createPost: (input: CreatePostInput) => Promise<{ post: Post; moderation: ModerationResult }>;
  creating: boolean;
  error: string | null;
}

export function useCreatePost(): UseCreatePostReturn {
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createPost = useCallback(async (input: CreatePostInput) => {
    setCreating(true);
    setError(null);
    try {
      const data = await api.post<{ post: Post; moderation: ModerationResult }>(
        "/api/posts",
        input,
      );
      return data;
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to create post";
      setError(msg);
      throw err;
    } finally {
      setCreating(false);
    }
  }, []);

  return { createPost, creating, error };
}
