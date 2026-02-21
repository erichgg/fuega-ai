import { Skeleton } from "@/components/ui/skeleton";

export function FeedSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex gap-3 rounded-lg border border-ash-800 bg-ash-900/50 p-3"
        >
          <div className="flex flex-col items-center gap-1">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-4 w-6" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-3/4" />
            <div className="flex gap-4 pt-1">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function PostDetailSkeleton() {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-ash-800 bg-ash-900/50 p-4">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="mt-2 h-6 w-3/4" />
        <Skeleton className="mt-3 h-20 w-full" />
        <div className="mt-3 flex gap-4">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <Skeleton className="h-24 w-full rounded-lg" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex gap-2 py-2" style={{ marginLeft: `${i * 1.5}rem` }}>
          <Skeleton className="h-16 w-8" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CommunitySkeleton() {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-ash-800 bg-ash-900/50 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-2 h-4 w-72" />
        <div className="mt-3 flex gap-3">
          <Skeleton className="h-9 w-20 rounded-md" />
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
      </div>
      <FeedSkeleton />
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 rounded-lg border border-ash-800 bg-ash-900/50 p-6">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <FeedSkeleton />
    </div>
  );
}

export function GovernanceSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg border border-ash-800 bg-ash-900/50 p-4"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <Skeleton className="h-5 w-64" />
              <Skeleton className="h-3 w-96" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <div className="mt-3 flex gap-4">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ModLogSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-lg border border-ash-800 bg-ash-900/50 p-3"
        >
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}
