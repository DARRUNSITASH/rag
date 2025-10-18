import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Document {
  id: string;
  filename: string;
  file_type: 'pdf' | 'docx' | 'txt' | 'image' | 'audio';
  file_size: number;
  storage_path: string;
  uploaded_by: string;
  metadata: Record<string, any>;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  uploaded_at: string;
  created_at: string;
}

export interface DocumentChunk {
  id: string;
  document_id: string;
  chunk_text: string;
  chunk_index: number;
  embedding?: number[];
  chunk_metadata: Record<string, any>;
  created_at: string;
}

export interface Query {
  id: string;
  user_id: string;
  query_text: string;
  retrieved_chunks: Array<{
    chunk_id: string;
    score: number;
    document_id: string;
  }>;
  generated_response: string;
  citations: Array<{
    source: string;
    type: string;
    reference: string;
  }>;
  created_at: string;
}
