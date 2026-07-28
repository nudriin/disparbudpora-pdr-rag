import { createClient, SupabaseClient } from "@supabase/supabase-js";
import ws from "ws";

// ============================================================
// Supabase digunakan HANYA untuk:
//   - Auth admin panel (login/session)
//   - Data relasional: conversation_history, document_sources,
//     ingestion_jobs, admin_users
// Vector store ada di ChromaDB (terpisah).
// ============================================================

// Pilih WebSocket: gunakan built-in jika tersedia (Node 22+), fallback ke "ws"
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const WsImpl: any = typeof WebSocket !== "undefined" ? WebSocket : ws;

const SUPABASE_OPTIONS = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  global: { fetch: fetch as any },
  realtime: { transport: WsImpl },
};

/**
 * Client publik — menggunakan ANON KEY.
 * Tunduk pada Row Level Security (RLS).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getSupabaseClient(): SupabaseClient<any> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) throw new Error("Missing env var: NEXT_PUBLIC_SUPABASE_URL");
  if (!supabaseAnonKey) throw new Error("Missing env var: NEXT_PUBLIC_SUPABASE_ANON_KEY");

  return createClient(supabaseUrl, supabaseAnonKey, SUPABASE_OPTIONS);
}

/**
 * Admin client — menggunakan SERVICE_ROLE KEY.
 * Bypass RLS — HANYA gunakan di API routes server-side!
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getSupabaseAdmin(): SupabaseClient<any> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) throw new Error("Missing env var: NEXT_PUBLIC_SUPABASE_URL");
  if (!supabaseServiceRoleKey) throw new Error("Missing env var: SUPABASE_SERVICE_ROLE_KEY");

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    ...SUPABASE_OPTIONS,
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Backward compat: lazy-init singleton untuk kode yang masih import supabaseClient langsung
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _supabaseClient: SupabaseClient<any> | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabaseClient: SupabaseClient<any> = new Proxy({} as SupabaseClient<any>, {
  get(_target, prop) {
    if (!_supabaseClient) _supabaseClient = getSupabaseClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (_supabaseClient as any)[prop];
  },
});
