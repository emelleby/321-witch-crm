"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { createBrowserSupabaseClient } from "@/utils/supabase/client";
import { useCallback, useEffect, useState } from "react";

type CategoryType = {
  category_id: string;
  category_name: string;
  category_description: string | null;
  organization_id: string;
  created_at: string | null;
  updated_at: string | null;
  display_color: string | null;
};

export function TicketCategories() {
  const [categories, setCategories] = useState<CategoryType[]>([]);
  const [newCategory, setNewCategory] = useState({
    category_name: "",
    category_description: "",
  });
  const [organizationId, setOrganizationId] = useState<string | null>(null);
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

  useEffect(() => {
    fetchOrganizationId();
  }, [fetchOrganizationId]);

  useEffect(() => {
    if (organizationId) {
      fetchCategories();
    }
  }, [organizationId, fetchCategories]);

  const handleCategorySubmit = async (e: React.FormEvent) => {
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
            category_name: newCategory.category_name,
            category_description: newCategory.category_description || null,
            organization_id: organizationId,
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
      setNewCategory({ category_name: "", category_description: "" });
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

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      const { error } = await supabase
        .from("ticket_categories")
        .delete()
        .eq("category_id", categoryId);

      if (error) {
        console.error("Error deleting category:", error);
        toast({
          title: "Error",
          description: "Failed to delete category",
          variant: "destructive",
        });
        return;
      }

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ticket Categories</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleCategorySubmit} className="mb-6 space-y-4">
          <div>
            <Input
              placeholder="Category Name"
              value={newCategory.category_name}
              onChange={(e) =>
                setNewCategory({
                  ...newCategory,
                  category_name: e.target.value,
                })
              }
              data-testid="category-name-input"
            />
          </div>
          <div>
            <Input
              placeholder="Description"
              value={newCategory.category_description}
              onChange={(e) =>
                setNewCategory({
                  ...newCategory,
                  category_description: e.target.value,
                })
              }
              data-testid="category-description-input"
            />
          </div>
          <Button type="submit" data-testid="submit-category-button">
            Add Category
          </Button>
        </form>

        <div className="space-y-4">
          {categories.map((category) => (
            <div
              key={category.category_id}
              className="flex items-center justify-between rounded-lg border p-4"
              data-testid={`category-item-${category.category_id}`}
            >
              <div>
                <h3 className="font-semibold">{category.category_name}</h3>
                <p className="text-sm text-gray-500">
                  {category.category_description}
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={() => handleDeleteCategory(category.category_id)}
                data-testid={`delete-category-${category.category_id}`}
              >
                Delete
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
