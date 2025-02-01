"use client";

import { TicketList } from "@/components/tickets/ticket-list";
import Link from "next/link";

export default function CustomerTicketsPage() {
  return (
    <div className="container py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">My Tickets</h1>
        <Link
          href="/customer/tickets/new"
          className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
        >
          Create Ticket
        </Link>
      </div>
      <TicketList userRole="customer" />
    </div>
  );
}
