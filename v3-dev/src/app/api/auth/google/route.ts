import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    const origin = req.nextUrl.origin;
    const callbackUrl = `${origin}/api/auth/callback`;

    console.log("[Google Auth] Initiating OAuth with callback:", callbackUrl);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });

    if (error || !data?.url) {
      console.error("[Google Auth] Error:", error);
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(
          error?.message ?? "OAuth error"
        )}`
      );
    }

    console.log("[Google Auth] Redirect URL:", data.url);
    return NextResponse.redirect(data.url);
  } catch (e) {
    console.error("[Google Auth] Exception:", e);
    const origin = new URL(req.url).origin;
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(msg)}`
    );
  }
}
