import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, getUserByAccessToken } from "@/lib/supabase";
import stripeLib from "@/lib/stripe";

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    const authUser = await getUserByAccessToken(token ?? undefined);
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { eventId } = await req.json();
    if (!eventId) return NextResponse.json({ error: "Missing eventId" }, { status: 400 });

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

    const amount = Number(assignment.assigned_amount || 0);
    const amountCents = stripeLib.amountToCents(amount);

    // Build success/cancel URLs from the request origin so they point back to the app (e.g. http://localhost:3000/events)
    const origin = (() => {
      try {
        // Prefer header-derived origin when available (proxied hosts), otherwise use request URL origin
        const forwardedHost = req.headers.get("x-forwarded-host");
        const forwardedProto = req.headers.get("x-forwarded-proto") || req.headers.get("x-forwarded-protocol");
        if (forwardedHost) return `${forwardedProto || "https"}://${forwardedHost}`;
      } catch (e) {
        // ignore
      }
      return new URL(req.url).origin;
    })();

    const successUrl = `${origin}/events`;
    const cancelUrl = `${origin}/events`;

    const session = await stripeLib.createCheckoutSession({
      amountCents,
      currency: "usd",
      eventId,
      assignmentId: assignment.id,
      successUrl,
      cancelUrl,
    });

    // persist pending payment
    try {
      const nowIso = new Date().toISOString();
      const { data: existing } = await supabaseAdmin
        .from("payments_pending")
        .select("*")
        .eq("assignment_id", assignment.id)
        .eq("captured", false)
        .limit(1);
      if (!existing || existing.length === 0) {
        await supabaseAdmin.from("payments_pending").insert({
          order_id: session.id,
          event_id: eventId,
          assignment_id: assignment.id,
          created_at: nowIso,
          captured: false,
        });
      }
    } catch (e) {
      console.error("Failed to persist payments_pending for stripe session", e);
    }

    return NextResponse.json({ id: session.id, url: session.url });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Server error" }, { status: 500 });
  }
}
