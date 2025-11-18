import { NextResponse } from "next/server";
import { supabaseAdmin, getUserByAccessToken } from "@/lib/supabase";

/**
 * GET /api/clubs/[clubId]/stats
 * Fetch dashboard statistics for a specific club
 */
export async function GET(req: Request, { params }: { params: { clubId: string } }) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    const authUser = await getUserByAccessToken(token ?? undefined);
    if (!authUser) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { clubId } = params;

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

    // Get club details
    const { data: club } = await supabaseAdmin
      .from("clubs")
      .select("*")
      .eq("id", clubId)
      .limit(1)
      .maybeSingle();

    // Get member count
    const { count: memberCount } = await supabaseAdmin
      .from("memberships")
      .select("*", { count: "exact", head: true })
      .eq("club_id", clubId);

    // Get pending events (unpaid assignees)
    const { data: pendingAssignees } = await supabaseAdmin
      .from("club_event_assignees")
      .select("assigned_amount")
      .eq("club_id", clubId)
      .is("paid_at", null)
      .eq("is_cancelled", false);

    const upcomingDue = (pendingAssignees || []).reduce(
      (sum: number, a: any) => sum + (a.assigned_amount || 0),
      0
    );

    // Get recent activity (last 10 ledger entries)
    const { data: recentLedgers } = await supabaseAdmin
      .from("ledgers")
      .select(`
        *,
        users:completed_by_user_id (
          name,
          email
        )
      `)
      .eq("club_id", clubId)
      .order("created_at", { ascending: false })
      .limit(10);

    const recentActivity = (recentLedgers || []).map((ledger: any) => ({
      id: ledger.id,
      type: ledger.type,
      amount: ledger.amount,
      user: ledger.users?.name || ledger.completed_by_name || ledger.completed_by_email || "Unknown",
      createdAt: ledger.created_at,
      description: ledger.description,
    }));

    // Get action items (assigned unpaid events for current user)
    const { data: userAssignments } = await supabaseAdmin
      .from("club_event_assignees")
      .select(`
        *,
        club_events (
          id,
          title,
          description
        )
      `)
      .eq("club_id", clubId)
      .eq("user_id", authUser.id)
      .is("paid_at", null)
      .eq("is_cancelled", false);

    const actionItems = (userAssignments || []).map((assignment: any) => ({
      id: assignment.id,
      title: assignment.club_events?.title || "Payment Due",
      amount: assignment.assigned_amount,
      eventId: assignment.club_event_id,
      assignedAt: assignment.assigned_at,
    }));

    return NextResponse.json({
      stats: {
        totalMembers: memberCount || 0,
        balance: club?.balance || 0,
        upcomingDue,
      },
      recentActivity,
      actionItems,
    });
  } catch (e: any) {
    console.error("[GET /api/clubs/[clubId]/stats]", e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
