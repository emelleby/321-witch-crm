"use client";

import { useCallback, useEffect, useState } from "react";

import { FileUpload } from "@/components/file-upload";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Database } from "@/database.types";
import { useToast } from "@/hooks/use-toast";
import { createBrowserSupabaseClient } from "@/utils/supabase/client";

type Organization = Database["public"]["Tables"]["organizations"]["Row"];
type Profile = Database["public"]["Tables"]["user_profiles"]["Row"];
type ProfileUpdates = Partial<Profile>;

export default function ProfilePage() {
  const supabase = createBrowserSupabaseClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState("");
  const [saving, setSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [newProfilePictureId, setNewProfilePictureId] = useState<string | null>(
    null
  );
  const { toast } = useToast();

  const fetchProfile = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData, error: profileError } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (profileError) throw profileError;

      if (profileData) {
        setProfile(profileData);
        setFullName(profileData.display_name || "");

        if (profileData.organization_id) {
          const { data: orgData, error: orgError } = await supabase
            .from("organizations")
            .select("*")
            .eq("organization_id", profileData.organization_id)
            .single();

          if (orgError) throw orgError;
          setOrganization(orgData);
        }

        if (profileData.avatar_file_id) {
          const { data: fileData, error: fileError } = await supabase
            .from("uploaded_files")
            .select("storage_path")
            .eq("file_id", profileData.avatar_file_id)
            .single();

          if (fileError) throw fileError;

          const storagePath = fileData?.storage_path;
          if (storagePath && typeof storagePath === "string") {
            try {
              const { data } = await supabase.storage
                .from("public")
                .createSignedUrl(storagePath, 3600);

              if (data) {
                setAvatarUrl(data.signedUrl);
              }
            } catch (error) {
              console.error("Error creating signed URL:", error);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [supabase, toast]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updates: ProfileUpdates = {
        display_name: fullName.trim(),
      };

      const { error } = await supabase
        .from("user_profiles")
        .update(updates)
        .eq("user_id", profile?.user_id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
      await fetchProfile();
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (fileIds: string[]) => {
    if (!fileIds.length || !profile) return;

    try {
      const updates: ProfileUpdates = {
        avatar_file_id: fileIds[0],
      };

      const { error } = await supabase
        .from("user_profiles")
        .update(updates)
        .eq("user_id", profile.user_id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Avatar updated successfully",
      });
      await fetchProfile();
    } catch (error) {
      console.error("Error updating avatar:", error);
      toast({
        title: "Error",
        description: "Failed to update avatar",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Profile not found</h2>
          <p className="text-muted-foreground">
            Please try refreshing the page
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground">Manage your account settings</p>
      </div>

      <Card className="p-6">
        <div className="space-y-6">
          <div className="flex items-center gap-6">
            <Avatar className="h-20 w-20">
              <AvatarImage src={avatarUrl || undefined} />
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
                onUploadComplete={(fileIds) => {
                  if (fileIds.length > 0) {
                    setNewProfilePictureId(fileIds[0]);
                  }
                }}
              />
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Full Name</label>
            {editing ? (
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
              />
            ) : (
              <p className="text-muted-foreground">{profile.display_name}</p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium">Email</p>
            <p className="text-muted-foreground">{profile.user_id}</p>
          </div>

          {organization && (
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">Organization</p>
              <p className="text-muted-foreground">
                {organization.organization_name}
              </p>
            </div>
          )}

          <div className="flex justify-end gap-4">
            {editing ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditing(false);
                    setFullName(profile.display_name || "");
                    setNewProfilePictureId(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={
                    saving ||
                    !fullName.trim() ||
                    fullName === profile.display_name
                  }
                >
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </>
            ) : (
              <Button onClick={() => setEditing(true)}>Edit Profile</Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
