// app/api/venmo/start/route.ts
import { NextResponse } from "next/server";

const PAYPAL_BASE = process.env.PAYPAL_ENV === "sandbox"
  ? "https://api-m.sandbox.paypal.com"
  : "https://api-m.paypal.com";

async function getAccessToken() {
  const client = process.env.PAYPAL_CLIENT_ID!;
  const secret = process.env.PAYPAL_SECRET!;
  const r = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
    // @ts-ignore
    next: { revalidate: 0 },
    // Basic auth per PayPal spec
    // @ts-ignore
    headers: {
      Authorization: "Basic " + Buffer.from(`${client}:${secret}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });
  if (!r.ok) throw new Error("Failed to obtain PayPal token");
  const j = await r.json();
  return j.access_token as string;
}

export async function POST(req: Request) {
  try {
    const { eventId } = await req.json();
    if (!eventId) {
      return NextResponse.json({ error: "Missing eventId" }, { status: 400 });
    }

    // TODO: authn/authz using req.headers.get('authorization')
    // TODO: lookup event & amount from your DB:
    const amount = await getAmountForEvent(eventId); // implement this

    const accessToken = await getAccessToken();
    const origin =
      process.env.NEXT_PUBLIC_BASE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

    // Create a PayPal order with return/cancel URLs (needed for redirect-style flows)
    const orderRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        application_context: {
          brand_name: "Tally",
          user_action: "PAY_NOW",
          return_url: `${origin}/api/paypal/return?eventId=${encodeURIComponent(eventId)}`,
          cancel_url: `${origin}/payments/cancelled`,
          shipping_preference: "NO_SHIPPING",
        },
        purchase_units: [
          {
            reference_id: eventId,
            amount: { currency_code: "USD", value: amount.toFixed(2) },
          },
        ],
      }),
      // @ts-ignore
      next: { revalidate: 0 },
    });

    const order = await orderRes.json();
    if (!orderRes.ok) {
      return NextResponse.json({ error: order?.message || "Failed to create order" }, { status: 500 });
    }

    const approveUrl = order?.links?.find((l: any) => l.rel === "approve")?.href;
    if (!approveUrl) {
      return NextResponse.json({ error: "No approve link from PayPal" }, { status: 500 });
    }

    // Send JSON so the client can redirect
    return NextResponse.json({ redirectUrl: approveUrl });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}

// --- stub: replace with your real DB lookup ---
async function getAmountForEvent(_eventId: string) {
  // read from your events table; must match cents/precision you use elsewhere
  return 30.0;
}
