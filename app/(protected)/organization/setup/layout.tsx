import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"

export default async function OrganizationSetupLayout({
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

    // If user is not an agent/admin or already has an organization, redirect
    if (!profile ||
        (profile.role !== 'agent' && profile.role !== 'admin') ||
        profile.organization_id) {
        redirect('/')
    }

    return (
        <div className="flex min-h-screen flex-col">
            <main className="flex-1">
                {children}
            </main>
        </div>
    )
}
