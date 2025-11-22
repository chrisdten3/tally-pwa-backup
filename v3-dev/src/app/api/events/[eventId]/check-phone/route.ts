import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * GET /api/events/[eventId]/check-phone?phone=...
 * Check if a phone number exists in the club and return user info
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get("phone");

    if (!phone) {
      return NextResponse.json({ error: "Phone parameter is required" }, { status: 400 });
    }

    // Get event details to find the club
    const { data: eventRows } = await supabaseAdmin
      .from("club_events")
      .select("club_id")
      .eq("id", eventId)
      .limit(1);

    const event = eventRows?.[0];
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Find user by phone
    const { data: userRows } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("phone", phone)
      .limit(1);

    const user = userRows?.[0];
    if (!user) {
      return NextResponse.json({ exists: false });
    }

    // Check if user is a member of this club
    const { data: membershipRows } = await supabaseAdmin
      .from("memberships")
      .select("*")
      .eq("club_id", event.club_id)
      .eq("user_id", user.id)
      .limit(1);

    if (!membershipRows || membershipRows.length === 0) {
      return NextResponse.json({ exists: false });
    }

    // User exists in this club
    return NextResponse.json({
      exists: true,
      user: {
        firstName: user.first_name || "",
        lastName: user.last_name || "",
        email: user.email || "",
      phone: user.phone || "",
    },
  });
  } catch (e) {
    console.error("[GET /api/events/[eventId]/check-phone]", e);
    const error = e as Error;
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}