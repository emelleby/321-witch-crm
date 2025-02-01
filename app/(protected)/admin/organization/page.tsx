"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Database } from "@/database.types";
import { useToast } from "@/hooks/use-toast";
import { createBrowserSupabaseClient } from "@/utils/supabase/client";
import { Pencil, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type Category = Database["public"]["Tables"]["ticket_categories"]["Row"];
type Tag = Database["public"]["Tables"]["ticket_tags"]["Row"];

type CategoryFormData = {
  category_name: string;
  category_description: string;
  organization_id: string;
};

type TagFormData = {
  tag_name: string;
  tag_description: string;
  organization_id: string;
};

export default function AdminOrganizationPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryForm, setCategoryForm] = useState<CategoryFormData>({
    category_name: "",
    category_description: "",
    organization_id: "",
  });
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [tagForm, setTagForm] = useState<TagFormData>({
    tag_name: "",
    tag_description: "",
    organization_id: "",
  });
  const { toast } = useToast();
  const supabase = createBrowserSupabaseClient();

  const fetchOrganizationData = useCallback(async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userProfile, error: profileError } = await supabase
        .from("user_profiles")
        .select("organization_id")
        .eq("user_id", user.id)
        .single();

      if (profileError || !userProfile?.organization_id) {
        toast({
          title: "Error",
          description: "Failed to get organization information",
          variant: "destructive",
        });
        return;
      }

      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("ticket_categories")
        .select("*")
        .eq("organization_id", userProfile.organization_id)
        .order("category_name");

      if (categoriesError) throw categoriesError;
      setCategories(categoriesData);

      // Fetch tags
      const { data: tagsData, error: tagsError } = await supabase
        .from("ticket_tags")
        .select("*")
        .eq("organization_id", userProfile.organization_id)
        .order("tag_name");

      if (tagsError) throw tagsError;
      setTags(tagsData);
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
  }, [supabase, toast]);

  useEffect(() => {
    fetchOrganizationData();
  }, [fetchOrganizationData]);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to create a category",
          variant: "destructive",
        });
        return;
      }

      // Get user's organization_id
      const { data: userProfile, error: profileError } = await supabase
        .from("user_profiles")
        .select("organization_id")
        .eq("user_id", user.id)
        .single();

      if (profileError || !userProfile?.organization_id) {
        toast({
          title: "Error",
          description: "Failed to get organization information",
          variant: "destructive",
        });
        return;
      }

      const { error: categoryError } = await supabase
        .from("ticket_categories")
        .insert({
          category_name: categoryForm.category_name,
          category_description: categoryForm.category_description || null,
          organization_id: userProfile.organization_id,
        });

      if (categoryError) {
        console.error("Error creating category:", categoryError);
        toast({
          title: "Error",
          description: "Failed to create category",
          variant: "destructive",
        });
        return;
      }

      setCategoryForm({
        category_name: "",
        category_description: "",
        organization_id: "",
      });
      fetchOrganizationData();
      toast({
        title: "Success",
        description: "Category created successfully",
      });
    } catch (error) {
      console.error("Error:", error);
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
      const { error } = await supabase
        .from("ticket_categories")
        .update({
          category_name: categoryForm.category_name,
          category_description: categoryForm.category_description || null,
        })
        .eq("category_id", editingCategory.category_id);

      if (error) throw error;

      setEditingCategory(null);
      setCategoryForm({
        category_name: "",
        category_description: "",
        organization_id: "",
      });
      fetchOrganizationData();
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to create a tag",
          variant: "destructive",
        });
        return;
      }

      // Get user's organization_id
      const { data: userProfile, error: profileError } = await supabase
        .from("user_profiles")
        .select("organization_id")
        .eq("user_id", user.id)
        .single();

      if (profileError || !userProfile?.organization_id) {
        toast({
          title: "Error",
          description: "Failed to get organization information",
          variant: "destructive",
        });
        return;
      }

      const { error: tagError } = await supabase.from("ticket_tags").insert({
        tag_name: tagForm.tag_name,
        tag_description: tagForm.tag_description || null,
        organization_id: userProfile.organization_id,
      });

      if (tagError) throw tagError;

      setTagForm({
        tag_name: "",
        tag_description: "",
        organization_id: "",
      });
      fetchOrganizationData();
      toast({
        title: "Success",
        description: "Tag created successfully",
      });
    } catch (error) {
      console.error("Error:", error);
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
      const { error } = await supabase
        .from("ticket_tags")
        .update({
          tag_name: tagForm.tag_name,
          tag_description: tagForm.tag_description || null,
        })
        .eq("tag_id", editingTag.tag_id);

      if (error) throw error;

      setEditingTag(null);
      setTagForm({
        tag_name: "",
        tag_description: "",
        organization_id: "",
      });
      fetchOrganizationData();
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
        .from("ticket_tags")
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
                      <Label htmlFor="category_description">Description</Label>
                      <Textarea
                        id="category_description"
                        value={categoryForm.category_description}
                        onChange={(e) =>
                          setCategoryForm((prev) => ({
                            ...prev,
                            category_description: e.target.value,
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
                        {category.category_description && (
                          <p className="text-sm text-gray-500">
                            {category.category_description}
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
                              category_description:
                                category.category_description || "",
                              organization_id: category.organization_id,
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
                        value={tagForm.tag_description}
                        onChange={(e) =>
                          setTagForm((prev) => ({
                            ...prev,
                            tag_description: e.target.value,
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
                        {tag.tag_description && (
                          <p className="text-sm text-gray-500">
                            {tag.tag_description}
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
                              tag_description: tag.tag_description || "",
                              organization_id: tag.organization_id,
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
