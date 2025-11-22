import { NextResponse } from "next/server";
import { getUserByAccessToken, supabaseAdmin } from "@/lib/supabase";
import { createExpressAccount, createAccountLink, retrieveAccount } from "@/lib/stripe";

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

    // If user already has an account ID, verify it's actually complete
    if (accountId) {
      try {
        const accountDetails = await retrieveAccount(accountId);
        // If account is fully onboarded, they don't need to onboard again
        if (accountDetails.details_submitted && accountDetails.charges_enabled) {
          console.log("User already has a completed Stripe account:", authUser.id, accountId);
          return NextResponse.json({ 
            error: "Account already onboarded", 
            accountId,
            alreadyOnboarded: true 
          }, { status: 400 });
        }
        // If account exists but isn't complete, continue with onboarding
        console.log("User has incomplete Stripe account, continuing onboarding:", authUser.id, accountId);
      } catch (e) {
        // If we can't retrieve the account, it might be deleted - create a new one
        console.log("Could not retrieve existing account, will create new one:", e);
        accountId = null;
      }
    }

    // If no account exists, create a new one
    if (!accountId) {
      const acct = await createExpressAccount({ 
        country: "US", 
        email: authUser.email || undefined,
        metadata: { user_id: authUser.id } // Store user ID in Stripe metadata for webhook
      });
      
      if (!acct || !acct.id) {
        return NextResponse.json({ error: "Failed to create Stripe account" }, { status: 500 });
      }

      accountId = acct.id;

      // DON'T store the account ID yet - wait for webhook to confirm onboarding completion
      // This prevents the issue where users start onboarding but never complete it
      console.log("Created Stripe Account for user:", authUser.id, accountId, "- awaiting onboarding completion");
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
