import { NextResponse } from "next/server";
import { getUserByAccessToken, supabaseAdmin } from "@/lib/supabase";

const STRIPE_BASE = "https://api.stripe.com";

export async function POST(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  
  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const authUser = await getUserByAccessToken(token);
  if (!authUser) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  try {
    // Get user's current Stripe account ID
    const { data: user, error: fetchError } = await supabaseAdmin
      .from("users")
      .select("stripe_account_id")
      .eq("id", authUser.id)
      .single();

    if (fetchError) {
      console.error("Error fetching user:", fetchError);
      return NextResponse.json({ error: "Failed to fetch user data" }, { status: 500 });
    }

    const stripeAccountId = user?.stripe_account_id;

    if (!stripeAccountId) {
      return NextResponse.json({ 
        message: "No Stripe account connected" 
      });
    }

    // Delete the Stripe account
    try {
      const secret = process.env.STRIPE_SECRET_KEY;
      if (!secret) {
        throw new Error("Missing STRIPE_SECRET_KEY");
      }

      const res = await fetch(`${STRIPE_BASE}/v1/accounts/${stripeAccountId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${secret}`,
        },
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        console.error("Failed to delete Stripe account:", error);
        // Continue anyway to remove from database
      }
    } catch (stripeError) {
      console.error("Stripe deletion error:", stripeError);
      // Continue anyway to remove from database
    }

    // Remove stripe_account_id from user record
    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({ stripe_account_id: null })
      .eq("id", authUser.id);

    if (updateError) {
      console.error("Error updating user:", updateError);
      return NextResponse.json({ error: "Failed to disconnect Stripe account" }, { status: 500 });
    }

    return NextResponse.json({ 
      message: "Stripe account disconnected successfully" 
    });
  } catch (e) {
    console.error("Disconnect error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
