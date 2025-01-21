"use client";

import { TicketTemplates } from "@/components/admin/ticket-templates";
import { PageHeader } from "@/components/page-header";

export default function TemplatesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        heading="Ticket Templates"
        description="Create and manage templates for common ticket types"
      />
      <TicketTemplates />
    </div>
  );
}
