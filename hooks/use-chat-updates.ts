import { useEffect, useState, useCallback } from "react";
import { createBrowserSupabaseClient } from "@/utils/supabase/client";
import { Database } from "@/database.types";
import { RealtimeChannel } from "@supabase/supabase-js";

type Message = Database["public"]["Tables"]["ticket_messages"]["Row"];

export function useChatUpdates(ticketId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createBrowserSupabaseClient();

  const setupRealtimeSubscription = useCallback(async () => {
    let channel: RealtimeChannel;

    try {
      // Initial fetch
      const { data: initialMessages } = await supabase
        .from("ticket_messages")
        .select(
          `
          *,
          sender:sender_user_id(
            user_id,
            display_name,
            avatar_file_id
          )
        `
        )
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });

      if (initialMessages) {
        setMessages(initialMessages);
      }

      // Subscribe to changes
      channel = supabase
        .channel(`chat-${ticketId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "ticket_messages",
            filter: `ticket_id=eq.${ticketId}`,
          },
          async (payload) => {
            // Fetch full message data with sender info
            if (
              payload.eventType === "INSERT" ||
              payload.eventType === "UPDATE"
            ) {
              const { data: message } = await supabase
                .from("ticket_messages")
                .select(
                  `
                  *,
                  sender:sender_user_id(
                    user_id,
                    display_name,
                    avatar_file_id
                  )
                `
                )
                .eq("message_id", payload.new.message_id)
                .single();

              if (message) {
                if (payload.eventType === "INSERT") {
                  setMessages((prev) => [...prev, message]);
                } else {
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.message_id === message.message_id ? message : msg
                    )
                  );
                }
              }
            } else if (payload.eventType === "DELETE") {
              setMessages((prev) =>
                prev.filter((msg) => msg.message_id !== payload.old.message_id)
              );
            }
          }
        )
        .subscribe();

      setLoading(false);
    } catch (error) {
      console.error("Error setting up chat updates:", error);
      setLoading(false);
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [supabase, ticketId]);

  useEffect(() => {
    const cleanup = setupRealtimeSubscription();
    return () => {
      cleanup.then((cleanupFn) => cleanupFn());
    };
  }, [setupRealtimeSubscription]);

  const sendMessage = async (content: string, isInternal: boolean = false) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const message = {
      ticket_id: ticketId,
      sender_user_id: user.id,
      message_content: content,
      is_internal_note: isInternal,
      is_ai_generated: false,
      customer_has_read: false,
      agent_has_read: true,
      attached_file_ids: [],
    };

    const { error } = await supabase.from("ticket_messages").insert(message);

    if (error) {
      console.error("Error sending message:", error);
    }
  };

  return { messages, loading, sendMessage };
}
