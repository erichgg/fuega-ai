"use client";

import * as React from "react";
import { Send, Wifi, WifiOff, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatMessage } from "@/components/fuega/chat-message";
import { useChat, type ChatMessage as ChatMsg } from "@/lib/hooks/useChat";
import { useAuth } from "@/lib/contexts/auth-context";
import { cn } from "@/lib/utils";

interface ChatPanelProps {
  campfireId: string;
  className?: string;
}

export function ChatPanel({ campfireId, className }: ChatPanelProps) {
  const { user } = useAuth();
  const { messages, loading, error, sendMessage, sending, connected } = useChat({
    campfireId,
    enabled: true,
  });

  const [input, setInput] = React.useState("");
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    setInput("");
    try {
      await sendMessage(trimmed);
    } catch {
      // Error shown via hook
      setInput(trimmed); // Restore on failure
    }
    inputRef.current?.focus();
  };

  return (
    <div className={cn("flex flex-col rounded-lg border border-ash-800 bg-ash-950/50", className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-ash-800 px-4 py-2.5">
        <span className="text-xs font-semibold text-ash-300">Chat</span>
        <div className="flex items-center gap-1.5">
          {connected ? (
            <Wifi className="h-3 w-3 text-green-400" />
          ) : (
            <WifiOff className="h-3 w-3 text-ash-600" />
          )}
          <span className={cn("text-[10px]", connected ? "text-green-400" : "text-ash-600")}>
            {connected ? "Live" : "Connecting..."}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto min-h-[300px] max-h-[500px] py-2">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-xs text-ash-500 animate-pulse">Loading messages...</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-xs text-red-400">{error}</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ash-900 border border-ash-800">
              <MessageSquare className="h-5 w-5 text-ash-600" />
            </div>
            <p className="text-xs text-ash-500">No messages yet</p>
            <p className="text-[10px] text-ash-600">Start the conversation below</p>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                isOwn={msg.author_id === user?.id}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      {user ? (
        <form onSubmit={handleSend} className="border-t border-ash-800 p-3">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Send a message..."
              maxLength={2000}
              className="flex-1 rounded-md border border-ash-800 bg-ash-900 px-3 py-2 text-sm text-ash-200 placeholder:text-ash-600 focus:outline-none focus:ring-1 focus:ring-flame-500/50"
              disabled={sending}
            />
            <Button
              type="submit"
              variant="spark"
              size="sm"
              disabled={!input.trim() || sending}
              className="h-9 w-9 p-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      ) : (
        <div className="border-t border-ash-800 p-3 text-center text-xs text-ash-500">
          Log in to chat
        </div>
      )}
    </div>
  );
}
