"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Database } from "@/database.types";
import { useToast } from "@/hooks/use-toast";
import { createBrowserSupabaseClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type Ticket = Database["public"]["Tables"]["support_tickets"]["Row"];
type Team = Database["public"]["Tables"]["support_teams"]["Row"];

export function UnassignedTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();

  const fetchUnassignedTickets = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // First get the teams the agent is a member of
      const { data: teamMemberships } = await supabase
        .from("team_memberships")
        .select("team_id")
        .eq("user_id", user.id);

      if (!teamMemberships?.length) return;

      const teamIds = teamMemberships.map((tm) => tm.team_id);

      // Get team details
      const { data: teamData } = await supabase
        .from("support_teams")
        .select("*")
        .in("team_id", teamIds);

      setTeams(teamData || []);

      // Get unassigned tickets for these teams
      const { data: ticketData } = await supabase
        .from("support_tickets")
        .select("*")
        .in("assigned_team_id", teamIds)
        .is("assigned_to_user_id", null)
        .eq("ticket_status", "open")
        .order("created_at", { ascending: false });

      setTickets(ticketData || []);
    } catch (error) {
      console.error("Error fetching unassigned tickets:", error);
      toast({
        title: "Error",
        description: "Failed to load unassigned tickets",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [supabase, toast]);

  const handleAssignToSelf = async (ticketId: string) => {
    try {
      setAssigning(ticketId);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("support_tickets")
        .update({ assigned_to_user_id: user.id })
        .eq("ticket_id", ticketId);

      if (error) throw error;

      // Trigger notification for assignment
      await fetch(`/api/triggers/ticket/assign/agent/${ticketId}/${user.id}`, {
        method: "POST",
      });

      toast({
        title: "Success",
        description: "Ticket assigned successfully",
      });

      // Remove the assigned ticket from the list
      setTickets((prev) => prev.filter((t) => t.ticket_id !== ticketId));
    } catch (error) {
      console.error("Error assigning ticket:", error);
      toast({
        title: "Error",
        description: "Failed to assign ticket",
        variant: "destructive",
      });
    } finally {
      setAssigning(null);
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

  useEffect(() => {
    fetchUnassignedTickets();

    // Set up real-time subscription for ticket updates
    const channel = supabase
      .channel("unassigned_tickets")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "support_tickets",
        },
        () => {
          fetchUnassignedTickets();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchUnassignedTickets, supabase]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Unassigned Team Tickets</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {tickets.length === 0 ? (
              <p className="text-center text-muted-foreground">
                No unassigned tickets in your teams
              </p>
            ) : (
              tickets.map((ticket) => (
                <Card
                  key={ticket.ticket_id}
                  className="p-4 hover:bg-accent transition-colors cursor-pointer"
                  onClick={() =>
                    router.push(`/agent/tickets/${ticket.ticket_id}`)
                  }
                  data-testid={`unassigned-ticket-${ticket.ticket_id}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{ticket.ticket_title}</h4>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1">
                                <div
                                  className={`h-2 w-2 rounded-full ${getPriorityColor(
                                    ticket.ticket_priority
                                  )}`}
                                />
                                <span className="text-sm">
                                  {ticket.ticket_priority}
                                </span>
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
                        <Badge variant="outline">
                          {
                            teams.find(
                              (t) => t.team_id === ticket.assigned_to_team_id
                            )?.team_name
                          }
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {ticket.ticket_description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Created:{" "}
                        {new Date(ticket.created_at || "").toLocaleString()}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAssignToSelf(ticket.ticket_id);
                      }}
                      disabled={assigning === ticket.ticket_id}
                      data-testid={`assign-ticket-${ticket.ticket_id}`}
                    >
                      {assigning === ticket.ticket_id
                        ? "Assigning..."
                        : "Assign to Me"}
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
