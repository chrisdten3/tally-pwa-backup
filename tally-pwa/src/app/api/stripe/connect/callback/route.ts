import { NextResponse } from "next/server";
import { supabaseAdmin, getUserByAccessToken } from "@/lib/supabase";
import { createExpressAccount } from "@/lib/stripe";

// GET: /api/stripe/connect/callback?session_id=... (or other Stripe params)
export async function GET(req: Request) {
  // Get token from cookie or query param (customize as needed)
  // You may need to use a session or JWT to identify the user
  // For demo, try to get token from cookie
  const url = new URL(req.url);
  const token = url.searchParams.get("token") || "";
  if (!token) return NextResponse.redirect("/profile?error=missing_token");

  const authUser = await getUserByAccessToken(token);
  if (!authUser) return NextResponse.redirect("/profile?error=not_authenticated");

  // You should get the Stripe account ID from the onboarding flow (e.g., via query param or session)
  // For demo, try to get it from query param
  const accountId = url.searchParams.get("account_id");
  console.log("Stripe Connect Callback - accountId:", accountId);
  if (!accountId) return NextResponse.redirect("/profile?error=missing_account_id");

  try {
    // Persist stripe_account_id to user
    await supabaseAdmin.from("users").update({ stripe_account_id: accountId }).eq("id", authUser.id);

    // Redirect to profile with success
    return NextResponse.redirect("/profile?onboarded=true");
  } catch {
    return NextResponse.redirect("/profile?error=server_error");
  }
}
