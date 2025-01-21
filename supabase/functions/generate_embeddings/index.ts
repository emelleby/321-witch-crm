// Import type definitions for Supabase Edge Runtime
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import OpenAI from "https://deno.land/x/openai@v4.69.0/mod.ts";
import { corsHeaders } from "../_shared/cors.ts";

// Access the OPENAI_API_KEY directly from environment variables
const openaiApiKey = Deno.env.get("OPENAI_API_KEY");

// Validate the presence of the API key
if (!openaiApiKey) {
  console.error("OPENAI_API_KEY is missing");
  throw new Error("OPENAI_API_KEY environment variable is missing");
}

// Initialize the OpenAI client with the API key
const client = new OpenAI({
  apiKey: openaiApiKey,
});

// Function to generate embeddings using OpenAI
async function generateEmbeddings(text: string) {
  try {
    const response = await client.embeddings.create({
      model: "text-embedding-ada-002", // Correct model name
      input: text,
    });

    // Validate the response structure
    if (!response.data || !response.data[0].embedding) {
      throw new Error("Invalid response structure from OpenAI");
    }

    return response.data[0].embedding;
  } catch (error) {
    console.error("Error generating embeddings:", error);
    throw new Error("Failed to generate embeddings");
  }
}

// Serve the Edge Function
Deno.serve(async (req) => {
  // This is needed if you're planning to invoke your function from a browser.
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    // Log headers for debugging
    console.log("Request Headers:", req.headers);

    // Log the raw request body
    const rawBody = await req.text();
    console.log("Raw body:", rawBody);

    // Parse the JSON body
    const { text } = JSON.parse(rawBody);

    // Validate input
    if (!text || typeof text !== "string") {
      return new Response(
        JSON.stringify({
          error:
            "Invalid input: 'text' field is required and must be a string.",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    console.log("Received text:", text);

    // Generate embeddings
    const embedding = await generateEmbeddings(text);
    const data = { embedding };
    console.log("Generated embedding:", embedding);

    // Return the embedding as JSON
    return new Response(JSON.stringify(data), {
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  }
});
