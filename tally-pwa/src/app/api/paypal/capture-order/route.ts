// app/api/paypal/capture-order/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAccessToken, PAYPAL_BASE } from "@/lib/paypal";
import fs from "fs";
import path from "path";

const DB_PATH = path.join(process.cwd(), "mock-db.json");

function readDb() {
  try {
    if (!fs.existsSync(DB_PATH)) return {};
    return JSON.parse(fs.readFileSync(DB_PATH, "utf8") || "{}");
  } catch {
    return {};
  }
}

function writeDb(db: any) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf8");
  } catch {
    // ignore write errors in mock env
  }
}

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

    // Update mock DB: mark assignment as paid and increment club balance (mock)
    try {
      const db = readDb();
      db.club_event_assignees = db.club_event_assignees || [];
      db.clubs = db.clubs || [];

      // helper: try to get authenticated user from incoming request
      function getUserFromReq(r: NextRequest) {
        const auth = r.headers.get("authorization") || "";
        const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
        if (!token || !token.startsWith("mock-token-")) return null;
        const email = token.slice("mock-token-".length);
        return { id: `user_${email.replace(/[^a-z0-9]/gi, "")}`, email };
      }
      const authedUser = getUserFromReq(req);

      // mark pending payment captured if present
      db.payments_pending = db.payments_pending || [];

      if (referenceEventId) {
        // Try to find a pending payment by this orderId and use its assignment
        db.payments_pending = db.payments_pending || [];
        let assignment: any = null;
        const pending = db.payments_pending.find((p: any) => p.orderId === (capture?.id || json.id || orderId));
        if (pending && pending.assignmentId) {
          assignment = db.club_event_assignees.find((a: any) => a.id === pending.assignmentId && !a.is_cancelled);
        }

        // Prefer to match the assignment by the authenticated user (if present)
        if (!assignment && authedUser) {
          assignment = db.club_event_assignees.find((a: any) => a.club_event_id === referenceEventId && a.user_id === authedUser.id && !a.is_cancelled);
        }

        // Next try payer email from PayPal (if provided)
        if (!assignment) {
          const payerEmail = json.payer?.email_address;
          if (payerEmail && db.users && db.users[payerEmail]) {
            const payerId = db.users[payerEmail].id;
            assignment = db.club_event_assignees.find((a: any) => a.club_event_id === referenceEventId && a.user_id === payerId && !a.is_cancelled);
          }
        }

        // Fallback: first matching un-cancelled assignee
        if (!assignment) {
          assignment = db.club_event_assignees.find((a: any) => a.club_event_id === referenceEventId && !a.is_cancelled);
        }

        if (assignment) {
          assignment.is_cancelled = true; // treat as removed/paid
          assignment.paid_at = new Date().toISOString();
          assignment.payment_provider = "paypal";
          assignment.payment_id = capture?.id || json.id || orderId;

          // increment club balance (add property balance on club)
          const club = db.clubs.find((c: any) => c.id === assignment.club_id);
          const increment = amountStr ? Number(amountStr) : Number(assignment.assigned_amount || 0);
          if (club) {
            const prev = club.balance || 0;
            club.balance = prev + increment;

            // ensure ledger exists and append a payment entry
            db.ledgers = db.ledgers || [];
            // try to resolve user info from DB
            const usersMap: any = db.users || {};
            const assignedUser: any = Object.values(usersMap).find((u: any) => u.id === assignment.user_id) || null;
            const payer: any = json.payer?.email_address ? usersMap[json.payer.email_address] : null;

            const completedBy = payer ? payer : assignedUser ? assignedUser : null;
            const ledgerEntry = {
              id: `ledger_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
              club_id: club.id,
              type: "payment",
              amount: increment,
              balance_before: prev,
              balance_after: club.balance,
              // entry-level user_id should be the actor who completed the payment
              user_id: completedBy ? completedBy.id : assignment.user_id,
              // keep assignee reference
              assignee_user_id: assignment.user_id,
              // who actually completed the transaction (payer or assigned user)
              completed_by_user_id: completedBy ? completedBy.id : undefined,
              completed_by_name: completedBy ? completedBy.name : undefined,
              completed_by_email: completedBy ? completedBy.email : undefined,
              event_id: referenceEventId,
              payment_provider: "paypal",
              payment_id: assignment.payment_id,
              createdAt: new Date().toISOString(),
              description: `Payment for event ${referenceEventId}`,
            };
            db.ledgers.push(ledgerEntry);
          }
          // mark any pending payment for this assignment as captured
          const pending = db.payments_pending.find((p: any) => p.assignmentId === assignment.id && p.orderId === (capture?.id || json.id || orderId));
          if (pending) pending.captured = true;

          writeDb(db);
        }
      }
    } catch (e) {
      // ignore DB errors in mock env but still return success to client
      console.error("Error updating mock DB after capture:", e);
    }

    return NextResponse.json({ ...json, _dbUpdated: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Server error" }, { status: 500 });
  }
}
