"use client";

import { useEffect, useState } from "react";

import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { createBrowserSupabaseClient } from "@/utils/supabase/client";

type TicketStats = {
  active: number;
  waiting: number;
  closed: number;
  total: number;
};

export default function AgentDashboard() {
  const supabase = createBrowserSupabaseClient();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<TicketStats>({
    active: 0,
    waiting: 0,
    closed: 0,
    total: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data: tickets } = await supabase
          .from("support_tickets")
          .select("ticket_status")
          .eq("assigned_to_user_id", user.id);

        if (tickets) {
          setStats({
            total: tickets.length,
            active: tickets.filter((t) => t.ticket_status === "open").length,
            waiting: tickets.filter(
              (t) => t.ticket_status === "waiting_on_customer"
            ).length,
            closed: tickets.filter((t) => t.ticket_status === "closed").length,
          });
        }
      } catch (error) {
        console.error("Error fetching ticket stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [supabase]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        heading="Agent Dashboard"
        text="Overview of your assigned tickets"
      />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <h3 className="font-semibold">Total Tickets</h3>
          <div className="mt-2 text-2xl font-bold">{stats.total}</div>
          <p className="text-xs text-muted-foreground">All assigned tickets</p>
        </Card>
        <Card className="p-4">
          <h3 className="font-semibold">Active Tickets</h3>
          <div className="mt-2 text-2xl font-bold">{stats.active}</div>
          <p className="text-xs text-muted-foreground">
            Tickets requiring your attention
          </p>
        </Card>
        <Card className="p-4">
          <h3 className="font-semibold">Waiting on Customer</h3>
          <div className="mt-2 text-2xl font-bold">{stats.waiting}</div>
          <p className="text-xs text-muted-foreground">
            Tickets awaiting customer response
          </p>
        </Card>
        <Card className="p-4">
          <h3 className="font-semibold">Closed Tickets</h3>
          <div className="mt-2 text-2xl font-bold">{stats.closed}</div>
          <p className="text-xs text-muted-foreground">
            Successfully resolved tickets
          </p>
        </Card>
      </div>
    </div>
  );
}
