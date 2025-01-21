'use client'

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
    LayoutDashboard,
    Users,
    Building2,
    BookOpen,
    Settings,
    LogOut,
    BarChart,
    UserSquare2
} from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { useRouter } from "next/navigation"
import { notifications } from "@/utils/notifications"

const navigation = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Agents', href: '/admin/agents', icon: Users },
    { name: 'Teams', href: '/admin/teams', icon: UserSquare2 },
    { name: 'Organizations', href: '/admin/organizations', icon: Building2 },
    { name: 'Knowledge Base', href: '/admin/knowledge', icon: BookOpen },
    { name: 'Reports', href: '/admin/reports', icon: BarChart },
    { name: 'Settings', href: '/admin/settings', icon: Settings },
]

export function AdminSidebar() {
    const pathname = usePathname()
    const router = useRouter()
    const supabase = createClient()

    const handleSignOut = async () => {
        const { error } = await supabase.auth.signOut()
        if (error) {
            notifications.error('Error signing out')
            return
        }
        router.push('/')
    }

    return (
        <div className="flex h-screen w-64 flex-col border-r bg-muted/10">
            <div className="flex h-14 items-center border-b px-4">
                <Link
                    href="/admin/dashboard"
                    className="flex items-center gap-2 font-semibold"
                >
                    <span>Admin Portal</span>
                </Link>
            </div>

            <div className="flex-1 overflow-y-auto py-4">
                <nav className="space-y-1 px-2">
                    {navigation.map((item) => {
                        const isActive = pathname === item.href
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={cn(
                                    "group flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium",
                                    isActive
                                        ? "bg-primary text-primary-foreground"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                            >
                                <item.icon className="h-5 w-5" />
                                {item.name}
                            </Link>
                        )
                    })}
                </nav>
            </div>

            <div className="border-t p-4">
                <button
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                    <LogOut className="h-5 w-5" />
                    Sign Out
                </button>
            </div>
        </div>
    )
} 