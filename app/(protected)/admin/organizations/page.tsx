'use client'

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { notifications } from "@/utils/notifications"
import { FileUpload } from "@/components/file-upload"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/components/ui/avatar"
import { Building2, Pencil, Trash2 } from "lucide-react"

type Organization = {
    id: string
    name: string
    domain: string
    logo_file_id: string | null
    created_at: string
    stats: {
        agents: number
        customers: number
        tickets: number
    }
}

export default function OrganizationsPage() {
    const supabase = createClient()
    const [organizations, setOrganizations] = useState<Organization[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [showCreateDialog, setShowCreateDialog] = useState(false)
    const [editingOrg, setEditingOrg] = useState<Organization | null>(null)
    const [name, setName] = useState("")
    const [domain, setDomain] = useState("")
    const [logoFileId, setLogoFileId] = useState<string | null>(null)
    const [logoUrl, setLogoUrl] = useState<string | null>(null)
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        fetchOrganizations()
    }, [])

    const fetchOrganizations = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            // Get all organizations
            const { data: orgs, error } = await supabase
                .from('organizations')
                .select('*')
                .order('name')

            if (error) throw error

            // Get stats for each organization
            const orgsWithStats = await Promise.all(orgs.map(async (org) => {
                const [
                    { count: agentsCount },
                    { count: customersCount },
                    { count: ticketsCount }
                ] = await Promise.all([
                    // Count agents
                    supabase
                        .from('profiles')
                        .select('*', { count: 'exact', head: true })
                        .eq('organization_id', org.id)
                        .eq('role', 'agent'),

                    // Count customers
                    supabase
                        .from('profiles')
                        .select('*', { count: 'exact', head: true })
                        .eq('organization_id', org.id)
                        .eq('role', 'customer'),

                    // Count tickets
                    supabase
                        .from('tickets')
                        .select('*', { count: 'exact', head: true })
                        .eq('organization_id', org.id)
                ])

                // Get logo URL if exists
                let logoUrl = null
                if (org.logo_file_id) {
                    const { data: fileData } = await supabase
                        .from('files')
                        .select('storage_path')
                        .eq('id', org.logo_file_id)
                        .single()

                    if (fileData) {
                        const { data } = supabase.storage
                            .from('attachments')
                            .getPublicUrl(fileData.storage_path)
                        logoUrl = data.publicUrl
                    }
                }

                return {
                    ...org,
                    logoUrl,
                    stats: {
                        agents: agentsCount || 0,
                        customers: customersCount || 0,
                        tickets: ticketsCount || 0
                    }
                }
            }))

            setOrganizations(orgsWithStats)
        } catch (error) {
            console.error('Error:', error)
            notifications.error('Failed to load organizations')
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async () => {
        if (!name.trim() || !domain.trim()) {
            notifications.error('Please fill in all required fields')
            return
        }

        setSubmitting(true)

        try {
            if (editingOrg) {
                // Update organization
                const { error } = await supabase
                    .from('organizations')
                    .update({
                        name,
                        domain,
                        logo_file_id: logoFileId
                    })
                    .eq('id', editingOrg.id)

                if (error) throw error

                notifications.success('Organization updated successfully')
            } else {
                // Create new organization
                const { error } = await supabase
                    .from('organizations')
                    .insert([
                        {
                            name,
                            domain,
                            logo_file_id: logoFileId
                        }
                    ])

                if (error) throw error

                notifications.success('Organization created successfully')
            }

            setShowCreateDialog(false)
            setEditingOrg(null)
            resetForm()
            await fetchOrganizations()
        } catch (error) {
            console.error('Error:', error)
            notifications.error(editingOrg ? 'Failed to update organization' : 'Failed to create organization')
        } finally {
            setSubmitting(false)
        }
    }

    const handleEdit = (org: Organization) => {
        setEditingOrg(org)
        setName(org.name)
        setDomain(org.domain)
        setLogoFileId(org.logo_file_id)
        setLogoUrl(org.logoUrl)
        setShowCreateDialog(true)
    }

    const handleDelete = async (orgId: string) => {
        try {
            const { error } = await supabase
                .from('organizations')
                .delete()
                .eq('id', orgId)

            if (error) throw error

            notifications.success('Organization deleted successfully')
            await fetchOrganizations()
        } catch (error) {
            console.error('Error:', error)
            notifications.error('Failed to delete organization')
        }
    }

    const resetForm = () => {
        setName("")
        setDomain("")
        setLogoFileId(null)
        setLogoUrl(null)
    }

    const filteredOrganizations = organizations.filter(org =>
        org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        org.domain.toLowerCase().includes(searchQuery.toLowerCase())
    )

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Organizations</h1>
                    <p className="text-muted-foreground">
                        Manage organizations and their settings
                    </p>
                </div>
                <Dialog open={showCreateDialog} onOpenChange={(open) => {
                    setShowCreateDialog(open)
                    if (!open) {
                        setEditingOrg(null)
                        resetForm()
                    }
                }}>
                    <DialogTrigger asChild>
                        <Button>
                            <Building2 className="h-4 w-4 mr-2" />
                            Create Organization
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>
                                {editingOrg ? 'Edit Organization' : 'Create Organization'}
                            </DialogTitle>
                            <DialogDescription>
                                {editingOrg
                                    ? 'Update the organization details.'
                                    : 'Create a new organization in the system.'}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
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
                                    placeholder="Enter organization name"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Domain</label>
                                <Input
                                    value={domain}
                                    onChange={(e) => setDomain(e.target.value)}
                                    placeholder="company.com"
                                />
                                <p className="text-sm text-muted-foreground">
                                    Users with this email domain will be automatically associated with this organization
                                </p>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                onClick={handleSubmit}
                                disabled={submitting || !name.trim() || !domain.trim()}
                            >
                                {submitting ? "Saving..." : (editingOrg ? "Save Changes" : "Create")}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <div className="p-4">
                    <Input
                        placeholder="Search organizations..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="max-w-sm"
                    />
                </div>

                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Organization</TableHead>
                            <TableHead>Domain</TableHead>
                            <TableHead>Agents</TableHead>
                            <TableHead>Customers</TableHead>
                            <TableHead>Tickets</TableHead>
                            <TableHead className="w-[100px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredOrganizations.map((org) => (
                            <TableRow key={org.id}>
                                <TableCell className="flex items-center gap-3">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={org.logoUrl || undefined} />
                                        <AvatarFallback>
                                            {org.name[0].toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    {org.name}
                                </TableCell>
                                <TableCell>{org.domain}</TableCell>
                                <TableCell>{org.stats.agents}</TableCell>
                                <TableCell>{org.stats.customers}</TableCell>
                                <TableCell>{org.stats.tickets}</TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleEdit(org)}
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="hover:text-destructive"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Delete Organization</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Are you sure you want to delete this organization? This action cannot be undone.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction
                                                        onClick={() => handleDelete(org.id)}
                                                    >
                                                        Delete
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>
        </div>
    )
} 