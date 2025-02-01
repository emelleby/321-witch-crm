"use client";

import { FileUpload } from "@/components/file-upload";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Database } from "@/database.types";
import { useToast } from "@/hooks/use-toast";
import { createBrowserSupabaseClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type Ticket = Database["public"]["Tables"]["support_tickets"]["Row"];
type Message = Database["public"]["Tables"]["ticket_messages"]["Row"];
type FileAttachment = {
  file_id: string;
  file_name: string;
  file_type: string | null;
  storage_path: string;
};

interface TicketViewProps {
  ticketId: string;
}

export function TicketView({ ticketId }: TicketViewProps) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [files, setFiles] = useState<FileAttachment[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [newFileIds, setNewFileIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();

  const fetchTicketAndMessages = useCallback(async () => {
    try {
      const { data: ticketData, error: ticketError } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("ticket_id", ticketId)
        .single();

      if (ticketError) throw ticketError;
      setTicket(ticketData);

      const { data: messagesData, error: messagesError } = await supabase
        .from("ticket_messages")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });

      if (messagesError) throw messagesError;
      setMessages(messagesData);

      const { data: filesData, error: filesError } = await supabase
        .from("ticket_file_attachments")
        .select(
          `
            file:uploaded_files (
              file_id,
              file_name,
              file_type,
              storage_path
            )
          `
        )
        .eq("ticket_id", ticketId);

      if (filesError) throw filesError;
      setFiles(filesData.map((f: { file: FileAttachment }) => f.file));
    } catch (error) {
      console.error("Error fetching ticket details:", error);
      toast({
        title: "Error",
        description: "Failed to load ticket details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [ticketId, supabase, toast]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() && newFileIds.length === 0) return;

    setSending(true);
    try {
      if (newMessage.trim()) {
        const { error: messageError } = await supabase
          .from("ticket_messages")
          .insert({
            ticket_id: ticketId,
            message_content: newMessage,
            sender_user_id: "customer",
          });

        if (messageError) throw messageError;
      }

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

      // Update ticket status to open if it was waiting on customer
      if (ticket?.ticket_status === "waiting_on_customer") {
        await supabase
          .from("support_tickets")
          .update({ ticket_status: "open" })
          .eq("ticket_id", ticketId);
      }

      setNewMessage("");
      setNewFileIds([]);
      toast({
        title: "Success",
        description: "Message sent successfully",
      });
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleCloseTicket = async () => {
    try {
      const { error } = await supabase
        .from("support_tickets")
        .update({ ticket_status: "closed" })
        .eq("ticket_id", ticketId);

      if (error) throw error;

      setTicket((prev) => (prev ? { ...prev, ticket_status: "closed" } : null));
      toast({
        title: "Success",
        description: "Ticket closed successfully",
      });
    } catch (error) {
      console.error("Error closing ticket:", error);
      toast({
        title: "Error",
        description: "Failed to close ticket",
        variant: "destructive",
      });
    }
  };

  const handleReopenTicket = async () => {
    try {
      const { error } = await supabase
        .from("support_tickets")
        .update({ ticket_status: "open" })
        .eq("ticket_id", ticketId);

      if (error) throw error;

      setTicket((prev) => (prev ? { ...prev, ticket_status: "open" } : null));
      toast({
        title: "Success",
        description: "Ticket reopened successfully",
      });
    } catch (error) {
      console.error("Error reopening ticket:", error);
      toast({
        title: "Error",
        description: "Failed to reopen ticket",
        variant: "destructive",
      });
    }
  };

  const getFileUrl = async (path: string) => {
    const { data } = supabase.storage.from("attachments").getPublicUrl(path);
    return data.publicUrl;
  };

  useEffect(() => {
    fetchTicketAndMessages();

    // Set up real-time subscription for messages
    const channel = supabase
      .channel(`ticket-${ticketId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ticket_messages",
          filter: `ticket_id=eq.${ticketId}`,
        },
        async (payload) => {
          if (payload.eventType === "INSERT") {
            const message = payload.new as Message;
            setMessages((prev) => [...prev, message]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTicketAndMessages, ticketId, supabase]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Ticket not found</h2>
          <Button
            className="mt-4"
            onClick={() => router.push("/customer/tickets")}
          >
            Back to tickets
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {ticket.ticket_title}
          </h1>
          <div className="mt-2 flex gap-4 text-sm text-muted-foreground">
            <span>Status: {ticket.ticket_status}</span>
            <span>
              Created: {new Date(ticket.created_at || "").toLocaleDateString()}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          {ticket.ticket_status === "open" ||
          ticket.ticket_status === "waiting_on_customer" ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline">Close Ticket</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Close this ticket?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to close this ticket? You can reopen
                    it later if needed.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCloseTicket}>
                    Close Ticket
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline">Reopen Ticket</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reopen this ticket?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will reopen the ticket for further discussion.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleReopenTicket}>
                    Reopen Ticket
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button
            variant="outline"
            onClick={() => router.push("/customer/tickets")}
          >
            Back to tickets
          </Button>
        </div>
      </div>

      <Card className="p-6">
        <h2 className="mb-2 font-semibold">Description</h2>
        <p className="whitespace-pre-wrap text-muted-foreground">
          {ticket.ticket_description}
        </p>
      </Card>

      {files.length > 0 && (
        <Card className="p-6">
          <h2 className="mb-4 font-semibold">Attachments</h2>
          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.file_id}
                className="flex items-center justify-between rounded-md border bg-background p-2"
              >
                <span className="text-sm">{file.file_name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    const url = await getFileUrl(file.storage_path);
                    window.open(url, "_blank");
                  }}
                >
                  Download
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="space-y-4">
        <h2 className="font-semibold">Messages</h2>
        <div className="space-y-4">
          {messages.map((message) => (
            <Card
              key={message.message_id}
              className={`p-4 ${
                message.sender_user_id === "customer" ? "ml-12" : "mr-12"
              }`}
            >
              <div className="mb-2 flex items-start justify-between">
                <Badge
                  variant={
                    message.sender_user_id === "customer"
                      ? "default"
                      : "secondary"
                  }
                >
                  {message.sender_user_id === "customer" ? "You" : "Agent"}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {new Date(message.created_at || "").toLocaleString()}
                </span>
              </div>
              <p className="whitespace-pre-wrap">{message.message_content}</p>
            </Card>
          ))}
        </div>

        {ticket.ticket_status !== "closed" && (
          <div className="space-y-4">
            <FileUpload
              maxFiles={5}
              allowedTypes={["*/*"]}
              onUploadCompleteAction={setNewFileIds}
            />
            <div className="space-y-4">
              <Textarea
                placeholder="Type your message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="min-h-[100px]"
              />
              <div className="flex justify-end">
                <Button
                  onClick={handleSendMessage}
                  disabled={
                    sending || (!newMessage.trim() && newFileIds.length === 0)
                  }
                >
                  {sending ? "Sending..." : "Send Message"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
