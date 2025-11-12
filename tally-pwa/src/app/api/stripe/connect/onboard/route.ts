import { NextResponse } from "next/server";
import { supabaseAdmin, getUserByAccessToken } from "@/lib/supabase";
import { createExpressAccount, createAccountLink } from "@/lib/stripe";

// POST: { clubId }
export async function POST(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  const authUser = await getUserByAccessToken(token ?? undefined);
  if (!authUser) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { clubId?: string };
  if (!body.clubId) return NextResponse.json({ error: "Missing clubId" }, { status: 400 });

  // require admin
  const { data: membershipRows } = await supabaseAdmin
    .from("memberships")
    .select("role")
    .eq("club_id", body.clubId)
    .eq("user_id", authUser.id)
    .limit(1);
  const role = membershipRows?.[0]?.role;
  if (!role || role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // fetch club
  const { data: clubRows } = await supabaseAdmin.from("clubs").select("*").eq("id", body.clubId).limit(1);
  const club = clubRows?.[0];
  if (!club) return NextResponse.json({ error: "Club not found" }, { status: 404 });

  try {
    // if club already has a stripe_account_id, just return an account link for re-auth
    let stripeAccountId = club.stripe_account_id;

    if (!stripeAccountId) {
      // create an Express account for this club
      const acct = await createExpressAccount({ country: "US", email: club.email || undefined });
      if (!acct || !acct.id) return NextResponse.json({ error: "Failed to create Stripe account" }, { status: 500 });
      stripeAccountId = acct.id;

      // persist to clubs (best-effort; don't fail onboarding if DB column is missing)
      try {
        await supabaseAdmin.from("clubs").update({ stripe_account_id: stripeAccountId }).eq("id", club.id);
      } catch (e) {
        console.error("Failed to persist stripe_account_id on club", e);
      }
    }

    // build origin-based return/refresh URLs
    const origin = req.headers.get("x-forwarded-origin") || new URL(req.url).origin;
    const returnUrl = `${origin}/profile`;
    const refreshUrl = `${origin}/profile`;

    const link = await createAccountLink({ accountId: stripeAccountId, refreshUrl, returnUrl });
    if (!link || !link.url) return NextResponse.json({ error: "Failed to create account link" }, { status: 500 });

    return NextResponse.json({ url: link.url, accountId: stripeAccountId });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
