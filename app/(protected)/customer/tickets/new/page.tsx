"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { RichTextEditor } from "@/components/editor/rich-text-editor";
import { FileUpload } from "@/components/file-upload";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Database } from "@/database.types";
import { useToast } from "@/hooks/use-toast";
import { createBrowserSupabaseClient } from "@/utils/supabase/client";

type Organization = {
  organization_id: string;
  organization_name: string;
};

export default function NewTicketPage() {
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] =
    useState<Database["public"]["Enums"]["ticket_priority_type"]>("normal");
  const [organizationId, setOrganizationId] = useState<string>("");
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [fileIds, setFileIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const fetchOrganizations = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get user's profile to check their organization
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("user_id, organization_id")
        .eq("user_id", user.id)
        .single();

      if (!profile) throw new Error("Profile not found");

      // Get user's email from auth
      const emailDomain = user.email?.split("@")[1];
      if (!emailDomain) throw new Error("Invalid email");

      // If user has an organization_id, only show that organization
      if (profile.organization_id) {
        const { data, error } = await supabase
          .from("organizations")
          .select("organization_id, organization_name")
          .eq("organization_id", profile.organization_id)
          .single();

        if (error) throw error;
        setOrganizations([data]);
        setOrganizationId(data.organization_id); // Auto-select the user's organization
      } else {
        // If no organization_id, try to match by email domain
        const { data, error } = await supabase
          .from("organizations")
          .select("organization_id, organization_name")
          .ilike("domain", emailDomain)
          .order("organization_name");

        if (error) throw error;
        setOrganizations(data || []);
        if (data && data.length === 1) {
          setOrganizationId(data[0].organization_id); // Auto-select if only one organization
        }
      }
    } catch (error) {
      console.error("Error fetching organizations:", error);
      toast({
        title: "Error",
        description: "Failed to load organizations",
        variant: "destructive",
      });
    }
  }, [supabase, toast]);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  const handleSubmit = async () => {
    if (!subject.trim() || !description.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: ticket, error: ticketError } = await supabase
        .from("support_tickets")
        .insert({
          ticket_title: subject.trim(),
          ticket_description: description.trim(),
          ticket_priority: priority,
          created_by_user_id: user.id,
          organization_id: organizationId,
          ticket_status: "open",
        })
        .select("ticket_id")
        .single();

      if (ticketError) {
        console.error("Error creating ticket:", ticketError);
        throw ticketError;
      }

      // Handle file attachments
      if (fileIds.length > 0 && ticket) {
        const { error: filesError } = await supabase
          .from("ticket_file_attachments")
          .insert(
            fileIds.map((fileId) => ({
              ticket_id: ticket.ticket_id,
              file_id: fileId,
            }))
          );

        if (filesError) {
          console.error("Files error:", filesError);
          throw filesError;
        }
      }

      toast({
        title: "Success",
        description: "Ticket created successfully",
      });
      router.push(`/customer/tickets/${ticket.ticket_id}`);
    } catch (error) {
      console.error("Submit error:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to create ticket",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">New Ticket</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Submit a New Support Ticket</CardTitle>
          <CardDescription>
            Fill out the form below to create a new support ticket
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Organization *</label>
              <Select
                value={organizationId}
                onValueChange={setOrganizationId}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an organization" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((org) => (
                    <SelectItem
                      key={org.organization_id}
                      value={org.organization_id}
                    >
                      {org.organization_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Priority *</label>
              <Select
                value={priority}
                onValueChange={(
                  value: Database["public"]["Enums"]["ticket_priority_type"]
                ) => setPriority(value)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
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

            <div className="space-y-2">
              <label className="text-sm font-medium">Attachments</label>
              <FileUpload
                onUploadCompleteAction={(ids: string[]) =>
                  setFileIds((prev) => [...prev, ...ids])
                }
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Ticket"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
