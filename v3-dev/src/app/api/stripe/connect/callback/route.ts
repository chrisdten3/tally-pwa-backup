import { NextResponse } from "next/server";
import { getUserByAccessToken, supabaseAdmin } from "@/lib/supabase";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    
    // Stripe returns the user to this URL after onboarding
    // We can redirect them to a success page
    const successUrl = `${url.origin}/settings?stripe=success`;
    
    return NextResponse.redirect(successUrl);
  } catch (e) {
    console.error("Stripe callback error:", e);
    const url = new URL(req.url);
    return NextResponse.redirect(`${url.origin}/settings?stripe=error`);
  }
}
