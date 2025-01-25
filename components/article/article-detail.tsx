"use client";

import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { FileDown, FileText, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { VersionHistory } from "@/components/article/version-history";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { turndownService } from "@/utils/markdown";
import { createBrowserSupabaseClient } from "@/utils/supabase/client";

interface Article {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  organization_id: string;
  views_count: number;
  created_at: string;
  updated_at: string;
  file_ids: string[];
}

interface ArticleDetailProps {
  id: string;
}

export function ArticleDetail({ id }: ArticleDetailProps) {
  const router = useRouter();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createBrowserSupabaseClient();
  const { toast } = useToast();

  const fetchArticle = useCallback(async () => {
    try {
      const { data: article, error } = await supabase
        .from("knowledge_base")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setArticle(article);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load article",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [id, supabase, toast]);

  useEffect(() => {
    fetchArticle();
  }, [fetchArticle]);

  const handleRestore = useCallback(
    async (version: Record<string, unknown>) => {
      try {
        const { error } = await supabase
          .from("knowledge_base")
          .update({
            title: version.title,
            content: version.content,
            category: version.category,
            tags: version.tags,
            file_ids: version.file_ids,
          })
          .eq("id", id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Article restored successfully",
          variant: "default",
        });
        await fetchArticle();
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to restore article",
          variant: "destructive",
        });
      }
    },
    [fetchArticle, id, supabase, toast]
  );

  const handleExportMarkdown = useCallback(() => {
    try {
      if (!article) {
        toast({
          title: "Error",
          description: "No article to export",
          variant: "destructive",
        });
        return;
      }
      const markdown = turndownService.turndown(article.content);
      const blob = new Blob([markdown], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = article.title + ".md";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({
        title: "Success",
        description: "Article exported as Markdown",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export as Markdown",
        variant: "destructive",
      });
    }
  }, [article, toast]);

  const handleExportPDF = useCallback(async () => {
    try {
      if (!article) {
        toast({
          title: "Error",
          description: "No article to export",
          variant: "destructive",
        });
        return;
      }
      const content = document.querySelector(".prose");
      if (!content) {
        toast({
          title: "Error",
          description: "Content not found",
          variant: "destructive",
        });
        return;
      }

      const canvas = await html2canvas(content as HTMLElement);
      const pdf = new jsPDF();

      const imgData = canvas.toDataURL("image/png");
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(article.title + ".pdf");
      toast({
        title: "Success",
        description: "Article exported as PDF",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export as PDF",
        variant: "destructive",
      });
    }
  }, [article, toast]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <h1 className="mb-4 text-2xl font-bold">Article not found</h1>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{article.title}</h1>
          <p className="text-muted-foreground">
            Category: {article.category} • Views: {article.views_count}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportMarkdown}>
            <FileText className="mr-2 h-4 w-4" />
            Export MD
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF}>
            <FileDown className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
          <VersionHistory
            articleId={article.id}
            currentTitle={article.title}
            currentContent={article.content}
            currentCategory={article.category}
            currentTags={article.tags}
            currentFileIds={article.file_ids}
            onRestore={handleRestore}
          />
          <Button
            onClick={() => router.push("/admin/knowledge/edit/" + article.id)}
          >
            <Pencil className="mr-2 h-4 w-4" />
            Edit Article
          </Button>
        </div>
      </div>

      <Card className="p-6">
        <div
          className="prose prose-sm dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: article.content }}
        />
      </Card>

      {article.tags && article.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
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
