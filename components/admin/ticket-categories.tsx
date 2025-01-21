'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface Category {
    id: string;
    name: string;
    description: string | null;
    color: string;
    parent_id: string | null;
}

interface Tag {
    id: string;
    name: string;
    description: string | null;
    color: string;
}

export function TicketCategories() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [tags, setTags] = useState<Tag[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingCategory, setEditingCategory] = useState<string | null>(null);
    const [editingTag, setEditingTag] = useState<string | null>(null);
    const [showCategoryDialog, setShowCategoryDialog] = useState(false);
    const [showTagDialog, setShowTagDialog] = useState(false);
    const [categoryForm, setCategoryForm] = useState({
        name: '',
        description: '',
        color: '#94a3b8',
        parent_id: null as string | null
    });
    const [tagForm, setTagForm] = useState({
        name: '',
        description: '',
        color: '#94a3b8'
    });

    const supabase = createClient();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [categoriesResponse, tagsResponse] = await Promise.all([
                supabase.from('ticket_categories').select('*').order('name'),
                supabase.from('ticket_tags').select('*').order('name')
            ]);

            if (categoriesResponse.error) throw categoriesResponse.error;
            if (tagsResponse.error) throw tagsResponse.error;

            setCategories(categoriesResponse.data);
            setTags(tagsResponse.data);
        } catch (error) {
            toast.error('Failed to fetch data');
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCategorySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data, error } = editingCategory
                ? await supabase
                    .from('ticket_categories')
                    .update(categoryForm)
                    .eq('id', editingCategory)
                    .select()
                : await supabase
                    .from('ticket_categories')
                    .insert([categoryForm])
                    .select();

            if (error) throw error;

            toast.success(editingCategory ? 'Category updated' : 'Category created');
            setEditingCategory(null);
            setCategoryForm({
                name: '',
                description: '',
                color: '#94a3b8',
                parent_id: null
            });
            setShowCategoryDialog(false);
            fetchData();
        } catch (error) {
            toast.error(editingCategory ? 'Failed to update category' : 'Failed to create category');
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleTagSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data, error } = editingTag
                ? await supabase
                    .from('ticket_tags')
                    .update(tagForm)
                    .eq('id', editingTag)
                    .select()
                : await supabase
                    .from('ticket_tags')
                    .insert([tagForm])
                    .select();

            if (error) throw error;

            toast.success(editingTag ? 'Tag updated' : 'Tag created');
            setEditingTag(null);
            setTagForm({
                name: '',
                description: '',
                color: '#94a3b8'
            });
            setShowTagDialog(false);
            fetchData();
        } catch (error) {
            toast.error(editingTag ? 'Failed to update tag' : 'Failed to create tag');
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEditCategory = (category: Category) => {
        setEditingCategory(category.id);
        setCategoryForm({
            name: category.name,
            description: category.description || '',
            color: category.color,
            parent_id: category.parent_id
        });
        setShowCategoryDialog(true);
    };

    const handleEditTag = (tag: Tag) => {
        setEditingTag(tag.id);
        setTagForm({
            name: tag.name,
            description: tag.description || '',
            color: tag.color
        });
        setShowTagDialog(true);
    };

    const handleDeleteCategory = async (id: string) => {
        try {
            const { error } = await supabase
                .from('ticket_categories')
                .delete()
                .eq('id', id);

            if (error) throw error;

            toast.success('Category deleted');
            fetchData();
        } catch (error) {
            toast.error('Failed to delete category');
            console.error('Error:', error);
        }
    };

    const handleDeleteTag = async (id: string) => {
        try {
            const { error } = await supabase
                .from('ticket_tags')
                .delete()
                .eq('id', id);

            if (error) throw error;

            toast.success('Tag deleted');
            fetchData();
        } catch (error) {
            toast.error('Failed to delete tag');
            console.error('Error:', error);
        }
    };

    return (
        <Tabs defaultValue="categories" className="space-y-4">
            <TabsList>
                <TabsTrigger value="categories">Categories</TabsTrigger>
                <TabsTrigger value="tags">Tags</TabsTrigger>
            </TabsList>

            <TabsContent value="categories">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Ticket Categories</CardTitle>
                            <CardDescription>Manage ticket categories for your organization</CardDescription>
                        </div>
                        <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
                            <DialogTrigger asChild>
                                <Button>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Category
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>{editingCategory ? 'Edit Category' : 'New Category'}</DialogTitle>
                                    <DialogDescription>
                                        {editingCategory ? 'Update the category details' : 'Create a new ticket category'}
                                    </DialogDescription>
                                </DialogHeader>
                                <form onSubmit={handleCategorySubmit} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Name</Label>
                                        <Input
                                            id="name"
                                            value={categoryForm.name}
                                            onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="description">Description</Label>
                                        <Input
                                            id="description"
                                            value={categoryForm.description}
                                            onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="color">Color</Label>
                                        <Input
                                            id="color"
                                            type="color"
                                            value={categoryForm.color}
                                            onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="parent">Parent Category (Optional)</Label>
                                        <select
                                            id="parent"
                                            value={categoryForm.parent_id || ''}
                                            onChange={(e) => setCategoryForm({ ...categoryForm, parent_id: e.target.value || null })}
                                            className="w-full rounded-md border border-input bg-background px-3 py-2"
                                        >
                                            <option value="">None</option>
                                            {categories.map((cat) => (
                                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <DialogFooter>
                                        <Button type="submit" disabled={loading}>
                                            {editingCategory ? 'Update Category' : 'Create Category'}
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Color</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {categories.map((category) => (
                                    <TableRow key={category.id}>
                                        <TableCell className="font-medium">{category.name}</TableCell>
                                        <TableCell>{category.description}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="h-4 w-4 rounded"
                                                    style={{ backgroundColor: category.color }}
                                                />
                                                {category.color}
                                            </div>
                                        </TableCell>
                                        <TableCell className="flex gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleEditCategory(category)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDeleteCategory(category.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="tags">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Ticket Tags</CardTitle>
                            <CardDescription>Manage ticket tags for your organization</CardDescription>
                        </div>
                        <Dialog open={showTagDialog} onOpenChange={setShowTagDialog}>
                            <DialogTrigger asChild>
                                <Button>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Tag
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>{editingTag ? 'Edit Tag' : 'New Tag'}</DialogTitle>
                                    <DialogDescription>
                                        {editingTag ? 'Update the tag details' : 'Create a new ticket tag'}
                                    </DialogDescription>
                                </DialogHeader>
                                <form onSubmit={handleTagSubmit} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Name</Label>
                                        <Input
                                            id="name"
                                            value={tagForm.name}
                                            onChange={(e) => setTagForm({ ...tagForm, name: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="description">Description</Label>
                                        <Input
                                            id="description"
                                            value={tagForm.description}
                                            onChange={(e) => setTagForm({ ...tagForm, description: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="color">Color</Label>
                                        <Input
                                            id="color"
                                            type="color"
                                            value={tagForm.color}
                                            onChange={(e) => setTagForm({ ...tagForm, color: e.target.value })}
                                        />
                                    </div>
                                    <DialogFooter>
                                        <Button type="submit" disabled={loading}>
                                            {editingTag ? 'Update Tag' : 'Create Tag'}
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Color</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {tags.map((tag) => (
                                    <TableRow key={tag.id}>
                                        <TableCell className="font-medium">{tag.name}</TableCell>
                                        <TableCell>{tag.description}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="h-4 w-4 rounded"
                                                    style={{ backgroundColor: tag.color }}
                                                />
                                                {tag.color}
                                            </div>
                                        </TableCell>
                                        <TableCell className="flex gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleEditTag(tag)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDeleteTag(tag.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    );
} 