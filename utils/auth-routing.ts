import { SupabaseClient } from "@supabase/supabase-js";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

export async function handlePostLoginRouting(
  supabase: SupabaseClient,
  router: AppRouterInstance
) {
  // 1. Get the current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    router.push("/login");
    return;
  }

  // 2. Check if email is verified
  if (!user.email_confirmed_at) {
    router.push("/verify-email");
    return;
  }

  // 3. Get the user's profile
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, organization_id")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    console.error("Profile fetch error:", profileError);
    router.push("/login");
    return;
  }

  // 4. Route based on role
  switch (profile.role) {
    case "admin":
      router.push("/admin/dashboard");
      break;
    case "agent":
      router.push("/agent/dashboard");
      break;
    case "customer":
      router.push("/customer/dashboard");
      break;
    default:
      router.push("/");
  }
}
