"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { createBrowserSupabaseClient } from "@/utils/supabase/client";

type Article = {
  id: string;
  title: string;
  content: string;
  category: string | null;
  tags: string[] | null;
  views_count: number;
  created_at: string;
  updated_at: string;
};

type File = {
  id: string;
  file_name: string;
  content_type: string;
  storage_path: string;
};

export default function ArticleDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();
  const [article, setArticle] = useState<Article | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchArticle = useCallback(async () => {
    try {
      // First, get user's organization
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      // Fetch article
      const { data: articleData, error: articleError } = await supabase
        .from("knowledge_base")
        .select("*")
        .eq("id", params.id)
        .single();

      if (articleError) throw articleError;

      // Check if article belongs to user's organization
      if (
        profile?.organization_id &&
        articleData.organization_id !== profile.organization_id
      ) {
        throw new Error("Article not found");
      }

      setArticle(articleData);

      // Fetch attachments
      const { data: filesData, error: filesError } = await supabase
        .from("knowledge_base_files")
        .select(
          `
                    file:files (
                        id,
                        file_name,
                        content_type,
                        storage_path
                    )
                `
        )
        .eq("knowledge_base_id", params.id);

      if (filesError) throw filesError;
      setFiles(filesData.map((f) => f.file));
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load article",
        variant: "destructive",
      });
      console.error("Error:", error);
      router.push("/customer/knowledge");
    } finally {
      setLoading(false);
    }
  }, [params.id, supabase, toast, router]);

  const getFileUrl = async (path: string) => {
    const { data } = supabase.storage.from("attachments").getPublicUrl(path);
    return data.publicUrl;
  };

  useEffect(() => {
    fetchArticle();
  }, [fetchArticle]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Article not found</h2>
          <Button
            className="mt-4"
            onClick={() => router.push("/customer/knowledge")}
          >
            Back to Knowledge Base
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{article.title}</h1>
          <div className="flex gap-2 mt-2 text-sm text-muted-foreground">
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
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push("/customer/knowledge")}
        >
          Back to Articles
        </Button>
      </div>

      <Card className="p-6">
        <div className="prose prose-sm max-w-none dark:prose-invert">
          {article.content.split("\n").map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      </Card>

      {files.length > 0 && (
        <Card className="p-6">
          <h2 className="font-semibold mb-4">Attachments</h2>
          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-2 rounded-md border bg-background"
              >
                <span className="text-sm">{file.file_name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    const url = await getFileUrl(file.storage_path);
                    window.open(url, "_blank");
                  }}
                >
                  Download
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

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
  );
}
