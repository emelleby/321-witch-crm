"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Trash2 } from "lucide-react";

type CategoryType = {
  category_id: string;
  category_name: string;
  description: string | null;
  organization_id: string;
  created_at: string;
};

type TagType = {
  tag_id: string;
  tag_name: string;
  description: string | null;
  organization_id: string;
  created_at: string;
};

type CategoryFormData = {
  category_name: string;
  description: string;
};

export default function OrganizationPage() {
  const [categories, setCategories] = useState<CategoryType[]>([]);
  const [tags, setTags] = useState<TagType[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCategory, setEditingCategory] = useState<CategoryType | null>(
    null
  );
  const [categoryForm, setCategoryForm] = useState<CategoryFormData>({
    category_name: "",
    description: "",
  });
  const [editingTag, setEditingTag] = useState<TagType | null>(null);
  const [tagForm, setTagForm] = useState<{
    tag_name: string;
    description: string;
  }>({
    tag_name: "",
    description: "",
  });
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    fetchOrganizationData();
  }, []);

  const fetchOrganizationData = async () => {
    try {
      setLoading(true);

      const [categoriesResult, tagsResult] = await Promise.all([
        supabase.from("ticket_categories").select("*").order("category_name"),
        supabase.from("organization_tags").select("*").order("tag_name"),
      ]);

      if (categoriesResult.error) throw categoriesResult.error;
      if (tagsResult.error) throw tagsResult.error;

      setCategories(categoriesResult.data);
      setTags(tagsResult.data);
    } catch (error) {
      console.error("Error fetching organization data:", error);
      toast({
        title: "Error",
        description: "Failed to load organization data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase
        .from("ticket_categories")
        .insert([
          {
            category_name: categoryForm.category_name,
            description: categoryForm.description || null,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      setCategories([...categories, data]);
      setCategoryForm({ category_name: "", description: "" });
      toast({
        title: "Success",
        description: "Category created successfully",
      });
    } catch (error) {
      console.error("Error creating category:", error);
      toast({
        title: "Error",
        description: "Failed to create category",
        variant: "destructive",
      });
    }
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;

    try {
      const { data, error } = await supabase
        .from("ticket_categories")
        .update({
          category_name: categoryForm.category_name,
          description: categoryForm.description || null,
        })
        .eq("category_id", editingCategory.category_id)
        .select()
        .single();

      if (error) throw error;

      setCategories(
        categories.map((cat) =>
          cat.category_id === editingCategory.category_id ? data : cat
        )
      );
      setEditingCategory(null);
      setCategoryForm({ category_name: "", description: "" });
      toast({
        title: "Success",
        description: "Category updated successfully",
      });
    } catch (error) {
      console.error("Error updating category:", error);
      toast({
        title: "Error",
        description: "Failed to update category",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm("Are you sure you want to delete this category?")) return;

    try {
      const { error } = await supabase
        .from("ticket_categories")
        .delete()
        .eq("category_id", categoryId);

      if (error) throw error;

      setCategories(categories.filter((cat) => cat.category_id !== categoryId));
      toast({
        title: "Success",
        description: "Category deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting category:", error);
      toast({
        title: "Error",
        description: "Failed to delete category",
        variant: "destructive",
      });
    }
  };

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase
        .from("organization_tags")
        .insert([
          {
            tag_name: tagForm.tag_name,
            description: tagForm.description || null,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      setTags([...tags, data]);
      setTagForm({ tag_name: "", description: "" });
      toast({
        title: "Success",
        description: "Tag created successfully",
      });
    } catch (error) {
      console.error("Error creating tag:", error);
      toast({
        title: "Error",
        description: "Failed to create tag",
        variant: "destructive",
      });
    }
  };

  const handleUpdateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTag) return;

    try {
      const { data, error } = await supabase
        .from("organization_tags")
        .update({
          tag_name: tagForm.tag_name,
          description: tagForm.description || null,
        })
        .eq("tag_id", editingTag.tag_id)
        .select()
        .single();

      if (error) throw error;

      setTags(
        tags.map((tag) => (tag.tag_id === editingTag.tag_id ? data : tag))
      );
      setEditingTag(null);
      setTagForm({ tag_name: "", description: "" });
      toast({
        title: "Success",
        description: "Tag updated successfully",
      });
    } catch (error) {
      console.error("Error updating tag:", error);
      toast({
        title: "Error",
        description: "Failed to update tag",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    if (!confirm("Are you sure you want to delete this tag?")) return;

    try {
      const { error } = await supabase
        .from("organization_tags")
        .delete()
        .eq("tag_id", tagId);

      if (error) throw error;

      setTags(tags.filter((tag) => tag.tag_id !== tagId));
      toast({
        title: "Success",
        description: "Tag deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting tag:", error);
      toast({
        title: "Error",
        description: "Failed to delete tag",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">
          Organization Settings
        </h1>
      </div>

      <Tabs defaultValue="categories" className="space-y-4">
        <TabsList>
          <TabsTrigger value="categories" data-testid="categories-tab">
            Categories
          </TabsTrigger>
          <TabsTrigger value="tags" data-testid="tags-tab">
            Tags
          </TabsTrigger>
          <TabsTrigger value="settings" data-testid="settings-tab">
            General Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Ticket Categories</CardTitle>
              <Dialog>
                <DialogTrigger asChild>
                  <Button data-testid="create-category-button">
                    Create Category
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingCategory
                        ? "Edit Category"
                        : "Create New Category"}
                    </DialogTitle>
                  </DialogHeader>
                  <form
                    onSubmit={
                      editingCategory
                        ? handleUpdateCategory
                        : handleCreateCategory
                    }
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="category_name">Category Name</Label>
                      <Input
                        id="category_name"
                        value={categoryForm.category_name}
                        onChange={(e) =>
                          setCategoryForm((prev) => ({
                            ...prev,
                            category_name: e.target.value,
                          }))
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={categoryForm.description}
                        onChange={(e) =>
                          setCategoryForm((prev) => ({
                            ...prev,
                            description: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <Button type="submit" data-testid="submit-category-button">
                      {editingCategory ? "Update" : "Create"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div>Loading categories...</div>
              ) : (
                <div className="space-y-4">
                  {categories.map((category) => (
                    <div
                      key={category.category_id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                      data-testid={`category-${category.category_id}`}
                    >
                      <div>
                        <h3 className="font-medium">
                          {category.category_name}
                        </h3>
                        {category.description && (
                          <p className="text-sm text-gray-500">
                            {category.description}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingCategory(category);
                            setCategoryForm({
                              category_name: category.category_name,
                              description: category.description || "",
                            });
                          }}
                          data-testid={`edit-category-${category.category_id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            handleDeleteCategory(category.category_id)
                          }
                          data-testid={`delete-category-${category.category_id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tags" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Organization Tags</CardTitle>
              <Dialog>
                <DialogTrigger asChild>
                  <Button data-testid="create-tag-button">Create Tag</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingTag ? "Edit Tag" : "Create New Tag"}
                    </DialogTitle>
                  </DialogHeader>
                  <form
                    onSubmit={editingTag ? handleUpdateTag : handleCreateTag}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="tag_name">Tag Name</Label>
                      <Input
                        id="tag_name"
                        value={tagForm.tag_name}
                        onChange={(e) =>
                          setTagForm((prev) => ({
                            ...prev,
                            tag_name: e.target.value,
                          }))
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tag_description">Description</Label>
                      <Textarea
                        id="tag_description"
                        value={tagForm.description}
                        onChange={(e) =>
                          setTagForm((prev) => ({
                            ...prev,
                            description: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <Button type="submit" data-testid="submit-tag-button">
                      {editingTag ? "Update" : "Create"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div>Loading tags...</div>
              ) : (
                <div className="space-y-4">
                  {tags.map((tag) => (
                    <div
                      key={tag.tag_id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                      data-testid={`tag-${tag.tag_id}`}
                    >
                      <div>
                        <h3 className="font-medium">{tag.tag_name}</h3>
                        {tag.description && (
                          <p className="text-sm text-gray-500">
                            {tag.description}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingTag(tag);
                            setTagForm({
                              tag_name: tag.tag_name,
                              description: tag.description || "",
                            });
                          }}
                          data-testid={`edit-tag-${tag.tag_id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteTag(tag.tag_id)}
                          data-testid={`delete-tag-${tag.tag_id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Organization settings UI will go here */}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
