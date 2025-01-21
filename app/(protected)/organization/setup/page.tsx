'use client'

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { notifications } from "@/utils/notifications"
import { FileUpload } from "@/components/file-upload"
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/components/ui/avatar"

type Organization = {
    id: string
    name: string
    domain: string
    logo_file_id: string | null
}

export default function OrganizationSetupPage() {
    const router = useRouter()
    const supabase = createClient()
    const [name, setName] = useState("")
    const [domain, setDomain] = useState("")
    const [logoFileId, setLogoFileId] = useState<string | null>(null)
    const [logoUrl, setLogoUrl] = useState<string | null>(null)
    const [submitting, setSubmitting] = useState(false)
    const [userEmail, setUserEmail] = useState<string | null>(null)

    useEffect(() => {
        // Get user's email to pre-fill domain
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user?.email) {
                setUserEmail(user.email)
                // Extract domain from email and pre-fill
                const emailDomain = user.email.split('@')[1]
                setDomain(emailDomain)
            }
        })
    }, [])

    const handleSubmit = async () => {
        if (!name.trim() || !domain.trim()) {
            notifications.error('Please fill in all required fields')
            return
        }

        setSubmitting(true)

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('No user found')

            // Create organization
            const { data: org, error: orgError } = await supabase
                .from('organizations')
                .insert([
                    {
                        name,
                        domain,
                        logo_file_id: logoFileId
                    }
                ])
                .select()
                .single()

            if (orgError) throw orgError

            // Update user's profile with organization
            const { error: profileError } = await supabase
                .from('profiles')
                .update({ organization_id: org.id })
                .eq('id', user.id)

            if (profileError) throw profileError

            notifications.success('Organization setup complete')

            // Route to appropriate dashboard
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single()

            if (profile?.role === 'admin') {
                router.push('/admin/dashboard')
            } else {
                router.push('/agent/dashboard')
            }

        } catch (error) {
            console.error('Error:', error)
            notifications.error('Failed to setup organization')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="container max-w-2xl py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Organization Setup</h1>
                <p className="text-muted-foreground">
                    Complete your organization profile to get started
                </p>
            </div>

            <Card className="p-6">
                <div className="space-y-6">
                    <div className="flex items-center gap-6">
                        <Avatar className="h-20 w-20">
                            <AvatarImage src={logoUrl || undefined} />
                            <AvatarFallback>
                                {name ? name[0].toUpperCase() : 'O'}
                            </AvatarFallback>
                        </Avatar>
                        <FileUpload
                            maxFiles={1}
                            allowedTypes={['image/*']}
                            onUploadComplete={(fileIds) => {
                                if (fileIds.length > 0) {
                                    setLogoFileId(fileIds[0])
                                    // Get the URL for preview
                                    supabase
                                        .from('files')
                                        .select('storage_path')
                                        .eq('id', fileIds[0])
                                        .single()
                                        .then(({ data }) => {
                                            if (data) {
                                                const { data: { publicUrl } } = supabase.storage
                                                    .from('attachments')
                                                    .getPublicUrl(data.storage_path)
                                                setLogoUrl(publicUrl)
                                            }
                                        })
                                }
                            }}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Organization Name</label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter your organization name"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Domain</label>
                        <Input
                            value={domain}
                            onChange={(e) => setDomain(e.target.value)}
                            placeholder="company.com"
                            required
                        />
                        <p className="text-sm text-muted-foreground">
                            This domain will be used to automatically associate new users with your organization
                        </p>
                    </div>

                    <div className="flex justify-end">
                        <Button
                            onClick={handleSubmit}
                            disabled={submitting || !name.trim() || !domain.trim()}
                        >
                            {submitting ? "Setting up..." : "Complete Setup"}
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    )
}
