"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Database } from "@/database.types";
import { useToast } from "@/hooks/use-toast";
import { createBrowserSupabaseClient } from "@/utils/supabase/client";
import { useCallback, useEffect, useState } from "react";

type Team = Database["public"]["Tables"]["support_teams"]["Row"];
type TeamMember = Database["public"]["Tables"]["team_memberships"]["Row"] & {
  user_profiles: Database["public"]["Tables"]["user_profiles"]["Row"];
};
type Agent = Database["public"]["Tables"]["user_profiles"]["Row"];

export function TeamManagement() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamMembers, setTeamMembers] = useState<{
    [key: string]: TeamMember[];
  }>({});
  const [agents, setAgents] = useState<Agent[]>([]);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamDescription, setNewTeamDescription] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const { toast } = useToast();
  const supabase = createBrowserSupabaseClient();

  const fetchTeamMembers = useCallback(
    async (teamId: string) => {
      const { data: members, error } = await supabase
        .from("team_memberships")
        .select("*, user_profiles(*)")
        .eq("team_id", teamId);

      if (error) {
        console.error("Error fetching team members:", error);
        return;
      }

      setTeamMembers((prev) => ({
        ...prev,
        [teamId]: members,
      }));
    },
    [supabase]
  );

  useEffect(() => {
    const fetchTeams = async () => {
      const { data: teams, error } = await supabase
        .from("support_teams")
        .select("*")
        .order("team_name");

      if (error) {
        console.error("Error fetching teams:", error);
        return;
      }

      setTeams(teams);

      // Fetch members for each team
      teams.forEach((team) => fetchTeamMembers(team.team_id));
    };

    const fetchAgents = async () => {
      const { data: agents, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_role", "agent");

      if (error) {
        console.error("Error fetching agents:", error);
        return;
      }

      setAgents(agents);
    };

    fetchTeams();
    fetchAgents();
  }, [supabase, fetchTeamMembers]);

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return;

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to create a team",
          variant: "destructive",
        });
        return;
      }

      // Get user's organization_id
      const { data: userProfile, error: profileError } = await supabase
        .from("user_profiles")
        .select("organization_id")
        .eq("user_id", user.id)
        .single();

      if (profileError) throw profileError;
      if (!userProfile?.organization_id) {
        toast({
          title: "Error",
          description: "You must be part of an organization to create a team",
          variant: "destructive",
        });
        return;
      }

      const { error: teamError } = await supabase.from("support_teams").insert({
        team_name: newTeamName,
        team_description: newTeamDescription,
        organization_id: userProfile.organization_id,
      });

      if (teamError) throw teamError;

      setNewTeamName("");
      setNewTeamDescription("");
      toast({
        title: "Success",
        description: "Team created successfully",
      });

      // Refresh teams list
      const { data: teams, error: fetchError } = await supabase
        .from("support_teams")
        .select("*")
        .order("team_name");

      if (fetchError) throw fetchError;
      setTeams(teams || []);
    } catch (error: unknown) {
      console.error(
        "Error creating team:",
        error instanceof Error ? error.message : error
      );
      toast({
        title: "Error",
        description: "Failed to create team. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAddMember = async () => {
    if (!selectedTeam || !selectedAgent) return;

    const { error } = await supabase.from("team_memberships").insert({
      team_id: selectedTeam,
      user_id: selectedAgent,
    });

    if (error) {
      console.error("Error adding team member:", error);
      toast({
        title: "Error",
        description: "Failed to add team member. Please try again.",
        variant: "destructive",
      });
      return;
    }

    fetchTeamMembers(selectedTeam);
    setSelectedAgent("");

    toast({
      title: "Success",
      description: "Team member added successfully",
    });
  };

  const handleRemoveMember = async (teamId: string, userId: string) => {
    const { error } = await supabase
      .from("team_memberships")
      .delete()
      .eq("team_id", teamId)
      .eq("user_id", userId);

    if (error) {
      console.error("Error removing team member:", error);
      toast({
        title: "Error",
        description: "Failed to remove team member. Please try again.",
        variant: "destructive",
      });
      return;
    }

    fetchTeamMembers(teamId);

    toast({
      title: "Success",
      description: "Team member removed successfully",
    });
  };

  const handleToggleTeamLead = async (
    teamId: string,
    userId: string,
    currentStatus: boolean
  ) => {
    const { error } = await supabase
      .from("team_memberships")
      .update({ is_team_lead: !currentStatus })
      .eq("team_id", teamId)
      .eq("user_id", userId);

    if (error) {
      console.error("Error updating team lead status:", error);
      toast({
        title: "Error",
        description: "Failed to update team lead status. Please try again.",
        variant: "destructive",
      });
      return;
    }

    fetchTeamMembers(teamId);

    toast({
      title: "Success",
      description: `Team lead status ${
        currentStatus ? "removed" : "assigned"
      } successfully`,
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create New Team</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleCreateTeam();
            }}
            className="space-y-4"
          >
            <Input
              placeholder="Team Name"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              data-testid="team-name-input"
            />
            <Textarea
              placeholder="Team Description"
              value={newTeamDescription}
              onChange={(e) => setNewTeamDescription(e.target.value)}
              data-testid="team-description-input"
            />
            <Button type="submit" data-testid="create-team-button">
              Create Team
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {teams.map((team) => (
          <Card key={team.team_id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{team.team_name}</CardTitle>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      data-testid={`add-member-${team.team_id}`}
                    >
                      Add Member
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Team Member</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Select
                        value={selectedAgent}
                        onValueChange={(value) => {
                          setSelectedAgent(value);
                          setSelectedTeam(team.team_id);
                        }}
                      >
                        <SelectTrigger data-testid="agent-select">
                          <SelectValue placeholder="Select Agent" />
                        </SelectTrigger>
                        <SelectContent>
                          {agents.map((agent) => (
                            <SelectItem
                              key={agent.user_id}
                              value={agent.user_id}
                              data-testid={`agent-option-${agent.user_id}`}
                            >
                              {agent.display_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        onClick={handleAddMember}
                        data-testid="add-member-button"
                      >
                        Add Member
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {team.team_description}
              </p>
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {teamMembers[team.team_id]?.map((member) => (
                    <div
                      key={member.user_id}
                      className="flex items-center justify-between p-2 rounded-lg border"
                      data-testid={`team-member-${member.user_id}`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{member.user_profiles.display_name}</span>
                        {member.is_team_lead && (
                          <Badge variant="secondary">Team Lead</Badge>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleToggleTeamLead(
                              team.team_id,
                              member.user_id,
                              member.is_team_lead
                            )
                          }
                          data-testid={`toggle-lead-${member.user_id}`}
                        >
                          {member.is_team_lead ? "Remove Lead" : "Make Lead"}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() =>
                            handleRemoveMember(team.team_id, member.user_id)
                          }
                          data-testid={`remove-member-${member.user_id}`}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
