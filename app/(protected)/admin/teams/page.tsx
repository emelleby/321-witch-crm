"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Database } from "@/database.types";
import { useToast } from "@/hooks/use-toast";
import { createBrowserSupabaseClient } from "@/utils/supabase/client";

type UserProfile = Database["public"]["Tables"]["user_profiles"]["Row"];
type Team = Database["public"]["Tables"]["support_teams"]["Row"] & {
  team_memberships: Array<{
    user: UserProfile;
  }>;
};

export default function TeamsPage() {
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [availableAgents, setAvailableAgents] = useState<UserProfile[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [teamForm, setTeamForm] = useState({
    name: "",
    description: "",
  });
  const { toast } = useToast();

  const fetchTeams = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("support_teams")
        .select(
          `
          *,
          team_memberships(
            user:user_profiles(*)
          )
        `
        )
        .order("team_name");

      if (error) throw error;
      setTeams(data || []);
    } catch (error) {
      console.error("Error fetching teams:", error);
      toast({
        title: "Error",
        description: "Failed to load teams",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [supabase, toast]);

  const fetchAvailableAgents = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select(
          `
          user_id,
          display_name,
          avatar_file_id,
          created_at,
          updated_at,
          organization_id,
          user_role
        `
        )
        .eq("user_role", "agent")
        .order("display_name");

      if (error) throw error;
      setAvailableAgents(data || []);
    } catch (error) {
      console.error("Error fetching available agents:", error);
      toast({
        title: "Error",
        description: "Failed to load available agents",
        variant: "destructive",
      });
    }
  }, [supabase, toast]);

  const fetchTeamMembers = useCallback(async () => {
    if (!selectedTeam?.team_id) return;

    try {
      const { data, error } = await supabase
        .from("team_memberships")
        .select(
          `
          *,
          user:user_profiles(*)
        `
        )
        .eq("team_id", selectedTeam.team_id);

      if (error) throw error;
      setTeamMembers(data?.map((d) => d.user) || []);
    } catch (error) {
      console.error("Error fetching team members:", error);
      toast({
        title: "Error",
        description: "Failed to load team members",
        variant: "destructive",
      });
    }
  }, [supabase, toast, selectedTeam]);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  useEffect(() => {
    if (selectedTeam) {
      fetchAvailableAgents();
      fetchTeamMembers();
    }
  }, [selectedTeam, fetchAvailableAgents, fetchTeamMembers]);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamForm.name.trim()) {
      toast({
        title: "Error",
        description: "Please enter a team name",
        variant: "destructive",
      });
      return;
    }

    setShowDialog(true);
    try {
      const { data: orgData } = await supabase.auth.getSession();
      const organizationId =
        orgData?.session?.user?.user_metadata?.organization_id;

      if (!organizationId) {
        throw new Error("No organization ID found");
      }

      const { error } = await supabase.from("support_teams").insert({
        team_name: teamForm.name.trim(),
        team_description: teamForm.description.trim() || null,
        organization_id: organizationId,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Team created successfully",
        variant: "default",
      });
      setShowDialog(false);
      setTeamForm({ name: "", description: "" });
      await fetchTeams();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create team",
        variant: "destructive",
      });
      console.error("Error:", error);
    }
  };

  const handleAddMember = async (teamId: string, agentId: string) => {
    try {
      const { error } = await supabase.from("team_memberships").insert({
        team_id: teamId,
        user_id: agentId,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Member added successfully",
        variant: "default",
      });
      fetchTeams();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add team member",
        variant: "destructive",
      });
      console.error("Error:", error);
    }
  };

  const handleRemoveMember = async (teamId: string, agentId: string) => {
    try {
      const { error } = await supabase
        .from("team_memberships")
        .delete()
        .eq("team_id", teamId)
        .eq("user_id", agentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Member removed successfully",
        variant: "default",
      });
      fetchTeams();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove team member",
        variant: "destructive",
      });
      console.error("Error:", error);
    }
  };

  const renderTeamCard = (team: Team) => (
    <Card key={team.team_id} className="mb-4">
      <CardHeader>
        <CardTitle>{team.team_name}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 mb-2">
          {team.team_description || "No description"}
        </p>
        <p className="text-sm">{team.team_memberships.length} members</p>
        <div className="mt-4">
          <h4 className="font-medium mb-2">Team Members</h4>
          <ul className="space-y-2">
            {team.team_memberships.map(({ user }) => (
              <li
                key={user.user_id}
                className="flex items-center justify-between"
              >
                <span>{user.display_name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveMember(team.team_id, user.user_id)}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );

  const renderMemberTable = (members: UserProfile[], currentTeam: Team) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {members.map((member) => (
          <TableRow key={member.user_id}>
            <TableCell>{member.display_name}</TableCell>
            <TableCell>{member.user_role}</TableCell>
            <TableCell>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  handleRemoveMember(currentTeam.team_id, member.user_id)
                }
              >
                Remove
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Teams</h1>
          <p className="text-muted-foreground">Manage your support teams</p>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Button>Create Team</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Team</DialogTitle>
              <DialogDescription>
                Create a new team to organize your agents
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Team Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={teamForm.name}
                  onChange={(e) =>
                    setTeamForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  name="description"
                  value={teamForm.description}
                  onChange={(e) =>
                    setTeamForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                />
              </div>
              <DialogFooter>
                <Button type="submit">Create Team</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {teams.map((team) => renderTeamCard(team))}
      </div>

      {selectedTeam && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{selectedTeam.team_name} Members</CardTitle>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>Add Member</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Team Member</DialogTitle>
                  </DialogHeader>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.currentTarget);
                      handleAddMember(
                        selectedTeam.team_id,
                        formData.get("agent_id") as string
                      );
                    }}
                  >
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="agent_id">Select Agent</Label>
                        <Select name="agent_id" required>
                          {availableAgents.map((agent) => (
                            <option key={agent.user_id} value={agent.user_id}>
                              {agent.display_name}
                            </option>
                          ))}
                        </Select>
                      </div>
                      <DialogFooter>
                        <Button type="submit">Add Member</Button>
                      </DialogFooter>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {renderMemberTable(teamMembers, selectedTeam)}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
