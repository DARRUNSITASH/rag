import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface RequestBody {
  query: string;
  user_id: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { query, user_id }: RequestBody = await req.json();

    if (!query || !user_id) {
      return new Response(
        JSON.stringify({ error: 'Query and user_id are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const queryEmbedding = await generateEmbedding(query);

    const { data: chunks, error: searchError } = await supabase.rpc(
      'match_document_chunks',
      {
        query_embedding: queryEmbedding,
        match_threshold: 0.3,
        match_count: 10,
        user_id_filter: user_id
      }
    );

    if (searchError) {
      console.error('Search error:', searchError);
      return new Response(
        JSON.stringify({ error: 'Search failed', details: searchError }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!chunks || chunks.length === 0) {
      return new Response(
        JSON.stringify({
          answer: 'I could not find any relevant information in your documents to answer this question. Please ensure you have uploaded documents related to this topic.',
          citations: [],
          retrieved_chunks: []
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const context = chunks.map((chunk: any, index: number) => 
      `[${index + 1}] From ${chunk.filename} (${chunk.file_type}):\n${chunk.chunk_text}\n`
    ).join('\n');

    const answer = await generateAnswer(query, context);

    const citations = chunks.map((chunk: any, index: number) => ({
      source: chunk.filename,
      type: chunk.file_type.charAt(0).toUpperCase() + chunk.file_type.slice(1),
      reference: chunk.chunk_metadata?.page_number 
        ? `Page ${chunk.chunk_metadata.page_number}`
        : chunk.chunk_metadata?.timestamp 
        ? `Timestamp ${chunk.chunk_metadata.timestamp}`
        : `Chunk ${chunk.chunk_index}`,
      document_id: chunk.document_id
    }));

    return new Response(
      JSON.stringify({
        answer,
        citations,
        retrieved_chunks: chunks.map((c: any) => ({
          chunk_id: c.id,
          document_id: c.document_id,
          score: c.similarity
        }))
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = Deno.env.get('GOOGLE_AI_API_KEY');

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: {
          parts: [{ text }]
        },
        taskType: 'RETRIEVAL_DOCUMENT'
      }),
    }
  );

  const data = await response.json();
  return data.embedding.values;
}

async function generateAnswer(query: string, context: string): Promise<string> {
  const apiKey = Deno.env.get('GOOGLE_AI_API_KEY');

  const systemPrompt = `You are an advanced Multimodal Retrieval-Augmented Generation (RAG) Assistant for an Intelligence Centre.
You analyze and reason across multiple data types including text, PDFs, images, videos, and audio transcripts.

Your goal is to accurately answer the user's query using ONLY the provided retrieved context.
Every statement must be grounded in the source data. Do not make assumptions or add information not present in the context.

Provide a clear, concise answer in 2-3 paragraphs that directly addresses the query.
If the context doesn't contain sufficient information, clearly state this limitation.`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `${systemPrompt}\n\nUser Query: ${query}\n\nRetrieved Context:\n${context}\n\nProvide a well-structured answer based solely on the above context.`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 800,
        }
      }),
    }
  );

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}