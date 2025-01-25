import { redirect } from "next/navigation";

import { AdminSidebar } from "@/components/sidebar/admin-sidebar";
import { createClient } from "@/utils/supabase/server";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // Get user's profile
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("user_role")
    .eq("user_id", user.id)
    .single();

  // If user is not an admin, redirect
  if (!profile || profile.user_role !== "admin") {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="flex h-16 items-center justify-between px-4">
          <div className="flex gap-6 md:gap-10">
            <h2 className="text-lg font-semibold tracking-tight">
              Admin Portal
            </h2>
          </div>
        </div>
      </header>
      <div className="flex flex-1">
        <aside className="w-64 border-r bg-background">
          <AdminSidebar />
        </aside>
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
