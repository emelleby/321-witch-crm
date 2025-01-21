'use client'

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { notifications } from "@/utils/notifications"
import { FileUpload } from "@/components/file-upload"
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/components/ui/avatar"

type Profile = {
    id: string
    full_name: string
    email: string
    organization_id: string | null
    profile_picture_file_id: string | null
    role: 'customer' | 'agent' | 'admin'
}

type Organization = {
    id: string
    name: string
    domain: string
}

export default function ProfilePage() {
    const supabase = createClient()
    const [profile, setProfile] = useState<Profile | null>(null)
    const [organization, setOrganization] = useState<Organization | null>(null)
    const [loading, setLoading] = useState(true)
    const [editing, setEditing] = useState(false)
    const [fullName, setFullName] = useState("")
    const [saving, setSaving] = useState(false)
    const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null)
    const [newProfilePictureId, setNewProfilePictureId] = useState<string | null>(null)

    useEffect(() => {
        fetchProfile()
    }, [])

    const fetchProfile = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            // Get profile data
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single()

            if (profileError) throw profileError

            // Get organization data if any
            if (profileData.organization_id) {
                const { data: orgData, error: orgError } = await supabase
                    .from('organizations')
                    .select('*')
                    .eq('id', profileData.organization_id)
                    .single()

                if (orgError) throw orgError
                setOrganization(orgData)
            }

            // Get profile picture URL if any
            if (profileData.profile_picture_file_id) {
                const { data: fileData } = await supabase
                    .from('files')
                    .select('storage_path')
                    .eq('id', profileData.profile_picture_file_id)
                    .single()

                if (fileData) {
                    const { data } = supabase.storage
                        .from('attachments')
                        .getPublicUrl(fileData.storage_path)
                    setProfilePictureUrl(data.publicUrl)
                }
            }

            setProfile({ ...profileData, email: user.email })
            setFullName(profileData.full_name)
        } catch (error) {
            console.error('Error:', error)
            notifications.error('Failed to load profile')
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        if (!profile) return

        setSaving(true)
        try {
            const updates: any = {
                full_name: fullName.trim()
            }

            if (newProfilePictureId) {
                updates.profile_picture_file_id = newProfilePictureId
            }

            const { error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', profile.id)

            if (error) throw error

            setProfile(prev => prev ? { ...prev, ...updates } : null)
            setEditing(false)
            notifications.success('Profile updated successfully')

            // Refresh profile data to get new picture URL
            fetchProfile()
        } catch (error) {
            console.error('Error:', error)
            notifications.error('Failed to update profile')
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
        )
    }

    if (!profile) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold">Profile not found</h2>
                    <p className="text-muted-foreground">Please try refreshing the page</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
                <p className="text-muted-foreground">
                    Manage your account settings
                </p>
            </div>

            <Card className="p-6">
                <div className="space-y-6">
                    <div className="flex items-center gap-6">
                        <Avatar className="h-20 w-20">
                            <AvatarImage src={profilePictureUrl || undefined} />
                            <AvatarFallback>
                                {profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        {editing && (
                            <FileUpload
                                maxFiles={1}
                                allowedTypes={['image/*']}
                                onUploadComplete={(fileIds) => {
                                    if (fileIds.length > 0) {
                                        setNewProfilePictureId(fileIds[0])
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
                            <p className="text-muted-foreground">{profile.full_name}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Email</label>
                        <p className="text-muted-foreground">{profile.email}</p>
                    </div>

                    {organization && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Organization</label>
                            <p className="text-muted-foreground">{organization.name}</p>
                        </div>
                    )}

                    <div className="flex justify-end gap-4">
                        {editing ? (
                            <>
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setEditing(false)
                                        setFullName(profile.full_name)
                                        setNewProfilePictureId(null)
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleSave}
                                    disabled={saving || !fullName.trim() || fullName === profile.full_name}
                                >
                                    {saving ? "Saving..." : "Save Changes"}
                                </Button>
                            </>
                        ) : (
                            <Button onClick={() => setEditing(true)}>
                                Edit Profile
                            </Button>
                        )}
                    </div>
                </div>
            </Card>
        </div>
    )
} 