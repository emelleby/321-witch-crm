"use client";

import { TicketCategories } from "@/components/admin/ticket-categories";
import { PageHeader } from "@/components/page-header";

export default function CategoriesPage() {
  return (
    <div className="container space-y-6">
      <PageHeader
        heading="Ticket Categories & Tags"
        text="Manage categories and tags for organizing tickets"
      />
      <TicketCategories />
    </div>
  );
}
