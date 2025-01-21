'use client'

import { BaseSidebar } from "./base-sidebar"
import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { RealtimeChannel } from "@supabase/supabase-js"

export function CustomerSidebar() {
    const [unreadCount, setUnreadCount] = useState(0)
    const supabase = createClient()

    useEffect(() => {
        let channel: RealtimeChannel

        const setupRealtimeSubscription = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            // Get initial unread count
            const { data: tickets } = await supabase
                .from('tickets')
                .select('id')
                .eq('creator_id', user.id)
                .gt('unread_agent_messages', 0)

            setUnreadCount(tickets?.length || 0)

            // Subscribe to changes
            channel = supabase
                .channel('ticket-updates')
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'tickets',
                        filter: `creator_id=eq.${user.id}`
                    },
                    async () => {
                        // Refresh unread count on any ticket changes
                        const { data: updatedTickets } = await supabase
                            .from('tickets')
                            .select('id')
                            .eq('creator_id', user.id)
                            .gt('unread_agent_messages', 0)

                        setUnreadCount(updatedTickets?.length || 0)
                    }
                )
                .subscribe()
        }

        setupRealtimeSubscription()

        return () => {
            if (channel) {
                supabase.removeChannel(channel)
            }
        }
    }, [])

    const customerNavItems = [
        {
            title: "Dashboard",
            href: "/customer/dashboard",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                </svg>
            )
        },
        {
            title: "My Tickets",
            href: "/customer/tickets",
            badge: unreadCount,
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                    <polyline points="14 2 14 8 20 8" />
                </svg>
            )
        },
        {
            title: "New Ticket",
            href: "/customer/tickets/new",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
            )
        },
        {
            title: "Knowledge Base",
            href: "/customer/knowledge",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
            )
        },
        {
            title: "Profile",
            href: "/customer/profile",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                </svg>
            )
        }
    ]

    return <BaseSidebar items={customerNavItems} />
} 