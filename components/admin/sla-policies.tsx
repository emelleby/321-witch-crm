'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Pencil, Trash2 } from 'lucide-react';

interface SLAPolicy {
    id: string;
    name: string;
    description: string;
    priority: string;
    first_response_time: string;
    resolution_time: string;
}

export function SLAPolicies() {
    const [policies, setPolicies] = useState<SLAPolicy[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        priority: 'normal',
        first_response_time: '8 hours',
        resolution_time: '24 hours'
    });

    const supabase = createClient();
    const router = useRouter();

    const fetchPolicies = async () => {
        const { data, error } = await supabase
            .from('sla_policies')
            .select('*')
            .order('priority');

        if (error) {
            toast.error('Failed to fetch SLA policies');
            return;
        }

        setPolicies(data);
        setLoading(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const { data, error } = editing
            ? await supabase
                .from('sla_policies')
                .update(formData)
                .eq('id', editing)
                .select()
            : await supabase
                .from('sla_policies')
                .insert([formData])
                .select();

        if (error) {
            toast.error(editing ? 'Failed to update SLA policy' : 'Failed to create SLA policy');
            setLoading(false);
            return;
        }

        toast.success(editing ? 'SLA policy updated' : 'SLA policy created');
        setEditing(null);
        setFormData({
            name: '',
            description: '',
            priority: 'normal',
            first_response_time: '8 hours',
            resolution_time: '24 hours'
        });
        fetchPolicies();
    };

    const handleEdit = (policy: SLAPolicy) => {
        setEditing(policy.id);
        setFormData({
            name: policy.name,
            description: policy.description,
            priority: policy.priority,
            first_response_time: policy.first_response_time,
            resolution_time: policy.resolution_time
        });
    };

    const handleDelete = async (id: string) => {
        const { error } = await supabase
            .from('sla_policies')
            .delete()
            .eq('id', id);

        if (error) {
            toast.error('Failed to delete SLA policy');
            return;
        }

        toast.success('SLA policy deleted');
        fetchPolicies();
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>{editing ? 'Edit SLA Policy' : 'Create SLA Policy'}</CardTitle>
                    <CardDescription>
                        Define response time and resolution time expectations for different ticket priorities
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Name</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="priority">Priority</Label>
                                <Select
                                    value={formData.priority}
                                    onValueChange={(value) => setFormData({ ...formData, priority: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="urgent">Urgent</SelectItem>
                                        <SelectItem value="high">High</SelectItem>
                                        <SelectItem value="normal">Normal</SelectItem>
                                        <SelectItem value="low">Low</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Input
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="first_response_time">First Response Time</Label>
                                <Select
                                    value={formData.first_response_time}
                                    onValueChange={(value) => setFormData({ ...formData, first_response_time: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1 hour">1 hour</SelectItem>
                                        <SelectItem value="4 hours">4 hours</SelectItem>
                                        <SelectItem value="8 hours">8 hours</SelectItem>
                                        <SelectItem value="24 hours">24 hours</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="resolution_time">Resolution Time</Label>
                                <Select
                                    value={formData.resolution_time}
                                    onValueChange={(value) => setFormData({ ...formData, resolution_time: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="4 hours">4 hours</SelectItem>
                                        <SelectItem value="8 hours">8 hours</SelectItem>
                                        <SelectItem value="24 hours">24 hours</SelectItem>
                                        <SelectItem value="72 hours">72 hours</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <Button type="submit" disabled={loading}>
                            {editing ? 'Update Policy' : 'Create Policy'}
                        </Button>
                        {editing && (
                            <Button type="button" variant="outline" onClick={() => setEditing(null)} className="ml-2">
                                Cancel
                            </Button>
                        )}
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>SLA Policies</CardTitle>
                    <CardDescription>Manage your organization's SLA policies</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Priority</TableHead>
                                <TableHead>First Response</TableHead>
                                <TableHead>Resolution</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {policies.map((policy) => (
                                <TableRow key={policy.id}>
                                    <TableCell className="font-medium">{policy.name}</TableCell>
                                    <TableCell className="capitalize">{policy.priority}</TableCell>
                                    <TableCell>{policy.first_response_time}</TableCell>
                                    <TableCell>{policy.resolution_time}</TableCell>
                                    <TableCell className="flex gap-2">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleEdit(policy)}
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDelete(policy.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
} 