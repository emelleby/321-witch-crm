"use client";

import { CreateTicketForm } from "@/components/tickets/create-ticket-form";

export default function NewTicketPage() {
  return (
    <div className="container py-6">
      <h1 className="text-3xl font-bold mb-6">Create New Ticket</h1>
      <CreateTicketForm />
    </div>
  );
}
