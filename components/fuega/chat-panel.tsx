"use client";

import * as React from "react";
import { Send, Wifi, WifiOff, MessageSquare, Hash, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatMessage } from "@/components/fuega/chat-message";
import {
  useChat,
  useChatRooms,
  type ChatMessage as ChatMsg,
  type ChatRoom,
} from "@/lib/hooks/useChat";
import { useAuth } from "@/lib/contexts/auth-context";
import { cn } from "@/lib/utils";

interface ChatPanelProps {
  campfireId: string;
  className?: string;
}

export function ChatPanel({ campfireId, className }: ChatPanelProps) {
  const { user } = useAuth();
  const { rooms, loading: roomsLoading, createRoom } = useChatRooms(campfireId);
  const [activeRoomId, setActiveRoomId] = React.useState<string | null>(null);
  const [showCreateRoom, setShowCreateRoom] = React.useState(false);
  const [newRoomName, setNewRoomName] = React.useState("");
  const [creating, setCreating] = React.useState(false);

  // Auto-select default room
  React.useEffect(() => {
    if (rooms.length > 0 && !activeRoomId) {
      const defaultRoom = rooms.find((r) => r.is_default) ?? rooms[0];
      if (defaultRoom) setActiveRoomId(defaultRoom.id);
    }
  }, [rooms, activeRoomId]);

  const { messages, loading, error, sendMessage, sending, connected } = useChat({
    campfireId,
    roomId: activeRoomId ?? undefined,
    enabled: !!activeRoomId,
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
      setInput(trimmed);
    }
    inputRef.current?.focus();
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newRoomName.trim();
    if (!name || creating) return;

    setCreating(true);
    try {
      const room = await createRoom(name);
      setActiveRoomId(room.id);
      setNewRoomName("");
      setShowCreateRoom(false);
    } catch {
      // Error handled silently
    } finally {
      setCreating(false);
    }
  };

  const activeRoom = rooms.find((r) => r.id === activeRoomId);

  return (
    <div className={cn("flex flex-col rounded-md border border-lava-hot/10 bg-coal", className)}>
      {/* Room selector + header */}
      <div className="flex items-stretch border-b border-lava-hot/10">
        {/* Room tabs — horizontal scroll */}
        <div className="flex-1 flex items-center gap-0.5 overflow-x-auto px-2 py-1.5 scrollbar-hide">
          {roomsLoading ? (
            <span className="text-xs text-smoke animate-pulse px-2">Loading rooms…</span>
          ) : (
            rooms.map((room) => (
              <button
                key={room.id}
                onClick={() => setActiveRoomId(room.id)}
                className={cn(
                  "flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-1 text-xs font-mono transition-colors shrink-0",
                  room.id === activeRoomId
                    ? "bg-lava-hot/10 text-lava-hot font-medium"
                    : "text-ash hover:bg-charcoal/50 hover:text-foreground",
                )}
              >
                <Hash className="h-3 w-3 shrink-0" />
                {room.name}
              </button>
            ))
          )}

          {/* Create room button */}
          {user && !showCreateRoom && (
            <button
              onClick={() => setShowCreateRoom(true)}
              className="flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-1 text-xs text-smoke hover:text-lava-hot transition-colors shrink-0"
              aria-label="Create room"
            >
              <Plus className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Connection status */}
        <div className="flex items-center gap-1.5 px-3 border-l border-lava-hot/10">
          {connected ? (
            <Wifi className="h-3 w-3 text-green-400" />
          ) : (
            <WifiOff className="h-3 w-3 text-smoke" />
          )}
          <span className={cn("text-[10px] font-mono", connected ? "text-green-400" : "text-smoke")}>
            {connected ? "Live" : "…"}
          </span>
        </div>
      </div>

      {/* Create room inline form */}
      {showCreateRoom && (
        <form onSubmit={handleCreateRoom} className="flex items-center gap-2 border-b border-lava-hot/10 px-3 py-2 bg-charcoal/30">
          <Hash className="h-3 w-3 text-smoke shrink-0" />
          <input
            type="text"
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
            placeholder="room-name"
            maxLength={64}
            className="flex-1 bg-transparent text-xs font-mono text-foreground placeholder:text-smoke focus:outline-none"
            autoFocus
          />
          <Button type="submit" variant="spark" size="sm" disabled={!newRoomName.trim() || creating} className="h-6 px-2 text-[10px]">
            Create
          </Button>
          <button type="button" onClick={() => { setShowCreateRoom(false); setNewRoomName(""); }} className="text-smoke hover:text-foreground">
            <X className="h-3 w-3" />
          </button>
        </form>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto min-h-[300px] max-h-[500px] py-2">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-xs text-smoke animate-pulse">Loading messages...</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-xs text-red-400">{error}</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-charcoal border border-lava-hot/10">
              <MessageSquare className="h-5 w-5 text-smoke" />
            </div>
            <p className="text-xs text-smoke">
              No messages in <span className="font-mono text-lava-hot">#{activeRoom?.name ?? "general"}</span>
            </p>
            <p className="text-[10px] text-smoke/60">Start the conversation below</p>
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
        <form onSubmit={handleSend} className="border-t border-lava-hot/10 p-3">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Message #${activeRoom?.name ?? "general"}…`}
              maxLength={2000}
              className="flex-1 rounded-md border border-lava-hot/10 bg-charcoal/30 px-3 py-2 text-sm text-foreground placeholder:text-smoke focus:outline-none focus:border-lava-hot/30 transition-colors"
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
        <div className="border-t border-lava-hot/10 p-3 text-center text-xs text-smoke">
          Log in to chat
        </div>
      )}
    </div>
  );
}
