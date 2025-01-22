'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { notifications } from '@/utils/notifications';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { FileUpload } from '@/components/file-upload';

type Profile = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  email: string;
  role: string;
};

export default function AgentProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState('');
  const [newProfilePictureId, setNewProfilePictureId] = useState<string | null>(null);
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const fetchProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profile) {
        setProfile(profile);
        setNewName(profile.full_name);
        if (profile.avatar_url) {
          const {
            data: { publicUrl },
          } = supabase.storage.from('avatars').getPublicUrl(profile.avatar_url);
          setProfilePictureUrl(publicUrl);
        }
      }

      setLoading(false);
    };

    fetchProfile();
  }, []);

  const handleSave = async () => {
    if (!profile) return;

    try {
      const updates: { full_name: string; avatar_url?: string } = {
        full_name: newName,
      };

      if (newProfilePictureId) {
        updates.avatar_url = newProfilePictureId;
      }

      const { error } = await supabase.from('profiles').update(updates).eq('id', profile.id);

      if (error) throw error;

      setProfile({ ...profile, ...updates });
      setEditing(false);
      notifications.success('Profile updated successfully');

      if (newProfilePictureId) {
        const {
          data: { publicUrl },
        } = supabase.storage.from('avatars').getPublicUrl(newProfilePictureId);
        setProfilePictureUrl(publicUrl);
      }
    } catch (error) {
      notifications.error('Error updating profile');
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
      <PageHeader heading="Profile" description="Manage your account settings" />

      <Card className="p-6">
        <div className="space-y-6">
          <div className="flex items-center gap-6">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profilePictureUrl || undefined} />
              <AvatarFallback>
                {profile.full_name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {editing && (
              <FileUpload
                maxFiles={1}
                allowedTypes={['image/*']}
                onUploadComplete={(fileIds) => {
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
              <Input id="name" value={newName} onChange={(e) => setNewName(e.target.value)} />
            ) : (
              <p className="text-foreground">{profile.full_name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Email</Label>
            <p className="text-foreground">{profile.email}</p>
          </div>

          <div className="space-y-2">
            <Label>Role</Label>
            <p className="capitalize text-foreground">{profile.role}</p>
          </div>

          <div className="flex gap-2">
            {editing ? (
              <>
                <Button onClick={handleSave}>Save Changes</Button>
                <Button variant="outline" onClick={() => setEditing(false)}>
                  Cancel
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
