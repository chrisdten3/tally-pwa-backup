import { NextResponse } from "next/server";
import { getUserByAccessToken, supabaseAdmin } from "@/lib/supabase";
import { createExpressAccount, createAccountLink } from "@/lib/stripe";

export async function POST(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  const authUser = await getUserByAccessToken(token ?? undefined);
  if (!authUser) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    // Check if user already has a Stripe account
    const { data: existingUser } = await supabaseAdmin
      .from("users")
      .select("stripe_account_id")
      .eq("id", authUser.id)
      .single();

    let accountId = existingUser?.stripe_account_id;

    // If no account exists, create a new one
    if (!accountId) {
      const acct = await createExpressAccount({ 
        country: "US", 
        email: authUser.email || undefined 
      });
      
      if (!acct || !acct.id) {
        return NextResponse.json({ error: "Failed to create Stripe account" }, { status: 500 });
      }

      accountId = acct.id;

      // Store the account ID in Supabase
      console.log("Storing Stripe Account ID for user:", authUser.id, accountId);
      await supabaseAdmin
        .from("users")
        .update({ stripe_account_id: accountId })
        .eq("id", authUser.id);
    }

    // Build origin-based URLs for Stripe onboarding
    const origin = req.headers.get("x-forwarded-origin") || new URL(req.url).origin;
    const returnUrl = `${origin}/api/stripe/connect/callback`;
    const refreshUrl = `${origin}/settings?stripe=refresh`;

    // Create an account link for onboarding
    const link = await createAccountLink({ 
      accountId, 
      refreshUrl, 
      returnUrl 
    });
    
    if (!link || !link.url) {
      return NextResponse.json({ error: "Failed to create account link" }, { status: 500 });
    }

    return NextResponse.json({ url: link.url, accountId });
  } catch (e) {
    console.error("Stripe onboarding error:", e instanceof Error ? e.message : e, e);
    return NextResponse.json({ 
      error: "Server error", 
      details: e instanceof Error ? e.message : String(e) 
    }, { status: 500 });
  }
}
