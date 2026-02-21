import { Bot, Shield, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type ModAction = "approved" | "flagged" | "removed";

interface ModBadgeProps {
  action: ModAction;
  confidence?: number;
  className?: string;
}

const actionConfig: Record<
  ModAction,
  { label: string; icon: typeof Bot; badgeClass: string }
> = {
  approved: {
    label: "AI Approved",
    icon: Shield,
    badgeClass: "bg-green-500/20 text-green-400 border-green-500/30",
  },
  flagged: {
    label: "AI Flagged",
    icon: Eye,
    badgeClass: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  },
  removed: {
    label: "AI Removed",
    icon: Bot,
    badgeClass: "bg-red-500/20 text-red-400 border-red-500/30",
  },
};

export function ModBadge({ action, confidence, className }: ModBadgeProps) {
  const config = actionConfig[action];
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 text-[10px] font-medium",
        config.badgeClass,
        className,
      )}
    >
      <Icon className="h-3 w-3" />
      {config.label}
      {confidence !== undefined && (
        <span className="opacity-70">{Math.round(confidence * 100)}%</span>
      )}
    </Badge>
  );
}
