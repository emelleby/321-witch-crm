"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { createBrowserSupabaseClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";

type UserProfile = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  organization_id: string | null;
  user_role: "customer" | "agent" | "admin";
  created_at: string | null;
  updated_at: string | null;
};

export default function CustomerProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const { toast } = useToast();
  const supabase = createBrowserSupabaseClient();

  useEffect(() => {
    const fetchProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Get email from auth user
      setEmail(user.email || "");

      const { data: profile, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
        toast({
          title: "Error",
          description: "Failed to load profile",
          variant: "destructive",
        });
        return;
      }

      setProfile(profile);
      setDisplayName(profile.display_name);
    };

    fetchProfile();
  }, [supabase, toast]);

  const handleUpdateProfile = async () => {
    if (!profile) return;

    try {
      const { error } = await supabase
        .from("user_profiles")
        .update({ display_name: displayName })
        .eq("user_id", profile.user_id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    }
  };

  if (!profile) return null;

  return (
    <div className="container py-6 space-y-6">
      <h1 className="text-3xl font-bold">My Profile</h1>

      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Display Name</label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <Input value={email} disabled />
          </div>
          <Button onClick={handleUpdateProfile}>Update Profile</Button>
        </CardContent>
      </Card>
    </div>
  );
}
