"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
type Agent = Database["public"]["Tables"]["user_profiles"]["Row"];
type TicketStatus = Database["public"]["Enums"]["ticket_status_enum"];
type TicketPriority = Database["public"]["Enums"]["ticket_priority_enum"];

export function TicketManagement() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "">("");
  const { toast } = useToast();
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      // Fetch all tickets
      const { data: ticketData, error: ticketError } = await supabase
        .from("support_tickets")
        .select("*")
        .order("created_at", { ascending: false });

      if (ticketError) throw ticketError;
      setTickets(ticketData || []);

      // Fetch teams
      const { data: teamData, error: teamError } = await supabase
        .from("support_teams")
        .select("*")
        .order("team_name");

      if (teamError) throw teamError;
      setTeams(teamData || []);

      // Fetch agents
      const { data: agentData, error: agentError } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_role", "agent");

      if (agentError) throw agentError;
      setAgents(agentData || []);
    } catch (error: unknown) {
      console.error(
        "Error fetching data:",
        error instanceof Error ? error.message : error
      );
      toast({
        title: "Error",
        description: "Failed to load tickets",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [supabase, toast]);

  const handleAssignTeam = async (ticketId: string, teamId: string) => {
    try {
      const { error } = await supabase
        .from("support_tickets")
        .update({ assigned_to_team_id: teamId, assigned_to_user_id: null })
        .eq("ticket_id", ticketId);

      if (error) throw error;

      // Trigger notification
      await fetch(`/api/triggers/ticket/assign/team/${ticketId}/${teamId}`, {
        method: "POST",
      });

      toast({
        title: "Success",
        description: "Team assigned successfully",
      });

      await fetchData();
    } catch (error: unknown) {
      console.error(
        "Error assigning team:",
        error instanceof Error ? error.message : error
      );
      toast({
        title: "Error",
        description: "Failed to assign team",
        variant: "destructive",
      });
    }
  };

  const handleAssignAgent = async (ticketId: string, agentId: string) => {
    try {
      const { error } = await supabase
        .from("support_tickets")
        .update({ assigned_to_user_id: agentId })
        .eq("ticket_id", ticketId);

      if (error) throw error;

      // Trigger notification
      await fetch(`/api/triggers/ticket/assign/agent/${ticketId}/${agentId}`, {
        method: "POST",
      });

      toast({
        title: "Success",
        description: "Agent assigned successfully",
      });

      await fetchData();
    } catch (error: unknown) {
      console.error(
        "Error assigning agent:",
        error instanceof Error ? error.message : error
      );
      toast({
        title: "Error",
        description: "Failed to assign agent",
        variant: "destructive",
      });
    }
  };

  const handleAssignToSelf = async (ticketId: string) => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to perform this action",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from("support_tickets")
        .update({ assigned_to_user_id: user.id })
        .eq("ticket_id", ticketId);

      if (error) throw error;

      // Trigger notification
      await fetch(`/api/triggers/ticket/assign/agent/${ticketId}/${user.id}`, {
        method: "POST",
      });

      toast({
        title: "Success",
        description: "Ticket assigned to you successfully",
      });

      await fetchData();
    } catch (error: unknown) {
      console.error(
        "Error assigning ticket:",
        error instanceof Error ? error.message : error
      );
      toast({
        title: "Error",
        description: "Failed to assign ticket",
        variant: "destructive",
      });
    }
  };

  const handleUpdateStatus = async (ticketId: string, status: TicketStatus) => {
    try {
      const { error } = await supabase
        .from("support_tickets")
        .update({ ticket_status: status })
        .eq("ticket_id", ticketId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Ticket ${
          status === "closed" ? "closed" : "updated"
        } successfully`,
      });

      await fetchData();
    } catch (error: unknown) {
      console.error(
        "Error updating ticket status:",
        error instanceof Error ? error.message : error
      );
      toast({
        title: "Error",
        description: "Failed to update ticket status",
        variant: "destructive",
      });
    }
  };

  const getPriorityColor = (priority: TicketPriority): string => {
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

  const getStatusColor = (status: TicketStatus): string => {
    switch (status) {
      case "open":
        return "bg-green-500";
      case "waiting_on_customer":
        return "bg-yellow-500";
      case "closed":
        return "bg-gray-500";
      case "error":
        return "bg-red-500";
      case "under_review":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };

  useEffect(() => {
    void fetchData();

    // Set up real-time subscription for ticket updates
    const channel = supabase
      .channel("admin_tickets")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "support_tickets",
        },
        () => {
          void fetchData();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchData, supabase]);

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch =
      searchQuery === "" ||
      ticket.ticket_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.ticket_description
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "" || ticket.ticket_status === statusFilter;

    const matchesTeam =
      selectedTeam === "" || ticket.assigned_to_team_id === selectedTeam;

    const matchesAgent =
      selectedAgent === "" || ticket.assigned_to_user_id === selectedAgent;

    return matchesSearch && matchesStatus && matchesTeam && matchesAgent;
  });

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Tickets</CardTitle>
        <div className="flex flex-wrap gap-4 mt-4">
          <Input
            placeholder="Search tickets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-xs"
            data-testid="ticket-search"
          />
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as TicketStatus)}
          >
            <SelectTrigger className="w-[180px]" data-testid="status-filter">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Statuses</SelectItem>
              <SelectItem value="preprocessing">Preprocessing</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="waiting_on_customer">
                Waiting on Customer
              </SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
              <SelectItem value="under_review">Under Review</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedTeam} onValueChange={setSelectedTeam}>
            <SelectTrigger className="w-[180px]" data-testid="team-filter">
              <SelectValue placeholder="Filter by team" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Teams</SelectItem>
              {teams.map((team) => (
                <SelectItem key={team.team_id} value={team.team_id}>
                  {team.team_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedAgent} onValueChange={setSelectedAgent}>
            <SelectTrigger className="w-[180px]" data-testid="agent-filter">
              <SelectValue placeholder="Filter by agent" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Agents</SelectItem>
              {agents.map((agent) => (
                <SelectItem key={agent.user_id} value={agent.user_id}>
                  {agent.display_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTickets.map((ticket) => (
                <TableRow
                  key={ticket.ticket_id}
                  className="cursor-pointer hover:bg-accent"
                  onClick={() =>
                    router.push(`/admin/tickets/${ticket.ticket_id}`)
                  }
                  data-testid={`ticket-row-${ticket.ticket_id}`}
                >
                  <TableCell>{ticket.ticket_title}</TableCell>
                  <TableCell>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1">
                            <div
                              className={`h-2 w-2 rounded-full ${getPriorityColor(
                                ticket.ticket_priority
                              )}`}
                            />
                            <span>{ticket.ticket_priority}</span>
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
                  </TableCell>
                  <TableCell>
                    <Select
                      value={ticket.ticket_status}
                      onValueChange={(value) =>
                        handleUpdateStatus(
                          ticket.ticket_id,
                          value as TicketStatus
                        )
                      }
                    >
                      <SelectTrigger
                        className="w-[160px]"
                        onClick={(e) => e.stopPropagation()}
                        data-testid={`status-select-${ticket.ticket_id}`}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`h-2 w-2 rounded-full ${getStatusColor(
                              ticket.ticket_status
                            )}`}
                          />
                          <SelectValue />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="preprocessing">
                          Preprocessing
                        </SelectItem>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="waiting_on_customer">
                          Waiting on Customer
                        </SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                        <SelectItem value="under_review">
                          Under Review
                        </SelectItem>
                        <SelectItem value="error">Error</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={ticket.assigned_to_team_id || ""}
                      onValueChange={(value) =>
                        handleAssignTeam(ticket.ticket_id, value)
                      }
                    >
                      <SelectTrigger
                        className="w-[160px]"
                        onClick={(e) => e.stopPropagation()}
                        data-testid={`team-select-${ticket.ticket_id}`}
                      >
                        <SelectValue
                          placeholder="Assign team"
                          className="text-muted-foreground"
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {teams.map((team) => (
                          <SelectItem key={team.team_id} value={team.team_id}>
                            {team.team_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={ticket.assigned_to_user_id || ""}
                      onValueChange={(value) =>
                        handleAssignAgent(ticket.ticket_id, value)
                      }
                    >
                      <SelectTrigger
                        className="w-[160px]"
                        onClick={(e) => e.stopPropagation()}
                        data-testid={`agent-select-${ticket.ticket_id}`}
                      >
                        <SelectValue
                          placeholder="Assign agent"
                          className="text-muted-foreground"
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Unassigned</SelectItem>
                        {agents.map((agent) => (
                          <SelectItem key={agent.user_id} value={agent.user_id}>
                            {agent.display_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {new Date(ticket.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleAssignToSelf(ticket.ticket_id);
                        }}
                        data-testid={`assign-self-${ticket.ticket_id}`}
                      >
                        Assign to Me
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
