// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import OpenAI from "https://deno.land/x/openai@v4.69.0/mod.ts";

const client = new OpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY"),
});


async function generateEmbeddings(text: string) {
  const response = await client.embeddings.create({
    model: "text-embedding-3-large",
    input: text,
    dimensions: 1536
  })

  return response.data[0].embedding
}

Deno.serve(async (req) => {
  const { text } = await req.json()
  const embedding = await generateEmbeddings(text)
  const data = {
    embedding
  }
  return new Response(
    JSON.stringify(data),
    { headers: { "Content-Type": "application/json" } },
  )
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/generate_embeddings' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
