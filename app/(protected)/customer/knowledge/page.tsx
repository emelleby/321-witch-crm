"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { notifications } from "@/utils/notifications";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Article = {
  id: string;
  title: string;
  content: string;
  category: string | null;
  tags: string[] | null;
  views_count: number;
  created_at: string;
  updated_at: string;
  organization_id: string;
};

type Organization = {
  id: string;
  name: string;
};

export default function KnowledgeBasePage() {
  const router = useRouter();
  const supabase = createClient();
  const [articles, setArticles] = useState<Article[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [organizationFilter, setOrganizationFilter] = useState<string>("all");
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    fetchOrganizations();
  }, []);

  useEffect(() => {
    fetchArticles();
  }, [searchQuery, categoryFilter, organizationFilter]);

  const fetchOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from("organizations")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setOrganizations(data);
    } catch (error) {
      console.error("Error fetching organizations:", error);
    }
  };

  const fetchArticles = async () => {
    try {
      let query = supabase
        .from("knowledge_base")
        .select("*")
        .order("views_count", { ascending: false });

      if (organizationFilter !== "all") {
        query = query.eq("organization_id", organizationFilter);
      }

      if (searchQuery) {
        query = query.or(
          "title.ilike.%" +
            searchQuery +
            "%,content.ilike.%" +
            searchQuery +
            "%"
        );
      }

      if (categoryFilter !== "all") {
        query = query.eq("category", categoryFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setArticles(data);

      // Get unique categories from filtered articles
      const uniqueCategories = Array.from(
        new Set(
          data.map((article) => article.category).filter(Boolean) as string[]
        )
      ).sort();
      setCategories(uniqueCategories);
    } catch (error) {
      console.error("Error:", error);
      notifications.error("Failed to load articles");
    } finally {
      setLoading(false);
    }
  };

  const incrementViewCount = async (articleId: string) => {
    try {
      await supabase.rpc("increment_article_views", {
        article_id: articleId,
      });
    } catch (error) {
      console.error("Error incrementing view count:", error);
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Knowledge Base</h1>
        <p className="text-muted-foreground">
          Find answers to common questions and learn more about our services
        </p>
      </div>

      <div className="flex gap-4 items-center">
        <div className="flex-1">
          <Input
            placeholder="Search articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select
          value={organizationFilter}
          onValueChange={setOrganizationFilter}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select organization" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Organizations</SelectItem>
            {organizations.map((org) => (
              <SelectItem key={org.id} value={org.id}>
                {org.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {categories.length > 0 && (
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="grid gap-4">
        {articles.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground">
            No articles found
          </Card>
        ) : (
          articles.map((article) => (
            <Card
              key={article.id}
              className="p-6 cursor-pointer hover:bg-accent transition-colors"
              onClick={() => {
                incrementViewCount(article.id);
                router.push("/customer/knowledge/" + article.id);
              }}
            >
              <div className="space-y-2">
                <h3 className="font-semibold">{article.title}</h3>
                <div className="flex gap-2 text-sm text-muted-foreground">
                  {article.category && (
                    <>
                      <span>Category: {article.category}</span>
                      <span>•</span>
                    </>
                  )}
                  <span>Views: {article.views_count}</span>
                  <span>•</span>
                  <span>
                    Updated: {new Date(article.updated_at).toLocaleDateString()}
                  </span>
                  <span>•</span>
                  <span>
                    Organization:{" "}
                    {
                      organizations.find(
                        (org) => org.id === article.organization_id
                      )?.name
                    }
                  </span>
                </div>
                <p className="text-muted-foreground line-clamp-2">
                  {article.content}
                </p>
                {article.tags && article.tags.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {article.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
