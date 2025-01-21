'use client'

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Card } from "@/components/ui/card"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { notifications } from "@/utils/notifications"

type Ticket = {
    id: string
    subject: string
    status: 'open' | 'pending' | 'closed'
    priority: 'low' | 'normal' | 'high'
    created_at: string
    updated_at: string
    unread_agent_messages: number
    organization_id: string | null
}

type Organization = {
    id: string
    name: string
}

export default function TicketsPage() {
    const router = useRouter()
    const supabase = createClient()
    const [tickets, setTickets] = useState<Ticket[]>([])
    const [organizations, setOrganizations] = useState<Organization[]>([])
    const [loading, setLoading] = useState(true)
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const [organizationFilter, setOrganizationFilter] = useState<string>('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [sortBy, setSortBy] = useState<'created_at' | 'updated_at' | 'priority'>('updated_at')
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

    useEffect(() => {
        fetchTickets()
        fetchOrganizations()

        // Subscribe to real-time updates
        const channel = supabase
            .channel('tickets-updates')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'tickets'
                },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        setTickets(prev => [payload.new as Ticket, ...prev])
                    } else if (payload.eventType === 'UPDATE') {
                        setTickets(prev => prev.map(ticket =>
                            ticket.id === payload.new.id ? payload.new as Ticket : ticket
                        ))
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [statusFilter, organizationFilter, searchQuery, sortBy, sortOrder])

    const fetchOrganizations = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data, error } = await supabase
                .from('organizations')
                .select('id, name')
                .order('name')

            if (error) throw error
            setOrganizations(data)
        } catch (error) {
            console.error('Error fetching organizations:', error)
        }
    }

    const fetchTickets = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            let query = supabase
                .from('tickets')
                .select('*')
                .eq('creator_id', user.id)
                .order(sortBy, { ascending: sortOrder === 'asc' })

            if (statusFilter !== 'all') {
                query = query.eq('status', statusFilter)
            }

            if (organizationFilter !== 'all') {
                query = query.eq('organization_id', organizationFilter)
            }

            if (searchQuery) {
                query = query.ilike('subject', `%${searchQuery}%`)
            }

            const { data, error } = await query

            if (error) throw error
            setTickets(data)
        } catch (error) {
            notifications.error('Failed to load tickets')
            console.error('Error:', error)
        } finally {
            setLoading(false)
        }
    }

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high':
                return 'bg-red-500'
            case 'normal':
                return 'bg-yellow-500'
            case 'low':
                return 'bg-green-500'
            default:
                return 'bg-gray-500'
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'open':
                return 'bg-green-500'
            case 'pending':
                return 'bg-yellow-500'
            case 'closed':
                return 'bg-gray-500'
            default:
                return 'bg-gray-500'
        }
    }

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">My Tickets</h1>
                <Button onClick={() => router.push('/customer/tickets/new')}>
                    New Ticket
                </Button>
            </div>

            <div className="flex gap-4 items-center">
                <div className="flex-1">
                    <Input
                        placeholder="Search tickets..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Select
                    value={organizationFilter}
                    onValueChange={setOrganizationFilter}
                >
                    <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Filter by organization" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Organizations</SelectItem>
                        {organizations.map((org) => (
                            <SelectItem key={org.id} value={org.id}>
                                {org.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select
                    value={statusFilter}
                    onValueChange={setStatusFilter}
                >
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                </Select>
                <Select
                    value={sortBy}
                    onValueChange={(value: 'created_at' | 'updated_at' | 'priority') => setSortBy(value)}
                >
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="created_at">Created Date</SelectItem>
                        <SelectItem value="updated_at">Last Updated</SelectItem>
                        <SelectItem value="priority">Priority</SelectItem>
                    </SelectContent>
                </Select>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                >
                    {sortOrder === 'asc' ? '↑' : '↓'}
                </Button>
            </div>

            <div className="grid gap-4">
                {tickets.length === 0 ? (
                    <Card className="p-6 text-center text-muted-foreground">
                        No tickets found
                    </Card>
                ) : (
                    tickets.map((ticket) => (
                        <Card
                            key={ticket.id}
                            className="p-6 cursor-pointer hover:bg-accent transition-colors"
                            onClick={() => router.push(`/customer/tickets/${ticket.id}`)}
                        >
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-semibold">{ticket.subject}</h3>
                                        {ticket.unread_agent_messages > 0 && (
                                            <Badge variant="destructive">
                                                {ticket.unread_agent_messages} new
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="flex gap-2 text-sm text-muted-foreground">
                                        <span>Created: {new Date(ticket.created_at).toLocaleDateString()}</span>
                                        <span>•</span>
                                        <span>Updated: {new Date(ticket.updated_at).toLocaleDateString()}</span>
                                        {ticket.organization_id && (
                                            <>
                                                <span>•</span>
                                                <span>
                                                    Organization: {organizations.find(org => org.id === ticket.organization_id)?.name}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className={`h-2 w-2 rounded-full ${getPriorityColor(ticket.priority)}`} />
                                    <div className={`h-2 w-2 rounded-full ${getStatusColor(ticket.status)}`} />
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>
        </div>
    )
} 