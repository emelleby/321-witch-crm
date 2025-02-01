import { TicketDetail } from "@/components/tickets/ticket-detail";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="container py-6">
      <TicketDetail ticketId={id} userRole="customer" />
    </div>
  );
}
