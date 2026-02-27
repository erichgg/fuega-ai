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
    badgeClass: "bg-douse/20 text-douse border-douse/30",
  },
  flagged: {
    label: "AI Flagged",
    icon: Eye,
    badgeClass: "bg-flame-400/20 text-flame-400 border-flame-400/30",
  },
  removed: {
    label: "AI Removed",
    icon: Bot,
    badgeClass: "bg-ember-500/20 text-ember-500 border-ember-500/30",
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
