"use client";

import * as React from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

interface VirtualListProps<T> {
  items: T[];
  estimateSize: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  className?: string;
  /** Called when the user scrolls near the bottom. */
  onEndReached?: () => void;
  /** Threshold (in px) from bottom to trigger onEndReached. Default: 300 */
  endReachedThreshold?: number;
}

/**
 * Virtual scrolling list for large data sets.
 * Renders only visible items + overscan buffer for smooth scrolling.
 */
export function VirtualList<T>({
  items,
  estimateSize,
  renderItem,
  overscan = 5,
  className,
  onEndReached,
  endReachedThreshold = 300,
}: VirtualListProps<T>) {
  const parentRef = React.useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
  });

  // Infinite scroll detection
  React.useEffect(() => {
    if (!onEndReached) return;

    const container = parentRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      if (scrollHeight - scrollTop - clientHeight < endReachedThreshold) {
        onEndReached();
      }
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [onEndReached, endReachedThreshold]);

  return (
    <div
      ref={parentRef}
      className={className}
      style={{ overflow: "auto" }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              transform: `translateY(${virtualItem.start}px)`,
            }}
            data-index={virtualItem.index}
          >
            {renderItem(items[virtualItem.index]!, virtualItem.index)}
          </div>
        ))}
      </div>
    </div>
  );
}
