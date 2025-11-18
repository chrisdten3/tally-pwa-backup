import { NextResponse } from "next/server";
import { supabaseAdmin, getUserByAccessToken } from "@/lib/supabase";

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

    return NextResponse.json({ event }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
