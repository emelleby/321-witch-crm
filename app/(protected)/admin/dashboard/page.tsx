"use client";

import {
  BookOpen,
  Building2,
  MessageSquare,
  Ticket,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { createBrowserSupabaseClient } from "@/utils/supabase/client";

type Stats = {
  totalAgents: number;
  totalCustomers: number;
  totalOrganizations: number;
  totalTickets: number;
  totalMessages: number;
  totalArticles: number;
  ticketsByStatus: {
    open: number;
    waiting_on_customer: number;
    closed: number;
  };
};

export default function AdminDashboard() {
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    totalAgents: 0,
    totalCustomers: 0,
    totalOrganizations: 0,
    totalTickets: 0,
    totalMessages: 0,
    totalArticles: 0,
    ticketsByStatus: {
      open: 0,
      waiting_on_customer: 0,
      closed: 0,
    },
  });
  const { toast } = useToast();

  const fetchDashboardStats = useCallback(async () => {
    try {
      setLoading(true);
      const { data: tickets, error: ticketsError } = await supabase
        .from("support_tickets")
        .select("ticket_status");

      if (ticketsError) throw ticketsError;

      // Update ticket counts
      const statusCounts = tickets.reduce((acc, ticket) => {
        acc[ticket.ticket_status] = (acc[ticket.ticket_status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      setStats((prevStats) => ({
        ...prevStats,
        ticketsByStatus: {
          open: statusCounts.open || 0,
          waiting_on_customer: statusCounts.waiting_on_customer || 0,
          closed: statusCounts.closed || 0,
        },
      }));

      // Fetch other stats...
      const { data: agents } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_role", "agent");

      const { data: customers } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_role", "customer");

      const { data: messages } = await supabase
        .from("ticket_messages")
        .select("*");

      const { data: articles } = await supabase
        .from("knowledge_articles")
        .select("*");

      setStats((prevStats) => ({
        ...prevStats,
        totalAgents: agents?.length || 0,
        totalCustomers: customers?.length || 0,
        totalMessages: messages?.length || 0,
        totalArticles: articles?.length || 0,
      }));
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

    // Set up real-time subscriptions
    const ticketsChannel = supabase.channel("tickets-changes");
    const messagesChannel = supabase.channel("messages-changes");
    const profilesChannel = supabase.channel("profiles-changes");

    // Subscribe to ticket changes
    ticketsChannel
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "support_tickets",
        },
        () => {
          console.log("Ticket change detected");
          fetchDashboardStats();
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
          fetchDashboardStats();
        }
      )
      .subscribe((status) => {
        console.log("Message subscription status:", status);
      });

    // Subscribe to user profile changes
    profilesChannel
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_profiles",
        },
        () => {
          console.log("Profile change detected");
          fetchDashboardStats();
        }
      )
      .subscribe((status) => {
        console.log("Profile subscription status:", status);
      });

    // Cleanup subscriptions on unmount
    return () => {
      ticketsChannel.unsubscribe();
      messagesChannel.unsubscribe();
      profilesChannel.unsubscribe();
    };
  }, [supabase, fetchDashboardStats]);

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
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
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
                  <span>Waiting on Customer</span>
                  <span className="font-medium">
                    {stats.ticketsByStatus.waiting_on_customer}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-yellow-500"
                    style={{
                      width: `${
                        (stats.ticketsByStatus.waiting_on_customer /
                          stats.totalTickets) *
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
