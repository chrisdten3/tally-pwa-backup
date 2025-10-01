// app/api/paypal/capture-order/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAccessToken, PAYPAL_BASE } from "@/lib/paypal";

export async function POST(req: NextRequest) {
  try {
    const { orderId } = await req.json();
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

    // TODO: Upsert payment → your ledger (paid_at, amount, payer email, capture id)
    // const capture = json.purchase_units?.[0]?.payments?.captures?.[0];

    return NextResponse.json(json);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Server error" }, { status: 500 });
  }
}
