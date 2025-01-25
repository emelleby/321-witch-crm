import type { Document } from "@langchain/core/documents";
import { JsonOutputParser } from "@langchain/core/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { SupabaseClient } from "@supabase/supabase-js";
import { OpenAI } from "openai";
import type { TiktokenModel } from "tiktoken";
import { encoding_for_model } from "tiktoken";

import { Database } from "@/database.types";

const CHUNK_SIZE = process.env.CHUNK_SIZE
  ? parseInt(process.env.CHUNK_SIZE)
  : 5000;
const CHUNK_OVERLAP = process.env.CHUNK_OVERLAP
  ? parseInt(process.env.CHUNK_OVERLAP)
  : 1500;

// Initialize text splitter and embeddings
const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: CHUNK_SIZE,
  chunkOverlap: CHUNK_OVERLAP,
});

const embeddings = new OpenAIEmbeddings({
  modelName: process.env.TEXT_EMBEDDING_MODEL || "text-embedding-3-large",
  dimensions: process.env.TEXT_EMBEDDING_DIMENSIONS
    ? parseInt(process.env.TEXT_EMBEDDING_DIMENSIONS)
    : 1536,
});

interface RouterOutput {
  priority: "low" | "normal" | "high" | "urgent";
  assigned_team_id?: string;
  suggested_categories: string[];
  suggested_tags: string[];
  estimated_complexity: "low" | "medium" | "high";
  needs_human_review: boolean;
  human_review_reason?: string;
}

// Support Agent Chain Types
interface SupportAgentOutput {
  response: string;
  needs_human_review: boolean;
  human_review_reason?: string;
  suggested_knowledge_articles?: string[];
  confidence_score: number;
  next_action: "close" | "wait_for_customer" | "escalate" | "follow_up";
}

// Knowledge Agent Chain Types
interface KnowledgeAgentOutput {
  relevant_articles: Array<{
    source_type: string;
    source_id: string;
    relevance_score: number;
    suggested_updates?: string;
  }>;
  new_knowledge_extracted: boolean;
  knowledge_updates?: Array<{
    source_type: string;
    source_id: string;
    content: string;
    reason: string;
  }>;
}

// Add new types for knowledge base
interface KnowledgeBaseResult {
  embedding_id: string;
  source_type: "faq" | "article" | "file";
  source_id: string;
  content: string;
  metadata: {
    title?: string;
    category?: string;
    description?: string;
    update_reason?: string;
    updated_by?: string;
    total_chunks?: number;
    [key: string]: unknown;
  };
  similarity: number;
}

// Summarization chain output
interface SummarizationOutput {
  summary: string;
  key_points: string[];
  source_references: Array<{
    source_type: string;
    source_id: string;
    relevance: string;
  }>;
}

// Types for document processing
interface DocumentProcessingOutput {
  content: string;
  metadata: Record<string, unknown>;
  error?: string;
}

interface ChunkerOutput {
  chunks: string[];
  metadata: {
    original_text: string;
    chunk_map: Record<string, { start: number; end: number }>;
    total_tokens: number;
  };
}

interface QualityCheckOutput {
  passes_check: boolean;
  confidence_score: number;
  needs_human_review: boolean;
  review_reason?: string;
  suggested_improvements?: string[];
}

// Initialize the model
const model = new ChatOpenAI({
  modelName: process.env.ASSISTANT_MODEL || "gpt-4o",
  temperature: 0.3,
});

export const countTokens = (text: string, model: TiktokenModel | string) => {
  const encoding = encoding_for_model(model as TiktokenModel);
  const tokens = encoding.encode(text);
  return tokens.length;
};

/*
Hits the parser API running unstructured.io to extract text from a file
*/
export async function parseSupabaseFile(
  supabaseClient: SupabaseClient,
  filePath: string,
  bucketName: string
): Promise<string | null> {
  try {
    // Fetch the file from Supabase storage
    const { data, error } = await supabaseClient.storage
      .from(bucketName)
      .download(filePath);

    if (error) {
      console.error("Error fetching file:", error);
      return null;
    }
    // Process the file as needed
    const fileBlob = data;

    // Prepare form data
    const form = new FormData();
    form.append("files", fileBlob);
    form.append("strategy", "fast");
    const unstructured_endpoint = process.env.UNSTRUCTURED_ENDPOINT;
    if (!unstructured_endpoint) {
      throw new Error("UNSTRUCTURED_ENDPOINT is not set");
    }
    // Send to parser
    const parserResponse = await fetch(unstructured_endpoint, {
      method: "POST",
      body: form,
      headers: { accept: "application/json" },
    });

    const responseData: { text?: string }[] = await parserResponse.json();
    return responseData
      .map((el) => el.text?.trim())
      .filter(Boolean)
      .join("\n")
      .replace(/\n{3,}/g, "\n\n");
  } catch (error) {
    console.error("Error:", error);
    return null;
  }
}

export const gatherCategories = async (
  supabase: SupabaseClient<Database>,
  organizationId: string
) => {
  const { data, error } = await supabase
    .from("ticket_categories")
    .select("*")
    .eq("organization_id", organizationId);
  const categories: string[] = [];
  if (error) {
    console.error("Error fetching ticket categories", error);
    throw error;
  }

  for (const category of data) {
    categories.push(category.category_name);
  }
  return categories;
};

export const gatherTags = async (
  supabase: SupabaseClient<Database>,
  organizationId: string
): Promise<string[]> => {
  const { data, error } = await supabase
    .from("ticket_tags")
    .select("*")
    .eq("organization_id", organizationId);
  const tags: string[] = [];
  if (error) {
    console.error("Error fetching ticket tags", error);
    throw error;
  }
  for (const tag of data) {
    tags.push(tag.tag_name);
  }
  return tags;
};

export const gatherCategoriesAndTags = async (
  supabase: SupabaseClient,
  organizationId: string
) => {
  const tasks = [
    gatherCategories(supabase, organizationId),
    gatherTags(supabase, organizationId),
  ];
  const [categories, tags] = await Promise.all(tasks);
  return { categories, tags };
};

// Pre-processing chain
export const createPreProcessChain = (
  openai: OpenAI,
  supabase: SupabaseClient<Database>
) => {
  return RunnableSequence.from([
    {
      content: async (input: { text: string; attachments: string[] }) =>
        input.text,
      attachments: async (input: { text: string; attachments: string[] }) =>
        input.attachments,
    },
    {
      moderation: async (input) => {
        const response = await openai.moderations.create({
          input: input.content,
          model: "text-moderation-latest",
        });
        return {
          is_flagged: response.results[0].flagged,
          flag_reason: response.results[0].flagged
            ? JSON.stringify(response.results[0].categories)
            : undefined,
        };
      },
      content_processing: async (input) => {
        // Use Langchain's text splitter
        const docs = await textSplitter.createDocuments([input.content]);
        const chunks = docs.map((doc: Document) => doc.pageContent);
        const total_tokens = countTokens(input.content, "gpt-4");
        return {
          content_chunks: chunks,
          needs_chunking: total_tokens > CHUNK_SIZE,
          total_tokens,
        };
      },
      attachment_processing: async (input) => {
        const attachmentPromises = input.attachments.map(
          async (attachment: string) => {
            const text = await parseSupabaseFile(
              supabase,
              attachment,
              "attachments"
            );
            if (text) {
              const docs = await textSplitter.createDocuments([text]);
              return docs.map((doc: Document) => doc.pageContent);
            }
            return [];
          }
        );

        const results = await Promise.all(attachmentPromises);
        return { attachment_chunks: results };
      },
    },
    // Combine all results
    async (input) => ({
      ...input.moderation,
      ...input.content_processing,
      ...input.attachment_processing,
    }),
  ]);
};

// Router chain
export const createRouterChain = (supabase: SupabaseClient<Database>) => {
  const routerPrompt = PromptTemplate.fromTemplate(`
    Based on the following ticket information, determine the appropriate routing:
    
    Title: {title}
    Description: {description}
    Organization ID: {organization_id}
    
    Available Categories: {categories}
    Available Tags: {tags}
    
    Determine:
    1. Priority level (low, normal, high, urgent)
    2. Suggested categories and tags
    3. Estimated complexity
    4. Whether human review is needed
    
    Respond in JSON format with the following fields:
    {
      "priority": "low" | "normal" | "high" | "urgent",
      "suggested_categories": string[],
      "suggested_tags": string[],
      "estimated_complexity": "low" | "medium" | "high",
      "needs_human_review": boolean,
      "human_review_reason": string | null
    }
  `);

  return RunnableSequence.from([
    {
      // Gather context
      context: async (input: {
        title: string;
        description: string;
        organization_id: string;
      }) => {
        const { categories, tags } = await gatherCategoriesAndTags(
          supabase,
          input.organization_id
        );
        return {
          ...input,
          categories: categories.join(", "),
          tags: tags.join(", "),
        };
      },
    },
    // Format prompt
    routerPrompt,
    // Run through model
    model,
    // Parse output
    new JsonOutputParser<RouterOutput>(),
  ]);
};

// Main processing function
export const processNewTicket = async (
  ticket: Database["public"]["Tables"]["support_tickets"]["Row"],
  supabase: SupabaseClient<Database>,
  openai: OpenAI
) => {
  try {
    // Get ticket attachments
    const { data: attachments } = await supabase
      .from("ticket_file_attachments")
      .select("file_id")
      .eq("ticket_id", ticket.ticket_id);

    // 1. Pre-processing
    const preProcessChain = createPreProcessChain(openai, supabase);
    const preProcessResult = await preProcessChain.invoke({
      text: `${ticket.ticket_title}\n\n${ticket.ticket_description}`,
      attachments: attachments?.map((a) => a.file_id) || [],
    });

    // Handle flagged content
    if (preProcessResult.is_flagged) {
      await supabase
        .from("support_tickets")
        .update({
          ticket_status: "closed",
          ticket_priority: "urgent",
        })
        .eq("ticket_id", ticket.ticket_id);

      // Create notification for admins
      await supabase.from("notifications").insert({
        notification_type: "high_priority",
        notification_title: "Flagged Content Detected",
        notification_content: `Ticket ${ticket.ticket_id} was flagged for: ${preProcessResult.flag_reason}`,
        entity_type: "support_tickets",
        entity_id: ticket.ticket_id,
        organization_id: ticket.organization_id,
      });

      return { error: "Content flagged for review", details: preProcessResult };
    }

    // 2. Generate embeddings for content chunks
    const chunk_embeddings = await Promise.all(
      preProcessResult.content_chunks.map((chunk: string) =>
        embeddings.embedQuery(chunk)
      )
    );

    // Store embeddings
    await Promise.all(
      chunk_embeddings.map((embedding, index) =>
        supabase.from("ticket_embeddings").insert({
          ticket_id: ticket.ticket_id,
          content_embedding: embedding,
          chunk_index: index,
          chunk_text: preProcessResult.content_chunks[index],
        })
      )
    );

    // 3. Route ticket
    const routerChain = createRouterChain(supabase);
    const routingResult = await routerChain.invoke({
      title: ticket.ticket_title,
      description: ticket.ticket_description,
      organization_id: ticket.organization_id,
    });

    // 4. Update ticket with routing results
    await supabase
      .from("support_tickets")
      .update({
        ticket_priority: routingResult.priority,
        assigned_to_team_id: routingResult.assigned_team_id,
      })
      .eq("ticket_id", ticket.ticket_id);

    // 5. Create category and tag assignments
    if (routingResult.suggested_categories.length > 0) {
      const { data: categories } = await supabase
        .from("ticket_categories")
        .select("category_id, category_name")
        .in("category_name", routingResult.suggested_categories);

      if (categories) {
        await Promise.all(
          categories.map((category, index) =>
            supabase.from("ticket_category_assignments").insert({
              ticket_id: ticket.ticket_id,
              category_id: category.category_id,
              is_primary_category: index === 0,
            })
          )
        );
      }
    }

    if (routingResult.suggested_tags.length > 0) {
      const { data: tags } = await supabase
        .from("ticket_tags")
        .select("tag_id, tag_name")
        .in("tag_name", routingResult.suggested_tags);

      if (tags) {
        await Promise.all(
          tags.map((tag) =>
            supabase.from("ticket_tag_assignments").insert({
              ticket_id: ticket.ticket_id,
              tag_id: tag.tag_id,
            })
          )
        );
      }
    }

    return {
      preProcessResult,
      routingResult,
    };
  } catch (error) {
    console.error("Error processing ticket:", error);
    throw error;
  }
};

interface SupportAgentInput {
  message: string;
  ticket_id: string;
  context: {
    ticket_status: string;
    ticket_priority: string;
    created_at: string | null;
    updated_at: string | null;
    created_by: string | null;
    assigned_to: string | null;
    assigned_team: string | null;
  };
  knowledge_base: KnowledgeBaseResult[];
}

// Create Support Agent Chain
export const createSupportAgentChain = () => {
  const supportPrompt = PromptTemplate.fromTemplate(`
    Based on the following ticket information and context, generate an appropriate response:

    Ticket Context:
    Status: {context.ticket_status}
    Priority: {context.ticket_priority}
    Created By: {context.created_by}
    Assigned To: {context.assigned_to}
    Team: {context.assigned_team}
    
    Customer Message: {message}
    
    Relevant Knowledge Articles:
    {knowledge_base}
    
    Guidelines:
    1. Be professional and empathetic
    2. Use knowledge base information when relevant
    3. Ask for clarification if needed
    4. Suggest solutions based on previous similar cases
    5. Know when to escalate to human agents

    Respond in JSON format with:
    {
      "response": "Your response to the customer",
      "needs_human_review": boolean,
      "human_review_reason": "Reason if needs review",
      "suggested_knowledge_articles": ["article_ids"],
      "confidence_score": number between 0 and 1,
      "next_action": "close" | "wait_for_customer" | "escalate" | "follow_up"
    }
  `);

  return RunnableSequence.from([
    {
      message: (input: SupportAgentInput) => input.message,
      context: (input: SupportAgentInput) => input.context,
      knowledge_base: (input: SupportAgentInput) =>
        input.knowledge_base
          .map((k) => `${k.source_type.toUpperCase()}: ${k.content}`)
          .join("\n\n"),
    },
    supportPrompt,
    model,
    new JsonOutputParser<SupportAgentOutput>(),
  ]);
};

// Create summarization chain
export const createSummarizationChain = (model: ChatOpenAI) => {
  const summarizationPrompt = PromptTemplate.fromTemplate(`
    Summarize the following knowledge base excerpts while maintaining critical information:

    Context:
    {context}

    Source References:
    {sources}

    Guidelines:
    1. Preserve specific details, numbers, and technical information
    2. Maintain procedural steps if present
    3. Include error conditions and edge cases
    4. Keep product/feature names and specifications
    5. Retain any warnings or important notes

    Respond in JSON format with:
    {
      "summary": "Comprehensive summary of the information",
      "key_points": ["Array of crucial points"],
      "source_references": [
        {
          "source_type": "Type of source (faq/article/file)",
          "source_id": "ID of the source",
          "relevance": "Why this source is relevant"
        }
      ]
    }
  `);

  return RunnableSequence.from([
    {
      context: (input: { chunks: KnowledgeBaseResult[] }) =>
        input.chunks.map((c) => c.content).join("\n\n"),
      sources: (input: { chunks: KnowledgeBaseResult[] }) =>
        input.chunks
          .map(
            (c) =>
              `${c.source_type.toUpperCase()} (${
                c.source_id
              }): Similarity ${c.similarity.toFixed(3)}`
          )
          .join("\n"),
    },
    summarizationPrompt,
    model,
    new JsonOutputParser<SummarizationOutput>(),
  ]);
};

// Update Knowledge Agent Chain to use new knowledge base
export const createKnowledgeAgentChain = (
  supabase: SupabaseClient<Database>
) => {
  const knowledgePrompt = PromptTemplate.fromTemplate(`
    Based on the following ticket information and similar knowledge base articles, analyze and suggest updates:

    Ticket Title: {title}
    Description: {description}
    Resolution: {resolution}
    Category: {category}
    Tags: {tags}

    Relevant Knowledge Base Content:
    {summary}

    Key Points from Knowledge Base:
    {key_points}

    Tasks:
    1. Analyze similarity between current ticket and existing knowledge
    2. Identify information gaps
    3. Suggest updates to existing content
    4. Propose new content for unique solutions
    5. Extract reusable patterns

    Respond in JSON format with:
    {
      "relevant_articles": [
        {
          "source_type": "faq/article/file",
          "source_id": "string",
          "relevance_score": number,
          "suggested_updates": "string or null"
        }
      ],
      "new_knowledge_extracted": boolean,
      "knowledge_updates": [
        {
          "source_type": "faq/article/file",
          "source_id": "string or null for new content",
          "content": "string",
          "reason": "string"
        }
      ]
    }
  `);

  const summarizationChain = createSummarizationChain(model);

  return RunnableSequence.from([
    {
      // First get the embeddings and similar content
      similar_content: async (input: {
        ticket_id: string;
        resolution: string;
      }) => {
        // Get ticket details
        const { data: ticket } = await supabase
          .from("support_tickets")
          .select(
            `
            *,
            ticket_category_assignments (
              ticket_categories (*)
            ),
            ticket_tag_assignments (
              ticket_tags (*)
            )
          `
          )
          .eq("ticket_id", input.ticket_id)
          .single();

        // Generate embedding for the query
        const queryEmbeddingArray = await embeddings.embedQuery(
          `${ticket?.ticket_title}\n${ticket?.ticket_description}\n${input.resolution}`
        );
        const query_embedding = queryEmbeddingArray.join(",");

        // Search across all knowledge bases
        const { data: similar_content } = await supabase.rpc(
          "match_knowledge_base",
          {
            query_embedding,
            match_threshold: 0.7,
            match_count: 5,
            organization_id: ticket?.organization_id,
          }
        );

        return {
          ticket,
          similar_content: similar_content || [],
        };
      },
    },
    // Then summarize the similar content
    {
      title: (input) => input.similar_content.ticket?.ticket_title,
      description: (input) => input.similar_content.ticket?.ticket_description,
      resolution: (input) => input.resolution,
      category: (input) =>
        input.similar_content.ticket?.ticket_category_assignments
          ?.map(
            (tca: { ticket_categories: { category_name: string } }) =>
              tca.ticket_categories.category_name
          )
          .join(", ") || "",
      tags: (input) =>
        input.similar_content.ticket?.ticket_tag_assignments
          ?.map(
            (tta: { ticket_tags: { tag_name: string } }) =>
              tta.ticket_tags.tag_name
          )
          .join(", ") || "",
      summary: async (input) => {
        if (!input.similar_content.similar_content.length) {
          return "No relevant knowledge base content found.";
        }
        const summarization = await summarizationChain.invoke({
          chunks: input.similar_content.similar_content,
        });
        return summarization.summary;
      },
      key_points: async (input) => {
        if (!input.similar_content.similar_content.length) {
          return "No key points available.";
        }
        const summarization = await summarizationChain.invoke({
          chunks: input.similar_content.similar_content,
        });
        return summarization.key_points.join("\n");
      },
    },
    knowledgePrompt,
    model,
    new JsonOutputParser<KnowledgeAgentOutput>(),
  ]);
};

// Update the knowledge base
export const updateKnowledgeBase = async (
  updates: KnowledgeAgentOutput["knowledge_updates"],
  organization_id: string,
  user_id: string,
  supabase: SupabaseClient<Database>
) => {
  if (!updates?.length) return;

  for (const update of updates) {
    const content =
      update.source_type === "faq"
        ? `--- Question ---\n${
            update.content.split("\n")[0]
          }\n--- Answer ---\n${update.content.split("\n").slice(1).join("\n")}`
        : update.content;

    // Generate chunks using Langchain's text splitter
    const docs = await textSplitter.createDocuments([content]);
    const chunks = docs.map((doc: Document) => doc.pageContent);

    if (update.source_id) {
      // Delete old embeddings
      await supabase.from("knowledge_base_embeddings").delete().match({
        source_type: update.source_type,
        source_id: update.source_id,
      });

      // Create new embeddings for each chunk in parallel
      const embeddingPromises = chunks.map(
        async (chunk: string, index: number) => {
          const embeddingArray = await embeddings.embedQuery(chunk);
          if (!update.source_id) throw new Error("Source ID is required");

          return supabase.from("knowledge_base_embeddings").insert({
            organization_id,
            source_type: update.source_type,
            source_id: update.source_id,
            chunk_index: index,
            content: chunk,
            content_embedding: embeddingArray.join(","),
            metadata: {
              update_reason: update.reason,
              updated_by: user_id,
              total_chunks: chunks.length,
            },
          });
        }
      );

      await Promise.all(embeddingPromises);
    }
  }
};

// Document Processing Chain
export const createDocumentProcessingChain = () => {
  const processDocument = async (
    content: string,
    fileType: string
  ): Promise<DocumentProcessingOutput> => {
    try {
      // Basic text extraction for now
      // TODO: Implement Unstructured.io integration
      return {
        content,
        metadata: {
          file_type: fileType,
          processed_at: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error("Error processing document:", error);
      return {
        content: "",
        metadata: {},
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  };

  return processDocument;
};

// Enhanced Chunker Chain
export const createEnhancedChunkerChain = (model: ChatOpenAI) => {
  const chunkerPrompt = PromptTemplate.fromTemplate(`
    Split the following content into meaningful chunks while preserving context:

    Content: {content}
    Max Chunk Size: {max_chunk_size}
    
    Guidelines:
    1. Keep logical sections together
    2. Don't split mid-sentence
    3. Preserve hierarchical structure
    4. Include relevant context in each chunk
    
    Return chunks in JSON format:
    {
      "chunks": ["array of chunks"],
      "metadata": {
        "chunk_map": {
          "chunk_id": { "start": number, "end": number }
        }
      }
    }
  `);

  return RunnableSequence.from([
    {
      content: (input: { text: string; max_chunk_size?: number }) => input.text,
      max_chunk_size: (input) => input.max_chunk_size || CHUNK_SIZE,
    },
    chunkerPrompt,
    model,
    new JsonOutputParser<ChunkerOutput>(),
  ]);
};

// Quality Check Chain
export const createQualityCheckChain = (model: ChatOpenAI) => {
  const qualityPrompt = PromptTemplate.fromTemplate(`
    Evaluate the following response for quality and appropriateness:

    Response: {response}
    Context: {context}
    
    Evaluate:
    1. Accuracy and correctness
    2. Completeness
    3. Tone and professionalism
    4. Technical accuracy
    5. Need for human review
    
    Return evaluation in JSON format:
    {
      "passes_check": boolean,
      "confidence_score": number between 0 and 1,
      "needs_human_review": boolean,
      "review_reason": "string if needs review",
      "suggested_improvements": ["array of suggestions"]
    }
  `);

  return RunnableSequence.from([
    {
      response: (input: { response: string; context: string }) =>
        input.response,
      context: (input) => input.context,
    },
    qualityPrompt,
    model,
    new JsonOutputParser<QualityCheckOutput>(),
  ]);
};

// Post-Resolution Analytics Chain
interface AnalyticsOutput {
  resolution_quality: number;
  response_time: number;
  complexity_score: number;
  needs_feedback: boolean;
  feedback_type: "automated" | "agent" | "none";
  learning_opportunities: string[];
}

export const createAnalyticsChain = (model: ChatOpenAI) => {
  const analyticsPrompt = PromptTemplate.fromTemplate(`
    Analyze the following ticket resolution:

    Ticket: {ticket_info}
    Resolution: {resolution}
    Time to Resolve: {time_to_resolve}
    
    Analyze:
    1. Resolution quality
    2. Response time vs SLA
    3. Complexity of issue
    4. Learning opportunities
    5. Feedback requirements
    
    Return analysis in JSON format:
    {
      "resolution_quality": number between 0 and 1,
      "response_time": time in minutes,
      "complexity_score": number between 0 and 1,
      "needs_feedback": boolean,
      "feedback_type": "automated" | "agent" | "none",
      "learning_opportunities": ["array of learning points"]
    }
  `);

  return RunnableSequence.from([
    {
      ticket_info: (input: {
        ticket: Database["public"]["Tables"]["support_tickets"]["Row"];
        resolution: string;
        time_to_resolve: number;
      }) => `${input.ticket.ticket_title}\n${input.ticket.ticket_description}`,
      resolution: (input) => input.resolution,
      time_to_resolve: (input) => input.time_to_resolve,
    },
    analyticsPrompt,
    model,
    new JsonOutputParser<AnalyticsOutput>(),
  ]);
};

// Update the processTicketResolution function to use new chains
export const processTicketResolution = async (
  ticket_id: string,
  resolution: string,
  supabase: SupabaseClient<Database>
) => {
  try {
    // Get ticket details
    const { data: ticket } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("ticket_id", ticket_id)
      .single();

    if (!ticket) throw new Error("Ticket not found");

    // Calculate resolution time
    const resolutionTime =
      new Date().getTime() - new Date(ticket.created_at || "").getTime();
    const timeToResolveMinutes = Math.floor(resolutionTime / (1000 * 60));

    // Run analytics
    const analyticsChain = createAnalyticsChain(model);
    const analyticsResult = await analyticsChain.invoke({
      ticket,
      resolution,
      time_to_resolve: timeToResolveMinutes,
    });

    // Update knowledge base if needed
    const knowledgeChain = createKnowledgeAgentChain(supabase);
    const knowledgeResult = await knowledgeChain.invoke({
      ticket_id,
      resolution,
    });

    if (knowledgeResult.new_knowledge_extracted) {
      await updateKnowledgeBase(
        knowledgeResult.knowledge_updates,
        ticket.organization_id,
        "system",
        supabase
      );
    }

    // Update ticket status
    await supabase
      .from("support_tickets")
      .update({
        ticket_status: "resolved",
        updated_at: new Date().toISOString(),
      })
      .eq("ticket_id", ticket_id);

    // Create resolution audit log
    // await supabase.from("audit_logs").insert({
    //   entity_type: "support_tickets" as const,
    //   entity_id: ticket_id,
    //   action: "resolve",
    //   changes: JSON.stringify({
    //     resolution,
    //     knowledge_updates: knowledgeResult.knowledge_updates,
    //     analytics: {
    //       resolution_quality: analyticsResult.resolution_quality,
    //       response_time: analyticsResult.response_time,
    //       complexity_score: analyticsResult.complexity_score,
    //       needs_feedback: analyticsResult.needs_feedback,
    //       feedback_type: analyticsResult.feedback_type,
    //       learning_opportunities: analyticsResult.learning_opportunities,
    //     },
    //   }),
    //   performed_by_user_id: "system",
    //   organization_id: ticket.organization_id,
    // });

    // Handle feedback if needed
    if (analyticsResult.needs_feedback) {
      await supabase.from("notifications").insert({
        notification_type: "high_priority",
        notification_title: "Feedback Required",
        notification_content: `Ticket ${ticket_id} requires ${analyticsResult.feedback_type} feedback`,
        entity_type: "support_tickets",
        entity_id: ticket_id,
        organization_id: ticket.organization_id,
      });
    }

    return {
      status: "success",
      knowledge_updates: knowledgeResult.knowledge_updates,
      relevant_articles: knowledgeResult.relevant_articles,
      analytics: analyticsResult,
    };
  } catch (error) {
    console.error("Error processing ticket resolution:", error);
    throw error;
  }
};
