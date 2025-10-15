// app/api/paypal/create-order/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAccessToken, PAYPAL_BASE } from "@/lib/paypal";
import { supabaseAdmin, getUserByAccessToken } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    const authUser = await getUserByAccessToken(token ?? undefined);
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { eventId } = await req.json();
    if (!eventId) return NextResponse.json({ error: "Missing eventId" }, { status: 400 });

    // look up the assigned amount for this user+event in supabase
    const { data: eventRows } = await supabaseAdmin.from("club_events").select("*").eq("id", eventId).limit(1);
    const event = eventRows?.[0];
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const { data: assignmentRows } = await supabaseAdmin
      .from("club_event_assignees")
      .select("*")
      .eq("club_event_id", eventId)
      .eq("user_id", authUser.id)
      .eq("is_cancelled", false)
      .limit(1);
    const assignment = assignmentRows?.[0];
    if (!assignment) return NextResponse.json({ error: "Not assigned" }, { status: 403 });

    const value = Number(assignment.assigned_amount).toFixed(2);

    const access = await getAccessToken();
    const requestId = `create-${eventId}-${authUser.id}-${Date.now()}`;

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

    // persist a pending payment so we can avoid duplicate orders for the same assignment
    try {
      const nowIso = new Date().toISOString();
      // check for existing pending
      const { data: existing } = await supabaseAdmin
        .from("payments_pending")
        .select("*")
        .eq("assignment_id", assignment.id)
        .eq("captured", false)
        .limit(1);
      if (!existing || existing.length === 0) {
        await supabaseAdmin.from("payments_pending").insert({ order_id: json.id, event_id: eventId, assignment_id: assignment.id, created_at: nowIso, captured: false });
      }
    } catch (e) {
      console.error("Failed to persist payments_pending in Supabase", e);
    }

    return NextResponse.json({ id: json.id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Server error" }, { status: 500 });
  }
}
