"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { AdvancedSearch } from "@/components/tickets/advanced-search";
import { Card } from "@/components/ui/card";
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
type Organization = Database["public"]["Tables"]["organizations"]["Row"];

interface SearchFilters {
  status?: Database["public"]["Tables"]["support_tickets"]["Row"]["ticket_status"];
  priority?: Database["public"]["Tables"]["support_tickets"]["Row"]["ticket_priority"];
  organizationId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export default function AgentTicketsPage() {
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchOrganizations = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .order("organization_name");

      if (error) throw error;
      setOrganizations(data);
    } catch (error) {
      console.error("Error fetching organizations:", error);
    }
  }, [supabase]);

  const fetchTickets = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      setLoading(true);
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("assigned_to_user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTickets(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load tickets",
        variant: "destructive",
      });
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  }, [supabase, toast]);

  const handleSearch = async (filters: SearchFilters) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      setLoading(true);

      // Build the query based on filters
      let query = supabase
        .from("support_tickets")
        .select("*")
        .eq("assigned_to_user_id", user.id);

      if (filters.status) {
        query = query.eq("ticket_status", filters.status);
      }

      if (filters.priority) {
        query = query.eq("ticket_priority", filters.priority);
      }

      if (filters.organizationId) {
        query = query.eq("organization_id", filters.organizationId);
      }

      if (filters.dateFrom) {
        query = query.gte("created_at", filters.dateFrom);
      }

      if (filters.dateTo) {
        query = query.lte("created_at", filters.dateTo);
      }

      const { data, error } = await query.order("created_at", {
        ascending: false,
      });

      if (error) throw error;
      setTickets(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load tickets",
        variant: "destructive",
      });
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
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
      case "pending":
        return "bg-yellow-500";
      case "closed":
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
  };

  useEffect(() => {
    fetchOrganizations();
    fetchTickets();

    // Subscribe to real-time updates
    const channel = supabase
      .channel("tickets-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "support_tickets",
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setTickets((prev) => [payload.new as Ticket, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setTickets((prev) =>
              prev.map((ticket) =>
                ticket.ticket_id === payload.new.ticket_id
                  ? (payload.new as Ticket)
                  : ticket
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchOrganizations, fetchTickets, supabase]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Tickets</h1>
      </div>

      <AdvancedSearch showAssigneeFilter={true} onSearch={handleSearch} />

      <div className="grid gap-4">
        {tickets.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground">
            No tickets found
          </Card>
        ) : (
          tickets.map((ticket) => (
            <Card
              key={ticket.ticket_id}
              className="p-6 cursor-pointer hover:bg-accent transition-colors"
              onClick={() => router.push(`/agent/tickets/${ticket.ticket_id}`)}
            >
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{ticket.ticket_title}</h3>
                  </div>
                  <div className="flex gap-2 text-sm text-muted-foreground">
                    <span>
                      Created:{" "}
                      {new Date(ticket.created_at || "").toLocaleDateString()}
                    </span>
                    <span>•</span>
                    <span>
                      Updated:{" "}
                      {new Date(ticket.updated_at || "").toLocaleDateString()}
                    </span>
                    {ticket.organization_id && (
                      <>
                        <span>•</span>
                        <span>
                          Organization:{" "}
                          {
                            organizations.find(
                              (org) =>
                                org.organization_id === ticket.organization_id
                            )?.organization_name
                          }
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-2">
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
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
