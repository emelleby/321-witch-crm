import { SupabaseClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import { Database } from "@/database.types";

interface VerifiedUser {
  id: string;
  profile: Database["public"]["Tables"]["user_profiles"]["Row"];
}

export async function getUserInfo(
  supabase: SupabaseClient<Database>
): Promise<VerifiedUser | null> {
  const { data: user, error } = await supabase.auth.getUser();

  if (!user) {
    console.error("User not found");
    redirect("/login");
  }

  if (error) {
    console.error("Error getting user", error);
    redirect("/login");
  }

  const { data: userProfile, error: userProfileError } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", user.user.id)
    .single();

  if (!userProfile) {
    console.error("User profile not found");
    redirect("/login");
  }

  if (userProfileError) {
    console.error("Error getting user profile", userProfileError);
    redirect("/login");
  }

  return {
    id: user.user.id,
    profile: userProfile,
  };
}
