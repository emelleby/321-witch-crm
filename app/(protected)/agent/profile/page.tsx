"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { FileUpload } from "@/components/file-upload";
import { PageHeader } from "@/components/page-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Database } from "@/database.types";
import { useToast } from "@/hooks/use-toast";
import { createBrowserSupabaseClient } from "@/utils/supabase/client";

type Profile = Database["public"]["Tables"]["user_profiles"]["Row"];

export default function AgentProfilePage() {
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState("");
  const [newProfilePictureId, setNewProfilePictureId] = useState<string | null>(
    null
  );
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(
    null
  );
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchProfile = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      setProfile(data);
      setNewName(data.display_name);
      if (data.avatar_file_id) {
        const {
          data: { publicUrl },
        } = supabase.storage.from("avatars").getPublicUrl(data.avatar_file_id);
        setProfilePictureUrl(publicUrl);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!profile) return;

    setSaving(true);
    try {
      const updates: Partial<Profile> = {
        display_name: newName,
        avatar_file_id: newProfilePictureId || profile.avatar_file_id,
      };

      const { error } = await supabase
        .from("user_profiles")
        .update(updates)
        .eq("user_id", profile.user_id);

      if (error) throw error;

      setProfile((prev) => (prev ? { ...prev, ...updates } : null));
      setEditing(false);
      toast({
        title: "Success",
        description: "Profile updated successfully",
        variant: "default",
      });

      if (newProfilePictureId) {
        const {
          data: { publicUrl },
        } = supabase.storage.from("avatars").getPublicUrl(newProfilePictureId);
        setProfilePictureUrl(publicUrl);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error updating profile",
        variant: "destructive",
      });
      console.error("Error:", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!profile) {
    return <div>Error loading profile</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader heading="Profile" text="Manage your account settings" />

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex items-center gap-6">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profilePictureUrl || undefined} />
              <AvatarFallback>
                {profile.display_name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {editing && (
              <FileUpload
                maxFiles={1}
                allowedTypes={["image/*"]}
                onUploadCompleteAction={(fileIds) => {
                  if (fileIds.length > 0) {
                    setNewProfilePictureId(fileIds[0]);
                  }
                }}
              />
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            {editing ? (
              <Input
                id="name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            ) : (
              <p className="text-foreground">{profile.display_name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Email</Label>
            <p className="text-foreground">{profile.user_id}</p>
          </div>

          <div className="space-y-2">
            <Label>Role</Label>
            <p className="capitalize text-foreground">{profile.user_role}</p>
          </div>

          <div className="flex gap-2">
            {editing ? (
              <>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditing(false)}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <Button type="button" onClick={() => setEditing(true)}>
                Edit Profile
              </Button>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
}
