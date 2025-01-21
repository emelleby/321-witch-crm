'use client'

import { CustomerSidebar } from "@/components/sidebar/customer-sidebar"
import { createClient } from "@/utils/supabase/client"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export default function CustomerLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const router = useRouter()
    const supabase = createClient()
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/login')
                return
            }

            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single()

            if (!profile || profile.role !== 'customer') {
                router.push('/login')
                return
            }

            setLoading(false)
        }

        checkAuth()
    }, [])

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
        )
    }

    return (
        <div className="flex h-screen">
            <aside className="w-64 border-r bg-background">
                <CustomerSidebar />
            </aside>
            <main className="flex-1 overflow-y-auto">
                <div className="container mx-auto py-6">
                    {children}
                </div>
            </main>
        </div>
    )
} 