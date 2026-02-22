import { Users, Flame } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CommunityCardProps {
  community: {
    id: string;
    name: string;
    description: string;
    category: string;
    memberCount: number;
    activeCount?: number;
    isJoined?: boolean;
  };
  onJoin?: () => void;
  onLeave?: () => void;
  className?: string;
}

const categoryColors: Record<string, string> = {
  technology: "bg-blue-500/20 text-blue-400",
  science: "bg-green-500/20 text-green-400",
  politics: "bg-red-500/20 text-red-400",
  entertainment: "bg-purple-500/20 text-purple-400",
  general: "bg-ash-500/20 text-ash-400",
};

export function CommunityCard({
  community,
  onJoin,
  onLeave,
  className,
}: CommunityCardProps) {
  return (
    <Card
      className={cn(
        "border-ash-800 bg-ash-900/50 transition-colors hover:border-ash-700",
        className,
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">
              <span className="text-flame-400 cursor-pointer hover:underline">
                <span className="text-lava-hot">f</span><span className="text-smoke mx-1">|</span><span>{community.name}</span>
              </span>
            </CardTitle>
            <Badge
              variant="outline"
              className={cn(
                "mt-1 text-[10px]",
                categoryColors[community.category] ?? categoryColors.general,
              )}
            >
              {community.category}
            </Badge>
          </div>
          {community.isJoined ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onLeave}
              className="border-ash-700 text-ash-400 hover:border-red-500/50 hover:text-red-400"
            >
              Joined
            </Button>
          ) : (
            <Button variant="spark" size="sm" onClick={onJoin}>
              Join
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-ash-400 line-clamp-2">
          {community.description}
        </p>
        <div className="mt-3 flex items-center gap-4 text-xs text-ash-500">
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {community.memberCount.toLocaleString()} members
          </span>
          {community.activeCount !== undefined && (
            <span className="flex items-center gap-1">
              <Flame className="h-3.5 w-3.5 text-flame-500" />
              {community.activeCount} active
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
