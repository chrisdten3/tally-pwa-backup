// lib/supabaseServer.ts
import { cookies, headers } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { supabaseAdmin } from "./supabase";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Handle cookie setting errors in middleware
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options, maxAge: 0 });
          } catch {
            // Handle cookie removal errors in middleware
          }
        },
      },
    }
  );
}

// Helper to get the authenticated user from server-side
// Supports both cookie-based sessions and Bearer token authentication
export async function getServerUser() {
  // First, try cookie-based session authentication
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (user && !error) {
    return user;
  }
  
  // Fallback: check for Bearer token in Authorization header
  const headersList = await headers();
  const authHeader = headersList.get("authorization") || headersList.get("Authorization");
  
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7); // Remove "Bearer " prefix
    
    try {
      // Verify the token using Supabase Admin
      const { data: { user: tokenUser }, error: tokenError } = await supabaseAdmin.auth.getUser(token);
      
      if (tokenUser && !tokenError) {
        return tokenUser;
      }
    } catch (err) {
      console.error("[getServerUser] Error verifying token:", err);
    }
  }
  
  return null;
}

