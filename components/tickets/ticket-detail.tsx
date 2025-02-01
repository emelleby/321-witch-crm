"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { Database } from "@/database.types";
import { useToast } from "@/hooks/use-toast";
import { createBrowserSupabaseClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";

interface TicketDetailProps {
  ticketId: string;
  userRole: "customer" | "agent" | "admin";
}

type Ticket = Database["public"]["Tables"]["support_tickets"]["Row"] & {
  created_by: Database["public"]["Tables"]["user_profiles"]["Row"];
};

type TicketMessage = Database["public"]["Tables"]["ticket_messages"]["Row"] & {
  sender: Database["public"]["Tables"]["user_profiles"]["Row"] | null;
};

export function TicketDetail({ ticketId, userRole }: TicketDetailProps) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [newFileIds, setNewFileIds] = useState<string[]>([]);
  const { toast } = useToast();
  const supabase = createBrowserSupabaseClient();

  useEffect(() => {
    const fetchTicket = async () => {
      const { data: ticketData, error } = await supabase
        .from("support_tickets")
        .select(
          `
          *,
          created_by:user_profiles!support_tickets_created_by_user_id_fkey(*)
        `
        )
        .eq("ticket_id", ticketId)
        .single();

      if (error) {
        console.error("Error fetching ticket:", error);
        return;
      }

      if (ticketData) {
        const ticket: Ticket = {
          ...ticketData,
          created_by:
            ticketData.created_by as Database["public"]["Tables"]["user_profiles"]["Row"],
        };
        setTicket(ticket);
      }
    };

    const fetchMessages = async () => {
      const { data: messagesData, error } = await supabase
        .from("ticket_messages")
        .select(
          `
          *,
          sender:user_profiles!ticket_messages_sender_user_id_fkey(*)
        `
        )
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching messages:", error);
        return;
      }

      if (messagesData) {
        const messages: TicketMessage[] = messagesData.map((msg) => ({
          ...msg,
          sender: msg.sender as
            | Database["public"]["Tables"]["user_profiles"]["Row"]
            | null,
        }));
        setMessages(messages);
      }
    };

    fetchTicket();
    fetchMessages();

    // Set up realtime subscriptions
    const ticketChannel = supabase
      .channel("ticket_detail")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "support_tickets",
          filter: `ticket_id=eq.${ticketId}`,
        },
        (payload) => {
          if (payload.eventType === "UPDATE") {
            setTicket(payload.new as Ticket);
          }
        }
      )
      .subscribe();

    const messageChannel = supabase
      .channel("ticket_messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ticket_messages",
          filter: `ticket_id=eq.${ticketId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as TicketMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ticketChannel);
      supabase.removeChannel(messageChannel);
    };
  }, [ticketId, supabase]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() && newFileIds.length === 0) return;

    try {
      // Add message if there is one
      if (newMessage.trim()) {
        const { error: messageError } = await supabase
          .from("ticket_messages")
          .insert({
            ticket_id: ticketId,
            message_content: newMessage,
            sender_user_id: userRole,
          });

        if (messageError) throw messageError;
      }

      // Link files if any
      if (newFileIds.length > 0) {
        const { error: filesError } = await supabase
          .from("ticket_file_attachments")
          .insert(
            newFileIds.map((fileId) => ({
              ticket_id: ticketId,
              file_id: fileId,
            }))
          );

        if (filesError) throw filesError;
      }

      setNewMessage("");
      setNewFileIds([]);
      toast({
        title: "Success",
        description: "Message sent successfully",
      });
    } catch (error: unknown) {
      console.error(
        "Error sending message:",
        error instanceof Error ? error.message : error
      );
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    }
  };

  if (!ticket) return null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{ticket.ticket_title}</CardTitle>
            <div className="flex gap-2">
              <Badge variant="outline">{ticket.ticket_status}</Badge>
              <Badge
                variant={
                  ticket.ticket_priority === "urgent"
                    ? "destructive"
                    : ticket.ticket_priority === "high"
                    ? "default"
                    : "outline"
                }
              >
                {ticket.ticket_priority}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap">{ticket.ticket_description}</p>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {messages.map((message) => (
          <Card
            key={message.message_id}
            data-testid={`message-${message.message_id}`}
          >
            <CardContent className="pt-4">
              <p className="whitespace-pre-wrap">{message.message_content}</p>
              <p className="text-sm text-muted-foreground mt-2">
                {new Date(message.created_at!).toLocaleString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-2">
        <Textarea
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message..."
          className="flex-1"
          data-testid="message-input"
        />
        <Button onClick={handleSendMessage} data-testid="send-message">
          Send
        </Button>
      </div>
    </div>
  );
}
