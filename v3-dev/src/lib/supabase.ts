import { createClient, SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  throw new Error("Missing SUPABASE_URL environment variable");
}

if (!SUPABASE_ANON_KEY) {
  // Allow server-only usage when anon key isn't present in env for server-side only setups
  // but warn in development.
  if (process.env.NODE_ENV === "development") {
    console.warn("Warning: NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_ANON_KEY not set");
  }
}

// Browser client (uses anon/public key)
export const supabaseClient: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY ?? "",
  { 
    auth: { 
      persistSession: true,
      storageKey: 'tally-auth',
      storage: typeof window !== 'undefined' ? window.localStorage : undefined
    } 
  }
);

// Admin / server client (uses service role key). Only use this on server-side code.
// Only create if the service role key is available
let supabaseAdminInstance: SupabaseClient | null = null;

if (SUPABASE_SERVICE_ROLE_KEY) {
  supabaseAdminInstance = createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
} else if (process.env.NODE_ENV === "production") {
  console.warn("Missing SUPABASE_SERVICE_ROLE_KEY - admin operations will not be available");
}

export const supabaseAdmin: SupabaseClient = supabaseAdminInstance as SupabaseClient;

// Helper to get user by access token (server-side). Returns Supabase user object or null.
export async function getUserByAccessToken(token?: string) {
  if (!token || !supabaseAdminInstance) {
    return null;
  }
  try {
    // supabase-js exposes auth.getUser which can verify JWT access tokens server-side
    // using the admin client.
    const resp = await supabaseAdminInstance.auth.getUser(token);
    
    // resp.data.user may be undefined if token is invalid
    if (resp?.error) {
      console.error("[getUserByAccessToken] Error:", resp.error);
      return null;
    }
    
    return resp?.data?.user ?? null;
  } catch (err) {
    console.error("[getUserByAccessToken] Exception:", err);
    return null;
  }
}

export default supabaseClient;
