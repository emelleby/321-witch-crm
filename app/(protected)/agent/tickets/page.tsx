'use client'

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { notifications } from "@/utils/notifications"
import { AdvancedSearch } from "@/components/tickets/advanced-search"

type Ticket = {
    id: string
    subject: string
    status: 'open' | 'pending' | 'closed'
    priority: 'low' | 'normal' | 'high'
    created_at: string
    updated_at: string
    unread_messages: number
    organization_id: string | null
    assigned_to: string | null
}

type Organization = {
    id: string
    name: string
}

export default function AgentTicketsPage() {
    const router = useRouter()
    const supabase = createClient()
    const [tickets, setTickets] = useState<Ticket[]>([])
    const [organizations, setOrganizations] = useState<Organization[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
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
    }, [])

    const fetchOrganizations = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: profile } = await supabase
                .from('profiles')
                .select('organization_id')
                .eq('id', user.id)
                .single()

            if (!profile) return

            const { data, error } = await supabase
                .from('organizations')
                .select('id, name')
                .eq('id', profile.organization_id)

            if (error) throw error
            setOrganizations(data)
        } catch (error) {
            console.error('Error fetching organizations:', error)
        }
    }

    const handleSearch = async (filters: any) => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: profile } = await supabase
                .from('profiles')
                .select('organization_id')
                .eq('id', user.id)
                .single()

            if (!profile) return

            setLoading(true)

            const { data, error } = await supabase.rpc('search_tickets', {
                search_query: filters.query || null,
                status_filter: filters.status || null,
                priority_filter: filters.priority || null,
                category_ids: filters.categoryIds.length > 0 ? filters.categoryIds : null,
                tag_ids: filters.tagIds.length > 0 ? filters.tagIds : null,
                date_from: filters.dateFrom,
                date_to: filters.dateTo,
                organization_id: profile.organization_id,
                assigned_to: filters.assignedTo || null,
                use_vector_search: filters.useVectorSearch,
                similarity_threshold: 0.7
            })

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
                <h1 className="text-3xl font-bold tracking-tight">Tickets</h1>
            </div>

            <AdvancedSearch
                showAssigneeFilter={true}
                onSearch={handleSearch}
            />

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
                            onClick={() => router.push(`/agent/tickets/${ticket.id}`)}
                        >
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-semibold">{ticket.subject}</h3>
                                        {ticket.unread_messages > 0 && (
                                            <Badge variant="destructive">
                                                {ticket.unread_messages} new
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
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <div className={`h-2 w-2 rounded-full ${getPriorityColor(ticket.priority)}`} />
                                        <span className="text-sm text-muted-foreground">{ticket.priority}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className={`h-2 w-2 rounded-full ${getStatusColor(ticket.status)}`} />
                                        <span className="text-sm text-muted-foreground">{ticket.status}</span>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>
        </div>
    )
} 