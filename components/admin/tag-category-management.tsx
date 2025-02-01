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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { createBrowserSupabaseClient } from "@/utils/supabase/client";
import { useCallback, useEffect, useState } from "react";
import { HexColorPicker } from "react-colorful";

type Category = {
  category_id: string;
  category_name: string;
  category_description: string | null;
  organization_id: string;
  display_color: string | null;
};

type Tag = {
  tag_id: string;
  tag_name: string;
  tag_description: string | null;
  organization_id: string;
  display_color: string | null;
};

type CategoryForm = {
  category_name: string;
  category_description: string;
  display_color: string;
};

type TagForm = {
  tag_name: string;
  tag_description: string;
  display_color: string;
};

type EditItem =
  | { type: "category"; item: Category }
  | { type: "tag"; item: Tag };

export function TagCategoryManagement() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newColor, setNewColor] = useState("#000000");
  const [editItem, setEditItem] = useState<EditItem | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [categoryForm, setCategoryForm] = useState<CategoryForm>({
    category_name: "",
    category_description: "",
    display_color: "#000000",
  });
  const [tagForm, setTagForm] = useState<TagForm>({
    tag_name: "",
    tag_description: "",
    display_color: "#000000",
  });
  const { toast } = useToast();
  const supabase = createBrowserSupabaseClient();

  const fetchOrganizationId = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile, error } = await supabase
      .from("user_profiles")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();

    if (error) {
      console.error("Error fetching organization ID:", error);
      return;
    }

    setOrganizationId(profile.organization_id);
  }, [supabase]);

  const fetchCategories = useCallback(async () => {
    if (!organizationId) return;

    try {
      const { data, error } = await supabase
        .from("ticket_categories")
        .select("*")
        .eq("organization_id", organizationId);

      if (error) {
        console.error("Error fetching categories:", error);
        toast({
          title: "Error",
          description: "Failed to fetch categories",
          variant: "destructive",
        });
        return;
      }

      setCategories(data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast({
        title: "Error",
        description: "Failed to fetch categories",
        variant: "destructive",
      });
    }
  }, [supabase, organizationId, toast]);

  const fetchTags = useCallback(async () => {
    if (!organizationId) return;

    try {
      const { data, error } = await supabase
        .from("ticket_tags")
        .select("*")
        .eq("organization_id", organizationId);

      if (error) {
        console.error("Error fetching tags:", error);
        toast({
          title: "Error",
          description: "Failed to fetch tags",
          variant: "destructive",
        });
        return;
      }

      setTags(data || []);
    } catch (error) {
      console.error("Error fetching tags:", error);
      toast({
        title: "Error",
        description: "Failed to fetch tags",
        variant: "destructive",
      });
    }
  }, [supabase, organizationId, toast]);

  useEffect(() => {
    fetchOrganizationId();
  }, [fetchOrganizationId]);

  useEffect(() => {
    if (organizationId) {
      fetchCategories();
      fetchTags();
    }
  }, [organizationId, fetchCategories, fetchTags]);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId) {
      toast({
        title: "Error",
        description: "Organization ID not found",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from("ticket_categories")
        .insert([
          {
            category_name: categoryForm.category_name,
            category_description: categoryForm.category_description || null,
            organization_id: organizationId,
            display_color: categoryForm.display_color,
          },
        ])
        .select();

      if (error) {
        console.error("Error creating category:", error);
        toast({
          title: "Error",
          description: "Failed to create category",
          variant: "destructive",
        });
        return;
      }

      setCategories([...categories, data[0]]);
      setCategoryForm({
        category_name: "",
        category_description: "",
        display_color: "#000000",
      });
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

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId) {
      toast({
        title: "Error",
        description: "Organization ID not found",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.from("ticket_tags").insert({
        tag_name: tagForm.tag_name,
        tag_description: tagForm.tag_description || null,
        display_color: tagForm.display_color,
        organization_id: organizationId,
      });

      if (error) throw error;

      setTagForm({
        tag_name: "",
        tag_description: "",
        display_color: "#000000",
      });
      fetchTags();
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

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem || editItem.type !== "category") return;

    const { error } = await supabase
      .from("ticket_categories")
      .update({
        category_name: categoryForm.category_name,
        category_description: categoryForm.category_description || null,
        display_color: categoryForm.display_color,
      })
      .eq("category_id", editItem.item.category_id);

    if (error) {
      console.error("Error updating category:", error);
      toast({
        title: "Error",
        description: "Failed to update category. Please try again.",
        variant: "destructive",
      });
      return;
    }

    fetchCategories();
    resetForm();
    toast({
      title: "Success",
      description: "Category updated successfully",
    });
  };

  const handleUpdateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem || editItem.type !== "tag") return;

    const { error } = await supabase
      .from("ticket_tags")
      .update({
        tag_name: tagForm.tag_name,
        tag_description: tagForm.tag_description || null,
        display_color: tagForm.display_color,
      })
      .eq("tag_id", editItem.item.tag_id);

    if (error) {
      console.error("Error updating tag:", error);
      toast({
        title: "Error",
        description: "Failed to update tag. Please try again.",
        variant: "destructive",
      });
      return;
    }

    fetchTags();
    resetForm();
    toast({
      title: "Success",
      description: "Tag updated successfully",
    });
  };

  const handleDelete = async (type: "category" | "tag", id: string) => {
    const { error } = await supabase
      .from(type === "category" ? "ticket_categories" : "ticket_tags")
      .delete()
      .eq(type === "category" ? "category_id" : "tag_id", id);

    if (error) {
      console.error(`Error deleting ${type}:`, error);
      toast({
        title: "Error",
        description: `Failed to delete ${type}. Please try again.`,
        variant: "destructive",
      });
      return;
    }

    if (type === "category") {
      fetchCategories();
    } else {
      fetchTags();
    }

    toast({
      title: "Success",
      description: `${type} deleted successfully`,
    });
  };

  const resetForm = () => {
    setNewName("");
    setNewDescription("");
    setNewColor("#000000");
    setEditItem(null);
    setShowColorPicker(false);
  };

  const startEdit = (item: Category | Tag, type: "category" | "tag") => {
    if (type === "category") {
      setEditItem({ type: "category", item: item as Category });
      setCategoryForm({
        category_name: (item as Category).category_name,
        category_description: (item as Category).category_description || "",
        display_color: (item as Category).display_color || "#000000",
      });
    } else {
      setEditItem({ type: "tag", item: item as Tag });
      setTagForm({
        tag_name: (item as Tag).tag_name,
        tag_description: (item as Tag).tag_description || "",
        display_color: (item as Tag).display_color || "#000000",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editItem) {
      if (editItem.type === "category") {
        await handleUpdateCategory(e);
      } else {
        await handleUpdateTag(e);
      }
    } else {
      const activeTab = document
        .querySelector('[role="tab"][aria-selected="true"]')
        ?.getAttribute("value");
      if (activeTab === "tags") {
        await handleCreateTag(e);
      } else {
        await handleCreateCategory(e);
      }
    }
  };

  return (
    <Tabs defaultValue="categories" className="space-y-4">
      <TabsList>
        <TabsTrigger value="categories">Categories</TabsTrigger>
        <TabsTrigger value="tags">Tags</TabsTrigger>
      </TabsList>

      <TabsContent value="categories">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {editItem ? "Edit Category" : "Create New Category"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  placeholder="Category Name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  data-testid="category-name-input"
                />
                <Textarea
                  placeholder="Category Description"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  data-testid="category-description-input"
                />
                <Dialog
                  open={showColorPicker}
                  onOpenChange={setShowColorPicker}
                >
                  <DialogTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      data-testid="color-picker-trigger"
                    >
                      <div
                        className="w-4 h-4 rounded-full mr-2"
                        style={{ backgroundColor: newColor }}
                      />
                      Select Color
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Choose Color</DialogTitle>
                    </DialogHeader>
                    <HexColorPicker
                      color={newColor}
                      onChange={setNewColor}
                      data-testid="color-picker"
                    />
                  </DialogContent>
                </Dialog>
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    className="flex-1"
                    data-testid="save-category-button"
                  >
                    {editItem ? "Update Category" : "Create Category"}
                  </Button>
                  {editItem && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={resetForm}
                      data-testid="cancel-edit-button"
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {categories.map((category) => (
                    <div
                      key={category.category_id}
                      className="flex items-center justify-between p-2 rounded-lg border"
                      data-testid={`category-${category.category_id}`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{
                            backgroundColor:
                              category.display_color || "#000000",
                          }}
                        />
                        <div>
                          <p className="font-medium">
                            {category.category_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {category.category_description}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            startEdit(category, "category");
                          }}
                          data-testid={`edit-category-${category.category_id}`}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() =>
                            handleDelete("category", category.category_id)
                          }
                          data-testid={`delete-category-${category.category_id}`}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="tags">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{editItem ? "Edit Tag" : "Create New Tag"}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  placeholder="Tag Name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  data-testid="tag-name-input"
                />
                <Textarea
                  placeholder="Tag Description"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  data-testid="tag-description-input"
                />
                <Dialog
                  open={showColorPicker}
                  onOpenChange={setShowColorPicker}
                >
                  <DialogTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      data-testid="color-picker-trigger"
                    >
                      <div
                        className="w-4 h-4 rounded-full mr-2"
                        style={{ backgroundColor: newColor }}
                      />
                      Select Color
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Choose Color</DialogTitle>
                    </DialogHeader>
                    <HexColorPicker color={newColor} onChange={setNewColor} />
                  </DialogContent>
                </Dialog>
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    className="flex-1"
                    data-testid="save-tag-button"
                  >
                    {editItem ? "Update Tag" : "Create Tag"}
                  </Button>
                  {editItem && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={resetForm}
                      data-testid="cancel-edit-button"
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tags</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {tags.map((tag) => (
                    <div
                      key={tag.tag_id}
                      className="flex items-center justify-between p-2 rounded-lg border"
                      data-testid={`tag-${tag.tag_id}`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{
                            backgroundColor: tag.display_color || "#000000",
                          }}
                        />
                        <div>
                          <p className="font-medium">{tag.tag_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {tag.tag_description}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            startEdit(tag, "tag");
                          }}
                          data-testid={`edit-tag-${tag.tag_id}`}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete("tag", tag.tag_id)}
                          data-testid={`delete-tag-${tag.tag_id}`}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    </Tabs>
  );
}
