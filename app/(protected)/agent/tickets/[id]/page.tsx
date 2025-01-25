"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Database } from "@/database.types";
import { useToast } from "@/hooks/use-toast";
import { createBrowserSupabaseClient } from "@/utils/supabase/client";

type Ticket = Database["public"]["Tables"]["support_tickets"]["Row"];
type Message = Database["public"]["Tables"]["ticket_messages"]["Row"];
type AttachmentFile = Database["public"]["Tables"]["uploaded_files"]["Row"];

type FileAttachment = Pick<
  Database["public"]["Tables"]["uploaded_files"]["Row"],
  "file_id" | "file_name" | "file_type" | "storage_path"
>;

type FileJoinResult = {
  file: FileAttachment;
};

interface PageProps {
  params: { id: string };
}

export default function AgentTicketDetailPage({ params }: PageProps) {
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [files, setFiles] = useState<FileAttachment[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [newFileIds, setNewFileIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isInternal, setIsInternal] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const { toast } = useToast();

  const fetchTicketAndMessages = useCallback(async () => {
    try {
      // Fetch ticket details
      const { data: ticketData, error: ticketError } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("ticket_id", params.id)
        .single();

      if (ticketError) throw ticketError;
      setTicket(ticketData);

      // Fetch messages
      const { data: messagesData, error: messagesError } = await supabase
        .from("ticket_messages")
        .select("*")
        .eq("ticket_id", params.id)
        .order("created_at", { ascending: true });

      if (messagesError) throw messagesError;
      setMessages(messagesData);

      // Fetch files
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
        .eq("ticket_id", params.id);

      if (filesError) throw filesError;
      setFiles(filesData.map((f: FileJoinResult) => f.file));
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load ticket details",
        variant: "destructive",
      });
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  }, [params.id, supabase, toast]);

  const markMessagesAsRead = useCallback(async () => {
    try {
      await supabase
        .from("ticket_messages")
        .update({ agent_has_read: true })
        .eq("ticket_id", params.id)
        .eq("sender_user_id", "customer");
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  }, [params.id, supabase]);

  const markMessageAsRead = useCallback(
    async (messageId: string) => {
      try {
        await supabase
          .from("ticket_messages")
          .update({ agent_has_read: true })
          .eq("message_id", messageId);
      } catch (error) {
        console.error("Error marking message as read:", error);
      }
    },
    [supabase]
  );

  const handleSendMessage = async () => {
    if (!newMessage.trim() && newFileIds.length === 0) return;

    setSending(true);
    try {
      // Add message if there is one
      if (newMessage.trim()) {
        const { error: messageError } = await supabase
          .from("ticket_messages")
          .insert({
            ticket_id: params.id,
            message_content: newMessage,
            sender_user_id: "agent",
            is_internal_note: isInternal,
          });

        if (messageError) throw messageError;
      }

      // Link files if any
      if (newFileIds.length > 0) {
        const { error: filesError } = await supabase
          .from("ticket_file_attachments")
          .insert(
            newFileIds.map((fileId) => ({
              ticket_id: params.id,
              file_id: fileId,
            }))
          );

        if (filesError) throw filesError;
      }

      setNewMessage("");
      setNewFileIds([]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
      console.error("Error:", error);
    } finally {
      setSending(false);
    }
  };

  const handleCloseTicket = async () => {
    try {
      const { error } = await supabase
        .from("support_tickets")
        .update({ ticket_status: "closed" })
        .eq("ticket_id", params.id);

      if (error) throw error;

      setTicket((prev) => (prev ? { ...prev, ticket_status: "closed" } : null));
      toast({
        title: "Success",
        description: "Ticket closed successfully",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to close ticket",
        variant: "destructive",
      });
      console.error("Error:", error);
    }
  };

  const handleReopenTicket = async () => {
    try {
      const { error } = await supabase
        .from("support_tickets")
        .update({ ticket_status: "open" })
        .eq("ticket_id", params.id);

      if (error) throw error;

      setTicket((prev) => (prev ? { ...prev, ticket_status: "open" } : null));
      toast({
        title: "Success",
        description: "Ticket reopened successfully",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reopen ticket",
        variant: "destructive",
      });
      console.error("Error:", error);
    }
  };

  const getFileUrl = async (path: string) => {
    const { data } = supabase.storage.from("attachments").getPublicUrl(path);
    return data.publicUrl;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-500";
      case "normal":
        return "bg-yellow-500";
      case "low":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-green-500";
      case "waiting_on_customer":
        return "bg-yellow-500";
      case "closed":
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
  };

  useEffect(() => {
    fetchTicketAndMessages();
    markMessagesAsRead();

    // Set up realtime subscription
    const channel = supabase
      .channel(`ticket-${params.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ticket_messages",
          filter: `ticket_id=eq.${params.id}`,
        },
        async (payload) => {
          if (payload.eventType === "INSERT") {
            const message = payload.new as Message;
            if (message.sender_user_id === "customer") {
              await markMessageAsRead(message.message_id);
            }
            setMessages((prev) => [...prev, message]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [
    fetchTicketAndMessages,
    markMessagesAsRead,
    markMessageAsRead,
    params.id,
    supabase,
  ]);

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
            onClick={() => router.push("/agent/tickets")}
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
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2">
                    Priority:
                    <div
                      className={`h-2 w-2 rounded-full ${getPriorityColor(
                        ticket.ticket_priority
                      )}`}
                    />
                    {ticket.ticket_priority}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {ticket.ticket_priority === "high" &&
                    "Urgent issue requiring immediate attention"}
                  {ticket.ticket_priority === "normal" &&
                    "Standard priority issue"}
                  {ticket.ticket_priority === "low" &&
                    "Non-urgent issue that can be addressed later"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2">
                    Status:
                    <div
                      className={`h-2 w-2 rounded-full ${getStatusColor(
                        ticket.ticket_status
                      )}`}
                    />
                    {ticket.ticket_status}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {ticket.ticket_status === "open" &&
                    "Ticket is active and awaiting response"}
                  {ticket.ticket_status === "waiting_on_customer" &&
                    "Ticket is awaiting customer response"}
                  {ticket.ticket_status === "closed" &&
                    "Ticket has been resolved"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <span>
              Created: {new Date(ticket.created_at || "").toLocaleDateString()}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          {ticket.ticket_status === "open" ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline">Close Ticket</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Close this ticket?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to close this ticket? You won&apos;t
                    be able to reopen it later.
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
          ) : ticket.ticket_status === "closed" ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline">Reopen Ticket</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reopen this ticket?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will reopen the ticket for further discussion.
                    You&apos;ll be able to add new messages.
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
          ) : null}
          <Button
            variant="outline"
            onClick={() => router.push("/agent/tickets")}
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
              } ${message.is_internal_note ? "border-yellow-500" : ""}`}
            >
              <div className="mb-2 flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      message.sender_user_id === "customer"
                        ? "default"
                        : "secondary"
                    }
                  >
                    {message.sender_user_id === "customer"
                      ? "Customer"
                      : "Agent"}
                  </Badge>
                  {message.is_internal_note && (
                    <Badge variant="secondary">Internal Note</Badge>
                  )}
                </div>
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
              onUploadComplete={setNewFileIds}
            />
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="internal-note"
                  checked={isInternal}
                  onCheckedChange={setIsInternal}
                />
                <Label htmlFor="internal-note">Internal Note</Label>
              </div>
              <Textarea
                placeholder={
                  isInternal
                    ? "Add an internal note..."
                    : "Type your message..."
                }
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
                  {sending
                    ? "Sending..."
                    : isInternal
                    ? "Add Note"
                    : "Send Message"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
