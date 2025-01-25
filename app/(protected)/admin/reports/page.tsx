"use client";

import { useState } from "react";

import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database } from "@/database.types";
import { useToast } from "@/hooks/use-toast";
import { createBrowserSupabaseClient } from "@/utils/supabase/client";

type Ticket = Database["public"]["Tables"]["support_tickets"]["Row"];
type UserProfile = Database["public"]["Tables"]["user_profiles"]["Row"];

export default function ReportsPage() {
  const supabase = createBrowserSupabaseClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("agent");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">
          View performance metrics and analytics
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="agent">Agent Performance</TabsTrigger>
          <TabsTrigger value="team">Team Performance</TabsTrigger>
          <TabsTrigger value="sla">SLA Compliance</TabsTrigger>
          <TabsTrigger value="volume">Ticket Volume</TabsTrigger>
        </TabsList>

        <TabsContent value="agent" className="space-y-4">
          <Card className="p-6">
            <div className="text-center p-4">
              <p className="text-lg text-muted-foreground">
                Agent performance reporting coming soon...
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                This will include metrics like:
              </p>
              <ul className="list-disc list-inside mt-2 text-sm text-muted-foreground">
                <li>Tickets resolved</li>
                <li>Average response time</li>
                <li>Customer satisfaction</li>
                <li>First response time</li>
              </ul>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="space-y-4">
          <Card className="p-6">
            <div className="text-center p-4">
              <p className="text-lg text-muted-foreground">
                Team performance reporting coming soon...
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                This will include metrics like:
              </p>
              <ul className="list-disc list-inside mt-2 text-sm text-muted-foreground">
                <li>Team ticket volume</li>
                <li>Average resolution time</li>
                <li>Team satisfaction scores</li>
                <li>Workload distribution</li>
              </ul>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="sla" className="space-y-4">
          <Card className="p-6">
            <div className="text-center p-4">
              <p className="text-lg text-muted-foreground">
                SLA compliance reporting coming soon...
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                This will include metrics like:
              </p>
              <ul className="list-disc list-inside mt-2 text-sm text-muted-foreground">
                <li>Response time compliance</li>
                <li>Resolution time compliance</li>
                <li>SLA breaches</li>
                <li>Time to breach warnings</li>
              </ul>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="volume" className="space-y-4">
          <Card className="p-6">
            <div className="text-center p-4">
              <p className="text-lg text-muted-foreground">
                Ticket volume reporting coming soon...
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                This will include metrics like:
              </p>
              <ul className="list-disc list-inside mt-2 text-sm text-muted-foreground">
                <li>Tickets by status</li>
                <li>Tickets by priority</li>
                <li>Tickets by category</li>
                <li>Volume trends</li>
              </ul>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
