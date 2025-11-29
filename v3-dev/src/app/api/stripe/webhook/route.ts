import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import stripeLib from "@/lib/stripe";
import { sendSMS } from "@/lib/surge";
import { createDirectTransferWithFee, createInstantPayoutToBank, amountToCents } from "@/lib/stripe";

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
          
          let assignment: Record<string, unknown> | null = null;

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

              // 🚀 AUTOMATIC PAYOUT: Transfer to admin's connected account immediately
              console.log(`[Stripe Webhook] Initiating automatic transfer to admin's connected account`);
              
              // Get club owner/admin with Stripe account
              const { data: membershipData } = await supabaseAdmin
                .from("memberships")
                .select("user_id, users!inner(id, email, name, stripe_account_id, phone)")
                .eq("club_id", club.id)
                .eq("role", "admin")
                .limit(1);
              
              const adminMembership = membershipData?.[0];
              const adminWithStripe = adminMembership?.users as { id: string; email: string; name: string; stripe_account_id?: string; phone?: string } | undefined;

              if (adminWithStripe?.stripe_account_id) {
                console.log(`[Stripe Webhook] Found admin ${adminWithStripe.id} with Stripe account ${adminWithStripe.stripe_account_id}`);
                
                // Calculate platform fee (5.5% + $0.30)
                const paymentAmountInDollars = increment / 100;
                const platformFeePercent = 0.055;
                const platformFeeFixed = 0.30;
                const platformFee = Number((paymentAmountInDollars * platformFeePercent + platformFeeFixed).toFixed(2));
                const netTransferAmount = Number((paymentAmountInDollars - platformFee).toFixed(2));

                console.log(`[Stripe Webhook] Payment: $${paymentAmountInDollars}, Fee: $${platformFee}, Net Transfer: $${netTransferAmount}`);

                try {
                  // Create direct transfer with platform fee
                  const transferResult = await createDirectTransferWithFee({
                    stripeAccountId: adminWithStripe.stripe_account_id,
                    amountCents: amountToCents(paymentAmountInDollars),
                    applicationFeeCents: amountToCents(platformFee),
                    currency: "usd",
                    description: `Auto-transfer from ${club.name} - Payment ${paymentId}`,
                  });

                  console.log(`[Stripe Webhook] Transfer successful: ${transferResult.id}`);

                  // 🚀 INSTANT PAYOUT: Trigger immediate payout to admin's bank account
                  let instantPayoutResult = null;
                  try {
                    console.log(`[Stripe Webhook] Triggering instant payout to bank for $${netTransferAmount}`);
                    
                    instantPayoutResult = await createInstantPayoutToBank({
                      stripeAccountId: adminWithStripe.stripe_account_id,
                      amountCents: amountToCents(netTransferAmount),
                      currency: "usd",
                      description: `Instant payout - Payment ${paymentId}`,
                    });

                    console.log(`[Stripe Webhook] Instant payout initiated: ${instantPayoutResult.id}, ETA: ${instantPayoutResult.arrival_date}`);
                  } catch (payoutError: unknown) {
                    console.error(`[Stripe Webhook] Instant payout failed (money still in Stripe balance):`, payoutError);
                    // If instant payout fails, money stays in their Stripe balance
                    // They'll get it on their regular payout schedule
                  }

                  // Create payout record for tracking
                  const autoPayoutId = `autopayout_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
                  await supabaseAdmin.from("payouts").insert({
                    id: autoPayoutId,
                    club_id: club.id,
                    amount: increment, // Store in cents
                    currency: "USD",
                    receiver: adminWithStripe.email || adminWithStripe.id,
                    receiver_type: "STRIPE_ACCOUNT",
                    provider: "stripe",
                    provider_batch_id: instantPayoutResult?.id || transferResult.id,
                    status: instantPayoutResult ? "paid" : (transferResult.status || "pending"),
                    created_at: paidAt,
                    raw: { transfer: transferResult, instantPayout: instantPayoutResult },
                    initiated_by: adminWithStripe.id,
                    recipient_user_id: adminWithStripe.id,
                  });

                  // Create ledger entry for automatic payout
                  const autoPayoutLedgerId = `ledger_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
                  await supabaseAdmin.from("ledgers").insert({
                    id: autoPayoutLedgerId,
                    club_id: club.id,
                    type: "payout",
                    amount: -paymentAmountInDollars,
                    balance_before: newBalance,
                    balance_after: Number((newBalance - paymentAmountInDollars).toFixed(2)),
                    user_id: adminWithStripe.id,
                    completed_by_user_id: adminWithStripe.id,
                    completed_by_email: adminWithStripe.email,
                    completed_by_name: adminWithStripe.name,
                    created_at: paidAt,
                    description: `Auto-transfer (Platform fee: $${platformFee.toFixed(2)} [5.5% + $0.30], Net: $${netTransferAmount.toFixed(2)})`,
                    payout_id: autoPayoutId,
                    provider_batch_id: transferResult.id,
                    payment_provider: "stripe",
                  });

                  // Create platform fee ledger entry
                  const autoFeeLedgerId = `ledger_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
                  await supabaseAdmin.from("ledgers").insert({
                    id: autoFeeLedgerId,
                    club_id: club.id,
                    type: "platform_fee",
                    amount: platformFee,
                    balance_before: Number((newBalance - paymentAmountInDollars).toFixed(2)),
                    balance_after: Number((newBalance - paymentAmountInDollars).toFixed(2)),
                    user_id: adminWithStripe.id,
                    completed_by_user_id: adminWithStripe.id,
                    completed_by_email: adminWithStripe.email,
                    completed_by_name: adminWithStripe.name,
                    created_at: paidAt,
                    description: `Platform fee (5.5% + $0.30) for auto-transfer ${autoPayoutId}`,
                    payout_id: autoPayoutId,
                    payment_provider: "stripe",
                  });

                  // Update club balance (deduct the transferred amount)
                  const balanceAfterTransfer = Number((newBalance - paymentAmountInDollars).toFixed(2));
                  await supabaseAdmin
                    .from("clubs")
                    .update({ balance: balanceAfterTransfer })
                    .eq("id", club.id);

                  console.log(`[Stripe Webhook] Club balance updated to ${balanceAfterTransfer} after auto-transfer`);

                  // Send SMS notification to admin
                  if (adminWithStripe.phone) {
                    const smsMessage = instantPayoutResult
                      ? `� Instant payout complete! $${netTransferAmount.toFixed(2)} sent to your bank account (arrives within minutes). Payment from ${club.name}. Fee: $${platformFee.toFixed(2)}`
                      : `�💰 Payment received: $${paymentAmountInDollars.toFixed(2)} transferred to your Stripe account. Fee: $${platformFee.toFixed(2)}. You receive: $${netTransferAmount.toFixed(2)}. From: ${club.name}`;
                    
                    try {
                      await sendSMS({
                        to: adminWithStripe.phone,
                        message: smsMessage,
                      });
                      console.log(`[Stripe Webhook] Auto-transfer SMS sent to admin ${adminWithStripe.id}`);
                    } catch (smsError) {
                      console.error(`[Stripe Webhook] Failed to send auto-transfer SMS:`, smsError);
                    }
                  }
                } catch (transferError) {
                  console.error(`[Stripe Webhook] Auto-transfer failed:`, transferError);
                  // Payment still succeeded, but auto-transfer failed
                  // Admin can still manually request payout from balance
                }
              } else {
                console.log(`[Stripe Webhook] No admin with Stripe account found for club ${club.id}, skipping auto-transfer`);
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

      // Handle Stripe Connect account onboarding completion
      if (event.type === "account.updated") {
        console.log("[Stripe Webhook] Processing account.updated event");
        const accountData = event.data?.object;
        const accountId = accountData?.id;
        const detailsSubmitted = accountData?.details_submitted;
        const chargesEnabled = accountData?.charges_enabled;
        const payoutsEnabled = accountData?.payouts_enabled;
        const metadata = accountData?.metadata;

        console.log(`[Stripe Webhook] Account ID: ${accountId}, Details Submitted: ${detailsSubmitted}, Charges Enabled: ${chargesEnabled}, Payouts Enabled: ${payoutsEnabled}`);
        console.log(`[Stripe Webhook] Metadata:`, JSON.stringify(metadata));

        if (!accountId) {
          console.error("[Stripe Webhook] No account ID in account.updated event");
          return NextResponse.json({ received: true });
        }

        if (!metadata?.user_id) {
          console.error("[Stripe Webhook] No user_id in metadata for account.updated event. Account:", accountId);
          return NextResponse.json({ received: true });
        }

        // Store or update the account ID when onboarding is complete
        if (detailsSubmitted && chargesEnabled) {
          console.log(`[Stripe Webhook] Account ${accountId} fully onboarded, storing for user ${metadata.user_id}`);
          
          // Check if this user already has this account ID stored
          const { data: existingUser, error: selectError } = await supabaseAdmin
            .from("users")
            .select("stripe_account_id")
            .eq("id", metadata.user_id)
            .single();

          if (selectError) {
            console.error(`[Stripe Webhook] Error fetching user:`, selectError);
            return NextResponse.json({ received: true });
          }

          if (!existingUser?.stripe_account_id || existingUser.stripe_account_id !== accountId) {
            // Store the account ID in the database
            const { error: updateError } = await supabaseAdmin
              .from("users")
              .update({ stripe_account_id: accountId })
              .eq("id", metadata.user_id);

            if (updateError) {
              console.error(`[Stripe Webhook] Error storing stripe_account_id:`, updateError);
            } else {
              console.log(`[Stripe Webhook] Successfully stored stripe_account_id ${accountId} for user ${metadata.user_id}`);
            }
          } else {
            console.log(`[Stripe Webhook] User ${metadata.user_id} already has correct stripe_account_id: ${existingUser.stripe_account_id}`);
          }
        } else {
          console.log(`[Stripe Webhook] Account ${accountId} not yet fully onboarded (details_submitted: ${detailsSubmitted}, charges_enabled: ${chargesEnabled})`);
          console.log(`[Stripe Webhook] Will wait for completion before storing account ID`);
        }
      }

      // Handle payout events (for instant payouts to connected accounts)
      if (event.type === "payout.paid") {
        console.log("[Stripe Webhook] Processing payout.paid event");
        const payoutData = event.data?.object;
        const payoutId = payoutData?.id;
        const arrivalDate = payoutData?.arrival_date;

        console.log(`[Stripe Webhook] Payout ID: ${payoutId}, Arrival Date: ${arrivalDate}`);

        if (payoutId) {
          // Find the payout in our database
          const { data: payoutRows } = await supabaseAdmin
            .from("payouts")
            .select("*")
            .eq("provider_batch_id", payoutId)
            .limit(1);

          const payout = payoutRows?.[0];

          if (payout) {
            console.log(`[Stripe Webhook] Found payout record: ${payout.id}`);

            // Update payout status
            await supabaseAdmin
              .from("payouts")
              .update({ status: "paid" })
              .eq("id", payout.id);

            // Get admin user info (who initiated the payout)
            const { data: adminRows } = await supabaseAdmin
              .from("users")
              .select("id, email, name, phone")
              .eq("id", payout.initiated_by)
              .limit(1);

            const adminUser = adminRows?.[0];

            // Get recipient user info
            const { data: recipientRows } = await supabaseAdmin
              .from("users")
              .select("id, email, name")
              .eq("id", payout.recipient_user_id)
              .limit(1);

            const recipientUser = recipientRows?.[0];

            // Get club info
            const { data: clubRows } = await supabaseAdmin
              .from("clubs")
              .select("id, name")
              .eq("id", payout.club_id)
              .limit(1);

            const club = clubRows?.[0];

            if (adminUser && recipientUser && club) {
              const amountInDollars = (payout.amount / 100).toFixed(2);
              const notificationMessage = `✓ Payout settled: $${amountInDollars} deposited to ${recipientUser.name || recipientUser.email}'s bank. ID: ${payoutId}`;

              // Send SMS notification if phone available
              if (adminUser.phone) {
                try {
                  await sendSMS({
                    to: adminUser.phone,
                    message: notificationMessage,
                  });
                  console.log(`[Stripe Webhook] SMS notification sent to admin ${adminUser.id}`);
                } catch (smsError) {
                  console.error(`[Stripe Webhook] Failed to send SMS:`, smsError);
                }
              } else {
                console.log(`[Stripe Webhook] No phone number for admin ${adminUser.id}, skipping SMS`);
              }
            } else {
              console.log(`[Stripe Webhook] Missing user or club info for notifications`);
            }
          } else {
            console.log(`[Stripe Webhook] No payout record found for Stripe payout ID: ${payoutId}`);
          }
        }
      }

      if (event.type === "payout.failed") {
        console.log("[Stripe Webhook] Processing payout.failed event");
        const payoutData = event.data?.object;
        const payoutId = payoutData?.id;
        const failureCode = payoutData?.failure_code;
        const failureMessage = payoutData?.failure_message;

        console.log(`[Stripe Webhook] Payout ID: ${payoutId}, Failure: ${failureCode} - ${failureMessage}`);

        if (payoutId) {
          // Update payout status in database
          const { data: payoutRows } = await supabaseAdmin
            .from("payouts")
            .select("*")
            .eq("provider_batch_id", payoutId)
            .limit(1);

          const payout = payoutRows?.[0];

          if (payout) {
            await supabaseAdmin
              .from("payouts")
              .update({ status: "failed" })
              .eq("id", payout.id);

            // Get admin user info
            const { data: adminRows } = await supabaseAdmin
              .from("users")
              .select("id, email, phone")
              .eq("id", payout.initiated_by)
              .limit(1);

            const adminUser = adminRows?.[0];

            if (adminUser) {
              const failureNotification = `⚠️ Payout failed (${payoutId}): ${failureMessage || failureCode || "Unknown error"}. Contact support.`;

              // Send SMS alert if phone available
              if (adminUser.phone) {
                try {
                  await sendSMS({
                    to: adminUser.phone,
                    message: failureNotification,
                  });
                  console.log(`[Stripe Webhook] Failure SMS sent to admin ${adminUser.id}`);
                } catch (smsError) {
                  console.error(`[Stripe Webhook] Failed to send failure SMS:`, smsError);
                }
              } else {
                console.log(`[Stripe Webhook] No phone number for admin ${adminUser.id}, skipping failure SMS`);
              }
            }
          }
        }
      }
    } catch (e) {
      console.error("[Stripe Webhook] Error processing stripe webhook event:", e);
      console.error("[Stripe Webhook] Error stack:", e instanceof Error ? e.stack : "No stack trace");
    }

    console.log(`[Stripe Webhook] Successfully processed event ${event.type}`);
    return NextResponse.json({ received: true });
  } catch (e: unknown) {
    const error = e as Error;
    return NextResponse.json({ error: error.message || "verify error" }, { status: 500 });
  }
}
