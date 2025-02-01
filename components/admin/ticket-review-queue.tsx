"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database } from "@/database.types";
import { useToast } from "@/hooks/use-toast";
import { createBrowserSupabaseClient } from "@/utils/supabase/client";
import { useCallback, useEffect, useState } from "react";

type ReviewType = "moderation" | "orphaned" | "error";
type Team = Database["public"]["Tables"]["support_teams"]["Row"];

export function TicketReviewQueue() {
  const [tickets, setTickets] = useState<
    Database["public"]["Tables"]["support_tickets"]["Row"][]
  >([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [reviewType, setReviewType] = useState<ReviewType>("moderation");
  const { toast } = useToast();
  const supabase = createBrowserSupabaseClient();

  const fetchTeams = useCallback(async () => {
    const { data, error } = await supabase
      .from("support_teams")
      .select("*")
      .order("team_name");

    if (error) {
      console.error("Error fetching teams:", error);
      toast({
        title: "Error",
        description: "Failed to load teams",
        variant: "destructive",
      });
      return;
    }

    setTeams(data || []);
  }, [supabase, toast]);

  const fetchTickets = useCallback(async () => {
    let query = supabase.from("support_tickets").select("*");

    switch (reviewType) {
      case "moderation":
        query = query
          .is("assigned_to_user_id", null)
          .is("assigned_to_team_id", null);
        break;
      case "orphaned":
        query = query
          .not("assigned_to_user_id", "is", null)
          .not("ticket_status", "eq", "closed");
        break;
      case "error":
        query = query.eq("has_error", true);
        break;
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching tickets:", error);
      toast({
        title: "Error",
        description: "Failed to load tickets",
        variant: "destructive",
      });
      return;
    }

    setTickets(data || []);
  }, [supabase, reviewType, toast]);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  useEffect(() => {
    fetchTickets();

    // Set up real-time subscription
    const channel = supabase
      .channel("ticket_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "support_tickets",
        },
        () => {
          fetchTickets();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, fetchTickets]);

  const handleAssignTeam = async (ticketId: string) => {
    if (!selectedTeam) {
      toast({
        title: "Error",
        description: "Please select a team",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("support_tickets")
        .update({
          assigned_to_team_id: selectedTeam,
          ticket_status: "in_progress",
        })
        .eq("ticket_id", ticketId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Ticket assigned successfully",
      });
      fetchTickets();
    } catch (error) {
      console.error("Error assigning team:", error);
      toast({
        title: "Error",
        description: "Failed to assign team",
        variant: "destructive",
      });
    }
  };

  const handleApprove = async (ticketId: string) => {
    try {
      const { error } = await supabase
        .from("support_tickets")
        .update({
          is_approved: true,
          ticket_status: "open",
        })
        .eq("ticket_id", ticketId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Ticket approved successfully",
      });
      fetchTickets();
    } catch (error) {
      console.error("Error approving ticket:", error);
      toast({
        title: "Error",
        description: "Failed to approve ticket",
        variant: "destructive",
      });
    }
  };

  const handleReject = async (ticketId: string) => {
    try {
      const { error } = await supabase
        .from("support_tickets")
        .update({
          is_approved: false,
          ticket_status: "closed",
        })
        .eq("ticket_id", ticketId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Ticket rejected successfully",
      });
      fetchTickets();
    } catch (error) {
      console.error("Error rejecting ticket:", error);
      toast({
        title: "Error",
        description: "Failed to reject ticket",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Tabs
        value={reviewType}
        onValueChange={(v) => setReviewType(v as ReviewType)}
      >
        <TabsList>
          <TabsTrigger value="moderation" data-testid="moderation-tab">
            Moderation Queue
          </TabsTrigger>
          <TabsTrigger value="orphaned" data-testid="orphaned-tab">
            Orphaned Tickets
          </TabsTrigger>
          <TabsTrigger value="error" data-testid="error-tab">
            Error Queue
          </TabsTrigger>
        </TabsList>

        <TabsContent value="moderation" className="space-y-4">
          {tickets.map((ticket) => (
            <Card
              key={ticket.ticket_id}
              data-testid={`moderation-ticket-${ticket.ticket_id}`}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{ticket.ticket_title}</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handleReject(ticket.ticket_id)}
                      data-testid="reject-ticket"
                    >
                      Reject
                    </Button>
                    <Button
                      onClick={() => handleApprove(ticket.ticket_id)}
                      data-testid="approve-ticket"
                    >
                      Approve
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap mb-4">
                  {ticket.ticket_description}
                </p>
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
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="orphaned" className="space-y-4">
          {tickets.map((ticket) => (
            <Card
              key={ticket.ticket_id}
              data-testid={`orphaned-ticket-${ticket.ticket_id}`}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{ticket.ticket_title}</CardTitle>
                  <div className="flex gap-2">
                    <Select
                      value={selectedTeam}
                      onValueChange={setSelectedTeam}
                    >
                      <SelectTrigger
                        className="w-[200px]"
                        data-testid="team-select"
                      >
                        <SelectValue placeholder="Select Team" />
                      </SelectTrigger>
                      <SelectContent>
                        {teams.map((team) => (
                          <SelectItem key={team.team_id} value={team.team_id}>
                            {team.team_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={() => handleAssignTeam(ticket.ticket_id)}
                      data-testid="assign-team"
                    >
                      Assign Team
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap mb-4">
                  {ticket.ticket_description}
                </p>
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
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="error" className="space-y-4">
          {tickets.map((ticket) => (
            <Card
              key={ticket.ticket_id}
              data-testid={`error-ticket-${ticket.ticket_id}`}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{ticket.ticket_title}</CardTitle>
                  <div className="flex gap-2">
                    <Select
                      value={selectedTeam}
                      onValueChange={setSelectedTeam}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Select Team" />
                      </SelectTrigger>
                      <SelectContent>
                        {teams.map((team) => (
                          <SelectItem key={team.team_id} value={team.team_id}>
                            {team.team_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={() => handleAssignTeam(ticket.ticket_id)}>
                      Reassign
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap mb-4">
                  {ticket.ticket_description}
                </p>
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
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
