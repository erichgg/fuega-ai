"use client";

import { useCallback, useEffect, useState } from "react";
import { api, type Comment, type ModerationResult, ApiError } from "@/lib/api/client";

// ---------------------------------------------------------------------------
// List comments for a post
// ---------------------------------------------------------------------------

interface UseCommentsReturn {
  comments: Comment[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useComments(postId: string | undefined): UseCommentsReturn {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!postId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<{ comments: Comment[] }>(
        `/api/posts/${postId}/comments`,
      );
      setComments(data.comments);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load comments");
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    let cancelled = false;
    if (!postId) return;
    setLoading(true);
    setError(null);
    api.get<{ comments: Comment[] }>(`/api/posts/${postId}/comments`)
      .then((data) => { if (!cancelled) setComments(data.comments); })
      .catch((err) => { if (!cancelled) setError(err instanceof ApiError ? err.message : "Failed to load comments"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [postId]);

  return { comments, loading, error, refresh };
}

// ---------------------------------------------------------------------------
// Create comment
// ---------------------------------------------------------------------------

interface CreateCommentInput {
  post_id: string;
  body: string;
  parent_id?: string;
}

interface UseCreateCommentReturn {
  createComment: (input: CreateCommentInput) => Promise<{ comment: Comment; moderation: ModerationResult }>;
  creating: boolean;
  error: string | null;
  clearError: () => void;
}

export function useCreateComment(): UseCreateCommentReturn {
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createComment = useCallback(async (input: CreateCommentInput) => {
    setCreating(true);
    setError(null);
    try {
      const data = await api.post<{ comment: Comment; moderation: ModerationResult }>(
        `/api/posts/${input.post_id}/comments`,
        { body: input.body, parent_id: input.parent_id },
      );
      return data;
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to create comment";
      setError(msg);
      throw err;
    } finally {
      setCreating(false);
    }
  }, []);

  return { createComment, creating, error, clearError: () => setError(null) };
}

// ---------------------------------------------------------------------------
// Edit comment
// ---------------------------------------------------------------------------

interface UseEditCommentReturn {
  editComment: (commentId: string, body: string) => Promise<{ comment: Comment }>;
  editing: boolean;
  error: string | null;
}

export function useEditComment(): UseEditCommentReturn {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editComment = useCallback(async (commentId: string, body: string) => {
    setEditing(true);
    setError(null);
    try {
      const data = await api.patch<{ comment: Comment }>(
        `/api/comments/${commentId}`,
        { body },
      );
      return data;
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to edit comment";
      setError(msg);
      throw err;
    } finally {
      setEditing(false);
    }
  }, []);

  return { editComment, editing, error };
}

// ---------------------------------------------------------------------------
// Delete comment
// ---------------------------------------------------------------------------

interface UseDeleteCommentReturn {
  deleteComment: (commentId: string) => Promise<void>;
  deleting: boolean;
  error: string | null;
}

export function useDeleteComment(): UseDeleteCommentReturn {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteComment = useCallback(async (commentId: string) => {
    setDeleting(true);
    setError(null);
    try {
      await api.delete(`/api/comments/${commentId}`);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to delete comment";
      setError(msg);
      throw err;
    } finally {
      setDeleting(false);
    }
  }, []);

  return { deleteComment, deleting, error };
}
