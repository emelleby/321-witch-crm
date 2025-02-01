"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Database } from "@/database.types";
import { useToast } from "@/hooks/use-toast";
import { createBrowserSupabaseClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type TicketPriority = Database["public"]["Enums"]["ticket_priority_enum"];
type Organization = {
  organization_id: string;
  organization_name: string;
};

const TICKET_PRIORITIES: TicketPriority[] = ["low", "normal", "high", "urgent"];

export function CreateTicketForm() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TicketPriority>("normal");
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrganization, setSelectedOrganization] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createBrowserSupabaseClient();

  useEffect(() => {
    async function fetchOrganizations() {
      const { data: orgs, error } = await supabase
        .from("organizations")
        .select("organization_id, organization_name");

      if (error) {
        console.error("Error fetching organizations:", error);
        toast({
          title: "Error",
          description: "Failed to load organizations. Please try again.",
          variant: "destructive",
        });
        return;
      }

      setOrganizations(orgs || []);
      setIsLoading(false);
    }

    fetchOrganizations();
  }, [supabase, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !selectedOrganization) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to create a ticket",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    const { data: ticket, error } = await supabase
      .from("support_tickets")
      .insert({
        ticket_title: title,
        ticket_description: description,
        ticket_priority: priority,
        organization_id: selectedOrganization,
        created_by_user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating ticket:", error);
      toast({
        title: "Error",
        description: "Failed to create ticket. Please try again.",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    // Call FastAPI backend to trigger ticket processing
    try {
      await fetch(`/api/triggers/ticket/process/${ticket.ticket_id}`, {
        method: "POST",
      });
    } catch (error) {
      console.error("Error triggering ticket processing:", error);
    }

    toast({
      title: "Success",
      description: "Ticket created successfully",
    });

    router.push(`/customer/tickets/${ticket.ticket_id}`);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Ticket</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Select
              value={selectedOrganization}
              onValueChange={setSelectedOrganization}
              required
            >
              <SelectTrigger data-testid="organization-select">
                <SelectValue placeholder="Select Organization" />
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
            <Input
              placeholder="Ticket Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              data-testid="ticket-title"
            />
          </div>

          <div className="space-y-2">
            <Textarea
              placeholder="Describe your issue..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              className="min-h-[100px]"
              data-testid="ticket-description"
            />
          </div>

          <div className="space-y-2">
            <Select
              value={priority}
              onValueChange={(value) => setPriority(value as TicketPriority)}
            >
              <SelectTrigger data-testid="ticket-priority">
                <SelectValue placeholder="Select Priority" />
              </SelectTrigger>
              <SelectContent>
                {TICKET_PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            data-testid="submit-ticket"
          >
            {isSubmitting ? "Creating..." : "Create Ticket"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
