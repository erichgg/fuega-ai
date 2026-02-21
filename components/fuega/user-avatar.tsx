import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  username: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: "h-6 w-6 text-xs",
  md: "h-8 w-8 text-sm",
  lg: "h-10 w-10 text-base",
} as const;

const colorPalette = [
  "bg-flame-600",
  "bg-ember-600",
  "bg-blue-600",
  "bg-purple-600",
  "bg-green-600",
  "bg-pink-600",
  "bg-amber-600",
  "bg-teal-600",
] as const;

function hashUsername(username: string): number {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    const char = username.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

export function UserAvatar({ username, size = "md", className }: UserAvatarProps) {
  const colorIndex = hashUsername(username) % colorPalette.length;
  const initials = username.slice(0, 2).toUpperCase();

  return (
    <Avatar className={cn(sizeMap[size], className)}>
      <AvatarFallback
        className={cn(
          colorPalette[colorIndex],
          "text-white font-medium",
        )}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
