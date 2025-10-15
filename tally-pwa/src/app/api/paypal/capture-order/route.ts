// app/api/paypal/capture-order/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAccessToken, PAYPAL_BASE } from "@/lib/paypal";
import { supabaseAdmin, getUserByAccessToken } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const orderId = body.orderId as string | undefined;
    const eventIdFromClient = body.eventId as string | undefined;
    if (!orderId) return NextResponse.json({ error: "Missing orderId" }, { status: 400 });

    const access = await getAccessToken();
    const requestId = `capture-${orderId}-${Date.now()}`;

    const res = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${orderId}/capture`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": requestId, // idempotency on capture
      },
      cache: "no-store",
    });

    const json = await res.json();
    if (!res.ok) return NextResponse.json(json, { status: res.status });

    // Extract capture and amount
    const capture = json.purchase_units?.[0]?.payments?.captures?.[0];
    const referenceEventId = json.purchase_units?.[0]?.reference_id || eventIdFromClient;
    const amountStr = capture?.amount?.value || json.purchase_units?.[0]?.amount?.value;

    // Try to update Supabase rows: find assignment, mark paid, update club balance, add ledger, mark pending
    try {
      // Determine authenticated user if present (helps find assignment)
      const auth = req.headers.get("authorization") || "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
      const authedUser = await getUserByAccessToken(token ?? undefined);

      // Find pending payment by order id
      let assignment: any = null;
      if (referenceEventId) {
        const { data: pendingRows } = await supabaseAdmin.from("payments_pending").select("*").eq("order_id", capture?.id || json.id || orderId).limit(1);
        const pending = pendingRows?.[0];
        if (pending && pending.assignment_id) {
          const { data: aRows } = await supabaseAdmin.from("club_event_assignees").select("*").eq("id", pending.assignment_id).eq("is_cancelled", false).limit(1);
          assignment = aRows?.[0];
        }

        // prefer assignment matching authed user
        if (!assignment && authedUser) {
          const { data: aRows } = await supabaseAdmin
            .from("club_event_assignees")
            .select("*")
            .eq("club_event_id", referenceEventId)
            .eq("user_id", authedUser.id)
            .eq("is_cancelled", false)
            .limit(1);
          assignment = aRows?.[0];
        }

        // Next try payer email from PayPal
        if (!assignment) {
          const payerEmail = json.payer?.email_address;
          if (payerEmail) {
            const { data: payerUser } = await supabaseAdmin.from("users").select("id").eq("email", payerEmail).limit(1);
            const payerId = payerUser?.[0]?.id;
            if (payerId) {
              const { data: aRows } = await supabaseAdmin
                .from("club_event_assignees")
                .select("*")
                .eq("club_event_id", referenceEventId)
                .eq("user_id", payerId)
                .eq("is_cancelled", false)
                .limit(1);
              assignment = aRows?.[0];
            }
          }
        }

        // Fallback: first matching un-cancelled assignee
        if (!assignment) {
          const { data: aRows } = await supabaseAdmin.from("club_event_assignees").select("*").eq("club_event_id", referenceEventId).eq("is_cancelled", false).limit(1);
          assignment = aRows?.[0];
        }

        if (assignment) {
          // mark assignment cancelled/paid
          const paidAt = new Date().toISOString();
          const paymentId = capture?.id || json.id || orderId;
          await supabaseAdmin.from("club_event_assignees").update({ is_cancelled: true, paid_at: paidAt, payment_provider: "paypal", payment_id: paymentId }).eq("id", assignment.id);

          // increment club balance
          const increment = amountStr ? Number(amountStr) : Number(assignment.assigned_amount || 0);
          const { data: clubRows } = await supabaseAdmin.from("clubs").select("*").eq("id", assignment.club_id).limit(1);
          const club = clubRows?.[0];
          if (club) {
            const prev = Number(club.balance || 0);
            const newBalance = prev + increment;
            await supabaseAdmin.from("clubs").update({ balance: newBalance }).eq("id", club.id);

            // create ledger entry
            const ledgerEntry = {
              id: `ledger_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
              club_id: club.id,
              type: "payment",
              amount: increment,
              balance_before: prev,
              balance_after: newBalance,
              user_id: assignment.user_id,
              assignee_user_id: assignment.user_id,
              completed_by_user_id: authedUser?.id ?? assignment.user_id,
              completed_by_name: authedUser?.email ?? undefined,
              completed_by_email: authedUser?.email ?? undefined,
              event_id: referenceEventId,
              payment_provider: "paypal",
              payment_id: paymentId,
              created_at: new Date().toISOString(),
              description: `Payment for event ${referenceEventId}`,
            };
            await supabaseAdmin.from("ledgers").insert(ledgerEntry);
          }

          // mark any pending payment for this assignment as captured
          await supabaseAdmin
            .from("payments_pending")
            .update({ captured: true })
            .eq("assignment_id", assignment.id)
            .eq("order_id", capture?.id || json.id || orderId);
        }
      }
    } catch (e) {
      console.error("Error updating Supabase after capture:", e);
    }

    return NextResponse.json({ ...json, _dbUpdated: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Server error" }, { status: 500 });
  }
}
