'use client'

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { notifications } from "@/utils/notifications"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

type Team = {
    id: string
    name: string
    description: string
    created_at: string
    member_count: number
}

type TeamMember = {
    id: string
    full_name: string
    email: string
    role: string
}

export default function TeamsPage() {
    const supabase = createClient()
    const [teams, setTeams] = useState<Team[]>([])
    const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
    const [loading, setLoading] = useState(true)
    const [availableAgents, setAvailableAgents] = useState<TeamMember[]>([])

    useEffect(() => {
        fetchTeams()
    }, [])

    useEffect(() => {
        if (selectedTeam) {
            fetchTeamMembers(selectedTeam.id)
            fetchAvailableAgents()
        }
    }, [selectedTeam])

    const fetchTeams = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: profile } = await supabase
                .from('profiles')
                .select('organization_id')
                .eq('id', user.id)
                .single()

            if (!profile?.organization_id) return

            const { data: teams } = await supabase
                .from('teams')
                .select(`
                    *,
                    member_count:team_members(count)
                `)
                .eq('organization_id', profile.organization_id)

            setTeams(teams || [])
        } catch (error) {
            console.error('Error:', error)
            notifications.error('Failed to load teams')
        } finally {
            setLoading(false)
        }
    }

    const fetchTeamMembers = async (teamId: string) => {
        try {
            const { data } = await supabase
                .from('team_members')
                .select(`
                    profiles (
                        id,
                        full_name,
                        email,
                        role
                    )
                `)
                .eq('team_id', teamId)

            setTeamMembers(data?.map(d => d.profiles) || [])
        } catch (error) {
            console.error('Error:', error)
            notifications.error('Failed to load team members')
        }
    }

    const fetchAvailableAgents = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: profile } = await supabase
                .from('profiles')
                .select('organization_id')
                .eq('id', user.id)
                .single()

            if (!profile?.organization_id) return

            const { data: agents } = await supabase
                .from('profiles')
                .select('id, full_name, email, role')
                .eq('organization_id', profile.organization_id)
                .eq('role', 'agent')
                .not('id', 'in', `(${teamMembers.map(m => m.id).join(',')})`)

            setAvailableAgents(agents || [])
        } catch (error) {
            console.error('Error:', error)
            notifications.error('Failed to load available agents')
        }
    }

    const createTeam = async (name: string, description: string) => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: profile } = await supabase
                .from('profiles')
                .select('organization_id')
                .eq('id', user.id)
                .single()

            if (!profile?.organization_id) return

            await supabase.from('teams').insert({
                name,
                description,
                organization_id: profile.organization_id
            })

            notifications.success('Team created successfully')
            fetchTeams()
        } catch (error) {
            console.error('Error:', error)
            notifications.error('Failed to create team')
        }
    }

    const addTeamMember = async (teamId: string, userId: string) => {
        try {
            await supabase.from('team_members').insert({
                team_id: teamId,
                user_id: userId
            })

            notifications.success('Member added successfully')
            fetchTeamMembers(teamId)
            fetchAvailableAgents()
        } catch (error) {
            console.error('Error:', error)
            notifications.error('Failed to add team member')
        }
    }

    const removeTeamMember = async (teamId: string, userId: string) => {
        try {
            await supabase
                .from('team_members')
                .delete()
                .eq('team_id', teamId)
                .eq('user_id', userId)

            notifications.success('Member removed successfully')
            fetchTeamMembers(teamId)
            fetchAvailableAgents()
        } catch (error) {
            console.error('Error:', error)
            notifications.error('Failed to remove team member')
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        )
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Teams</h1>
                    <p className="text-muted-foreground">
                        Manage your support teams
                    </p>
                </div>

                <Dialog>
                    <DialogTrigger asChild>
                        <Button>Create Team</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create New Team</DialogTitle>
                            <DialogDescription>
                                Create a new team to organize your agents
                            </DialogDescription>
                        </DialogHeader>
                        <form
                            onSubmit={(e) => {
                                e.preventDefault()
                                const formData = new FormData(e.currentTarget)
                                createTeam(
                                    formData.get('name') as string,
                                    formData.get('description') as string
                                )
                            }}
                            className="space-y-4"
                        >
                            <div className="space-y-2">
                                <Label htmlFor="name">Team Name</Label>
                                <Input id="name" name="name" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Input id="description" name="description" />
                            </div>
                            <DialogFooter>
                                <Button type="submit">Create Team</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {teams.map((team) => (
                    <Card
                        key={team.id}
                        className="cursor-pointer hover:shadow-lg transition-shadow"
                        onClick={() => setSelectedTeam(team)}
                    >
                        <CardHeader>
                            <CardTitle>{team.name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground mb-2">
                                {team.description}
                            </p>
                            <p className="text-sm">
                                {team.member_count} members
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {selectedTeam && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>{selectedTeam.name} Members</CardTitle>
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button>Add Member</Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Add Team Member</DialogTitle>
                                        <DialogDescription>
                                            Add an agent to this team
                                        </DialogDescription>
                                    </DialogHeader>
                                    <form
                                        onSubmit={(e) => {
                                            e.preventDefault()
                                            const formData = new FormData(e.currentTarget)
                                            addTeamMember(
                                                selectedTeam.id,
                                                formData.get('agent_id') as string
                                            )
                                        }}
                                        className="space-y-4"
                                    >
                                        <div className="space-y-2">
                                            <Label htmlFor="agent_id">Select Agent</Label>
                                            <Select name="agent_id" required>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select an agent" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {availableAgents.map((agent) => (
                                                        <SelectItem key={agent.id} value={agent.id}>
                                                            {agent.full_name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <DialogFooter>
                                            <Button type="submit">Add Member</Button>
                                        </DialogFooter>
                                    </form>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {teamMembers.map((member) => (
                                    <TableRow key={member.id}>
                                        <TableCell>{member.full_name}</TableCell>
                                        <TableCell>{member.email}</TableCell>
                                        <TableCell>{member.role}</TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => removeTeamMember(selectedTeam.id, member.id)}
                                            >
                                                Remove
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
        </div>
    )
} 