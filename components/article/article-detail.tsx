"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { createBrowserSupabaseClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";

interface ArticleDetailProps {
  articleId: string;
}

type Article = {
  article_id: string;
  title: string;
  content: string;
  created_at: string | null;
  updated_at: string | null;
  created_by_user_id: string | null;
  updated_by_user_id: string | null;
  is_ai_generated: boolean;
  is_ai_updated: boolean;
  is_published: boolean;
  organization_id: string;
};

export function ArticleDetail({ articleId }: ArticleDetailProps) {
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const supabase = createBrowserSupabaseClient();

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        const { data, error } = await supabase
          .from("knowledge_articles")
          .select("*")
          .eq("article_id", articleId)
          .single();

        if (error) {
          console.error("Error fetching article:", error);
          toast({
            title: "Error",
            description: "Failed to fetch article",
            variant: "destructive",
          });
          return;
        }

        setArticle(data);
      } finally {
        setLoading(false);
      }
    };

    fetchArticle();
  }, [articleId, supabase, toast]);

  const handleUpdateArticle = async (updates: Partial<Article>) => {
    if (!article) return;

    try {
      const { error } = await supabase
        .from("knowledge_articles")
        .update(updates)
        .eq("article_id", article.article_id);

      if (error) {
        console.error("Error updating article:", error);
        toast({
          title: "Error",
          description: "Failed to update article",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Article updated successfully",
      });
    } catch (error) {
      console.error("Error updating article:", error);
      toast({
        title: "Error",
        description: "Failed to update article",
        variant: "destructive",
      });
    }
  };

  const handleDeleteArticle = async () => {
    if (!article) return;

    try {
      const { error } = await supabase
        .from("knowledge_articles")
        .delete()
        .eq("article_id", article.article_id);

      if (error) {
        console.error("Error deleting article:", error);
        toast({
          title: "Error",
          description: "Failed to delete article",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Article deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting article:", error);
      toast({
        title: "Error",
        description: "Failed to delete article",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!article) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{article.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="prose max-w-none">
          <div dangerouslySetInnerHTML={{ __html: article.content }} />
        </div>
        <div className="mt-6 flex justify-end gap-4">
          <Button variant="outline" onClick={handleDeleteArticle}>
            Delete Article
          </Button>
          <Button
            onClick={() =>
              handleUpdateArticle({
                title: article.title,
                content: article.content,
              })
            }
          >
            Update Article
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
