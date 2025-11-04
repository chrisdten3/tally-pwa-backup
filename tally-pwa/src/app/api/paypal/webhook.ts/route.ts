// app/api/paypal/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PAYPAL_BASE, getAccessToken } from "@/lib/paypal";

export async function POST(req: NextRequest) {
  try {
    const body = await req.text(); // must be raw text
    const headers = Object.fromEntries(req.headers.entries());

    const verifyPayload = {
      auth_algo: headers["paypal-auth-algo"],
      cert_url: headers["paypal-cert-url"],
      transmission_id: headers["paypal-transmission-id"],
      transmission_sig: headers["paypal-transmission-sig"],
      transmission_time: headers["paypal-transmission-time"],
      webhook_id: process.env.PAYPAL_WEBHOOK_ID,
      webhook_event: JSON.parse(body),
    };

    const access = await getAccessToken();
    const verifyRes = await fetch(`${PAYPAL_BASE}/v1/notifications/verify-webhook-signature`, {
      method: "POST",
      headers: { Authorization: `Bearer ${access}`, "Content-Type": "application/json" },
      body: JSON.stringify(verifyPayload),
      cache: "no-store",
    });
    const verifyJson = await verifyRes.json();
    if (verifyJson.verification_status !== "SUCCESS") {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const _event = verifyPayload.webhook_event;
    // Handle events you care about:
    // - CHECKOUT.ORDER.APPROVED
    // - PAYMENT.CAPTURE.COMPLETED / DENIED / REFUNDED
    // Use _event.resource to update your ledger atomically.

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "verify error" }, { status: 500 });
  }
}

// Important: tell Next NOT to parse body so we can read raw text
export const config = {
  api: { bodyParser: false },
};
