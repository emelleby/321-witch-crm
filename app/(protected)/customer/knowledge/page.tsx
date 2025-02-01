"use client";

import { Database } from "@/database.types";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { createBrowserSupabaseClient } from "@/utils/supabase/client";

type Organization = Database["public"]["Tables"]["organizations"]["Row"];

type CombinedKnowledgeItem = {
  id: string;
  title: string;
  content: string;
  type: "article" | "faq";
  organization_id: string;
  created_at: string | null;
  updated_at: string | null;
  created_by_user_id: string | null;
  updated_by_user_id: string | null;
  is_ai_generated: boolean;
  is_ai_updated: boolean;
  is_published: boolean;
};

export default function KnowledgeBasePage() {
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();
  const [articles, setArticles] = useState<CombinedKnowledgeItem[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [organizationFilter, setOrganizationFilter] = useState<string>("all");
  const [categories, setCategories] = useState<string[]>([]);
  const { toast } = useToast();

  const fetchOrganizations = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .order("organization_name");

      if (error) throw error;
      setOrganizations(data);
    } catch (error) {
      console.error("Error fetching organizations:", error);
    }
  }, [supabase]);

  const fetchArticles = useCallback(async () => {
    try {
      const [articlesResult, faqsResult] = await Promise.all([
        supabase
          .from("knowledge_articles")
          .select("*")
          .eq("is_published", true)
          .order("created_at", { ascending: false }),
        supabase
          .from("knowledge_faqs")
          .select("*")
          .eq("is_published", true)
          .order("created_at", { ascending: false }),
      ]);

      if (articlesResult.error) throw articlesResult.error;
      if (faqsResult.error) throw faqsResult.error;

      const combinedData = [
        ...(articlesResult.data?.map((article) => ({
          id: article.article_id,
          title: article.title,
          content: article.content,
          type: "article" as const,
          organization_id: article.organization_id,
          created_at: article.created_at,
          updated_at: article.updated_at,
          created_by_user_id: article.created_by_user_id,
          updated_by_user_id: article.updated_by_user_id,
          is_ai_generated: article.is_ai_generated,
          is_ai_updated: article.is_ai_updated,
          is_published: article.is_published,
        })) || []),
        ...(faqsResult.data?.map((faq) => ({
          id: faq.faq_id,
          title: faq.question,
          content: faq.answer,
          type: "faq" as const,
          organization_id: faq.organization_id,
          created_at: faq.created_at,
          updated_at: faq.updated_at,
          created_by_user_id: faq.created_by_user_id,
          updated_by_user_id: faq.updated_by_user_id,
          is_ai_generated: faq.is_ai_generated,
          is_ai_updated: faq.is_ai_updated,
          is_published: faq.is_published,
        })) || []),
      ]
        .filter(
          (item) =>
            organizationFilter === "all" ||
            item.organization_id === organizationFilter
        )
        .filter(
          (item) =>
            !searchQuery ||
            item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.content.toLowerCase().includes(searchQuery.toLowerCase())
        );

      setArticles(combinedData);
      setCategories(
        Array.from(new Set(combinedData.map((item) => item.type))).sort()
      );
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Failed to load knowledge base items",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [supabase, searchQuery, organizationFilter, toast]);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

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
              <SelectItem key={org.organization_id} value={org.organization_id}>
                {org.organization_name}
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
                router.push("/customer/knowledge/" + article.id);
              }}
            >
              <div className="space-y-2">
                <h3 className="font-semibold">{article.title}</h3>
                <div className="flex gap-2 text-sm text-muted-foreground">
                  {article.type === "article" && (
                    <>
                      <span>Type: Article</span>
                      <span>•</span>
                    </>
                  )}
                  {article.type === "faq" && (
                    <>
                      <span>Type: FAQ</span>
                      <span>•</span>
                    </>
                  )}
                  <span>
                    Updated:{" "}
                    {article.updated_at
                      ? new Date(article.updated_at).toLocaleDateString()
                      : "Never"}
                  </span>
                  <span>•</span>
                  <span>
                    Organization:{" "}
                    {
                      organizations.find(
                        (org) => org.organization_id === article.organization_id
                      )?.organization_name
                    }
                  </span>
                </div>
                <p className="text-muted-foreground line-clamp-2">
                  {article.content}
                </p>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
