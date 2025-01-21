"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { notifications } from "@/utils/notifications";
import { FileUpload } from "@/components/file-upload";
import { RichTextEditor } from "@/components/editor/rich-text-editor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TicketForm } from "@/components/tickets/ticket-form";

type Organization = {
  id: string;
  name: string;
};

type TicketTemplate = {
  id: string;
  name: string;
  subject: string;
  content: string;
  priority: "low" | "normal" | "high";
  category_ids: string[];
  tag_ids: string[];
};

type Article = {
  id: string;
  title: string;
  content: string;
};

type ForumPost = {
  id: string;
  title: string;
  content: string;
};

export default function NewTicketPage() {
  const router = useRouter();
  const supabase = createClient();
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<string>("normal");
  const [organizationId, setOrganizationId] = useState<string>("");
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [fileIds, setFileIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [templates, setTemplates] = useState<TicketTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("none");
  const [similarContent, setSimilarContent] = useState<
    Array<{
      title: string;
      content: string;
      type: "article" | "forum";
      url: string;
    }>
  >([]);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(
    null
  );
  function stripHtml(htmlString: string) {
    // Remove all <tags> with a regex, replace them with spaces, then trim
    return htmlString.replace(/<[^>]*>/g, " ").trim();
  }

  useEffect(() => {
    fetchOrganizations();
    fetchTemplates();
  }, []);

  useEffect(() => {
    if (description) {
      // Clear any existing timeout
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }

      // Set a new timeout to search after 1 second of no typing
      const timeout = setTimeout(() => {
        searchSimilarContent();
      }, 1000);

      setSearchTimeout(timeout);

      // Cleanup timeout on unmount or when description changes
      return () => {
        if (searchTimeout) {
          clearTimeout(searchTimeout);
        }
      };
    }
  }, [description]);

  const fetchOrganizations = async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) {
        notifications.error("Failed to authenticate user");
        throw userError;
      }
      if (!user) {
        notifications.error("No authenticated user found");
        return;
      }

      const { data, error } = await supabase
        .from("organizations")
        .select("id, name")
        .order("name");

      if (error) {
        notifications.error("Failed to load organizations");
        throw error;
      }

      setOrganizations(data || []);

      // If user belongs to only one organization, select it by default
      if (data?.length === 1) {
        setOrganizationId(data[0].id);
      }
    } catch (error) {
      console.error("Error fetching organizations:", error);
    }
  };

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from("ticket_templates")
        .select("id, name, subject, content, priority, category_ids, tag_ids")
        .order("name");

      if (error) {
        console.error("Error fetching templates:", error.message);
        notifications.error("Failed to load ticket templates");
        setTemplates([]);
        return;
      }

      setTemplates(data || []);
    } catch (error) {
      console.error(
        "Error fetching templates:",
        error instanceof Error ? error.message : "Unknown error"
      );
      notifications.error("Failed to load ticket templates");
      setTemplates([]);
    }
  };

  const searchSimilarContent = async () => {
    // Only search if description is at least 3 characters long
    if (!description || description.length < 3) {
      setSimilarContent([]);
      return;
    }

    const strippedDescription = stripHtml(description);

    try {
      // Call the Edge Function to generate embeddings
      const { data: embeddingData, error: embeddingError } =
        await supabase.functions.invoke("generate_embeddings", {
          body: { text: strippedDescription },
        });

      if (embeddingError) {
        console.error("Error generating embedding:", embeddingError);
        return setSimilarContent([]);
      }

      // Ensure embeddingData has the correct structure
      if (!embeddingData || !embeddingData.embedding) {
        console.error("Invalid embedding data:", embeddingData);
        return setSimilarContent([]);
      }

      // Search knowledge base articles with the embedding
      const { data: articles, error: articlesError } = await supabase.rpc(
        "search_articles",
        {
          search_query: strippedDescription,
          query_embedding: embeddingData.embedding,
          similarity_threshold: 0.7,
        }
      );

      if (articlesError) {
        console.error("Error searching articles:", articlesError.message);
        return setSimilarContent([]);
      }

      // Search forum posts with the same embedding
      const { data: posts, error: postsError } = await supabase.rpc(
        "search_forum_topics",
        {
          search_query: strippedDescription,
          query_embedding: embeddingData.embedding,
          similarity_threshold: 0.7,
          solved_only: true,
        }
      );

      if (postsError) {
        console.error("Error searching forum posts:", postsError.message);
        return setSimilarContent([]);
      }

      const similar = [
        ...(articles || []).map((a: Article) => ({
          title: a.title,
          content: a.content,
          type: "article" as const,
          url: `/knowledge/${a.id}`,
        })),
        ...(posts || []).map((p: ForumPost) => ({
          title: p.title,
          content: p.content,
          type: "forum" as const,
          url: `/forum/topics/${p.id}`,
        })),
      ];

      setSimilarContent(similar);
    } catch (error) {
      console.error(
        "Error searching similar content:",
        error instanceof Error ? error.message : "Unknown error"
      );
      setSimilarContent([]);
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    if (templateId === "none") {
      setSubject("");
      setDescription("");
      setPriority("normal");
      setSelectedTemplate("none");
      return;
    }

    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setSubject(template.subject);
      setDescription(template.content);
      setPriority(template.priority);
    }
    setSelectedTemplate(templateId);
  };

  const handleSubmit = async () => {
    if (!subject.trim() || !description.trim()) {
      notifications.error("Please fill in all required fields");
      return;
    }

    setSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Generate embedding first
      const combinedText = `Subject: ${subject.trim()} Description: ${description.trim()} Priority: ${priority}`;
      const { data: embeddingData, error: embeddingError } =
        await supabase.functions.invoke("generate_embeddings", {
          body: { text: combinedText },
        });

      if (embeddingError) throw embeddingError;

      // Create ticket with embedding
      const { data: ticket, error: ticketError } = await supabase
        .from("tickets")
        .insert({
          subject: subject.trim(),
          description: description.trim(),
          priority,
          creator_id: user.id,
          organization_id: organizationId || null,
          content_embedding: embeddingData.embedding,
        })
        .select()
        .single();

      if (ticketError) throw ticketError;

      // Link files to ticket if any
      if (fileIds.length > 0) {
        const { error: filesError } = await supabase
          .from("ticket_files")
          .insert(
            fileIds.map((fileId) => ({
              ticket_id: ticket.id,
              file_id: fileId,
            }))
          );

        if (filesError) throw filesError;
      }

      notifications.success("Ticket created successfully");
      router.push(`/customer/tickets/${ticket.id}`);
    } catch (error) {
      console.error("Submit error:", error);
      notifications.error("Failed to create ticket");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">New Ticket</h1>
        <Button
          variant="outline"
          onClick={() => router.push("/customer/tickets")}
        >
          Cancel
        </Button>
      </div>

      <Card className="p-6">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!submitting) {
              handleSubmit();
            }
          }}
        >
          <div className="space-y-2">
            <label className="text-sm font-medium">Organization</label>
            <Select value={organizationId} onValueChange={setOrganizationId}>
              <SelectTrigger>
                <SelectValue placeholder="Select an organization" />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Template (Optional)</label>
            <Select
              value={selectedTemplate}
              onValueChange={handleTemplateSelect}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No template</SelectItem>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Subject *</label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief description of your issue"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description *</label>
            <RichTextEditor
              onChange={setDescription}
              initialContent={description}
              className="min-h-[200px]"
              placeholder="Detailed explanation of your issue"
            />
          </div>

          {similarContent.length > 0 && (
            <div className="space-y-2 rounded-lg border p-4 bg-muted/50">
              <h3 className="font-medium">Similar Content Found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                We found some existing content that might help with your issue:
              </p>
              <div className="space-y-4">
                {similarContent.map((item, i) => (
                  <div key={i} className="space-y-1">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium hover:underline"
                    >
                      {item.title}
                    </a>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {item.content}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      From{" "}
                      {item.type === "article" ? "Knowledge Base" : "Forum"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Priority</label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Attachments</label>
            <FileUpload onUploadComplete={setFileIds} />
          </div>

          <div className="flex justify-end gap-4">
            <Button
              type="submit"
              disabled={submitting || !subject.trim() || !description.trim()}
            >
              {submitting ? "Creating..." : "Create Ticket"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
