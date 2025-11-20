import { NextResponse } from "next/server";
import { supabaseAdmin, getUserByAccessToken } from "@/lib/supabase";

/**
 * GET /api/clubs/[clubId]/events
 * Fetch all events for a specific club
 */
export async function GET(req: Request, { params }: { params: Promise<{ clubId: string }> }) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    const authUser = await getUserByAccessToken(token ?? undefined);
    if (!authUser) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { clubId } = await params;

    // Verify user is a member of this club
    const { data: membership } = await supabaseAdmin
      .from("memberships")
      .select("role")
      .eq("user_id", authUser.id)
      .eq("club_id", clubId)
      .limit(1)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ error: "Not a member of this club" }, { status: 403 });
    }

    // Get all events for this club
    const { data: events } = await supabaseAdmin
      .from("club_events")
      .select(`
        *,
        users:author_id (
          id,
          name,
          email
        )
      `)
      .eq("club_id", clubId)
      .order("created_at", { ascending: false });

    // Get assignee counts and payment stats for each event
    const eventIds = events?.map((e: any) => e.id) || [];
    
    const { data: assignees } = await supabaseAdmin
      .from("club_event_assignees")
      .select("club_event_id, paid_at, is_cancelled, assigned_amount")
      .in("club_event_id", eventIds);

    // Calculate stats per event
    const statsMap = (assignees || []).reduce((acc: any, assignee: any) => {
      if (!acc[assignee.club_event_id]) {
        acc[assignee.club_event_id] = {
          totalAssignees: 0,
          paidCount: 0,
          totalCollected: 0,
          pendingCount: 0,
        };
      }
      if (!assignee.is_cancelled) {
        acc[assignee.club_event_id].totalAssignees++;
        if (assignee.paid_at) {
          acc[assignee.club_event_id].paidCount++;
          acc[assignee.club_event_id].totalCollected += assignee.assigned_amount || 0;
        } else {
          acc[assignee.club_event_id].pendingCount++;
        }
      }
      return acc;
    }, {});

    const eventsWithStats = (events || []).map((event: any) => ({
      id: event.id,
      title: event.title,
      description: event.description,
      amount: event.amount,
      currency: event.currency,
      createdAt: event.created_at,
      expiresAt: event.expires_at,
      isActive: event.is_active,
      author: {
        id: event.users?.id,
        name: event.users?.name,
        email: event.users?.email,
      },
      stats: statsMap[event.id] || {
        totalAssignees: 0,
        paidCount: 0,
        totalCollected: 0,
        pendingCount: 0,
      },
    }));

    return NextResponse.json({ events: eventsWithStats });
  } catch (e: any) {
    console.error("[GET /api/clubs/[clubId]/events]", e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
