import { redirect } from "next/navigation";

import { AgentSidebar } from "@/components/sidebar/agent-sidebar";
import { Database } from "@/database.types";
import { createClient } from "@/utils/supabase/server";

export default async function AgentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient<Database>();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("user_role, organization_id")
    .eq("user_id", user.id)
    .single();

  if (!profile || profile.user_role !== "agent") {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen flex-col space-y-6">
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="container flex h-16 items-center justify-between py-4">
          <div className="flex gap-6 md:gap-10">
            <h2 className="text-lg font-semibold tracking-tight">
              Agent Portal
            </h2>
          </div>
        </div>
      </header>
      <div className="container grid flex-1 gap-12 md:grid-cols-[200px_1fr]">
        <aside className="hidden w-[200px] flex-col md:flex">
          <AgentSidebar />
        </aside>
        <main className="flex w-full flex-1 flex-col overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
