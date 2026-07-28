// ============================================================
// Tipe TypeScript untuk tabel-tabel Supabase
// ============================================================

export type Database = {
  public: {
    Tables: {
      admin_users: {
        Row: {
          id: string;
          email: string;
          password_hash: string;
          full_name: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          password_hash: string;
          full_name?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          email?: string;
          password_hash?: string;
          full_name?: string | null;
          is_active?: boolean;
          updated_at?: string;
        };
      };
      document_sources: {
        Row: {
          id: string;
          file_name: string;
          chroma_collection: string;
          parent_count: number;
          child_count: number;
          status: "pending" | "processing" | "completed" | "failed";
          file_size_bytes: number | null;
          file_hash: string | null;
          uploaded_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          file_name: string;
          chroma_collection?: string;
          parent_count?: number;
          child_count?: number;
          status?: "pending" | "processing" | "completed" | "failed";
          file_size_bytes?: number | null;
          file_hash?: string | null;
          uploaded_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          file_name?: string;
          chroma_collection?: string;
          parent_count?: number;
          child_count?: number;
          status?: "pending" | "processing" | "completed" | "failed";
          file_size_bytes?: number | null;
          file_hash?: string | null;
          updated_at?: string;
        };
      };
      ingestion_jobs: {
        Row: {
          id: string;
          document_source_id: string | null;
          status: "running" | "completed" | "failed";
          error_message: string | null;
          parents_created: number;
          children_created: number;
          duration_seconds: number | null;
          started_at: string;
          finished_at: string | null;
        };
        Insert: {
          id?: string;
          document_source_id?: string | null;
          status?: "running" | "completed" | "failed";
          error_message?: string | null;
          parents_created?: number;
          children_created?: number;
          duration_seconds?: number | null;
          started_at?: string;
          finished_at?: string | null;
        };
        Update: {
          status?: "running" | "completed" | "failed";
          error_message?: string | null;
          parents_created?: number;
          children_created?: number;
          duration_seconds?: number | null;
          finished_at?: string | null;
        };
      };
      conversation_history: {
        Row: {
          id: string;
          telegram_chat_id: number;
          telegram_username: string | null;
          sender_name: string | null;
          user_message: string;
          bot_response: string | null;
          retrieved_context: Record<string, unknown>[] | null;
          was_answered: boolean;
          response_time_ms: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          telegram_chat_id: number;
          telegram_username?: string | null;
          sender_name?: string | null;
          user_message: string;
          bot_response?: string | null;
          retrieved_context?: Record<string, unknown>[] | null;
          was_answered?: boolean;
          response_time_ms?: number | null;
          created_at?: string;
        };
        Update: {
          bot_response?: string | null;
          retrieved_context?: Record<string, unknown>[] | null;
          was_answered?: boolean;
          response_time_ms?: number | null;
        };
      };
    };
  };
};
