import { NextResponse } from "next/server";
import { supabaseAdmin, getUserByAccessToken } from "@/lib/supabase";

/**
 * GET /api/clubs/[clubId]/payouts
 * Fetch all payout history for a specific club
 */
export async function GET(req: Request, { params }: { params: Promise<{ clubId: string }> }) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    const authUser = await getUserByAccessToken(token ?? undefined);
    if (!authUser) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { clubId } = await params;

    // Verify user is a member of this club
    const { data: membership } = await supabaseAdmin
      .from("memberships")
      .select("role")
      .eq("user_id", authUser.id)
      .eq("club_id", clubId)
      .limit(1)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ error: "Not a member of this club" }, { status: 403 });
    }

    // Get club balance
    const { data: club } = await supabaseAdmin
      .from("clubs")
      .select("balance")
      .eq("id", clubId)
      .limit(1)
      .maybeSingle();

    // Get all payouts for this club
    const { data: payouts } = await supabaseAdmin
      .from("payouts")
      .select(`
        *,
        users:initiated_by (
          id,
          name,
          email
        )
      `)
      .eq("club_id", clubId)
      .order("created_at", { ascending: false });

    // Get payout ledger entries
    const { data: ledgers } = await supabaseAdmin
      .from("ledgers")
      .select(`
        *,
        users:completed_by_user_id (
          id,
          name,
          email
        )
      `)
      .eq("club_id", clubId)
      .eq("type", "payout")
      .order("created_at", { ascending: false });

    const formattedPayouts = (payouts || []).map((payout: any) => ({
      id: payout.id,
      amount: payout.amount,
      currency: payout.currency,
      receiver: payout.receiver,
      receiverType: payout.receiver_type,
      provider: payout.provider,
      status: payout.status,
      createdAt: payout.created_at,
      initiatedBy: {
        id: payout.users?.id,
        name: payout.users?.name,
        email: payout.users?.email,
      },
      providerBatchId: payout.provider_batch_id,
    }));

    const formattedLedgers = (ledgers || []).map((ledger: any) => ({
      id: ledger.id,
      amount: Math.abs(ledger.amount),
      type: ledger.type,
      paymentProvider: ledger.payment_provider,
      createdAt: ledger.created_at,
      description: ledger.description,
      user: {
        id: ledger.users?.id,
        name: ledger.users?.name || ledger.completed_by_name,
        email: ledger.users?.email || ledger.completed_by_email,
      },
      balanceBefore: ledger.balance_before,
      balanceAfter: ledger.balance_after,
    }));

    // Calculate summary stats
    const totalPaidOut = (ledgers || []).reduce((sum: number, l: any) => sum + Math.abs(l.amount), 0);
    const pendingPayouts = (payouts || []).filter((p: any) => p.status === "pending");
    const pendingTotal = pendingPayouts.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

    return NextResponse.json({
      payouts: formattedPayouts,
      ledgers: formattedLedgers,
      stats: {
        availableBalance: club?.balance || 0,
        totalPaidOut,
        pendingTotal,
        totalCount: payouts?.length || 0,
        pendingCount: pendingPayouts.length,
      },
    });
  } catch (e: any) {
    console.error("[GET /api/clubs/[clubId]/payouts]", e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
