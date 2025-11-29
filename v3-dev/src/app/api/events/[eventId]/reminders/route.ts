import { NextResponse } from "next/server";
import { supabaseAdmin, getUserByAccessToken } from "@/lib/supabase";
import { sendBulkSMS, formatEventNotification } from "@/lib/surge";

type UnpaidAssigneeUser = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
};

type UnpaidAssignee = {
  user_id: string;
  assigned_amount: number;
  users: UnpaidAssigneeUser | UnpaidAssigneeUser[] | null;
};

type NormalizedAssignee = {
  user_id: string;
  assigned_amount: number;
  users: UnpaidAssigneeUser | null;
};

/**
 * POST /api/events/[eventId]/reminders
 * Send payment reminders to unpaid assignees
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    const authUser = await getUserByAccessToken(token ?? undefined);
    if (!authUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { eventId } = await params;

    // Get the event details
    const { data: event, error: eventError } = await supabaseAdmin
      .from("club_events")
      .select("*, clubs!club_events_club_id_fkey(id, name)")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Verify user is an admin of this club
    const { data: membership } = await supabaseAdmin
      .from("memberships")
      .select("role")
      .eq("user_id", authUser.id)
      .eq("club_id", event.club_id)
      .limit(1)
      .maybeSingle();

    if (!membership || membership.role !== "admin") {
      return NextResponse.json({ error: "Only admins can send reminders" }, { status: 403 });
    }

    // Get unpaid assignees with their phone numbers
    const { data: unpaidAssignees } = await supabaseAdmin
      .from("club_event_assignees")
      .select(`
        user_id,
        assigned_amount,
        users!club_event_assignees_user_id_fkey(
          id,
          name,
          email,
          phone
        )
      `)
      .eq("club_event_id", eventId)
      .eq("is_cancelled", false)
      .is("paid_at", null);

    if (!unpaidAssignees || unpaidAssignees.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No unpaid assignees to remind",
        sent: 0,
        failed: 0,
      });
    }

    console.log("📱 [Reminders] Found unpaid assignees:", unpaidAssignees.length);

    // Normalize the data - Supabase may return users as array or object
    const normalizedAssignees: NormalizedAssignee[] = (unpaidAssignees as UnpaidAssignee[]).map((a) => ({
      ...a,
      users: Array.isArray(a.users) ? a.users[0] : a.users,
    }));

    // Filter assignees with valid phone numbers
    const assigneesWithPhones = normalizedAssignees.filter(
      (assignee) => assignee.users?.phone
    );

    if (assigneesWithPhones.length === 0) {
      return NextResponse.json({
        success: false,
        message: "No unpaid assignees have phone numbers on file",
        sent: 0,
        failed: 0,
        details: normalizedAssignees.map((a) => ({
          name: a.users?.name || "Unknown",
          email: a.users?.email || "Unknown",
          hasPhone: false,
        })),
      });
    }

    console.log("📱 [Reminders] Assignees with phones:", assigneesWithPhones.length);

    // Generate payment link
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const paymentLink = `${baseUrl}/events/${eventId}/pay`;

    // Get club name (handle both nested and direct structure)
    const clubName = event.clubs?.name || event.club?.name || "Your Club";

    // Format message
    const message = formatEventNotification({
      eventTitle: event.title,
      amount: event.amount,
      clubName,
      paymentLink,
    });

    console.log("📱 [Reminders] Message:", message);

    // Send SMS reminders
    const phoneNumbers = assigneesWithPhones.map((a) => a.users!.phone as string);
    console.log("📱 [Reminders] Sending to:", phoneNumbers);

    const smsResult = await sendBulkSMS(phoneNumbers, message);

    console.log("✅ [Reminders] Results:", smsResult);

    // Prepare detailed results
    const details = normalizedAssignees.map((a) => {
      const hasPhone = !!a.users?.phone;
      const smsResultForUser = hasPhone
        ? smsResult.results.find((r) => r.phone === a.users!.phone)
        : null;

      return {
        name: a.users?.name || "Unknown",
        email: a.users?.email || "Unknown",
        phone: a.users?.phone || null,
        hasPhone,
        sent: smsResultForUser?.success || false,
        error: smsResultForUser?.error || (!hasPhone ? "No phone number" : undefined),
      };
    });

    return NextResponse.json({
      success: smsResult.sent > 0,
      message: `Sent ${smsResult.sent} reminder(s), ${smsResult.failed} failed`,
      sent: smsResult.sent,
      failed: smsResult.failed,
      details,
    });
  } catch (e) {
    console.error("[POST /api/events/[eventId]/reminders]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to send reminders" },
      { status: 500 }
    );
  }
}
