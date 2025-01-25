"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Database } from "@/database.types";
import { useToast } from "@/hooks/use-toast";
import { createBrowserSupabaseClient } from "@/utils/supabase/client";

type KnowledgeArticle =
  Database["public"]["Tables"]["knowledge_articles"]["Row"] & {
    created_by: {
      display_name: string;
    } | null;
  };

type KnowledgeFAQ = Database["public"]["Tables"]["knowledge_faqs"]["Row"] & {
  created_by: {
    display_name: string;
  } | null;
};

type FileAttachment = Database["public"]["Tables"]["uploaded_files"]["Row"];

export default function KnowledgePage() {
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [faqs, setFaqs] = useState<KnowledgeFAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const fetchKnowledgeBase = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("knowledge_articles")
        .select(
          `
          *,
          created_by:user_profiles!created_by_user_id(display_name)
        `
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      setArticles(data || []);
    } catch (error) {
      console.error("Error fetching knowledge base:", error);
      toast({
        title: "Error",
        description: "Failed to load knowledge base",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [supabase, toast]);

  useEffect(() => {
    fetchKnowledgeBase();
  }, [fetchKnowledgeBase]);

  const handleFileUpload = async (file: File, articleId: string) => {
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${articleId}/${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("knowledge_files")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: fileData, error: fileError } = await supabase
        .from("uploaded_files")
        .insert({
          file_name: file.name,
          file_size: file.size,
          file_type: file.type,
          storage_path: fileName,
          uploaded_by_user_id: (await supabase.auth.getUser()).data.user?.id,
        })
        .select()
        .single();

      if (fileError) throw fileError;

      // Create the relationship in the join table
      const { error: joinError } = await supabase
        .from("ticket_file_attachments")
        .insert({
          ticket_id: articleId,
          file_id: fileData.file_id,
        });

      if (joinError) throw joinError;

      toast({
        title: "Success",
        description: "File uploaded successfully",
        variant: "default",
      });

      await fetchKnowledgeBase();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload file",
        variant: "destructive",
      });
      console.error("Error:", error);
    }
  };

  const handleDeleteArticle = async (articleId: string) => {
    try {
      const { error } = await supabase
        .from("knowledge_articles")
        .delete()
        .eq("article_id", articleId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Article deleted successfully",
        variant: "default",
      });
      await fetchKnowledgeBase();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete article",
        variant: "destructive",
      });
      console.error("Error:", error);
    }
  };

  const handleDeleteFAQ = async (faqId: string) => {
    try {
      const { error } = await supabase
        .from("knowledge_faqs")
        .delete()
        .eq("faq_id", faqId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "FAQ deleted successfully",
        variant: "default",
      });
      await fetchKnowledgeBase();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete FAQ",
        variant: "destructive",
      });
      console.error("Error:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Knowledge Base</h1>
          <p className="text-muted-foreground">
            Manage your knowledge base articles and FAQs
          </p>
        </div>
        <div className="flex gap-4">
          <Button onClick={() => router.push("/admin/knowledge/new-article")}>
            New Article
          </Button>
          <Button onClick={() => router.push("/admin/knowledge/new-faq")}>
            New FAQ
          </Button>
        </div>
      </div>

      <Card>
        <div className="p-4">
          <Input
            placeholder="Search knowledge base..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Author</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {articles
              .filter((article) =>
                article.title.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map((article) => (
                <TableRow key={article.article_id}>
                  <TableCell>{article.title}</TableCell>
                  <TableCell>Article</TableCell>
                  <TableCell>{article.created_by?.display_name}</TableCell>
                  <TableCell>
                    {new Date(article.updated_at || "").toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      onClick={() =>
                        router.push(`/admin/knowledge/${article.article_id}`)
                      }
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => handleDeleteArticle(article.article_id)}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            {faqs
              .filter((faq) =>
                faq.question.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map((faq) => (
                <TableRow key={faq.faq_id}>
                  <TableCell>{faq.question}</TableCell>
                  <TableCell>FAQ</TableCell>
                  <TableCell>{faq.created_by?.display_name}</TableCell>
                  <TableCell>
                    {new Date(faq.updated_at || "").toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      onClick={() =>
                        router.push(`/admin/knowledge/${faq.faq_id}`)
                      }
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => handleDeleteFAQ(faq.faq_id)}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
