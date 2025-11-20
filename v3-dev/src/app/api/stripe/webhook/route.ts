import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import stripeLib from "@/lib/stripe";

export async function POST(req: NextRequest) {
  try {
    const raw = await req.text();
    const sig = req.headers.get("stripe-signature") || req.headers.get("Stripe-Signature");

    const ok = stripeLib.verifyStripeSignature(raw, sig);
    if (!ok) {
      console.error("Stripe signature verification failed");
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const event = JSON.parse(raw);
    console.log(`[Stripe Webhook] Received event: ${event.type}, ID: ${event.id}`);

    try {
      if (event.type === "checkout.session.completed") {
        console.log("[Stripe Webhook] Processing checkout.session.completed");
        const session = event.data?.object;
        const sessionId = session?.id;
        const paymentIntent = session?.payment_intent;
        const paymentStatus = session?.payment_status;

        console.log(`[Stripe Webhook] Session ID: ${sessionId}, Payment Intent: ${paymentIntent}, Payment Status: ${paymentStatus}`);

        // Only process if payment was successful
        if (paymentStatus !== "paid") {
          console.log(`[Stripe Webhook] Payment status is ${paymentStatus}, skipping processing`);
          return NextResponse.json({ received: true });
        }

        // lookup payments_pending
        if (sessionId) {
          const { data: pendingRows } = await supabaseAdmin
            .from("payments_pending")
            .select("*")
            .eq("order_id", sessionId)
            .limit(1);
          const pending = pendingRows?.[0];
          console.log(`[Stripe Webhook] Found pending payment:`, pending ? `Yes (assignment_id: ${pending.assignment_id})` : "No");
          
          let assignment: any = null;

          if (pending && pending.assignment_id) {
            const { data: aRows } = await supabaseAdmin
              .from("club_event_assignees")
              .select("*")
              .eq("id", pending.assignment_id)
              .eq("is_cancelled", false)
              .is("paid_at", null)
              .limit(1);
            assignment = aRows?.[0];
            console.log(`[Stripe Webhook] Found assignment from pending:`, assignment ? `Yes (${assignment.id})` : "No");
          }

          // fallback: try metadata on session
          if (!assignment && session?.metadata?.assignment_id) {
            console.log(`[Stripe Webhook] Trying metadata assignment_id: ${session.metadata.assignment_id}`);
            const { data: aRows } = await supabaseAdmin
              .from("club_event_assignees")
              .select("*")
              .eq("id", session.metadata.assignment_id)
              .eq("is_cancelled", false)
              .is("paid_at", null)
              .limit(1);
            assignment = aRows?.[0];
            console.log(`[Stripe Webhook] Found assignment from metadata:`, assignment ? `Yes (${assignment.id})` : "No");
          }

          // another fallback: event_id in metadata
          if (!assignment && session?.metadata?.event_id) {
            console.log(`[Stripe Webhook] Trying metadata event_id: ${session.metadata.event_id}`);
            const { data: aRows } = await supabaseAdmin
              .from("club_event_assignees")
              .select("*")
              .eq("club_event_id", session.metadata.event_id)
              .eq("is_cancelled", false)
              .is("paid_at", null)
              .limit(1);
            assignment = aRows?.[0];
            console.log(`[Stripe Webhook] Found assignment from event_id:`, assignment ? `Yes (${assignment.id})` : "No");
          }

          if (assignment) {
            console.log(`[Stripe Webhook] Found assignment: ${assignment.id}, updating payment status`);
            const paidAt = new Date().toISOString();
            const paymentId = paymentIntent || sessionId;

            // Ensure user is a member of the club (in case they paid via public link)
            const { data: membershipRows } = await supabaseAdmin
              .from("memberships")
              .select("*")
              .eq("club_id", assignment.club_id)
              .eq("user_id", assignment.user_id)
              .limit(1);

            if (!membershipRows || membershipRows.length === 0) {
              console.log(`[Stripe Webhook] Adding user ${assignment.user_id} to club ${assignment.club_id}`);
              await supabaseAdmin.from("memberships").insert({
                club_id: assignment.club_id,
                user_id: assignment.user_id,
                role: "member",
                joined_via_payment: true,
                created_at: paidAt,
              });
            } else {
              console.log(`[Stripe Webhook] User ${assignment.user_id} already member of club ${assignment.club_id}`);
            }

            // Mark assignment as paid
            const { error: assignmentError } = await supabaseAdmin
              .from("club_event_assignees")
              .update({ 
                paid_at: paidAt, 
                payment_provider: "stripe", 
                payment_id: paymentId 
              })
              .eq("id", assignment.id);
            
            if (assignmentError) {
              console.error(`[Stripe Webhook] Error updating assignment:`, assignmentError);
            } else {
              console.log(`[Stripe Webhook] Assignment ${assignment.id} marked as paid`);
            }

            // Update club balance
            const increment = Number(assignment.assigned_amount || 0);
            console.log(`[Stripe Webhook] Incrementing club balance by ${increment} cents`);
            
            const { data: clubRows, error: clubSelectError } = await supabaseAdmin
              .from("clubs")
              .select("*")
              .eq("id", assignment.club_id)
              .limit(1);
            
            if (clubSelectError) {
              console.error(`[Stripe Webhook] Error fetching club:`, clubSelectError);
            }
            
            const club = clubRows?.[0];
            
            if (club) {
              const prev = Number(club.balance || 0);
              const newBalance = prev + increment;
              console.log(`[Stripe Webhook] Updating club ${club.id} balance: ${prev} + ${increment} = ${newBalance}`);
              
              const { error: balanceError } = await supabaseAdmin
                .from("clubs")
                .update({ balance: newBalance })
                .eq("id", club.id);
              
              if (balanceError) {
                console.error(`[Stripe Webhook] Error updating club balance:`, balanceError);
              } else {
                console.log(`[Stripe Webhook] Club ${club.id} balance successfully updated to ${newBalance}`);
              }

              // Get user info for ledger
              const { data: userRows } = await supabaseAdmin
                .from("users")
                .select("name, email")
                .eq("id", assignment.user_id)
                .limit(1);
              const user = userRows?.[0];

              // Create ledger entry
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
                completed_by_name: user?.name || undefined,
                completed_by_email: user?.email || undefined,
                event_id: assignment.club_event_id || session?.metadata?.event_id,
                payment_provider: "stripe",
                payment_id: paymentId,
                created_at: paidAt,
                description: `Payment for event ${assignment.club_event_id || session?.metadata?.event_id}`,
              };
              
              const { error: ledgerError } = await supabaseAdmin.from("ledgers").insert(ledgerEntry);
              
              if (ledgerError) {
                console.error(`[Stripe Webhook] Error creating ledger entry:`, ledgerError);
              } else {
                console.log(`[Stripe Webhook] Ledger entry created: ${ledgerEntry.id}`);
              }
            } else {
              console.error(`[Stripe Webhook] Club not found: ${assignment.club_id}`);
            }

            // Mark pending payment as captured
            const { error: captureError } = await supabaseAdmin
              .from("payments_pending")
              .update({ captured: true })
              .eq("assignment_id", assignment.id)
              .eq("order_id", sessionId);
            
            if (captureError) {
              console.error(`[Stripe Webhook] Error marking payment as captured:`, captureError);
            } else {
              console.log(`[Stripe Webhook] Pending payment marked as captured`);
            }
          } else {
            console.log("[Stripe Webhook] No assignment found for this checkout session");
            console.log(`[Stripe Webhook] Session metadata:`, JSON.stringify(session?.metadata));
          }
        } else {
          console.log("[Stripe Webhook] No session ID found");
        }
      }
    } catch (e) {
      console.error("[Stripe Webhook] Error processing stripe webhook event:", e);
      console.error("[Stripe Webhook] Error stack:", e instanceof Error ? e.stack : "No stack trace");
    }

    console.log(`[Stripe Webhook] Successfully processed event ${event.type}`);
    return NextResponse.json({ received: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "verify error" }, { status: 500 });
  }
}
