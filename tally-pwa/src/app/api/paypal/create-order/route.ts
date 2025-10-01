// app/api/paypal/create-order/route.ts
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

function getUserFromReq(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token || !token.startsWith("mock-token-")) return null;
  const email = token.slice("mock-token-".length);
  return { id: `user_${email.replace(/[^a-z0-9]/gi, "")}`, email };
}

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromReq(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { eventId } = await req.json();
    if (!eventId) return NextResponse.json({ error: "Missing eventId" }, { status: 400 });

    // look up the assigned amount for this user+event in your mock DB
    const db = readDb() as any;
    const event = (db.club_events || []).find((e: any) => e.id === eventId);
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const assignment = (db.club_event_assignees || []).find(
      (a: any) => a.club_event_id === eventId && a.user_id === user.id && !a.is_cancelled
    );
    if (!assignment) return NextResponse.json({ error: "Not assigned" }, { status: 403 });

    const value = Number(assignment.assigned_amount).toFixed(2);

    const access = await getAccessToken();
    const requestId = `create-${eventId}-${user.id}-${Date.now()}`;

    const res = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": requestId, // idempotency
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: eventId,
            amount: { currency_code: "USD", value },
            // Later (marketplace): payee: { merchant_id: CLUB_MERCHANT_ID }
          },
        ],
        application_context: {
          shipping_preference: "NO_SHIPPING",
          user_action: "PAY_NOW",
          brand_name: "Tally",
          return_url: "https://example.com/success", // not used for JS SDK popups
          cancel_url: "https://example.com/cancel",
        },
      }),
      cache: "no-store",
    });

    const json = await res.json();
    if (!res.ok) return NextResponse.json(json, { status: res.status });

    // (Optional) persist json.id as a pending payment in your ledger
    return NextResponse.json({ id: json.id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Server error" }, { status: 500 });
  }
}
