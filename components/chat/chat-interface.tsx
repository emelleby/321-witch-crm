"use client";

import { Loader2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { MessageItem } from "@/components/chat/message-item.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import { useAuth } from "@/hooks/use-auth.jsx";
import { useToast } from "@/hooks/use-toast.jsx";
import { createBrowserSupabaseClient } from "@/utils/supabase/client.jsx";
import { Database } from "@/database.types.js";

type Message = Database["public"]["Tables"]["ticket_messages"]["Row"] & {
  sender: {
    display_name: string;
    avatar_file_id: string | null;
  } | null;
};

type Ticket = Database["public"]["Tables"]["support_tickets"]["Row"] & {
  created_by_user: { display_name: string } | null;
  assigned_to_user: { display_name: string } | null;
  assigned_to_team: { team_name: string } | null;
};

interface ChatInterfaceProps {
  ticketId: string;
  initialMessages: Message[];
  ticket: Ticket;
  userRole: "admin" | "agent" | "customer";
}

export function ChatInterface({
  ticketId,
  initialMessages,
  userRole,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [aiPreview, setAIPreview] = useState<string | null>(null);
  const [showAIPreview, setShowAIPreview] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const supabase = createBrowserSupabaseClient();

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Subscribe to new messages
  useEffect(() => {
    const channel = supabase
      .channel(`ticket:${ticketId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ticket_messages",
          filter: `ticket_id=eq.${ticketId}`,
        },
        async (payload) => {
          // Fetch the complete message with sender info
          const { data: newMessage } = await supabase
            .from("ticket_messages")
            .select(
              `
              *,
              sender:sender_user_id(display_name, avatar_file_id)
            `
            )
            .eq("message_id", payload.new.message_id)
            .single();

          if (newMessage) {
            setMessages((prev) => [...prev, newMessage as Message]);

            // Update read status based on user role
            if (userRole === "agent" || userRole === "admin") {
              await supabase
                .from("ticket_messages")
                .update({ agent_has_read: true })
                .eq("message_id", newMessage.message_id);
            } else if (userRole === "customer") {
              await supabase
                .from("ticket_messages")
                .update({ customer_has_read: true })
                .eq("message_id", newMessage.message_id);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketId, supabase, userRole]);

  const handleGetAIPreview = async () => {
    if (!newMessage.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/tickets/preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ticketId,
          message: newMessage.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get AI preview");
      }

      const data = await response.json();
      setAIPreview(data.response);
      setShowAIPreview(true);
    } catch (error) {
      toast({
        title: "Error getting AI preview",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendWithAI = async () => {
    if (!newMessage.trim() || !user) return;

    setIsLoading(true);
    try {
      // Send user message
      const { data: userMessage, error } = await supabase
        .from("ticket_messages")
        .insert({
          ticket_id: ticketId,
          sender_user_id: user.id,
          message_content: newMessage.trim(),
          is_internal_note: false,
          agent_has_read: userRole === "agent" || userRole === "admin",
          customer_has_read: userRole === "customer",
          is_ai_generated: false,
        })
        .select()
        .single();

      if (error) throw error;
      setNewMessage("");

      // Trigger AI processing
      setIsAIProcessing(true);
      const response = await fetch("/api/tickets/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ticketId,
          messageId: userMessage.message_id,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to process message with AI");
      }
    } catch (error) {
      toast({
        title: "Error sending message",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsAIProcessing(false);
      setShowAIPreview(false);
      setAIPreview(null);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/tickets/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ticketId,
          message: newMessage.trim(),
          userId: user.id,
          userRole,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      setNewMessage("");
    } catch (error) {
      toast({
        title: "Error sending message",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsAIProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <MessageItem
            key={message.message_id}
            message={message}
            isCurrentUser={message.sender_user_id === user?.id}
          />
        ))}
        {isAIProcessing && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>AI is processing your message...</span>
          </div>
        )}
        {showAIPreview && aiPreview && (
          <div className="border rounded-lg p-4 bg-muted/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">AI Preview</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAIPreview(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {aiPreview}
            </p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t p-4">
        <div className="flex flex-col gap-2">
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="min-h-[80px]"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            data-testid="message-input"
          />
          <div className="flex justify-end gap-2">
            {(userRole === "agent" || userRole === "admin") && (
              <>
                <Button
                  variant="outline"
                  onClick={handleGetAIPreview}
                  disabled={isLoading || !newMessage.trim()}
                >
                  Preview AI Response
                </Button>
                <Button
                  onClick={handleSendWithAI}
                  disabled={isLoading || !newMessage.trim()}
                >
                  Send with AI
                </Button>
              </>
            )}
            <Button
              onClick={handleSendMessage}
              disabled={isLoading || !newMessage.trim()}
              data-testid="send-message-button"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Send"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
