"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { notifications } from "@/utils/notifications";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RichTextEditor } from "@/components/editor/rich-text-editor";

interface Category {
  id: string;
  name: string;
  description: string;
  slug: string;
}

export default function NewTopicPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [tags, setTags] = useState("");

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("forum_categories")
        .select("*")
        .order("name");

      if (error) throw error;
      setCategories(data);
    } catch (error) {
      console.error("Error:", error);
      notifications.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim() || !categoryId) {
      notifications.error("Please fill in all required fields");
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createClient();

      // Get user's organization ID
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .single();

      if (!profile?.organization_id) {
        throw new Error("No organization found");
      }

      const { error } = await supabase.from("forum_topics").insert({
        title: title.trim(),
        content,
        category_id: categoryId,
        organization_id: profile.organization_id,
        tags: tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      });

      if (error) throw error;

      notifications.success("Discussion created successfully");
      router.push("/customer/forums");
    } catch (error) {
      console.error("Error:", error);
      notifications.error("Failed to create discussion");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Start Discussion</h1>
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>

      <Card className="p-6 space-y-4">
        <div className="space-y-2">
          <Input
            placeholder="Discussion title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Input
            placeholder="Tags (comma-separated)"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <RichTextEditor
            content={content}
            onChange={setContent}
            placeholder="Write your discussion here..."
          />
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Creating..." : "Create Discussion"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
