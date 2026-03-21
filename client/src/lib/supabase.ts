import type { SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

// Gracefully handle missing config (e.g., local dev without Supabase)
export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// In-memory storage adapter (avoids localStorage which is blocked in sandboxed iframes)
const memoryStorage = new Map<string, string>();
const storageAdapter = {
  getItem: (key: string) => memoryStorage.get(key) ?? null,
  setItem: (key: string, value: string) => { memoryStorage.set(key, value); },
  removeItem: (key: string) => { memoryStorage.delete(key); },
};

let _client: SupabaseClient | null = null;

export async function getSupabaseClient(): Promise<SupabaseClient | null> {
  if (!supabaseConfigured) return null;
  if (_client) return _client;
  const { createClient } = await import("@supabase/supabase-js");
  _client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: storageAdapter,
      autoRefreshToken: true,
      persistSession: true,
    },
  });
  return _client;
}

// Synchronous getter for cases where we know the client is initialized
export function getSupabaseSync(): SupabaseClient | null {
  return _client;
}
