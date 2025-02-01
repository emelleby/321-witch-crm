"use client";

import { PerformanceMetrics } from "@/components/agent/performance-metrics";
import { UnassignedTickets } from "@/components/agent/unassigned-tickets";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createBrowserSupabaseClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";

type TicketStats = {
  total: number;
  active: number;
  waiting: number;
  closed: number;
  highPriority: number;
  normalPriority: number;
  lowPriority: number;
  aiGeneratedMessages: number;
};

export default function AgentDashboard() {
  const supabase = createBrowserSupabaseClient();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<TicketStats>({
    total: 0,
    active: 0,
    waiting: 0,
    closed: 0,
    highPriority: 0,
    normalPriority: 0,
    lowPriority: 0,
    aiGeneratedMessages: 0,
  });

  useEffect(() => {
    let userId: string | undefined;

    const fetchStats = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        userId = user.id;

        const { data: tickets } = await supabase
          .from("support_tickets")
          .select("*")
          .eq("assigned_to_user_id", user.id);

        const { data: aiMessages } = await supabase
          .from("ticket_messages")
          .select("message_id")
          .eq("is_ai_generated", true)
          .in("ticket_id", tickets?.map((t) => t.ticket_id) || []);

        if (tickets) {
          setStats({
            total: tickets.length,
            active: tickets.filter((t) => t.ticket_status === "open").length,
            waiting: tickets.filter(
              (t) => t.ticket_status === "waiting_on_customer"
            ).length,
            closed: tickets.filter((t) => t.ticket_status === "closed").length,
            highPriority: tickets.filter((t) => t.ticket_priority === "high")
              .length,
            normalPriority: tickets.filter(
              (t) => t.ticket_priority === "normal"
            ).length,
            lowPriority: tickets.filter((t) => t.ticket_priority === "low")
              .length,
            aiGeneratedMessages: aiMessages?.length || 0,
          });
        }
      } catch (error) {
        console.error("Error fetching ticket stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();

    // Set up real-time subscription for ticket updates
    const channel = supabase
      .channel("ticket_updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "support_tickets",
          filter: userId ? `assigned_to_user_id=eq.${userId}` : undefined,
        },
        () => {
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

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
        <h1 className="text-3xl font-bold">Agent Dashboard</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              All assigned tickets
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Tickets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
            <p className="text-xs text-muted-foreground">
              Tickets requiring attention
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Waiting on Customer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.waiting}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting customer response
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Closed Tickets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.closed}</div>
            <p className="text-xs text-muted-foreground">
              Successfully resolved tickets
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Priority</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.highPriority}</div>
            <p className="text-xs text-muted-foreground">
              Urgent tickets needing attention
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Normal Priority
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.normalPriority}</div>
            <p className="text-xs text-muted-foreground">
              Standard priority tickets
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Priority</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.lowPriority}</div>
            <p className="text-xs text-muted-foreground">Non-urgent tickets</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Messages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.aiGeneratedMessages}
            </div>
            <p className="text-xs text-muted-foreground">
              AI-generated responses
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <PerformanceMetrics />
        <UnassignedTickets />
      </div>
    </div>
  );
}
