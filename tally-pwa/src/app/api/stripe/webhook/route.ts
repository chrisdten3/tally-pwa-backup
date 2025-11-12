import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import stripeLib from "@/lib/stripe";

export const config = {
  api: { bodyParser: false },
};

export async function POST(req: NextRequest) {
  try {
    const raw = await req.text();
    const sig = req.headers.get("stripe-signature") || req.headers.get("Stripe-Signature");

    const ok = stripeLib.verifyStripeSignature(raw, sig);
    if (!ok) return NextResponse.json({ ok: false }, { status: 400 });

    const event = JSON.parse(raw);

    try {
      if (event.type === "checkout.session.completed") {
        const session = event.data?.object;
        const sessionId = session?.id;
        const paymentIntent = session?.payment_intent;

        // lookup payments_pending
        if (sessionId) {
          const { data: pendingRows } = await supabaseAdmin.from("payments_pending").select("*").eq("order_id", sessionId).limit(1);
          const pending = pendingRows?.[0];
          let assignment: any = null;

          if (pending && pending.assignment_id) {
            const { data: aRows } = await supabaseAdmin.from("club_event_assignees").select("*").eq("id", pending.assignment_id).eq("is_cancelled", false).limit(1);
            assignment = aRows?.[0];
          }

          // fallback: try metadata on session
          if (!assignment && session?.metadata?.assignment_id) {
            const { data: aRows } = await supabaseAdmin.from("club_event_assignees").select("*").eq("id", session.metadata.assignment_id).eq("is_cancelled", false).limit(1);
            assignment = aRows?.[0];
          }

          // another fallback: event_id in metadata
          if (!assignment && session?.metadata?.event_id) {
            const { data: aRows } = await supabaseAdmin.from("club_event_assignees").select("*").eq("club_event_id", session.metadata.event_id).eq("is_cancelled", false).limit(1);
            assignment = aRows?.[0];
          }

          if (assignment) {
            const paidAt = new Date().toISOString();
            const paymentId = paymentIntent || sessionId;

            await supabaseAdmin.from("club_event_assignees").update({ is_cancelled: true, paid_at: paidAt, payment_provider: "stripe", payment_id: paymentId }).eq("id", assignment.id);

            const increment = Number(assignment.assigned_amount || 0);
            const { data: clubRows } = await supabaseAdmin.from("clubs").select("*").eq("id", assignment.club_id).limit(1);
            const club = clubRows?.[0];
            if (club) {
              const prev = Number(club.balance || 0);
              const newBalance = prev + increment;
              await supabaseAdmin.from("clubs").update({ balance: newBalance }).eq("id", club.id);

              const ledgerEntry = {
                id: `ledger_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                club_id: club.id,
                type: "payment",
                amount: increment,
                balance_before: prev,
                balance_after: newBalance,
                user_id: assignment.user_id,
                assignee_user_id: assignment.user_id,
                completed_by_user_id: assignment.user_id,
                completed_by_name: undefined,
                completed_by_email: undefined,
                event_id: assignment.club_event_id || session?.metadata?.event_id,
                payment_provider: "stripe",
                payment_id: paymentId,
                created_at: new Date().toISOString(),
                description: `Payment for event ${assignment.club_event_id || session?.metadata?.event_id}`,
              };
              await supabaseAdmin.from("ledgers").insert(ledgerEntry);
            }

            await supabaseAdmin.from("payments_pending").update({ captured: true }).eq("assignment_id", assignment.id).eq("order_id", sessionId);
          }
        }
      }
    } catch (e) {
      console.error("Error processing stripe webhook event:", e);
    }

    return NextResponse.json({ received: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "verify error" }, { status: 500 });
  }
}
