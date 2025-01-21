'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { notifications } from '@/utils/notifications';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserPlus, Trash2 } from 'lucide-react';
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
} from '@/components/ui/alert-dialog';

type Agent = {
  id: string;
  email: string;
  full_name: string;
  role: 'agent' | 'admin';
  created_at: string;
};

type AgentResponse = {
  id: string;
  full_name: string;
  role: 'agent' | 'admin';
  created_at: string;
  email: {
    email: string;
  } | null;
};

export default function AgentsPage() {
  const supabase = createClient();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'agent' | 'admin'>('agent');
  const [inviting, setInviting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showInviteDialog, setShowInviteDialog] = useState(false);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const fetchAgents = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's organization
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (!profile?.organization_id) return;

      // Get all agents and admins in the organization
      const { data, error } = await supabase
        .from('profiles')
        .select('*, auth_user:id(email)')
        .eq('organization_id', profile.organization_id)
        .in('role', ['agent', 'admin'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform the data to handle the email join
      const agentsWithEmail = (data as any[]).map((agent) => ({
        id: agent.id,
        full_name: agent.full_name,
        role: agent.role,
        created_at: agent.created_at,
        email: agent.auth_user?.email || 'No email',
      }));

      setAgents(agentsWithEmail);
    } catch (error) {
      console.error('Error:', error);
      notifications.error('Failed to load agents');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      notifications.error('Please enter an email address');
      return;
    }

    setInviting(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // Get user's organization
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (!profile?.organization_id) throw new Error('No organization found');

      // Extract domain from email
      const domain = inviteEmail.split('@')[1];

      // Create invite
      const { error: inviteError } = await supabase.from('invites').insert([
        {
          email: inviteEmail,
          organization_id: profile.organization_id,
          role: inviteRole,
          domain,
        },
      ]);

      if (inviteError) throw inviteError;

      notifications.success('Invitation sent successfully');
      setInviteEmail('');
      setShowInviteDialog(false);
      await fetchAgents();
    } catch (error) {
      console.error('Error:', error);
      notifications.error('Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveAgent = async (agentId: string) => {
    try {
      // Update profile to remove organization_id
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ organization_id: null })
        .eq('id', agentId);

      if (profileError) throw profileError;

      notifications.success('Agent removed successfully');
      await fetchAgents();
    } catch (error) {
      console.error('Error:', error);
      notifications.error('Failed to remove agent');
    }
  };

  const handleRoleChange = async (agentId: string, newRole: 'agent' | 'admin') => {
    try {
      const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', agentId);

      if (error) throw error;

      notifications.success('Role updated successfully');
      await fetchAgents();
    } catch (error) {
      console.error('Error:', error);
      notifications.error('Failed to update role');
    }
  };

  const filteredAgents = agents.filter(
    (agent) =>
      agent.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.email.toLowerCase().includes(searchQuery.toLowerCase())
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
          <p className="text-muted-foreground">Manage your support team</p>
        </div>
        <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Invite Agent
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite Agent</DialogTitle>
              <DialogDescription>Send an invitation to join your support team.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="agent@company.com"
                  type="email"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Role</label>
                <Select
                  value={inviteRole}
                  onValueChange={(value: 'agent' | 'admin') => setInviteRole(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="agent">Agent</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()}>
                {inviting ? 'Sending...' : 'Send Invitation'}
              </Button>
            </DialogFooter>
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
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAgents.map((agent) => (
              <TableRow key={agent.id}>
                <TableCell>{agent.full_name}</TableCell>
                <TableCell>{agent.email}</TableCell>
                <TableCell>
                  <Select
                    value={agent.role}
                    onValueChange={(value: 'agent' | 'admin') => handleRoleChange(agent.id, value)}
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
                <TableCell>{new Date(agent.created_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove Agent</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to remove this agent? They will lose access to the
                          support system.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleRemoveAgent(agent.id)}>
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
