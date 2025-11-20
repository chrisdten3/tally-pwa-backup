import { NextResponse } from "next/server";
import { getUserByAccessToken, supabaseAdmin } from "@/lib/supabase";
import { createExpressAccount, createAccountLink } from "@/lib/stripe";

export async function POST(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  const authUser = await getUserByAccessToken(token ?? undefined);
  if (!authUser) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    // build origin-based URLs for Stripe onboarding
    const origin = req.headers.get("x-forwarded-origin") || new URL(req.url).origin;
    const profileUrl = `${origin}/profile`;

    // Create a Stripe Express account for the user (do not persist yet)
    const acct = await createExpressAccount({ country: "US", email: authUser.email || undefined });
    if (!acct || !acct.id) return NextResponse.json({ error: "Failed to create Stripe account" }, { status: 500 });

    // Create an account link for onboarding
    const link = await createAccountLink({ accountId: acct.id, refreshUrl: profileUrl, returnUrl: profileUrl });
    if (!link || !link.url) return NextResponse.json({ error: "Failed to create account link" }, { status: 500 });

    //Store the account ID in Supabase here 
    console.log("Storing Stripe Account ID for user:", authUser.id, acct.id);
    await supabaseAdmin.from("users").update({ stripe_account_id: acct.id }).eq("id", authUser.id);

    return NextResponse.json({ url: link.url });
  } catch (e) {
    console.error("Stripe onboarding error:", e instanceof Error ? e.message : e, e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
