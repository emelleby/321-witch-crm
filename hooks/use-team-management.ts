import { useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@/utils/supabase/client";
import { Database } from "@/database.types";
import { RealtimeChannel } from "@supabase/supabase-js";

type Team = Database["public"]["Tables"]["support_teams"]["Row"];
type TeamMembership = Database["public"]["Tables"]["team_memberships"]["Row"];
type UserProfile = Database["public"]["Tables"]["user_profiles"]["Row"];

interface TeamWithMembers extends Team {
  members: (TeamMembership & { user: UserProfile })[];
}

export function useTeamManagement(organizationId: string) {
  const [teams, setTeams] = useState<TeamWithMembers[]>([]);
  const [unassignedAgents, setUnassignedAgents] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createBrowserSupabaseClient();

  useEffect(() => {
    let channel: RealtimeChannel;

    const setupRealtimeSubscription = async () => {
      // Initial fetch
      await fetchTeamsAndAgents();

      // Subscribe to changes
      channel = supabase
        .channel("team-management")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "support_teams",
            filter: `organization_id=eq.${organizationId}`,
          },
          () => fetchTeamsAndAgents()
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "team_memberships",
          },
          () => fetchTeamsAndAgents()
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "user_profiles",
            filter: `organization_id=eq.${organizationId}`,
          },
          () => fetchTeamsAndAgents()
        )
        .subscribe();

      setLoading(false);
    };

    setupRealtimeSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [organizationId]);

  const fetchTeamsAndAgents = async () => {
    // Fetch teams with members
    const { data: teamsData } = await supabase
      .from("support_teams")
      .select(
        `
        *,
        members:team_memberships(
          *,
          user:user_profiles(*)
        )
      `
      )
      .eq("organization_id", organizationId);

    if (teamsData) {
      setTeams(teamsData as TeamWithMembers[]);
    }

    // Fetch unassigned agents
    const { data: agents } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("user_role", "agent")
      .not(
        "user_id",
        "in",
        (
          await supabase.from("team_memberships").select("user_id")
        ).data?.map((m) => m.user_id) || []
      );

    if (agents) {
      setUnassignedAgents(agents);
    }
  };

  const createTeam = async (name: string, description?: string) => {
    const { error } = await supabase.from("support_teams").insert({
      organization_id: organizationId,
      team_name: name,
      team_description: description,
    });

    if (error) {
      console.error("Error creating team:", error);
      throw error;
    }
  };

  const assignAgentToTeam = async (
    userId: string,
    teamId: string,
    isTeamLead: boolean = false
  ) => {
    const { error } = await supabase.from("team_memberships").insert({
      team_id: teamId,
      user_id: userId,
      is_team_lead: isTeamLead,
    });

    if (error) {
      console.error("Error assigning agent:", error);
      throw error;
    }
  };

  const removeAgentFromTeam = async (userId: string, teamId: string) => {
    const { error } = await supabase
      .from("team_memberships")
      .delete()
      .eq("team_id", teamId)
      .eq("user_id", userId);

    if (error) {
      console.error("Error removing agent:", error);
      throw error;
    }
  };

  const updateTeamLead = async (
    userId: string,
    teamId: string,
    isTeamLead: boolean
  ) => {
    const { error } = await supabase
      .from("team_memberships")
      .update({ is_team_lead: isTeamLead })
      .eq("team_id", teamId)
      .eq("user_id", userId);

    if (error) {
      console.error("Error updating team lead:", error);
      throw error;
    }
  };

  return {
    teams,
    unassignedAgents,
    loading,
    createTeam,
    assignAgentToTeam,
    removeAgentFromTeam,
    updateTeamLead,
  };
}
