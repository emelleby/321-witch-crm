'use client'

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useRouter } from "next/navigation"
import { notifications } from "@/utils/notifications"
import { FileUpload } from "@/components/file-upload"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

type Organization = {
    id: string
    name: string
}

export default function NewTicketPage() {
    const router = useRouter()
    const supabase = createClient()
    const [subject, setSubject] = useState("")
    const [description, setDescription] = useState("")
    const [priority, setPriority] = useState<string>("normal")
    const [organizationId, setOrganizationId] = useState<string>("")
    const [organizations, setOrganizations] = useState<Organization[]>([])
    const [fileIds, setFileIds] = useState<string[]>([])
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        fetchOrganizations()
    }, [])

    const fetchOrganizations = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data, error } = await supabase
                .from('organizations')
                .select('id, name')
                .order('name')

            if (error) throw error
            setOrganizations(data)

            // If user belongs to only one organization, select it by default
            if (data.length === 1) {
                setOrganizationId(data[0].id)
            }
        } catch (error) {
            console.error('Error fetching organizations:', error)
        }
    }

    const handleSubmit = async () => {
        if (!subject.trim() || !description.trim()) {
            notifications.error('Please fill in all required fields')
            return
        }

        setSubmitting(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            // Create ticket
            const { data: ticket, error: ticketError } = await supabase
                .from('tickets')
                .insert({
                    subject: subject.trim(),
                    description: description.trim(),
                    priority,
                    creator_id: user.id,
                    organization_id: organizationId || null
                })
                .select()
                .single()

            if (ticketError) throw ticketError

            // Link files to ticket if any
            if (fileIds.length > 0) {
                const { error: filesError } = await supabase
                    .from('ticket_files')
                    .insert(
                        fileIds.map(fileId => ({
                            ticket_id: ticket.id,
                            file_id: fileId
                        }))
                    )

                if (filesError) throw filesError
            }

            notifications.success('Ticket created successfully')
            router.push(`/customer/tickets/${ticket.id}`)
        } catch (error) {
            console.error('Submit error:', error)
            notifications.error('Failed to create ticket')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">New Ticket</h1>
                <Button
                    variant="outline"
                    onClick={() => router.push('/customer/tickets')}
                >
                    Cancel
                </Button>
            </div>

            <Card className="p-6">
                <form className="space-y-4" onSubmit={(e) => {
                    e.preventDefault()
                    handleSubmit()
                }}>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Organization</label>
                        <Select
                            value={organizationId}
                            onValueChange={setOrganizationId}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select an organization" />
                            </SelectTrigger>
                            <SelectContent>
                                {organizations.map((org) => (
                                    <SelectItem key={org.id} value={org.id}>
                                        {org.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Subject *</label>
                        <Input
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder="Brief description of your issue"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Description *</label>
                        <Textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Detailed explanation of your issue"
                            className="min-h-[200px]"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Priority</label>
                        <Select
                            value={priority}
                            onValueChange={setPriority}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="normal">Normal</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Attachments</label>
                        <FileUpload
                            onUploadComplete={setFileIds}
                        />
                    </div>

                    <div className="flex justify-end gap-4">
                        <Button
                            type="submit"
                            disabled={submitting || !subject.trim() || !description.trim()}
                        >
                            {submitting ? "Creating..." : "Create Ticket"}
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    )
} 