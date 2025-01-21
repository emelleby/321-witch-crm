import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { AdminSidebar } from "@/components/sidebar/admin-sidebar"

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        redirect('/login')
    }

    // Get user's profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('role, organization_id')
        .eq('id', user.id)
        .single()

    // If user is not an admin or doesn't have an organization, redirect
    if (!profile || profile.role !== 'admin' || !profile.organization_id) {
        redirect('/')
    }

    return (
        <div className="flex min-h-screen">
            <AdminSidebar />
            <main className="flex-1 p-8">
                {children}
            </main>
        </div>
    )
} 