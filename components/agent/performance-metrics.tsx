"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createBrowserSupabaseClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type PerformanceMetrics = {
  averageResponseTime: number;
  resolutionRate: number;
  customerSatisfaction: number;
  ticketsHandled: number;
  slaCompliance: number;
  firstResponseTime: number;
};

type TimeRange = "day" | "week" | "month";

export function PerformanceMetrics() {
  
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>("week");
  const [loading, setLoading] = useState(true);
  const supabase = createBrowserSupabaseClient();

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        // Get tickets for the selected time range
        const timeFilter = new Date();
        switch (timeRange) {
          case "day":
            timeFilter.setDate(timeFilter.getDate() - 1);
            break;
          case "week":
            timeFilter.setDate(timeFilter.getDate() - 7);
            break;
          case "month":
            timeFilter.setMonth(timeFilter.getMonth() - 1);
            break;
        }

        const { data: tickets } = await supabase
          .from("support_tickets")
          .select("*, ticket_messages(*)")
          .eq("assigned_to_user_id", user.id)
          .gte("created_at", timeFilter.toISOString());

        if (!tickets) return;

        // Calculate metrics
        const totalTickets = tickets.length;
        const resolvedTickets = tickets.filter(
          (t) => t.ticket_status === "closed"
        ).length;
        const slaBreaches = tickets.filter((t) => t.sla_id).length;

        // Calculate average response time
        let totalResponseTime = 0;
        let firstResponseTotal = 0;
        let ticketsWithResponse = 0;

        tickets.forEach((ticket) => {
          if (ticket.ticket_messages && ticket.ticket_messages.length > 0) {
            const customerMessages = ticket.ticket_messages.filter(
              (m) => m.sender_user_id === "customer"
            );
            const agentMessages = ticket.ticket_messages.filter(
              (m) => m.sender_user_id === "agent"
            );

            if (customerMessages.length > 0 && agentMessages.length > 0) {
              ticketsWithResponse++;

              // Calculate first response time
              const firstCustomerMessage = new Date(
                customerMessages[0].created_at
              );
              const firstAgentResponse = new Date(agentMessages[0].created_at);
              firstResponseTotal +=
                firstAgentResponse.getTime() - firstCustomerMessage.getTime();

              // Calculate average response time for all messages
              let messageResponseTimes = 0;
              let responseCount = 0;

              customerMessages.forEach((cm) => {
                const customerMessageTime = new Date(cm.created_at).getTime();
                const nextAgentMessage = agentMessages.find(
                  (am) =>
                    new Date(am.created_at).getTime() > customerMessageTime
                );
                if (nextAgentMessage) {
                  messageResponseTimes +=
                    new Date(nextAgentMessage.created_at).getTime() -
                    customerMessageTime;
                  responseCount++;
                }
              });

              if (responseCount > 0) {
                totalResponseTime += messageResponseTimes / responseCount;
              }
            }
          }
        });

        setMetrics({
          averageResponseTime: ticketsWithResponse
            ? totalResponseTime / ticketsWithResponse / (1000 * 60)
            : 0, // Convert to minutes
          firstResponseTime: ticketsWithResponse
            ? firstResponseTotal / ticketsWithResponse / (1000 * 60)
            : 0, // Convert to minutes
          resolutionRate: totalTickets
            ? (resolvedTickets / totalTickets) * 100
            : 0,
          customerSatisfaction: 0, // To be implemented with feedback system
          ticketsHandled: totalTickets,
          slaCompliance: totalTickets
            ? ((totalTickets - slaBreaches) / totalTickets) * 100
            : 0,
        });
      } catch (error) {
        console.error("Error fetching metrics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [timeRange, supabase]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    );
  }

  const chartData = metrics
    ? [
        {
          name: "Response Time",
          value: Math.round(metrics.averageResponseTime),
          unit: "min",
        },
        {
          name: "First Response",
          value: Math.round(metrics.firstResponseTime),
          unit: "min",
        },
        {
          name: "Resolution Rate",
          value: Math.round(metrics.resolutionRate),
          unit: "%",
        },
        {
          name: "SLA Compliance",
          value: Math.round(metrics.slaCompliance),
          unit: "%",
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Performance Metrics</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setTimeRange("day")}
            className={`px-3 py-1 rounded-md ${
              timeRange === "day"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary"
            }`}
            data-testid="day-range-button"
          >
            Day
          </button>
          <button
            onClick={() => setTimeRange("week")}
            className={`px-3 py-1 rounded-md ${
              timeRange === "week"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary"
            }`}
            data-testid="week-range-button"
          >
            Week
          </button>
          <button
            onClick={() => setTimeRange("month")}
            className={`px-3 py-1 rounded-md ${
              timeRange === "month"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary"
            }`}
            data-testid="month-range-button"
          >
            Month
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Average Response Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics ? `${Math.round(metrics.averageResponseTime)}m` : "N/A"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Resolution Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics ? `${Math.round(metrics.resolutionRate)}%` : "N/A"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Tickets Handled
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics ? metrics.ticketsHandled : "N/A"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              SLA Compliance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics ? `${Math.round(metrics.slaCompliance)}%` : "N/A"}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Performance Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-lg border bg-background p-2 shadow-sm">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="font-medium">
                              {payload[0].payload.name}
                            </div>
                            <div className="font-medium">
                              {payload[0].value}
                              {payload[0].payload.unit}
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="value"
                  fill="currentColor"
                  className="fill-primary"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
