"use client";

import { format } from "date-fns";
import { Bot } from "lucide-react";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar.jsx";
import { cn } from "@/lib/utils.jsx";
import { Database } from "@/database.types.js";

type Message = Database["public"]["Tables"]["ticket_messages"]["Row"] & {
  sender: {
    display_name: string;
    avatar_file_id: string | null;
  } | null;
};

interface MessageItemProps {
  message: Message;
  isCurrentUser: boolean;
}

export function MessageItem({ message, isCurrentUser }: MessageItemProps) {
  return (
    <div
      className={cn(
        "flex gap-3",
        isCurrentUser ? "flex-row-reverse" : "flex-row"
      )}
      data-testid="message-item"
    >
      {message.is_ai_generated ? (
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
          <Bot className="h-5 w-5 text-primary" />
        </div>
      ) : (
        <Avatar className="h-8 w-8">
          {message.sender?.avatar_file_id && (
            <AvatarImage
              src={`/api/files/${message.sender.avatar_file_id}`}
              alt={message.sender?.display_name || ""}
            />
          )}
          <AvatarFallback>
            {message.sender?.display_name?.charAt(0) || "?"}
          </AvatarFallback>
        </Avatar>
      )}

      <div
        className={cn(
          "flex flex-col gap-1 max-w-[80%]",
          isCurrentUser && "items-end"
        )}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {message.is_ai_generated
              ? "AI Assistant"
              : message.sender?.display_name || "Unknown"}
          </span>
          <span className="text-xs text-muted-foreground">
            {format(new Date(message.created_at || ""), "MMM d, h:mm a")}
          </span>
        </div>

        <div
          className={cn(
            "rounded-lg p-3",
            isCurrentUser
              ? "bg-primary text-primary-foreground"
              : message.is_ai_generated
              ? "bg-primary/10 text-foreground"
              : "bg-muted text-muted-foreground"
          )}
        >
          {message.message_content}
        </div>

        {message.is_internal_note && (
          <span className="text-xs text-muted-foreground">Internal Note</span>
        )}
      </div>
    </div>
  );
}
