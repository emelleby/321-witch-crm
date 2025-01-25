"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { createBrowserSupabaseClient } from "@/utils/supabase/client";

interface Category {
  category_id: string;
  category_name: string;
  category_description: string | null;
  display_color: string | null;
  organization_id: string;
  created_at?: string | null;
  updated_at?: string | null;
}

interface Tag {
  tag_id: string;
  tag_name: string;
  tag_description: string | null;
  display_color: string | null;
  organization_id: string;
  created_at?: string | null;
  updated_at?: string | null;
}

const DEFAULT_COLOR = "hsl(var(--accent))";
const COLOR_OPTIONS = [
  { label: "Accent", value: "hsl(var(--accent))" },
  { label: "Primary", value: "hsl(var(--primary))" },
  { label: "Secondary", value: "hsl(var(--secondary))" },
  { label: "Destructive", value: "hsl(var(--destructive))" },
  { label: "Muted", value: "hsl(var(--muted))" },
  { label: "Card", value: "hsl(var(--card))" },
];

export function TicketCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [showTagDialog, setShowTagDialog] = useState(false);
  const [categoryForm, setCategoryForm] = useState({
    category_name: "",
    category_description: "",
    display_color: DEFAULT_COLOR,
    organization_id: "",
  });
  const [tagForm, setTagForm] = useState({
    tag_name: "",
    tag_description: "",
    display_color: DEFAULT_COLOR,
    organization_id: "",
  });

  const supabase = createBrowserSupabaseClient();
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    try {
      const [categoriesResponse, tagsResponse] = await Promise.all([
        supabase.from("ticket_categories").select("*").order("category_name"),
        supabase.from("ticket_tags").select("*").order("tag_name"),
      ]);

      if (categoriesResponse.error) throw categoriesResponse.error;
      if (tagsResponse.error) throw tagsResponse.error;

      setCategories(categoriesResponse.data);
      setTags(tagsResponse.data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [supabase, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = editingCategory
        ? await supabase
            .from("ticket_categories")
            .update(categoryForm)
            .eq("category_id", editingCategory)
            .select()
        : await supabase
            .from("ticket_categories")
            .insert([categoryForm])
            .select();

      if (error) throw error;

      toast({
        title: "Success",
        description: editingCategory ? "Category updated" : "Category created",
        variant: "default",
      });
      setEditingCategory(null);
      setCategoryForm({
        category_name: "",
        category_description: "",
        display_color: DEFAULT_COLOR,
        organization_id: "",
      });
      setShowCategoryDialog(false);
      fetchData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save category",
        variant: "destructive",
      });
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
            .from("ticket_tags")
            .update(tagForm)
            .eq("tag_id", editingTag)
            .select()
        : await supabase.from("ticket_tags").insert([tagForm]).select();

      if (error) throw error;

      toast({
        title: "Success",
        description: editingTag ? "Tag updated" : "Tag created",
        variant: "default",
      });
      setEditingTag(null);
      setTagForm({
        tag_name: "",
        tag_description: "",
        display_color: DEFAULT_COLOR,
        organization_id: "",
      });
      setShowTagDialog(false);
      fetchData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save tag",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category.category_id);
    setCategoryForm({
      category_name: category.category_name,
      category_description: category.category_description || "",
      display_color: category.display_color || DEFAULT_COLOR,
      organization_id: category.organization_id,
    });
    setShowCategoryDialog(true);
  };

  const handleEditTag = (tag: Tag) => {
    setEditingTag(tag.tag_id);
    setTagForm({
      tag_name: tag.tag_name,
      tag_description: tag.tag_description || "",
      display_color: tag.display_color || DEFAULT_COLOR,
      organization_id: tag.organization_id,
    });
    setShowTagDialog(true);
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      const { error } = await supabase
        .from("ticket_categories")
        .delete()
        .eq("category_id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Category deleted",
        variant: "default",
      });
      fetchData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete category",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTag = async (id: string) => {
    try {
      const { error } = await supabase
        .from("ticket_tags")
        .delete()
        .eq("tag_id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Tag deleted",
        variant: "default",
      });
      fetchData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete tag",
        variant: "destructive",
      });
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
              <CardDescription>
                Manage ticket categories for your organization
              </CardDescription>
            </div>
            <Dialog
              open={showCategoryDialog}
              onOpenChange={setShowCategoryDialog}
            >
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Category
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingCategory ? "Edit Category" : "New Category"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingCategory
                      ? "Update the category details"
                      : "Create a new ticket category"}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCategorySubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="category_name">Name</Label>
                    <Input
                      id="category_name"
                      value={categoryForm.category_name}
                      onChange={(e) =>
                        setCategoryForm({
                          ...categoryForm,
                          category_name: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category_description">Description</Label>
                    <Input
                      id="category_description"
                      value={categoryForm.category_description}
                      onChange={(e) =>
                        setCategoryForm({
                          ...categoryForm,
                          category_description: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="display_color">Color</Label>
                    <select
                      id="display_color"
                      value={categoryForm.display_color}
                      onChange={(e) =>
                        setCategoryForm({
                          ...categoryForm,
                          display_color: e.target.value,
                        })
                      }
                      className="w-full rounded-md border border-input bg-background px-3 py-2"
                    >
                      {COLOR_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="organization_id">Organization ID</Label>
                    <Input
                      id="organization_id"
                      value={categoryForm.organization_id}
                      onChange={(e) =>
                        setCategoryForm({
                          ...categoryForm,
                          organization_id: e.target.value,
                        })
                      }
                    />
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={loading}>
                      {editingCategory ? "Update Category" : "Create Category"}
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
                  <TableRow key={category.category_id}>
                    <TableCell className="font-medium">
                      {category.category_name}
                    </TableCell>
                    <TableCell>{category.category_description}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-4 w-4 rounded"
                          style={{
                            backgroundColor:
                              category.display_color || DEFAULT_COLOR,
                          }}
                        />
                        {COLOR_OPTIONS.find(
                          (opt) => opt.value === category.display_color
                        )?.label || "Accent"}
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
                        onClick={() =>
                          handleDeleteCategory(category.category_id)
                        }
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
              <CardDescription>
                Manage ticket tags for your organization
              </CardDescription>
            </div>
            <Dialog open={showTagDialog} onOpenChange={setShowTagDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Tag
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingTag ? "Edit Tag" : "New Tag"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingTag
                      ? "Update the tag details"
                      : "Create a new ticket tag"}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleTagSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="tag_name">Name</Label>
                    <Input
                      id="tag_name"
                      value={tagForm.tag_name}
                      onChange={(e) =>
                        setTagForm({ ...tagForm, tag_name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tag_description">Description</Label>
                    <Input
                      id="tag_description"
                      value={tagForm.tag_description}
                      onChange={(e) =>
                        setTagForm({
                          ...tagForm,
                          tag_description: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="display_color">Color</Label>
                    <select
                      id="display_color"
                      value={tagForm.display_color}
                      onChange={(e) =>
                        setTagForm({
                          ...tagForm,
                          display_color: e.target.value,
                        })
                      }
                      className="w-full rounded-md border border-input bg-background px-3 py-2"
                    >
                      {COLOR_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="organization_id">Organization ID</Label>
                    <Input
                      id="organization_id"
                      value={tagForm.organization_id}
                      onChange={(e) =>
                        setTagForm({
                          ...tagForm,
                          organization_id: e.target.value,
                        })
                      }
                    />
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={loading}>
                      {editingTag ? "Update Tag" : "Create Tag"}
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
                  <TableRow key={tag.tag_id}>
                    <TableCell className="font-medium">
                      {tag.tag_name}
                    </TableCell>
                    <TableCell>{tag.tag_description}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-4 w-4 rounded"
                          style={{
                            backgroundColor: tag.display_color || DEFAULT_COLOR,
                          }}
                        />
                        {COLOR_OPTIONS.find(
                          (opt) => opt.value === tag.display_color
                        )?.label || "Accent"}
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
                        onClick={() => handleDeleteTag(tag.tag_id)}
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
