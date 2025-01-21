import { createClient } from "@/utils/supabase/client"

export async function getUserRole(supabase: ReturnType<typeof createClient>) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    return profile?.role
}

export async function isAgent(supabase: ReturnType<typeof createClient>) {
    const role = await getUserRole(supabase)
    return role === 'agent' || role === 'admin'
}