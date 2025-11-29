import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { retrieveAccount } from "@/lib/stripe";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    
    // Get the user from the query parameter if available
    const userId = url.searchParams.get("user_id");
    
    if (userId) {
      console.log("[Stripe Callback] Verifying account storage for user:", userId);
      
      // Verify the user has their stripe_account_id stored
      const { data: user, error: userError } = await supabaseAdmin
        .from("users")
        .select("id, stripe_account_id")
        .eq("id", userId)
        .single();
      
      if (userError) {
        console.error("[Stripe Callback] Error fetching user:", userError);
      } else if (user?.stripe_account_id) {
        console.log("[Stripe Callback] User has stripe_account_id:", user.stripe_account_id);
        
        // Verify the account is actually complete
        try {
          const accountDetails = await retrieveAccount(user.stripe_account_id);
          console.log("[Stripe Callback] Account details:", {
            id: accountDetails.id,
            details_submitted: accountDetails.details_submitted,
            charges_enabled: accountDetails.charges_enabled,
            payouts_enabled: accountDetails.payouts_enabled,
          });
          
          if (!accountDetails.details_submitted || !accountDetails.charges_enabled) {
            console.log("[Stripe Callback] Account not yet fully onboarded, redirecting with message");
            return NextResponse.redirect(`${url.origin}/settings?stripe=incomplete`);
          }
        } catch (e) {
          console.error("[Stripe Callback] Error retrieving account:", e);
        }
      } else {
        console.warn("[Stripe Callback] User does not have stripe_account_id stored yet");
      }
    }
    
    // Stripe returns the user to this URL after onboarding
    // We can redirect them to a success page
    const successUrl = `${url.origin}/home`;
    
    return NextResponse.redirect(successUrl);
  } catch (e) {
    console.error("Stripe callback error:", e);
    const url = new URL(req.url);
    return NextResponse.redirect(`${url.origin}/settings?stripe=error`);
  }
}
