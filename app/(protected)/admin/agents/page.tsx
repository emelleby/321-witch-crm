"use client";

import { SupabaseClient } from "@supabase/supabase-js";
import { Trash2, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

interface Agent extends UserProfile {
  organization: {
    organization_name: string;
  } | null;
  team_memberships: Array<{
    team: {
      team_name: string;
    };
  }> | null;
}

export default function AgentsPage() {
  const router = useRouter();
  const [supabase, setSupabase] = useState<SupabaseClient<Database> | null>(
    null
  );
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"agent" | "admin">("agent");
  const [inviting, setInviting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const { toast } = useToast();

  const fetchAgents = useCallback(async () => {
    if (!supabase) return;
    try {
      const { data: agents, error } = await supabase
        .from("user_profiles")
        .select(
          `
          *,
          organization:organizations(organization_name),
          team_memberships(
            team:support_teams(team_name)
          )
        `
        )
        .eq("user_role", "agent");

      if (error) throw error;

      setAgents(agents || []);
      setLoading(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load agents",
        variant: "destructive",
      });
      console.error("Error:", error);
    }
  }, [supabase, toast]);

  useEffect(() => {
    const initSupabase = async () => {
      const client = await createBrowserSupabaseClient();
      setSupabase(client);
    };
    initSupabase();
  }, []);

  useEffect(() => {
    if (supabase) {
      fetchAgents();
    }
  }, [supabase, fetchAgents]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !inviteEmail.trim()) {
      toast({
        title: "Error",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }

    setInviting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.auth.admin.inviteUserByEmail(
        inviteEmail.trim(),
        {
          data: {
            user_role: inviteRole,
            invited_by: user.id,
          },
        }
      );

      if (error) throw error;

      toast({
        title: "Success",
        description: "Invitation sent successfully",
        variant: "default",
      });
      setInviteEmail("");
      setShowInviteDialog(false);
      await fetchAgents();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send invitation",
        variant: "destructive",
      });
      console.error("Error:", error);
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveAgent = async (agentId: string) => {
    if (!supabase) return;
    try {
      const { error } = await supabase
        .from("user_profiles")
        .update({ user_role: "customer" })
        .eq("user_id", agentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Agent removed successfully",
        variant: "default",
      });
      await fetchAgents();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove agent",
        variant: "destructive",
      });
      console.error("Error:", error);
    }
  };

  const handleRoleChange = async (
    agentId: string,
    newRole: "agent" | "admin"
  ) => {
    if (!supabase) return;
    try {
      const { error } = await supabase
        .from("user_profiles")
        .update({ user_role: newRole })
        .eq("user_id", agentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Role updated successfully",
        variant: "default",
      });
      await fetchAgents();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update role",
        variant: "destructive",
      });
      console.error("Error:", error);
    }
  };

  const filteredAgents = agents.filter((agent) =>
    agent.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agents</h1>
          <p className="text-muted-foreground">
            Manage support agents and their roles
          </p>
        </div>
        <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Invite Agent
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite Agent</DialogTitle>
              <DialogDescription>
                Send an invitation to join as a support agent.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email Address
                </label>
                <Input
                  id="email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="agent@example.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="role" className="text-sm font-medium">
                  Role
                </label>
                <Select
                  value={inviteRole}
                  onValueChange={(value: "agent" | "admin") =>
                    setInviteRole(value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="agent">Agent</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button
                  type="submit"
                  disabled={inviting || !inviteEmail.trim()}
                >
                  {inviting ? "Sending..." : "Send Invitation"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <div className="p-4">
          <Input
            placeholder="Search agents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Organization</TableHead>
              <TableHead>Team</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAgents.map((agent) => (
              <TableRow key={agent.user_id}>
                <TableCell>{agent.display_name}</TableCell>
                <TableCell>
                  {agent.organization?.organization_name || "Unassigned"}
                </TableCell>
                <TableCell>
                  {agent.team_memberships?.[0]?.team?.team_name || "Unassigned"}
                </TableCell>
                <TableCell>
                  <Select
                    value={agent.user_role}
                    onValueChange={(value: "agent" | "admin") =>
                      handleRoleChange(agent.user_id, value)
                    }
                  >
                    <SelectTrigger className="w-[100px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="agent">Agent</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove Agent</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to remove this agent? They will
                          lose access to the support system.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleRemoveAgent(agent.user_id)}
                        >
                          Remove
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
