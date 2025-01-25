import { NextResponse } from "next/server";
import { OpenAI } from "openai";

import { Database } from "@/database.types";
import { createSupportAgentChain } from "@/lib/server/ai/chain";
import { createClient } from "@/utils/supabase/server";

type KnowledgeBaseResult =
  Database["public"]["Functions"]["match_knowledge_base"]["Returns"][number];

interface MatchKnowledgeBaseParams {
  query_embedding: string;
  match_threshold: number;
  match_count: number;
  organization_id: string | null;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { ticketId, message } = await request.json();

    // Get the supabase client
    const supabase = await createClient();

    // Get ticket details
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
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Search across all knowledge bases
    const { data: relevantKnowledge } = await supabase.rpc(
      "match_knowledge_base",
      {
        query_embedding: message,
        match_threshold: 0.7,
        match_count: 5,
        organization_id: ticket?.organization_id || null,
      }
    );

    // Map the knowledge base results
    const relevantContext = (relevantKnowledge || []).map(
      (k: KnowledgeBaseResult) => ({
        source_type: k.source_type,
        source_id: k.source_id,
        content: k.content,
        metadata: k.metadata || {},
        similarity: k.similarity,
      })
    );

    // Create and run the support agent chain
    const supportAgentChain = createSupportAgentChain();
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
      knowledge_base: relevantContext,
    });

    return NextResponse.json({
      response: agentResult.response,
      needs_human_review: agentResult.needs_human_review,
      human_review_reason: agentResult.human_review_reason,
      confidence_score: agentResult.confidence_score,
      next_action: agentResult.next_action,
    });
  } catch (error) {
    console.error("Error generating AI preview:", error);
    return NextResponse.json(
      { error: "Failed to generate preview" },
      { status: 500 }
    );
  }
}
