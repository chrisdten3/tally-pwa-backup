
import { NextResponse } from "next/server";
import { getAccessToken, PAYPAL_BASE } from "@/lib/paypal";
import { supabaseAdmin, getUserByAccessToken } from "@/lib/supabase";

// POST: { clubId, amount, to, toType?: 'EMAIL'|'PHONE' }
export async function POST(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  const authUser = await getUserByAccessToken(token ?? undefined);
  if (!authUser) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    clubId?: string;
    amount?: number | string;
    to?: string;
    toType?: "EMAIL" | "PHONE";
    note?: string;
  };

  if (!body.clubId || !body.to || typeof body.amount === "undefined") {
    return NextResponse.json({ error: "Missing fields (clubId, to, amount)" }, { status: 400 });
  }

  // fetch club row
  const { data: clubRows } = await supabaseAdmin.from("clubs").select("*").eq("id", body.clubId).limit(1);
  const club = clubRows?.[0];
  if (!club) return NextResponse.json({ error: "Club not found" }, { status: 404 });

  // require admin
  const { data: membershipRows } = await supabaseAdmin
    .from("memberships")
    .select("role")
    .eq("club_id", body.clubId)
    .eq("user_id", authUser.id)
    .limit(1);
  const role = membershipRows?.[0]?.role;
  if (!role || role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const amount = Number(body.amount);
  if (Number.isNaN(amount) || amount <= 0) return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  if (Number(club.balance || 0) < amount) return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });

  try {
    const access = await getAccessToken();

    const senderBatchId = `payout_${body.clubId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    const recipientType = body.toType === "PHONE" ? "PHONE" : "EMAIL";

    const payoutBody = {
      sender_batch_header: {
        sender_batch_id: senderBatchId,
        email_subject: `You received a payout from ${club.name || "your club"}`,
        email_message: body.note || `Payout of $${amount.toFixed(2)} from ${club.name || "your club"}`,
      },
      items: [
        {
          recipient_type: "EMAIL",
          amount: { value: amount.toFixed(2), currency: "USD" },
          receiver: body.to,
          note: body.note || `Payout from ${club.name || "club"}`,
          sender_item_id: `item_${Date.now()}`,
          recipient_wallet: "PAYPAL",
        },
      ],
    };

    const res = await fetch(`${PAYPAL_BASE}/v1/payments/payouts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": senderBatchId, // idempotency
      },
      body: JSON.stringify(payoutBody),
      // no-store
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json({ error: json?.message || json || "PayPal payout failed", details: json }, { status: res.status || 500 });
    }

    // Persist payout and ledger using supabase transaction-like operations
    try {
      // new payout id
      const payoutId = `payout_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const nowIso = new Date().toISOString();

      // insert payout
      await supabaseAdmin.from("payouts").insert({
        id: payoutId,
        club_id: club.id,
        amount,
        currency: "USD",
        receiver: body.to,
        receiver_type: recipientType,
        provider: "venmo",
        provider_batch_id: json.batch_header?.payout_batch_id || null,
        status: json.batch_header?.batch_status || json.batch_header?.status || "PENDING",
        created_at: nowIso,
        raw: json,
        initiated_by: authUser.id,
      });

      // update club balance
      const newBalance = Number((Number(club.balance || 0) - amount).toFixed(2));
      await supabaseAdmin.from("clubs").update({ balance: newBalance }).eq("id", club.id);

      // insert ledger entry
      const ledgerId = `ledger_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await supabaseAdmin.from("ledgers").insert({
        id: ledgerId,
        club_id: club.id,
        type: "payout",
        amount: -amount,
        balance_before: Number(club.balance || 0),
        balance_after: newBalance,
        user_id: authUser.id,
        completed_by_user_id: authUser.id,
        completed_by_email: authUser.email,
        completed_by_name: authUser.email,
        created_at: nowIso,
        description: `Payout to ${body.to}`,
        payout_id: payoutId,
        provider_batch_id: json.batch_header?.payout_batch_id || null,
      });
    } catch (e) {
      console.error("Failed to persist payout in Supabase", e);
    }

    return NextResponse.json({ ok: true, payout: json });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
