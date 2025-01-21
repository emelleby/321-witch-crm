'use client'

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { createClient } from "@/utils/supabase/client"
import { useRouter, usePathname } from "next/navigation"
import { Badge } from "@/components/ui/badge"

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
    items?: {
        title: string
        href: string
        icon?: React.ReactNode
        badge?: number
    }[]
    defaultCollapsed?: boolean
}

export function BaseSidebar({
    className,
    items = [],
    defaultCollapsed = false,
    ...props
}: SidebarProps) {
    const router = useRouter()
    const pathname = usePathname()
    const supabase = createClient()

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    return (
        <div className={cn("pb-12 min-h-screen", className)} {...props}>
            <div className="space-y-4 py-4">
                <div className="px-3 py-2">
                    <div className="space-y-1">
                        <h2 className="mb-2 px-4 text-xl font-semibold tracking-tight">
                            Overview
                        </h2>
                        <ScrollArea className="h-[calc(100vh-12rem)]">
                            <div className="space-y-1">
                                {items.map((item, index) => {
                                    const isActive = pathname === item.href
                                    return (
                                        <Button
                                            key={index}
                                            variant={isActive ? "secondary" : "ghost"}
                                            className={cn(
                                                "w-full justify-start",
                                                isActive && "bg-secondary"
                                            )}
                                            onClick={() => router.push(item.href)}
                                        >
                                            {item.icon && (
                                                <span className="mr-2">{item.icon}</span>
                                            )}
                                            {item.title}
                                            {item.badge ? (
                                                <Badge
                                                    variant="destructive"
                                                    className="ml-auto"
                                                >
                                                    {item.badge}
                                                </Badge>
                                            ) : null}
                                        </Button>
                                    )
                                })}
                            </div>
                        </ScrollArea>
                    </div>
                </div>
            </div>
            <div className="absolute bottom-4 w-full px-3">
                <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={handleSignOut}
                >
                    <span className="mr-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                            <polyline points="16 17 21 12 16 7" />
                            <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                    </span>
                    Sign Out
                </Button>
            </div>
        </div>
    )
} 