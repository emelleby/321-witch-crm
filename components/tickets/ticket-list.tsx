"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Database } from "@/database.types";
import { createBrowserSupabaseClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface TicketListProps {
  userRole: "customer" | "agent" | "admin";
}

type Ticket = Database["public"]["Tables"]["support_tickets"]["Row"] & {
  created_by: Database["public"]["Tables"]["user_profiles"]["Row"];
  messages: Database["public"]["Tables"]["ticket_messages"]["Row"][];
};

export function TicketList({ userRole }: TicketListProps) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();

  useEffect(() => {
    const fetchTickets = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from("support_tickets")
        .select(
          `
          *,
          created_by:user_profiles!support_tickets_created_by_user_id_fkey(*),
          messages:ticket_messages(*)
        `
        )
        .order("created_at", { ascending: false });

      // Add filters based on user role
      switch (userRole) {
        case "customer":
          query = query.eq("created_by_user_id", user.id);
          break;
        case "agent":
          query = query.eq("assigned_to_user_id", user.id);
          break;
        case "admin":
          // Admins can see all tickets
          break;
      }

      const { data: ticketsData, error } = await query;

      if (error) {
        console.error("Error fetching tickets:", error);
        return;
      }

      if (ticketsData) {
        const tickets: Ticket[] = ticketsData.map((ticket) => ({
          ...ticket,
          created_by:
            ticket.created_by as Database["public"]["Tables"]["user_profiles"]["Row"],
          messages:
            ticket.messages as Database["public"]["Tables"]["ticket_messages"]["Row"][],
        }));
        setTickets(tickets);
      }
    };

    fetchTickets();

    // Set up realtime subscription
    const channel = supabase
      .channel("ticket_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "support_tickets",
        },
        async (payload) => {
          const ticketId =
            payload.eventType === "DELETE"
              ? (payload.old as { ticket_id: string }).ticket_id
              : (payload.new as { ticket_id: string }).ticket_id;

          if (!ticketId) return;

          // Fetch complete ticket data when changes occur
          const { data: ticketData } = await supabase
            .from("support_tickets")
            .select(
              `
              *,
              created_by:user_profiles!support_tickets_created_by_user_id_fkey(*),
              messages:ticket_messages(*)
            `
            )
            .eq("ticket_id", ticketId)
            .single();

          if (payload.eventType === "INSERT" && ticketData) {
            const ticket: Ticket = {
              ...ticketData,
              created_by:
                ticketData.created_by as Database["public"]["Tables"]["user_profiles"]["Row"],
              messages:
                ticketData.messages as Database["public"]["Tables"]["ticket_messages"]["Row"][],
            };
            setTickets((prev) => [ticket, ...prev]);
          } else if (payload.eventType === "UPDATE" && ticketData) {
            const ticket: Ticket = {
              ...ticketData,
              created_by:
                ticketData.created_by as Database["public"]["Tables"]["user_profiles"]["Row"],
              messages:
                ticketData.messages as Database["public"]["Tables"]["ticket_messages"]["Row"][],
            };
            setTickets((prev) =>
              prev.map((t) => (t.ticket_id === ticket.ticket_id ? ticket : t))
            );
          } else if (payload.eventType === "DELETE") {
            setTickets((prev) => prev.filter((t) => t.ticket_id !== ticketId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, userRole]);

  return (
    <div className="space-y-4">
      {tickets.length === 0 ? (
        <Card className="p-6">
          <CardContent className="text-center text-muted-foreground">
            No tickets found
          </CardContent>
        </Card>
      ) : (
        tickets.map((ticket) => (
          <Card
            key={ticket.ticket_id}
            className="cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={() =>
              router.push(`/${userRole}/tickets/${ticket.ticket_id}`)
            }
            data-testid={`ticket-${ticket.ticket_id}`}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{ticket.ticket_title}</CardTitle>
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
              <p className="text-sm text-muted-foreground line-clamp-2">
                {ticket.ticket_description}
              </p>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
