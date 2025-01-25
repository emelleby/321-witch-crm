"use client";

import {
  BarChart,
  BookOpen,
  Building2,
  LayoutDashboard,
  LogOut,
  Users,
  UserSquare2,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { createBrowserSupabaseClient } from "@/utils/supabase/client";

const navigation = [
  { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { name: "Agents", href: "/admin/agents", icon: Users },
  { name: "Teams", href: "/admin/teams", icon: UserSquare2 },
  { name: "Knowledge Base", href: "/admin/knowledge", icon: BookOpen },
  { name: "Reports", href: "/admin/reports", icon: BarChart },
  { name: "Organization", href: "/admin/organization", icon: Building2 },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();
  const { toast } = useToast();

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error",
        description: "Error signing out",
        variant: "destructive",
      });
      return;
    }
    router.push("/");
  };

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
            const isActive = pathname === item.href;
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
            );
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
  );
}
