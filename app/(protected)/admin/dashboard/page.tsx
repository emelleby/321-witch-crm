"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { notifications } from "@/utils/notifications";
import { useRouter } from "next/navigation";
import {
  Users,
  Building2,
  MessageSquare,
  Ticket,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Stats = {
  totalAgents: number;
  totalCustomers: number;
  totalOrganizations: number;
  totalTickets: number;
  totalMessages: number;
  totalArticles: number;
  ticketsByStatus: {
    open: number;
    pending: number;
    closed: number;
  };
};

export default function AdminDashboard() {
  const router = useRouter();
  const supabase = createClient();
  const [stats, setStats] = useState<Stats>({
    totalAgents: 0,
    totalCustomers: 0,
    totalOrganizations: 0,
    totalTickets: 0,
    totalMessages: 0,
    totalArticles: 0,
    ticketsByStatus: {
      open: 0,
      pending: 0,
      closed: 0,
    },
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's organization
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      if (!profile?.organization_id) return;

      // Get counts
      const [
        { count: agentsCount },
        { count: customersCount },
        { count: organizationsCount },
        { count: ticketsCount },
        { count: messagesCount },
        { count: articlesCount },
        { data: ticketStatusCounts },
      ] = await Promise.all([
        // Count agents
        supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", profile.organization_id)
          .eq("role", "agent"),

        // Count customers
        supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", profile.organization_id)
          .eq("role", "customer"),

        // Count organizations
        supabase
          .from("organizations")
          .select("*", { count: "exact", head: true }),

        // Count tickets
        supabase
          .from("tickets")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", profile.organization_id),

        // Count messages
        supabase
          .from("ticket_messages")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", profile.organization_id),

        // Count knowledge base articles
        supabase
          .from("knowledge_base")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", profile.organization_id),

        // Get ticket status counts
        supabase
          .from("tickets")
          .select("status")
          .eq("organization_id", profile.organization_id),
      ]);

      // Calculate ticket status counts
      const ticketsByStatus = {
        open: 0,
        pending: 0,
        closed: 0,
      };
      ticketStatusCounts?.forEach((ticket) => {
        ticketsByStatus[ticket.status as keyof typeof ticketsByStatus]++;
      });

      setStats({
        totalAgents: agentsCount || 0,
        totalCustomers: customersCount || 0,
        totalOrganizations: organizationsCount || 0,
        totalTickets: ticketsCount || 0,
        totalMessages: messagesCount || 0,
        totalArticles: articlesCount || 0,
        ticketsByStatus,
      });
    } catch (error) {
      console.error("Error:", error);
      notifications.error("Failed to load dashboard stats");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchStats();

    // Set up real-time subscriptions
    const ticketsChannel = supabase.channel("tickets-changes");
    const messagesChannel = supabase.channel("messages-changes");

    // Subscribe to ticket changes
    ticketsChannel
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tickets",
        },
        () => {
          console.log("Ticket change detected");
          fetchStats();
        }
      )
      .subscribe((status) => {
        console.log("Ticket subscription status:", status);
      });

    // Subscribe to message changes
    messagesChannel
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ticket_messages",
        },
        () => {
          console.log("Message change detected");
          fetchStats();
        }
      )
      .subscribe((status) => {
        console.log("Message subscription status:", status);
      });

    // Cleanup subscriptions on unmount
    return () => {
      ticketsChannel.unsubscribe();
      messagesChannel.unsubscribe();
    };
  }, []); // Remove router from dependencies since we're not using router.refresh()

  const stats_cards = [
    {
      title: "Total Agents",
      value: stats.totalAgents,
      icon: Users,
      onClick: () => router.push("/admin/agents"),
    },
    {
      title: "Total Customers",
      value: stats.totalCustomers,
      icon: Users,
    },
    {
      title: "Total Organizations",
      value: stats.totalOrganizations,
      icon: Building2,
      onClick: () => router.push("/admin/organizations"),
    },
    {
      title: "Total Tickets",
      value: stats.totalTickets,
      icon: Ticket,
    },
    {
      title: "Total Messages",
      value: stats.totalMessages,
      icon: MessageSquare,
    },
    {
      title: "Knowledge Base Articles",
      value: stats.totalArticles,
      icon: BookOpen,
      onClick: () => router.push("/admin/knowledge"),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your support system</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stats_cards.map((stat, i) => (
          <Card
            key={i}
            className={cn(
              "hover:shadow-lg transition-shadow",
              stat.onClick && "cursor-pointer"
            )}
            onClick={stat.onClick}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Tickets by Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Open</span>
                  <span className="font-medium">
                    {stats.ticketsByStatus.open}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-blue-500"
                    style={{
                      width: `${
                        (stats.ticketsByStatus.open / stats.totalTickets) * 100
                      }%`,
                    }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Pending</span>
                  <span className="font-medium">
                    {stats.ticketsByStatus.pending}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-yellow-500"
                    style={{
                      width: `${
                        (stats.ticketsByStatus.pending / stats.totalTickets) *
                        100
                      }%`,
                    }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Closed</span>
                  <span className="font-medium">
                    {stats.ticketsByStatus.closed}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-green-500"
                    style={{
                      width: `${
                        (stats.ticketsByStatus.closed / stats.totalTickets) *
                        100
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
