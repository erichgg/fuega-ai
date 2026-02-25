"use client";

import { UserAvatar } from "@/components/fuega/user-avatar";
import { cn } from "@/lib/utils";

interface ChatMessageProps {
  message: {
    id: string;
    body: string;
    author_username?: string;
    created_at: string;
  };
  isOwn?: boolean;
  className?: string;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function ChatMessage({ message, isOwn, className }: ChatMessageProps) {
  const username = message.author_username ?? "anonymous";

  return (
    <div
      className={cn(
        "group flex items-start gap-2.5 px-3 py-1.5 hover:bg-ash-900/30 transition-colors",
        className
      )}
    >
      <UserAvatar username={username} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span
            className={cn(
              "text-xs font-semibold",
              isOwn ? "text-flame-400" : "text-ash-200"
            )}
          >
            {username}
          </span>
          <span className="text-[10px] text-ash-600 opacity-0 group-hover:opacity-100 transition-opacity">
            {formatTime(message.created_at)}
          </span>
        </div>
        <p className="text-sm text-ash-300 break-words leading-relaxed">
          {message.body}
        </p>
      </div>
    </div>
  );
}
