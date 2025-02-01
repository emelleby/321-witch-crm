"use client";

import { TicketList } from "@/components/tickets/ticket-list";

export default function AgentTicketsPage() {
  return (
    <div className="container py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">My Assigned Tickets</h1>
      </div>
      <TicketList userRole="agent" />
    </div>
  );
}
