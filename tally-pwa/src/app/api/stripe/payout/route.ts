import { NextResponse } from "next/server";
import { supabaseAdmin, getUserByAccessToken } from "@/lib/supabase";
import { createInstantPayout, amountToCents } from "@/lib/stripe";

/**
 * POST /api/stripe/payout
 * Body: { clubId, userId, amount }
 * 
 * Creates an instant payout to a user's Stripe Connect account
 * Updates club balance and creates ledger entry
 */
export async function POST(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  const authUser = await getUserByAccessToken(token ?? undefined);
  if (!authUser) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    clubId?: string;
    userId?: string;
    amount?: number | string;
    description?: string;
  };

  if (!body.clubId || !body.userId || typeof body.amount === "undefined") {
    return NextResponse.json({ error: "Missing fields (clubId, userId, amount)" }, { status: 400 });
  }

  // Fetch club
  const { data: clubRows } = await supabaseAdmin.from("clubs").select("*").eq("id", body.clubId).limit(1);
  const club = clubRows?.[0];
  if (!club) return NextResponse.json({ error: "Club not found" }, { status: 404 });

  // Verify admin permission
  const { data: membershipRows } = await supabaseAdmin
    .from("memberships")
    .select("role")
    .eq("club_id", body.clubId)
    .eq("user_id", authUser.id)
    .limit(1);
  const role = membershipRows?.[0]?.role;
  if (!role || role !== "admin") {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
  }

  const amount = Number(body.amount);
  if (Number.isNaN(amount) || amount <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  // Check club balance
  const clubBalance = Number(club.balance || 0);
  if (clubBalance < amount) {
    return NextResponse.json({ error: "Insufficient club balance" }, { status: 400 });
  }

  // Fetch recipient user's Stripe account ID
  const { data: userRows } = await supabaseAdmin
    .from("users")
    .select("id, email, name, stripe_account_id")
    .eq("id", body.userId)
    .limit(1);
  const recipientUser = userRows?.[0];
  if (!recipientUser) {
    return NextResponse.json({ error: "Recipient user not found" }, { status: 404 });
  }

  if (!recipientUser.stripe_account_id) {
    return NextResponse.json({ 
      error: "Recipient user has not completed Stripe onboarding",
      details: "User must connect their Stripe account to receive payouts" 
    }, { status: 400 });
  }

  try {
    // Create instant payout via Stripe
    const amountInCents = amountToCents(amount);
    const description = body.description || `Payout from ${club.name || "club"} to ${recipientUser.email || recipientUser.name}`;
    
    const stripeResult = await createInstantPayout({
      stripeAccountId: recipientUser.stripe_account_id,
      amountCents: amountInCents,
      currency: "usd",
      description,
    });

    // Persist payout in database
    const payoutId = `payout_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const nowIso = new Date().toISOString();

    try {
      // Insert payout record
      await supabaseAdmin.from("payouts").insert({
        id: payoutId,
        club_id: club.id,
        amount,
        currency: "USD",
        receiver: recipientUser.email || recipientUser.id,
        receiver_type: "STRIPE_ACCOUNT",
        provider: "stripe",
        provider_batch_id: stripeResult.id || stripeResult.payout?.id,
        status: stripeResult.status || stripeResult.payout?.status || "pending",
        created_at: nowIso,
        raw: stripeResult,
        initiated_by: authUser.id,
        recipient_user_id: recipientUser.id,
      });

      // Update club balance
      const newBalance = Number((clubBalance - amount).toFixed(2));
      await supabaseAdmin.from("clubs").update({ balance: newBalance }).eq("id", club.id);

      // Create ledger entry
      const ledgerId = `ledger_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await supabaseAdmin.from("ledgers").insert({
        id: ledgerId,
        club_id: club.id,
        type: "payout",
        amount: -amount,
        balance_before: clubBalance,
        balance_after: newBalance,
        user_id: recipientUser.id,
        completed_by_user_id: authUser.id,
        completed_by_email: authUser.email,
        completed_by_name: authUser.email,
        created_at: nowIso,
        description,
        payout_id: payoutId,
        provider_batch_id: stripeResult.id || stripeResult.payout?.id,
        payment_provider: "stripe",
      });

      return NextResponse.json({
        ok: true,
        payout: {
          id: payoutId,
          stripePayoutId: stripeResult.id || stripeResult.payout?.id,
          stripeTransferId: stripeResult.transfer?.id,
          amount,
          status: stripeResult.status || stripeResult.payout?.status,
          recipient: recipientUser.email || recipientUser.name,
          newClubBalance: newBalance,
        },
      });
    } catch (dbError) {
      console.error("Failed to persist payout in database:", dbError);
      return NextResponse.json({ 
        error: "Database error after payout created",
        details: "Payout was sent but failed to record in database. Please contact support.",
        stripePayoutId: stripeResult.id || stripeResult.payout?.id,
      }, { status: 500 });
    }
  } catch (e: any) {
    console.error("Stripe payout error:", e);
    return NextResponse.json({ 
      error: e?.message || "Failed to create payout",
      details: e?.raw || e,
    }, { status: 500 });
  }
}
