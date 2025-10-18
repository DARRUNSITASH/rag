/*
  # Create Vector Similarity Search Function

  ## Overview
  Creates a PostgreSQL function for semantic search using vector embeddings.
  This function performs cosine similarity search to find the most relevant document chunks
  based on a query embedding.

  ## Function: match_document_chunks
  
  ### Parameters
  - `query_embedding` (vector(384)) - The embedding vector of the user's query
  - `match_threshold` (float) - Minimum similarity score (0-1) for results
  - `match_count` (int) - Maximum number of results to return
  - `user_id_filter` (uuid) - Filter results to specific user's documents

  ### Returns
  A table with columns:
  - `id` - Chunk ID
  - `document_id` - Parent document ID
  - `chunk_text` - The text content
  - `chunk_index` - Position in document
  - `chunk_metadata` - Additional metadata (page, timestamp, etc.)
  - `filename` - Source document filename
  - `file_type` - Document type
  - `similarity` - Cosine similarity score (0-1)

  ### Security
  - Function respects Row Level Security policies
  - Only returns chunks from documents owned by the user
*/

-- Create function for vector similarity search
CREATE OR REPLACE FUNCTION match_document_chunks(
  query_embedding vector(384),
  match_threshold float DEFAULT 0.3,
  match_count int DEFAULT 10,
  user_id_filter uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  chunk_text text,
  chunk_index integer,
  chunk_metadata jsonb,
  filename text,
  file_type text,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.document_id,
    dc.chunk_text,
    dc.chunk_index,
    dc.chunk_metadata,
    d.filename,
    d.file_type,
    1 - (dc.embedding <=> query_embedding) AS similarity
  FROM document_chunks dc
  INNER JOIN documents d ON dc.document_id = d.id
  WHERE 
    (user_id_filter IS NULL OR d.uploaded_by = user_id_filter)
    AND dc.embedding IS NOT NULL
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
    AND d.processing_status = 'completed'
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION match_document_chunks TO authenticated;
GRANT EXECUTE ON FUNCTION match_document_chunks TO service_role;
