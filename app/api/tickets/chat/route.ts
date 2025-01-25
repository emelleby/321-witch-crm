import { NextResponse } from "next/server.js";
import { createSupportAgentChain } from "@/lib/server/ai/chain.js";
import { createClient } from "@/utils/supabase/server.js";

type KnowledgeBaseResult = {
  embedding_id: string;
  source_type: "faq" | "article" | "file";
  source_id: string;
  content: string;
  metadata: any;
  similarity: number;
};

export async function POST(request: Request) {
  try {
    const { ticketId, message, userId, userRole } = await request.json();
    const supabase = await createClient();

    // Insert the message
    const { data: newMessage, error: messageError } = await supabase
      .from("ticket_messages")
      .insert({
        ticket_id: ticketId,
        sender_user_id: userId,
        message_content: message,
        is_internal_note: false,
        agent_has_read: userRole === "agent" || userRole === "admin",
        customer_has_read: userRole === "customer",
        is_ai_generated: false,
      })
      .select()
      .single();

    if (messageError) throw messageError;

    // If the user is a customer, trigger AI processing
    if (userRole === "customer") {
      const supportAgentChain = createSupportAgentChain();
      const { data: ticket } = await supabase
        .from("support_tickets")
        .select(
          `
          *,
          created_by_user:user_profiles!support_tickets_created_by_user_id_fkey(user_id, display_name),
          assigned_to_user:user_profiles!support_tickets_assigned_to_user_id_fkey(user_id, display_name),
          assigned_to_team:support_teams!support_tickets_assigned_to_team_id_fkey(team_id, team_name)
        `
        )
        .eq("ticket_id", ticketId)
        .single();

      if (!ticket) {
        throw new Error("Ticket not found");
      }

      // Get relevant knowledge base articles
      const { data: relevantKnowledge } = (await supabase.rpc(
        "match_knowledge_base",
        {
          query_embedding: message,
          match_threshold: 0.7,
          match_count: 5,
          organization_id: ticket.organization_id,
        }
      )) as { data: KnowledgeBaseResult[] };

      const agentResult = await supportAgentChain.invoke({
        message,
        ticket_id: ticketId,
        context: {
          ticket_status: ticket.ticket_status,
          ticket_priority: ticket.ticket_priority,
          created_at: ticket.created_at,
          updated_at: ticket.updated_at,
          created_by: ticket.created_by_user?.display_name || null,
          assigned_to: ticket.assigned_to_user?.display_name || null,
          assigned_team: ticket.assigned_to_team?.team_name || null,
        },
        knowledge_base: relevantKnowledge || [],
      });

      // Insert AI response
      await supabase.from("ticket_messages").insert({
        ticket_id: ticketId,
        message_content: agentResult.response,
        is_internal_note: false,
        agent_has_read: true,
        customer_has_read: false,
        is_ai_generated: true,
      });
    }

    return NextResponse.json({
      success: true,
      messageId: newMessage.message_id,
    });
  } catch (error) {
    console.error("Error in chat route:", error);
    return NextResponse.json(
      { error: "Failed to process message" },
      { status: 500 }
    );
  }
}
