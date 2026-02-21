import { FeedSkeleton } from "@/components/fuega/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function HomeLoading() {
  return (
    <div>
      <Skeleton className="h-10 w-64 rounded-lg" />
      <div className="mt-4">
        <FeedSkeleton />
      </div>
    </div>
  );
}
