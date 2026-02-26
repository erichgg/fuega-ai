"use client";

import { useRef, useEffect, useCallback } from "react";

interface UseInfiniteScrollOptions {
  /** Whether there are more items to load */
  hasMore: boolean;
  /** Whether currently loading */
  loading: boolean;
  /** Function to load more items */
  onLoadMore: () => void;
  /** Root margin for IntersectionObserver (default "200px") */
  rootMargin?: string;
}

/**
 * Returns a ref to attach to a sentinel element at the bottom of a list.
 * When the sentinel becomes visible, onLoadMore is called.
 */
export function useInfiniteScroll({
  hasMore,
  loading,
  onLoadMore,
  rootMargin = "200px",
}: UseInfiniteScrollOptions) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry?.isIntersecting && hasMore && !loading) {
        onLoadMore();
      }
    },
    [hasMore, loading, onLoadMore],
  );

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(handleIntersect, {
      rootMargin,
    });

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [handleIntersect, rootMargin]);

  return sentinelRef;
}
