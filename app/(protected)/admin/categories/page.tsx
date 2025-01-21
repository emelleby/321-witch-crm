"use client";

import { TicketCategories } from "@/components/admin/ticket-categories";
import { PageHeader } from "@/components/page-header";

export default function CategoriesPage() {
  return (
    <div className="container space-y-6">
      <PageHeader
        title="Ticket Categories & Tags"
        description="Manage categories and tags for organizing tickets"
      />
      <TicketCategories />
    </div>
  );
}
