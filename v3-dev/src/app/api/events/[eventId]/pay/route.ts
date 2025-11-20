import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import stripeLib from "@/lib/stripe";

/**
 * POST /api/events/[eventId]/pay
 * Public endpoint for anyone to pay for an event (no auth required)
 * Creates or finds user by phone, adds to club if needed, creates assignment
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params;
    const body = await req.json();
    const { firstName, lastName, phone, email } = body;

    if (!firstName || !lastName || !phone) {
      return NextResponse.json({ error: "First name, last name, and phone are required" }, { status: 400 });
    }

    // Get event details
    const { data: eventRows } = await supabaseAdmin
      .from("club_events")
      .select("*")
      .eq("id", eventId)
      .limit(1);
    
    const event = eventRows?.[0];
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Check if event is expired
    if (event.expires_at) {
      const expiresAt = new Date(event.expires_at);
      if (expiresAt < new Date()) {
        return NextResponse.json({ error: "This event has expired" }, { status: 400 });
      }
    }

    // Find or create user by phone
    let user;
    const { data: existingUsers } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("phone", phone)
      .limit(1);

    if (existingUsers && existingUsers.length > 0) {
      user = existingUsers[0];
      
      // Update user name if it has changed
      const fullName = `${firstName} ${lastName}`;
      if (user.name !== fullName || user.first_name !== firstName || user.last_name !== lastName || (email && user.email !== email)) {
        await supabaseAdmin
          .from("users")
          .update({ 
            name: fullName,
            first_name: firstName,
            last_name: lastName,
            ...(email && { email })
          })
          .eq("id", user.id);
        user.name = fullName;
        user.first_name = firstName;
        user.last_name = lastName;
        if (email) user.email = email;
      }
    } else {
      // Create new user
      const userId = `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const newUser = {
        id: userId,
        name: `${firstName} ${lastName}`,
        first_name: firstName,
        last_name: lastName,
        phone: phone,
        email: email || null,
        created_at: new Date().toISOString(),
      };
      
      await supabaseAdmin.from("users").insert(newUser);
      user = newUser;
    }

    // Check if user is already a member of the club
    const { data: membershipRows } = await supabaseAdmin
      .from("memberships")
      .select("*")
      .eq("club_id", event.club_id)
      .eq("user_id", user.id)
      .limit(1);

    const nowIso = new Date().toISOString();

    if (!membershipRows || membershipRows.length === 0) {
      // Add user to club membership with joined_via_payment flag
      await supabaseAdmin.from("memberships").insert({
        club_id: event.club_id,
        user_id: user.id,
        role: "member",
        joined_via_payment: true,
        created_at: nowIso,
      });
    }

    // Check if user already has an assignment for this event
    const { data: existingAssignments } = await supabaseAdmin
      .from("club_event_assignees")
      .select("*")
      .eq("club_event_id", eventId)
      .eq("user_id", user.id)
      .eq("is_cancelled", false)
      .limit(1);

    let assignment = existingAssignments?.[0];

    // If already paid, don't allow duplicate payment
    if (assignment && assignment.paid_at) {
      return NextResponse.json({ error: "You have already paid for this event" }, { status: 400 });
    }

    // Create new assignment if none exists
    if (!assignment) {
      const assignmentId = `assign_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      assignment = {
        id: assignmentId,
        club_event_id: eventId,
        club_id: event.club_id,
        user_id: user.id,
        assigned_amount: event.amount,
        role_at_assign: "member",
        assigned_by: event.author_id,
        assigned_at: nowIso,
        is_waived: false,
        is_cancelled: false,
      };

      await supabaseAdmin.from("club_event_assignees").insert(assignment);
    }

    // Create Stripe checkout session
    // Note: event.amount is already stored in cents in the database
    const amountCents = Number(event.amount);

    const origin = (() => {
      try {
        const forwardedHost = req.headers.get("x-forwarded-host");
        const forwardedProto = req.headers.get("x-forwarded-proto") || req.headers.get("x-forwarded-protocol");
        if (forwardedHost) return `${forwardedProto || "https"}://${forwardedHost}`;
      } catch {
        // ignore
      }
      return new URL(req.url).origin;
    })();

    const successUrl = `${origin}/events/${eventId}/success`;
    const cancelUrl = `${origin}/events/${eventId}/pay`;

    const session = await stripeLib.createCheckoutSession({
      amountCents,
      currency: "usd",
      eventId,
      assignmentId: assignment.id,
      successUrl,
      cancelUrl,
    });

    // Persist pending payment
    try {
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

    return NextResponse.json({ 
      id: session.id, 
      url: session.url,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
      }
    });
  } catch (e: any) {
    console.error("[POST /api/events/[eventId]/pay]", e);
    return NextResponse.json({ error: e.message || "Server error" }, { status: 500 });
  }
}

/**
 * GET /api/events/[eventId]/pay
 * Get event details for public payment page
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params;

    const { data: eventRows } = await supabaseAdmin
      .from("club_events")
      .select(`
        id,
        title,
        description,
        amount,
        expires_at,
        created_at,
        clubs (
          id,
          name
        )
      `)
      .eq("id", eventId)
      .limit(1);
    
    const event = eventRows?.[0];
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Check if event is expired
    const isExpired = event.expires_at ? new Date(event.expires_at) < new Date() : false;

    return NextResponse.json({ 
      event: {
        id: event.id,
        title: event.title,
        description: event.description,
        amount: event.amount,
        expiresAt: event.expires_at,
        createdAt: event.created_at,
        isExpired,
        club: event.clubs,
      }
    });
  } catch (e: any) {
    console.error("[GET /api/events/[eventId]/pay]", e);
    return NextResponse.json({ error: e.message || "Server error" }, { status: 500 });
  }
}
