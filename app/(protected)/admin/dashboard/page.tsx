"use client";

import { TagCategoryManagement } from "@/components/admin/tag-category-management";
import { TeamManagement } from "@/components/admin/team-management";
import { TicketReviewQueue } from "@/components/admin/ticket-review-queue";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { createBrowserSupabaseClient } from "@/utils/supabase/client";
import { useCallback, useEffect, useState } from "react";

type DashboardStats = {
  ticketsNeedingReview: number;
  orphanedTickets: number;
  errorQueue: number;
  activeTeams: number;
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    ticketsNeedingReview: 0,
    orphanedTickets: 0,
    errorQueue: 0,
    activeTeams: 0,
  });
  const [loading, setLoading] = useState(true);
  const supabase = createBrowserSupabaseClient();
  const { toast } = useToast();

  const fetchDashboardStats = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch tickets needing review (unassigned tickets)
      const { data: reviewTickets, error: reviewError } = await supabase
        .from("support_tickets")
        .select("ticket_id")
        .is("assigned_to_user_id", null)
        .is("assigned_to_team_id", null);

      if (reviewError) throw reviewError;

      // Fetch orphaned tickets (assigned to inactive agents)
      const { data: orphanedTickets, error: orphanedError } = await supabase
        .from("support_tickets")
        .select("ticket_id, assigned_to_user_id")
        .not("assigned_to_user_id", "is", null)
        .not("ticket_status", "eq", "closed");

      if (orphanedError) throw orphanedError;

      // Fetch error queue tickets
      const { data: errorTickets, error: errorQueueError } = await supabase
        .from("support_tickets")
        .select("ticket_id")
        .eq("has_error", true);

      if (errorQueueError) throw errorQueueError;

      // Fetch active teams
      const { data: teams, error: teamsError } = await supabase
        .from("support_teams")
        .select("team_id")
        .eq("is_active", true);

      if (teamsError) throw teamsError;

      setStats({
        ticketsNeedingReview: reviewTickets?.length || 0,
        orphanedTickets: orphanedTickets?.length || 0,
        errorQueue: errorTickets?.length || 0,
        activeTeams: teams?.length || 0,
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      toast({
        title: "Error",
        description: "Failed to fetch dashboard statistics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [supabase, toast]);

  useEffect(() => {
    fetchDashboardStats();

    // Set up real-time subscriptions for tickets and teams
    const ticketsChannel = supabase
      .channel("tickets_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "support_tickets",
        },
        () => {
          fetchDashboardStats();
        }
      )
      .subscribe();

    const teamsChannel = supabase
      .channel("teams_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "support_teams",
        },
        () => {
          fetchDashboardStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ticketsChannel);
      supabase.removeChannel(teamsChannel);
    };
  }, [supabase, fetchDashboardStats]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Tickets Needing Review
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.ticketsNeedingReview}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Orphaned Tickets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.orphanedTickets}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Queue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.errorQueue}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Teams</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeTeams}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="review" className="space-y-4">
        <TabsList>
          <TabsTrigger value="review">Review Queue</TabsTrigger>
          <TabsTrigger value="teams">Team Management</TabsTrigger>
          <TabsTrigger value="tags">Tags & Categories</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="review">
          <TicketReviewQueue />
        </TabsContent>

        <TabsContent value="teams">
          <TeamManagement />
        </TabsContent>

        <TabsContent value="tags">
          <TagCategoryManagement />
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>System Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Settings interface coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
