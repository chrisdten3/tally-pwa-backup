import { NextResponse } from "next/server";
import { supabaseAdmin, getUserByAccessToken } from "@/lib/supabase";

/**
 * GET /api/clubs/[clubId]/payments
 * Fetch all payment history for a specific club
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

    // Get all payments for this club
    const { data: payments } = await supabaseAdmin
      .from("payments")
      .select(`
        *,
        users (
          id,
          name,
          email
        ),
        club_events (
          id,
          title
        )
      `)
      .eq("club_id", clubId)
      .order("created_at", { ascending: false });

    // Also get ledger entries for payment type
    const { data: ledgers } = await supabaseAdmin
      .from("ledgers")
      .select(`
        *,
        users:completed_by_user_id (
          id,
          name,
          email
        ),
        club_events (
          id,
          title
        )
      `)
      .eq("club_id", clubId)
      .eq("type", "payment")
      .order("created_at", { ascending: false });

    const formattedPayments = (payments || []).map((payment: any) => ({
      id: payment.id,
      amount: payment.amount,
      currency: payment.currency,
      provider: payment.payment_provider,
      status: payment.status,
      createdAt: payment.created_at,
      user: {
        id: payment.users?.id,
        name: payment.users?.name,
        email: payment.users?.email,
      },
      event: payment.club_events ? {
        id: payment.club_events.id,
        title: payment.club_events.title,
      } : null,
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
      event: ledger.club_events ? {
        id: ledger.club_events.id,
        title: ledger.club_events.title,
      } : null,
      balanceBefore: ledger.balance_before,
      balanceAfter: ledger.balance_after,
    }));

    // Calculate summary stats
    const totalReceived = (ledgers || []).reduce((sum: number, l: any) => sum + Math.abs(l.amount), 0);
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);
    
    const thisMonthPayments = (ledgers || []).filter((l: any) => 
      new Date(l.created_at) >= thisMonth
    );
    const monthlyTotal = thisMonthPayments.reduce((sum: number, l: any) => sum + Math.abs(l.amount), 0);

    // Get pending payments (unpaid assignees)
    const { data: pendingAssignees } = await supabaseAdmin
      .from("club_event_assignees")
      .select("assigned_amount")
      .eq("club_id", clubId)
      .is("paid_at", null)
      .eq("is_cancelled", false);

    const pendingTotal = (pendingAssignees || []).reduce(
      (sum: number, a: any) => sum + (a.assigned_amount || 0),
      0
    );

    return NextResponse.json({
      payments: formattedPayments,
      ledgers: formattedLedgers,
      stats: {
        totalReceived,
        monthlyTotal,
        pendingTotal,
        totalCount: payments?.length || 0,
      },
    });
  } catch (e: any) {
    console.error("[GET /api/clubs/[clubId]/payments]", e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
