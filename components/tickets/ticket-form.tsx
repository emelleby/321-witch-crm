'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card } from '@/components/ui/card'

interface Template {
    id: string
    name: string
    subject: string
    content: string
    priority: 'low' | 'normal' | 'high'
    category_ids: string[]
    tag_ids: string[]
}

interface TicketFormProps {
    templates: Template[]
}

export function TicketForm({ templates }: TicketFormProps) {
    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
    const [subject, setSubject] = useState('')
    const [content, setContent] = useState('')
    const [priority, setPriority] = useState<'low' | 'normal' | 'high'>('normal')

    const handleTemplateSelect = (templateId: string) => {
        const template = templates.find(t => t.id === templateId)
        if (template) {
            setSelectedTemplate(template)
            setSubject(template.subject)
            setContent(template.content)
            setPriority(template.priority)
        }
    }

    return (
        <div className="max-w-2xl mx-auto py-8">
            <Card className="p-6">
                <h1 className="text-2xl font-bold mb-6">Create New Ticket</h1>
                
                {templates.length > 0 && (
                    <div className="mb-6">
                        <Label>Template</Label>
                        <Select onValueChange={handleTemplateSelect}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a template" />
                            </SelectTrigger>
                            <SelectContent>
                                {templates.map(template => (
                                    <SelectItem key={template.id} value={template.id}>
                                        {template.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                <div className="space-y-4">
                    <div>
                        <Label htmlFor="subject">Subject</Label>
                        <Input
                            id="subject"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder="Enter ticket subject"
                        />
                    </div>

                    <div>
                        <Label htmlFor="content">Description</Label>
                        <Textarea
                            id="content"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Describe your issue"
                            rows={6}
                        />
                    </div>

                    <div>
                        <Label htmlFor="priority">Priority</Label>
                        <Select value={priority} onValueChange={(value: 'low' | 'normal' | 'high') => setPriority(value)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select priority" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="normal">Normal</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <Button className="w-full">Submit Ticket</Button>
                </div>
            </Card>
        </div>
    )
} 