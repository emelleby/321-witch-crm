"use client";

import { Book, FileText, HelpCircle } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database } from "@/database.types";
import { useToast } from "@/hooks/use-toast";
import { createBrowserSupabaseClient } from "@/utils/supabase/client";

type KnowledgeItem = {
  source_id: string;
  source_type: "article" | "faq" | "file";
  title: string;
  content: string;
  metadata: {
    title: string;
    category?: string;
    description?: string;
  };
  created_at: string;
};

type KnowledgeEmbedding =
  Database["public"]["Tables"]["knowledge_base_embeddings"]["Row"];

type TabValue = "all" | "articles" | "faqs" | "files";

export default function AgentKnowledgePage() {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<TabValue>("all");
  const [supabase] = useState(() => createBrowserSupabaseClient());
  const { toast } = useToast();

  const fetchKnowledgeItems = useCallback(async () => {
    try {
      const { data: embeddings, error } = await supabase
        .from("knowledge_base_embeddings")
        .select("source_id, source_type, content, metadata, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Remove duplicates and format data
      const uniqueItems =
        embeddings?.reduce((acc: KnowledgeItem[], curr) => {
          const exists = acc.find((item) => item.source_id === curr.source_id);
          if (
            !exists &&
            curr.metadata &&
            typeof curr.metadata === "object" &&
            "title" in curr.metadata
          ) {
            acc.push({
              source_id: curr.source_id,
              source_type: curr.source_type as "article" | "faq" | "file",
              title: (curr.metadata as { title: string }).title || "Untitled",
              content: curr.content,
              metadata: {
                title: (curr.metadata as { title: string }).title,
                category: (curr.metadata as { category?: string })?.category,
                description: (curr.metadata as { description?: string })
                  ?.description,
              },
              created_at: curr.created_at || new Date().toISOString(),
            });
          }
          return acc;
        }, []) || [];

      setItems(uniqueItems);
    } catch (error) {
      console.error("Error fetching knowledge items:", error);
      toast({
        title: "Error",
        description: "Failed to load knowledge items",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [supabase, toast]);

  useEffect(() => {
    fetchKnowledgeItems();
  }, [fetchKnowledgeItems]);

  const filteredItems = items.filter(
    (item) =>
      (activeTab === "all" || item.source_type === activeTab.slice(0, -1)) &&
      (item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.metadata?.category
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()))
  );

  const getIcon = (type: KnowledgeItem["source_type"]) => {
    switch (type) {
      case "article":
        return <Book className="h-4 w-4" />;
      case "file":
        return <FileText className="h-4 w-4" />;
      case "faq":
        return <HelpCircle className="h-4 w-4" />;
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
      <PageHeader
        heading="Knowledge Base"
        text="Search and reference help articles, FAQs, and files"
      />

      <div className="flex items-center gap-4">
        <Input
          placeholder="Search knowledge base..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as TabValue)}
      >
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="articles">Articles</TabsTrigger>
          <TabsTrigger value="faqs">FAQs</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
        </TabsList>

        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => (
            <Card key={item.source_id} className="p-4">
              <div className="mb-2 flex items-center gap-2">
                {getIcon(item.source_type)}
                <h3 className="font-semibold">{item.title}</h3>
              </div>
              {item.metadata?.category && (
                <Badge variant="secondary" className="mb-2">
                  {item.metadata.category}
                </Badge>
              )}
              {item.metadata?.description && (
                <p className="mb-4 text-sm text-muted-foreground line-clamp-2">
                  {item.metadata.description}
                </p>
              )}
              <Button asChild>
                <Link
                  href={`/agent/knowledge/${item.source_type}/${item.source_id}`}
                >
                  View {item.source_type}
                </Link>
              </Button>
            </Card>
          ))}
          {filteredItems.length === 0 && (
            <div className="col-span-full text-center text-muted-foreground">
              No items found
            </div>
          )}
        </div>
      </Tabs>
    </div>
  );
}
