/*
  # Multimodal RAG Intelligence Centre Schema

  ## Overview
  This migration creates the database schema for a Multimodal RAG system that handles
  text documents, PDFs, DOCX files, images, and audio transcripts with vector embeddings
  for semantic search and retrieval.

  ## New Tables
  
  ### `documents`
  Stores metadata about uploaded documents across all modalities
  - `id` (uuid, primary key) - Unique document identifier
  - `filename` (text) - Original filename
  - `file_type` (text) - File type (pdf, docx, txt, image, audio)
  - `file_size` (bigint) - File size in bytes
  - `storage_path` (text) - Path in Supabase storage
  - `uploaded_at` (timestamptz) - Upload timestamp
  - `uploaded_by` (uuid) - User who uploaded (references auth.users)
  - `metadata` (jsonb) - Additional metadata (page count, duration, dimensions, etc.)
  - `processing_status` (text) - Status: pending, processing, completed, failed
  - `created_at` (timestamptz) - Record creation time
  
  ### `document_chunks`
  Stores processed text chunks from documents with embeddings
  - `id` (uuid, primary key) - Unique chunk identifier
  - `document_id` (uuid) - References documents table
  - `chunk_text` (text) - Extracted text content
  - `chunk_index` (integer) - Position/order within document
  - `embedding` (vector(384)) - Vector embedding for semantic search
  - `chunk_metadata` (jsonb) - Page number, timestamp, coordinates, etc.
  - `created_at` (timestamptz) - Record creation time

  ### `queries`
  Stores user queries and generated responses for audit/analysis
  - `id` (uuid, primary key) - Unique query identifier
  - `user_id` (uuid) - User who made the query
  - `query_text` (text) - Original user query
  - `retrieved_chunks` (jsonb) - Array of retrieved chunk IDs and scores
  - `generated_response` (text) - RAG-generated answer
  - `citations` (jsonb) - Source citations with metadata
  - `created_at` (timestamptz) - Query timestamp

  ## Security
  - Enable RLS on all tables
  - Users can only access their own documents and queries
  - Authenticated users required for all operations

  ## Extensions
  - Enables vector extension for pgvector support (embeddings storage and similarity search)

  ## Indexes
  - HNSW index on embeddings for fast similarity search
  - B-tree indexes on foreign keys and frequently queried columns
*/

-- Enable vector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filename text NOT NULL,
  file_type text NOT NULL CHECK (file_type IN ('pdf', 'docx', 'txt', 'image', 'audio')),
  file_size bigint NOT NULL,
  storage_path text NOT NULL,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metadata jsonb DEFAULT '{}'::jsonb,
  processing_status text NOT NULL DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  uploaded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create document_chunks table
CREATE TABLE IF NOT EXISTS document_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunk_text text NOT NULL,
  chunk_index integer NOT NULL,
  embedding vector(384),
  chunk_metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create queries table for audit trail
CREATE TABLE IF NOT EXISTS queries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query_text text NOT NULL,
  retrieved_chunks jsonb DEFAULT '[]'::jsonb,
  generated_response text,
  citations jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_documents_processing_status ON documents(processing_status);
CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_queries_user_id ON queries(user_id);

-- Create HNSW index for vector similarity search (faster than IVFFlat for most use cases)
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding ON document_chunks 
USING hnsw (embedding vector_cosine_ops);

-- Enable Row Level Security
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE queries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for documents table
CREATE POLICY "Users can view own documents"
  ON documents FOR SELECT
  TO authenticated
  USING (auth.uid() = uploaded_by);

CREATE POLICY "Users can insert own documents"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Users can update own documents"
  ON documents FOR UPDATE
  TO authenticated
  USING (auth.uid() = uploaded_by)
  WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Users can delete own documents"
  ON documents FOR DELETE
  TO authenticated
  USING (auth.uid() = uploaded_by);

-- RLS Policies for document_chunks table
CREATE POLICY "Users can view chunks from own documents"
  ON document_chunks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = document_chunks.document_id
      AND documents.uploaded_by = auth.uid()
    )
  );

CREATE POLICY "Users can insert chunks for own documents"
  ON document_chunks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = document_chunks.document_id
      AND documents.uploaded_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete chunks from own documents"
  ON document_chunks FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = document_chunks.document_id
      AND documents.uploaded_by = auth.uid()
    )
  );

-- RLS Policies for queries table
CREATE POLICY "Users can view own queries"
  ON queries FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own queries"
  ON queries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
