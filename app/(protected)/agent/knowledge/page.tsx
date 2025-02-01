"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Database } from "@/database.types";
import { useToast } from "@/hooks/use-toast";
import { createBrowserSupabaseClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";

type Article = Database["public"]["Tables"]["knowledge_articles"]["Row"];

export default function AgentKnowledgePage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const supabase = createBrowserSupabaseClient();

  useEffect(() => {
    const fetchArticles = async () => {
      const { data, error } = await supabase
        .from("knowledge_articles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching articles:", error);
        toast({
          title: "Error",
          description: "Failed to fetch articles",
          variant: "destructive",
        });
        return;
      }

      setArticles(data || []);
    };

    fetchArticles();
  }, [supabase, toast]);

  const filteredArticles = articles.filter((article) =>
    article.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container py-6 space-y-6">
      <h1 className="text-3xl font-bold">Knowledge Base</h1>

      <div className="max-w-md">
        <Input
          placeholder="Search articles..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="space-y-4">
        {filteredArticles.map((article) => (
          <Card key={article.article_id}>
            <CardHeader>
              <CardTitle>{article.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{article.content}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
