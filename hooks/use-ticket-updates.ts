import { useEffect, useState, useCallback } from "react";
import { createBrowserSupabaseClient } from "@/utils/supabase/client";
import { Database } from "@/database.types";
import { RealtimeChannel } from "@supabase/supabase-js";

type Ticket = Database["public"]["Tables"]["support_tickets"]["Row"];

export function useTicketUpdates(teamId?: string, userId?: string) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createBrowserSupabaseClient();

  const setupRealtimeSubscription = useCallback(async () => {
    let channel: RealtimeChannel;

    try {
      // Initial fetch
      const query = supabase.from("support_tickets").select("*");

      if (teamId) {
        query.eq("assigned_to_team_id", teamId);
      }
      if (userId) {
        query.eq("assigned_to_user_id", userId);
      }

      const { data: initialTickets } = await query;
      if (initialTickets) {
        setTickets(initialTickets);
      }

      // Subscribe to changes
      channel = supabase
        .channel("ticket-updates")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "support_tickets",
            filter: teamId
              ? `assigned_to_team_id=eq.${teamId}`
              : userId
              ? `assigned_to_user_id=eq.${userId}`
              : undefined,
          },
          (payload) => {
            if (payload.eventType === "INSERT") {
              setTickets((prev) => [payload.new as Ticket, ...prev]);
            } else if (payload.eventType === "UPDATE") {
              setTickets((prev) =>
                prev.map((ticket) =>
                  ticket.ticket_id === (payload.new as Ticket).ticket_id
                    ? (payload.new as Ticket)
                    : ticket
                )
              );
            } else if (payload.eventType === "DELETE") {
              setTickets((prev) =>
                prev.filter(
                  (ticket) =>
                    ticket.ticket_id !== (payload.old as Ticket).ticket_id
                )
              );
            }
          }
        )
        .subscribe();

      setLoading(false);
    } catch (error) {
      console.error("Error setting up ticket updates:", error);
      setLoading(false);
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [supabase, teamId, userId]);

  useEffect(() => {
    const cleanup = setupRealtimeSubscription();
    return () => {
      cleanup.then((cleanupFn) => cleanupFn());
    };
  }, [setupRealtimeSubscription]);

  return { tickets, loading };
}
