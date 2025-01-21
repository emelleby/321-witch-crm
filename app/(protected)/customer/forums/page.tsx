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
import { MessageSquare, Pin, Lock } from "lucide-react";

interface Category {
  id: string;
  name: string;
  description: string;
  slug: string;
}

interface Topic {
  id: string;
  title: string;
  content: string;
  category_id: string;
  created_by: string;
  is_pinned: boolean;
  is_locked: boolean;
  views_count: number;
  replies_count: number;
  last_reply_at: string | null;
  created_at: string;
  tags: string[];
  user_name?: string;
  category_name?: string;
}

export default function ForumsPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchCategories();
    fetchTopics();

    // Set up real-time subscription for new topics
    const supabase = createClient();
    const channel = supabase
      .channel("forum_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "forum_topics",
        },
        () => {
          fetchTopics();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
    }
  };

  const fetchTopics = async () => {
    try {
      const supabase = createClient();
      let query = supabase
        .from("forum_topics")
        .select(
          "*, user_name:created_by(full_name), category_name:category_id(name)"
        )
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });

      if (selectedCategory !== "all") {
        query = query.eq("category_id", selectedCategory);
      }

      if (searchQuery) {
        query = query.ilike("title", "%" + searchQuery + "%");
      }

      const { data, error } = await query;
      if (error) throw error;

      setTopics(
        data.map((topic) => ({
          ...topic,
          user_name: topic.user_name?.full_name || "Unknown User",
          category_name: topic.category_name?.name || "Uncategorized",
        }))
      );
    } catch (error) {
      console.error("Error:", error);
      notifications.error("Failed to load topics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopics();
  }, [selectedCategory, searchQuery]);

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
        <h1 className="text-3xl font-bold tracking-tight">Forums</h1>
        <Button onClick={() => router.push("/customer/forums/new")}>
          Start Discussion
        </Button>
      </div>

      <div className="flex gap-4">
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          placeholder="Search discussions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="grid gap-4">
        {topics.map((topic) => (
          <Card
            key={topic.id}
            className="p-4 cursor-pointer hover:bg-muted/50"
            onClick={() => router.push("/customer/forums/" + topic.id)}
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {topic.is_pinned && (
                    <Pin className="h-4 w-4 text-muted-foreground" />
                  )}
                  {topic.is_locked && (
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  )}
                  <h3 className="font-semibold">{topic.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  {topic.category_name} • Posted by {topic.user_name} •{" "}
                  {new Date(topic.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <MessageSquare className="h-4 w-4" />
                <span>{topic.replies_count}</span>
              </div>
            </div>

            {topic.tags && topic.tags.length > 0 && (
              <div className="flex gap-2 mt-2 flex-wrap">
                {topic.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </Card>
        ))}

        {topics.length === 0 && (
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold">No discussions found</h3>
            <p className="text-muted-foreground">
              {searchQuery
                ? "Try adjusting your search or filters"
                : "Be the first to start a discussion!"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
