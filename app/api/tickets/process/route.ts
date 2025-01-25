import { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { OpenAI } from "openai";

import { Database } from "@/database.types";
import {
  createPreProcessChain,
  createSupportAgentChain,
} from "@/lib/server/ai/chain";
import { createClient } from "@/utils/supabase/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { ticketId, messageId } = await request.json();

    // Get the supabase client
    const supabase = await createClient();

    // Start background processing
    processMessageInBackground(ticketId, messageId, supabase).catch(
      console.error
    );

    // Return immediately
    return NextResponse.json({ success: true, message: "Processing started" });
  } catch (error) {
    console.error("Error initiating ticket processing:", error);
    return NextResponse.json(
      { error: "Failed to initiate processing" },
      { status: 500 }
    );
  }
}

async function processMessageInBackground(
  ticketId: string,
  messageId: string,
  supabase: SupabaseClient<Database>
) {
  let currentTicket:
    | Database["public"]["Tables"]["support_tickets"]["Row"]
    | null = null;

  try {
    // Get the ticket and message details
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

    const { data: message } = await supabase
      .from("ticket_messages")
      .select(
        `
        *,
        sender:user_profiles!ticket_messages_sender_user_id_fkey(user_id, display_name)
      `
      )
      .eq("message_id", messageId)
      .single();

    if (!ticket || !message) {
      throw new Error("Ticket or message not found");
    }

    // Get file attachments
    const { data: attachments } = await supabase
      .from("message_file_attachments")
      .select("file_id")
      .eq("message_id", messageId);

    currentTicket = ticket;

    // Create and run the pre-process chain
    const preProcessChain = createPreProcessChain(openai, supabase);
    const preProcessResult = await preProcessChain.invoke({
      text: message.message_content,
      attachments: attachments?.map((a) => a.file_id) || [],
    });

    // If content is flagged, notify admin and return
    if (preProcessResult.is_flagged) {
      await supabase.from("notifications").insert({
        organization_id: ticket.organization_id,
        notification_type: "high_priority",
        entity_type: "ticket_messages",
        entity_id: messageId,
        notification_title: "Content Flagged",
        notification_content: `Message content was flagged: ${preProcessResult.flag_reason}`,
      });
      return;
    }

    // Get relevant knowledge base articles
    const { data: relevantKnowledge } = await supabase.rpc(
      "match_knowledge_base",
      {
        query_embedding: message.message_content,
        match_threshold: 0.7,
        match_count: 3,
        organization_id: ticket.organization_id,
      }
    );

    // Create and run the support agent chain
    const supportAgentChain = createSupportAgentChain();
    const agentResult = await supportAgentChain.invoke({
      message: message.message_content,
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
      knowledge_base: (relevantKnowledge || []).map((k) => ({
        ...k,
        source_type: k.source_type as "faq" | "article" | "file",
        metadata: (k.metadata as Record<string, unknown>) || {},
      })),
    });

    // Save AI response
    await supabase.from("ticket_messages").insert({
      ticket_id: ticketId,
      message_content: agentResult.response,
      is_ai_generated: true,
      agent_has_read: false,
      customer_has_read: true,
      sender_user_id: null,
      organization_id: ticket.organization_id,
      is_internal_note: false,
      attached_file_ids: [],
    });

    // If human review is needed, create a notification
    if (agentResult.needs_human_review) {
      await supabase.from("notifications").insert({
        organization_id: ticket.organization_id,
        notification_type: "high_priority",
        entity_type: "support_tickets",
        entity_id: ticketId,
        notification_title: "Human Review Required",
        notification_content:
          agentResult.human_review_reason || "AI requested human review",
      });
    }

    // Update ticket status based on agent's next action
    const statusUpdate: Partial<
      Database["public"]["Tables"]["support_tickets"]["Update"]
    > = {};
    switch (agentResult.next_action) {
      case "close":
        statusUpdate.ticket_status = "resolved";
        break;
      case "wait_for_customer":
        statusUpdate.ticket_status = "waiting_on_customer";
        break;
      case "escalate":
        statusUpdate.ticket_priority = "high";
        break;
      case "follow_up":
        statusUpdate.ticket_status = "in_progress";
        break;
    }

    if (Object.keys(statusUpdate).length > 0) {
      await supabase
        .from("support_tickets")
        .update(statusUpdate)
        .eq("ticket_id", ticketId);
    }
  } catch (error) {
    console.error("Error in background processing:", error);
    // Log error and create notification for admin
    if (currentTicket) {
      await supabase.from("notifications").insert({
        organization_id: currentTicket.organization_id,
        notification_type: "high_priority",
        entity_type: "support_tickets",
        entity_id: ticketId,
        notification_title: "AI Processing Error",
        notification_content: `Error processing ticket: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      });
    }
  }
}
