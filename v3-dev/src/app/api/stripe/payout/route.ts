import { NextResponse } from "next/server";
import { supabaseAdmin, getUserByAccessToken } from "@/lib/supabase";
import { createDirectTransferWithFee, createInstantPayoutToBank, amountToCents } from "@/lib/stripe";
import { sendSMS } from "@/lib/twilio";

/**
 * POST /api/stripe/payout
 * Body: { clubId, userId, amount }
 * 
 * Creates a direct transfer to a user's Stripe Connect account with platform fee
 * Platform fee: 5.5% + $0.30 (covers Stripe's costs, nets profit for platform)
 * Money goes directly to connected account - faster than 2-step process
 * Sends SMS notification when transfer is initiated
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

  const requestedAmount = Number(body.amount);
  if (Number.isNaN(requestedAmount) || requestedAmount <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  // Calculate platform fee (5.5% + $0.30)
  // This mirrors Stripe's structure and ensures profitability on all transaction sizes
  const platformFeePercent = 0.055; // 5.5%
  const platformFeeFixed = 0.30; // $0.30
  const platformFee = Number((requestedAmount * platformFeePercent + platformFeeFixed).toFixed(2));
  const netPayoutAmount = Number((requestedAmount - platformFee).toFixed(2));

  console.log(`[Payout] Requested: $${requestedAmount}, Platform Fee (5.5% + $0.30): $${platformFee}, Net Payout: $${netPayoutAmount}`);

  // Check club balance (needs to cover full requested amount including fee)
  const clubBalance = Number(club.balance || 0);
  if (clubBalance < requestedAmount) {
    return NextResponse.json({ 
      error: "Insufficient club balance",
      details: `Club balance: $${clubBalance.toFixed(2)}, Required: $${requestedAmount.toFixed(2)} (includes 5.5% + $0.30 platform fee)`
    }, { status: 400 });
  }

  // Fetch recipient user's Stripe account ID
  const { data: userRows } = await supabaseAdmin
    .from("users")
    .select("id, email, name, stripe_account_id, phone")
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
    // Create direct transfer with platform fee to connected account
    // The full requested amount goes to the connected account
    // Platform fee is automatically deducted by Stripe and sent to platform balance
    const amountInCents = amountToCents(requestedAmount);
    const platformFeeCents = amountToCents(platformFee);
    const description = body.description || `Payout from ${club.name || "club"} to ${recipientUser.email || recipientUser.name}`;
    
    const stripeResult = await createDirectTransferWithFee({
      stripeAccountId: recipientUser.stripe_account_id,
      amountCents: amountInCents,
      applicationFeeCents: platformFeeCents,
      currency: "usd",
      description,
    });

    // Trigger instant payout to bank account
    let instantPayoutResult = null;
    try {
      console.log(`[Payout] Triggering instant payout to bank for $${netPayoutAmount}`);
      
      instantPayoutResult = await createInstantPayoutToBank({
        stripeAccountId: recipientUser.stripe_account_id,
        amountCents: amountToCents(netPayoutAmount),
        currency: "usd",
        description: `Instant payout - Manual request`,
      });

      console.log(`[Payout] Instant payout initiated: ${instantPayoutResult.id}`);
    } catch (payoutError) {
      console.error(`[Payout] Instant payout failed (money still in Stripe balance):`, payoutError);
      // If instant payout fails, money stays in their Stripe balance
    }

    // Persist payout in database
    const payoutId = `payout_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const nowIso = new Date().toISOString();

    try {
      // Insert payout record
      await supabaseAdmin.from("payouts").insert({
        id: payoutId,
        club_id: club.id,
        amount: requestedAmount * 100, // Store in cents
        currency: "USD",
        receiver: recipientUser.email || recipientUser.id,
        receiver_type: "STRIPE_ACCOUNT",
        provider: "stripe",
        provider_batch_id: instantPayoutResult?.id || stripeResult.id,
        status: instantPayoutResult ? "paid" : (stripeResult.status || "pending"),
        created_at: nowIso,
        raw: { transfer: stripeResult, instantPayout: instantPayoutResult },
        initiated_by: authUser.id,
        recipient_user_id: recipientUser.id,
      });

      // Update club balance (deduct full requested amount including platform fee)
      const newBalance = Number((clubBalance - requestedAmount).toFixed(2));
      await supabaseAdmin.from("clubs").update({ balance: newBalance }).eq("id", club.id);

      // Create ledger entry for the payout (shows full amount deducted)
      const payoutLedgerId = `ledger_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await supabaseAdmin.from("ledgers").insert({
        id: payoutLedgerId,
        club_id: club.id,
        type: "payout",
        amount: -requestedAmount,
        balance_before: clubBalance,
        balance_after: newBalance,
        user_id: recipientUser.id,
        completed_by_user_id: authUser.id,
        completed_by_email: authUser.email,
        completed_by_name: authUser.email,
        created_at: nowIso,
        description: `${description} (Platform fee: $${platformFee.toFixed(2)} [5.5% + $0.30], Net transferred: $${netPayoutAmount.toFixed(2)})`,
        payout_id: payoutId,
        provider_batch_id: stripeResult.id,
        payment_provider: "stripe",
      });

      // Create separate ledger entry for platform fee revenue
      const feeLedgerId = `ledger_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      await supabaseAdmin.from("ledgers").insert({
        id: feeLedgerId,
        club_id: club.id,
        type: "platform_fee",
        amount: platformFee,
        balance_before: newBalance,
        balance_after: newBalance, // Fee doesn't affect club balance (already deducted)
        user_id: recipientUser.id,
        completed_by_user_id: authUser.id,
        completed_by_email: authUser.email,
        completed_by_name: authUser.email,
        created_at: nowIso,
        description: `Platform fee (5.5% + $0.30) for transfer ${payoutId}`,
        payout_id: payoutId,
        payment_provider: "stripe",
      });

      // Send SMS notification to admin (initiator)
      // Check if admin has phone number configured
      const { data: adminUserData } = await supabaseAdmin
        .from("users")
        .select("phone")
        .eq("id", authUser.id)
        .limit(1);
      
      const adminPhone = adminUserData?.[0]?.phone;
      let smsSent = false;
      
      if (adminPhone) {
        const notificationMessage = instantPayoutResult
          ? `🚀 Instant payout complete! $${netPayoutAmount.toFixed(2)} sent to ${recipientUser.name || recipientUser.email}'s bank (arrives within minutes). Fee: $${platformFee.toFixed(2)}. Transfer ID: ${stripeResult.id}`
          : `Transfer complete: $${requestedAmount.toFixed(2)} sent to ${recipientUser.name || recipientUser.email}'s Stripe account. Platform fee: $${platformFee.toFixed(2)} (5.5% + $0.30). They receive: $${netPayoutAmount.toFixed(2)}. Transfer ID: ${stripeResult.id}`;
        
        try {
          await sendSMS({
            to: adminPhone,
            message: notificationMessage,
          });
          console.log(`[Payout] SMS notification sent to admin ${authUser.id}`);
          smsSent = true;
        } catch (smsError) {
          console.error(`[Payout] Failed to send SMS to admin:`, smsError);
        }
      } else {
        console.log(`[Payout] No phone number configured for admin ${authUser.id}, skipping SMS`);
      }

      return NextResponse.json({
        ok: true,
        payout: {
          id: payoutId,
          stripeTransferId: stripeResult.id,
          stripePayoutId: instantPayoutResult?.id,
          instantPayout: !!instantPayoutResult,
          requestedAmount,
          platformFee,
          netPayoutAmount,
          feeStructure: "5.5% + $0.30",
          status: instantPayoutResult ? "paid" : stripeResult.status,
          recipient: recipientUser.email || recipientUser.name,
          newClubBalance: newBalance,
          smsSent,
          needsPhoneNumber: !adminPhone,
        },
      });
    } catch (dbError) {
      console.error("Failed to persist payout in database:", dbError);
      return NextResponse.json({ 
        error: "Database error after transfer created",
        details: "Transfer was sent but failed to record in database. Please contact support.",
        stripeTransferId: stripeResult.id,
      }, { status: 500 });
    }
  } catch (e: unknown) {
    console.error("Stripe transfer error:", e);
    const error = e as Error & { raw?: unknown };
    return NextResponse.json({ 
      error: error?.message || "Failed to create transfer",
      details: error?.raw || e,
    }, { status: 500 });
  }
}
