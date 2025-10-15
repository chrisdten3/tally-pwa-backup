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
    // eslint-disable-next-line no-console
    console.warn("Warning: NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_ANON_KEY not set");
  }
}

// Browser client (uses anon/public key)
export const supabaseClient: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY ?? "",
  { auth: { persistSession: false } }
);

// Admin / server client (uses service role key). Only use this on server-side code.
if (!SUPABASE_SERVICE_ROLE_KEY) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable for server operations");
  }
}

export const supabaseAdmin: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY ?? "",
  { auth: { persistSession: false } }
);

// Helper to get user by access token (server-side). Returns Supabase user object or null.
export async function getUserByAccessToken(token?: string) {
  if (!token) return null;
  try {
    // supabase-js exposes auth.getUser which can verify JWT access tokens server-side
    // using the admin client.
    // @ts-ignore - getUser is available on auth in v2+
    const resp = await supabaseAdmin.auth.getUser(token);
    // resp.data.user may be undefined if token is invalid
    // @ts-ignore
    return resp?.data?.user ?? null;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Error verifying Supabase token", err);
    return null;
  }
}

export default supabaseClient;
