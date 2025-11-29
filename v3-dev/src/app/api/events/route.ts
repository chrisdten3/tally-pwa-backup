import { NextResponse } from "next/server";
import { supabaseAdmin, getUserByAccessToken } from "@/lib/supabase";
import { sendBulkSMS, formatEventNotification } from "@/lib/surge";

export async function GET(req: Request) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    const authUser = await getUserByAccessToken(token ?? undefined);
    if (!authUser) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    // fetch assigned events for user (only unpaid and not cancelled)
    const { data: assignments } = await supabaseAdmin
      .from("club_event_assignees")
      .select("*, club_events(*)")
      .eq("user_id", authUser.id)
      .eq("is_cancelled", false)
      .is("paid_at", null);

    const assigned = (assignments || []).map((a: any) => {
      const event = a.club_events;
      return {
        id: event.id,
        title: event.title,
        description: event.description,
        amount: a.assigned_amount,
        createdAt: event.created_at || event.createdAt,
        expires_at: event.expires_at,
        club: { id: event.club_id, name: event.club_id }, // club name can be joined if needed
        assignment: {
          assigned_by: a.assigned_by,
          assigned_by_name: a.assigned_by,
          assigned_at: a.assigned_at,
          is_waived: a.is_waived,
          is_cancelled: a.is_cancelled,
          role_at_assign: a.role_at_assign,
        },
      };
    });

    // fetch events created by current user
    const { data: createdEvents } = await supabaseAdmin.from("club_events").select("*").eq("author_id", authUser.id);

    const created = (createdEvents || []).map((event: any) => ({
      id: event.id,
      title: event.title,
      description: event.description,
      amount: event.amount,
      createdAt: event.created_at || event.createdAt,
      expires_at: event.expires_at,
      club: { id: event.club_id, name: event.club_id },
      stats: {},
    }));

    return NextResponse.json({ assigned, created });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    const authUser = await getUserByAccessToken(token ?? undefined);
    if (!authUser) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const body = (await req.json().catch(() => ({}))) as Partial<{
      clubId: string;
      title: string;
      description?: string;
      amount: number;
      expiresAt?: string | null;
      assigneeUserIds: string[];
    }>;

    const { clubId, title, description, amount, expiresAt, assigneeUserIds } = body;
    if (!clubId || !title || typeof amount !== "number" || !Array.isArray(assigneeUserIds)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // check role of creator
    const { data: membershipRows } = await supabaseAdmin
      .from("memberships")
      .select("role")
      .eq("club_id", clubId)
      .eq("user_id", authUser.id)
      .limit(1);
    const role = membershipRows?.[0]?.role;
    if (role !== "admin") return NextResponse.json({ error: "Only admins can create events" }, { status: 403 });

    const nowIso = new Date().toISOString();
    const slug = String(title).replace(/[^a-z0-9]/gi, "").toLowerCase();
    const eventId = `event_${slug}_${Date.now()}`;

    const event = {
      id: eventId,
      author_id: authUser.id,
      club_id: clubId,
      title: String(title),
      description: String(description || ""),
      amount: Math.trunc(Number(amount)),
      created_at: nowIso,
      expires_at: expiresAt ? String(expiresAt) : null,
    };

    await supabaseAdmin.from("club_events").insert(event);

    const assigneesToInsert = assigneeUserIds.map((uid) => ({
      id: `assign_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      club_event_id: eventId,
      club_id: clubId,
      user_id: uid,
      assigned_amount: event.amount,
      role_at_assign: "member",
      assigned_by: authUser.id,
      assigned_at: nowIso,
      is_waived: false,
      is_cancelled: false,
    }));

    if (assigneesToInsert.length) await supabaseAdmin.from("club_event_assignees").insert(assigneesToInsert);

    // Send SMS notifications to assigned members
    if (assigneeUserIds.length > 0) {
      try {
        // Fetch phone numbers for assigned members
        const { data: assignedUsers } = await supabaseAdmin
          .from("users")
          .select("id, phone, name")
          .in("id", assigneeUserIds);

        console.log("📱 [SMS] Assigned users:", JSON.stringify(assignedUsers, null, 2));

        if (assignedUsers && assignedUsers.length > 0) {
          // Filter users with valid phone numbers
          const usersWithPhones = assignedUsers.filter((user) => user.phone);

          console.log("📱 [SMS] Users with phones:", usersWithPhones.length);
          console.log("📱 [SMS] Phone numbers:", usersWithPhones.map(u => ({ name: u.name, phone: u.phone })));

          if (usersWithPhones.length > 0) {
            // Get club name for the message
            const { data: clubData } = await supabaseAdmin
              .from("clubs")
              .select("name")
              .eq("id", clubId)
              .single();

            const clubName = clubData?.name || "Your Club";
            console.log("📱 [SMS] Club name:", clubName);

            // Generate payment link
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
            const paymentLink = `${baseUrl}/events/${eventId}/pay`;
            console.log("📱 [SMS] Payment link:", paymentLink);

            // Format message
            const message = formatEventNotification({
              eventTitle: title,
              amount: event.amount,
              clubName,
              paymentLink,
            });

            console.log("📱 [SMS] Formatted message:", message);

            // Send SMS to all assigned members
            const phoneNumbers = usersWithPhones.map((user) => user.phone as string);
            console.log("📱 [SMS] About to send SMS to:", phoneNumbers);
            
            const smsResult = await sendBulkSMS(phoneNumbers, message);

            console.log("✅ [SMS] SMS notifications sent:", smsResult.sent, "successful,", smsResult.failed, "failed");
            console.log("📱 [SMS] Detailed results:", JSON.stringify(smsResult.results, null, 2));
          } else {
            console.log("⚠️ [SMS] No users with valid phone numbers found");
          }
        } else {
          console.log("⚠️ [SMS] No assigned users found");
        }
      } catch (smsError) {
        // Log error but don't fail the event creation
        console.error("❌ [SMS] Error sending SMS notifications:", smsError);
        console.error("❌ [SMS] Error details:", JSON.stringify(smsError, null, 2));
      }
    }

    return NextResponse.json({ event }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
