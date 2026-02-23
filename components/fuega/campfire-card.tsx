"use client";

import { Users, Flame } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CampfireCardProps {
  campfire: {
    id: string;
    name: string;
    description: string;
    memberCount: number;
    activeCount?: number;
    isJoined?: boolean;
  };
  onJoin?: () => void;
  onLeave?: () => void;
  className?: string;
}

export function CampfireCard({
  campfire,
  onJoin,
  onLeave,
  className,
}: CampfireCardProps) {
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
                <span className="text-lava-hot">f</span><span className="text-smoke mx-1">|</span><span>{campfire.name}</span>
              </span>
            </CardTitle>
          </div>
          {campfire.isJoined ? (
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
          {campfire.description}
        </p>
        <div className="mt-3 flex items-center gap-4 text-xs text-ash-500">
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {campfire.memberCount.toLocaleString()} members
          </span>
          {campfire.activeCount !== undefined && (
            <span className="flex items-center gap-1">
              <Flame className="h-3.5 w-3.5 text-flame-500" />
              {campfire.activeCount} active
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
