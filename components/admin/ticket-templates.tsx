'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MultiSelect } from '@/components/ui/multi-select';

interface TicketTemplate {
    id: string;
    name: string;
    description: string | null;
    subject: string;
    content: string;
    priority: 'low' | 'normal' | 'high';
    category_ids: string[];
    tag_ids: string[];
}

interface Category {
    id: string;
    name: string;
}

interface Tag {
    id: string;
    name: string;
}

export function TicketTemplates() {
    const supabase = createClient();
    const [templates, setTemplates] = useState<TicketTemplate[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [tags, setTags] = useState<Tag[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [currentTemplate, setCurrentTemplate] = useState<Partial<TicketTemplate>>({
        name: '',
        description: '',
        subject: '',
        content: '',
        priority: 'normal',
        category_ids: [],
        tag_ids: []
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [templatesResponse, categoriesResponse, tagsResponse] = await Promise.all([
                supabase.from('ticket_templates').select('*').order('name'),
                supabase.from('ticket_categories').select('id, name').order('name'),
                supabase.from('ticket_tags').select('id, name').order('name')
            ]);

            if (templatesResponse.error) throw templatesResponse.error;
            if (categoriesResponse.error) throw categoriesResponse.error;
            if (tagsResponse.error) throw tagsResponse.error;

            setTemplates(templatesResponse.data);
            setCategories(categoriesResponse.data);
            setTags(tagsResponse.data);
        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('Failed to load templates');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        try {
            if (!currentTemplate.name || !currentTemplate.subject || !currentTemplate.content) {
                toast.error('Please fill in all required fields');
                return;
            }

            const { error } = isEditing
                ? await supabase
                    .from('ticket_templates')
                    .update({
                        name: currentTemplate.name,
                        description: currentTemplate.description,
                        subject: currentTemplate.subject,
                        content: currentTemplate.content,
                        priority: currentTemplate.priority,
                        category_ids: currentTemplate.category_ids,
                        tag_ids: currentTemplate.tag_ids,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', currentTemplate.id)
                : await supabase
                    .from('ticket_templates')
                    .insert({
                        name: currentTemplate.name,
                        description: currentTemplate.description,
                        subject: currentTemplate.subject,
                        content: currentTemplate.content,
                        priority: currentTemplate.priority,
                        category_ids: currentTemplate.category_ids,
                        tag_ids: currentTemplate.tag_ids
                    });

            if (error) throw error;

            toast.success(`Template ${isEditing ? 'updated' : 'created'} successfully`);
            setCurrentTemplate({
                name: '',
                description: '',
                subject: '',
                content: '',
                priority: 'normal',
                category_ids: [],
                tag_ids: []
            });
            setIsEditing(false);
            fetchData();
        } catch (error) {
            console.error('Error saving template:', error);
            toast.error('Failed to save template');
        }
    };

    const handleEdit = (template: TicketTemplate) => {
        setCurrentTemplate(template);
        setIsEditing(true);
    };

    const handleDelete = async (id: string) => {
        try {
            const { error } = await supabase
                .from('ticket_templates')
                .delete()
                .eq('id', id);

            if (error) throw error;

            toast.success('Template deleted successfully');
            fetchData();
        } catch (error) {
            console.error('Error deleting template:', error);
            toast.error('Failed to delete template');
        }
    };

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Dialog>
                <DialogTrigger asChild>
                    <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        New Template
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{isEditing ? 'Edit Template' : 'Create Template'}</DialogTitle>
                        <DialogDescription>
                            {isEditing
                                ? 'Edit the template details below'
                                : 'Create a new ticket template for your team'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="name">Name</Label>
                            <Input
                                id="name"
                                value={currentTemplate.name}
                                onChange={(e) =>
                                    setCurrentTemplate({ ...currentTemplate, name: e.target.value })
                                }
                            />
                        </div>

                        <div>
                            <Label htmlFor="description">Description</Label>
                            <Input
                                id="description"
                                value={currentTemplate.description || ''}
                                onChange={(e) =>
                                    setCurrentTemplate({ ...currentTemplate, description: e.target.value })
                                }
                            />
                        </div>

                        <div>
                            <Label htmlFor="subject">Subject</Label>
                            <Input
                                id="subject"
                                value={currentTemplate.subject}
                                onChange={(e) =>
                                    setCurrentTemplate({ ...currentTemplate, subject: e.target.value })
                                }
                            />
                        </div>

                        <div>
                            <Label htmlFor="content">Content</Label>
                            <Textarea
                                id="content"
                                value={currentTemplate.content}
                                onChange={(e) =>
                                    setCurrentTemplate({ ...currentTemplate, content: e.target.value })
                                }
                            />
                        </div>

                        <div>
                            <Label htmlFor="priority">Priority</Label>
                            <Select
                                value={currentTemplate.priority}
                                onValueChange={(value) =>
                                    setCurrentTemplate({ ...currentTemplate, priority: value as 'low' | 'normal' | 'high' })
                                }
                            >
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

                        <div>
                            <Label>Categories</Label>
                            <MultiSelect
                                options={categories.map((cat) => ({ value: cat.id, label: cat.name }))}
                                selected={currentTemplate.category_ids || []}
                                onChange={(values: string[]) =>
                                    setCurrentTemplate({ ...currentTemplate, category_ids: values })
                                }
                            />
                        </div>

                        <div>
                            <Label>Tags</Label>
                            <MultiSelect
                                options={tags.map((tag) => ({ value: tag.id, label: tag.name }))}
                                selected={currentTemplate.tag_ids || []}
                                onChange={(values: string[]) =>
                                    setCurrentTemplate({ ...currentTemplate, tag_ids: values })
                                }
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button onClick={handleSubmit}>
                            {isEditing ? 'Update Template' : 'Create Template'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="grid gap-4">
                {templates.length === 0 ? (
                    <Card className="p-6 text-center text-muted-foreground">
                        No templates found
                    </Card>
                ) : (
                    templates.map((template) => (
                        <Card key={template.id} className="p-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <h3 className="font-semibold">{template.name}</h3>
                                    {template.description && (
                                        <p className="text-sm text-muted-foreground">
                                            {template.description}
                                        </p>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleEdit(template)}
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDelete(template.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
} 