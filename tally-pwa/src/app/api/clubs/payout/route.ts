
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getAccessToken, PAYPAL_BASE } from "@/lib/paypal";

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
    // ignore
  }
}

function getUserFromReq(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token || !token.startsWith("mock-token-")) return null;
  const email = token.slice("mock-token-".length);
  return { id: `user_${email.replace(/[^a-z0-9]/gi, "")}`, email };
}

// POST: { clubId, amount, to, toType?: 'EMAIL'|'PHONE' }
export async function POST(req: Request) {
  const user = getUserFromReq(req);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

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

  const db = readDb() as any;
  const club = (db.clubs || []).find((c: any) => c.id === body.clubId);
  if (!club) return NextResponse.json({ error: "Club not found" }, { status: 404 });

  // require admin
  const memberships = db.memberships || {};
  const role = memberships[user.id] && memberships[user.id][body.clubId];
  if (!role || role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const amount = Number(body.amount);
  if (Number.isNaN(amount) || amount <= 0) return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  if ((club.balance || 0) < amount) return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });

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
          recipient_type: recipientType,
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

    // Deduct balance and record ledger + payout record
    try {
      const before = club.balance || 0;
      club.balance = Number((before - amount).toFixed(2));

      db.payouts = db.payouts || [];
      const payoutRecord = {
        id: `payout_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        club_id: club.id,
        amount,
        currency: "USD",
        receiver: body.to,
        receiver_type: recipientType,
        provider: "paypal",
        provider_batch_id: json.batch_header?.payout_batch_id || null,
        status: json.batch_header?.batch_status || json.batch_header?.status || "PENDING",
        createdAt: new Date().toISOString(),
        raw: json,
        initiated_by: user.id,
      };
      db.payouts.push(payoutRecord);

      db.ledgers = db.ledgers || [];
      const entry = {
        id: `ledger_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        club_id: club.id,
        type: "payout",
        amount: -amount,
        balance_before: before,
        balance_after: club.balance,
        user_id: user.id,
        completed_by_user_id: user.id,
        completed_by_email: user.email,
        completed_by_name: user.email,
        createdAt: new Date().toISOString(),
        description: `Payout to ${body.to}`,
        payout_id: payoutRecord.id,
        provider_batch_id: payoutRecord.provider_batch_id,
      };
      db.ledgers.push(entry);

      writeDb(db);
    } catch (e) {
      // if DB write fails, we still return success to client (but log)
      console.error("Failed to persist payout in mock DB", e);
    }

    return NextResponse.json({ ok: true, payout: json });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
