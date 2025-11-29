import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase"; // keep this for DB writes

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const origin = url.origin;
    const searchParams = url.searchParams;

    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const error_description = searchParams.get("error_description");

    console.log("[Callback] Received params:", {
      code: code ? "present" : "missing",
      error,
      error_description,
      allParams: Array.from(searchParams.entries()),
    });

    if (error) {
      console.error("[Callback] OAuth error:", error, error_description);
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(
          error_description || error
        )}`
      );
    }

    if (!code) {
      console.error("[Callback] No code received.");
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(
          "No authorization code received"
        )}`
      );
    }

    const supabase = await createSupabaseServerClient();

    // This now has access to the PKCE code_verifier via cookies
    const { data, error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error("[Callback] Code exchange error:", exchangeError);
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(exchangeError.message)}`
      );
    }

    const session = data.session;
    const user = data.user;

    if (!session || !user) {
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(
          "Failed to create session"
        )}`
      );
    }

    console.log("[Callback] User authenticated:", user.id);

    // Check if user profile exists in users table
    const { data: existingProfile } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!existingProfile) {
      const firstName =
        user.user_metadata?.given_name ||
        user.user_metadata?.name?.split(" ")[0] ||
        "";
      const lastName =
        user.user_metadata?.family_name ||
        user.user_metadata?.name?.split(" ").slice(1).join(" ") ||
        "";
      const fullName =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        `${firstName} ${lastName}`.trim();

      const profile = {
        id: user.id,
        first_name: firstName,
        last_name: lastName,
        name: fullName,
        email: user.email,
        created_at: new Date().toISOString(),
      };

      console.log("[Callback] Creating new profile:", profile);

      const { error: profileError } = await supabaseAdmin
        .from("users")
        .insert(profile);

      if (profileError) {
        console.error("[Callback] Profile creation error:", profileError);
      }
    }

    // Redirect to a client-side page that will handle token storage
    // We can't set localStorage from server-side, so we'll pass the session via a query param
    const redirectUrl = new URL(`${origin}/auth-success`);
    redirectUrl.searchParams.set('access_token', session.access_token);
    redirectUrl.searchParams.set('refresh_token', session.refresh_token);
    
    return NextResponse.redirect(redirectUrl.toString());
  } catch (e) {
    console.error("[Callback] Exception:", e);
    const origin = new URL(req.url).origin;
    const msg = e instanceof Error ? e.message : "Authentication failed";
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(msg)}`
    );
  }
}
