import { NextResponse } from "next/server";
import { supabaseAdmin, getUserByAccessToken } from "@/lib/supabase";

/**
 * GET /api/clubs/[clubId]/members
 * Fetch all members of a specific club with their details
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

    // Get all members with their user details
    const { data: memberships } = await supabaseAdmin
      .from("memberships")
      .select(`
        role,
        joined_via_payment,
        created_at,
        users (
          id,
          name,
          email,
          phone,
          stripe_onboarded
        )
      `)
      .eq("club_id", clubId);

    // Get payment stats for each member
    const memberIds = memberships?.map((m: any) => m.users.id) || [];
    
    const { data: paymentStats } = await supabaseAdmin
      .from("ledgers")
      .select("user_id, amount, type")
      .eq("club_id", clubId)
      .in("user_id", memberIds);

    // Calculate stats per member
    const statsMap = (paymentStats || []).reduce((acc: any, ledger: any) => {
      if (!acc[ledger.user_id]) {
        acc[ledger.user_id] = { totalPaid: 0, totalReceived: 0 };
      }
      if (ledger.type === "payment") {
        acc[ledger.user_id].totalPaid += Math.abs(ledger.amount);
      } else if (ledger.type === "payout") {
        acc[ledger.user_id].totalReceived += Math.abs(ledger.amount);
      }
      return acc;
    }, {});

    const members = (memberships || []).map((m: any) => ({
      id: m.users.id,
      name: m.users.name,
      email: m.users.email,
      phone: m.users.phone,
      role: m.role,
      joinedViaPayment: m.joined_via_payment,
      joinedAt: m.created_at,
      stripeOnboarded: m.users.stripe_onboarded,
      totalPaid: statsMap[m.users.id]?.totalPaid || 0,
      totalReceived: statsMap[m.users.id]?.totalReceived || 0,
    }));

    return NextResponse.json({ members });
  } catch (e: any) {
    console.error("[GET /api/clubs/[clubId]/members]", e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/clubs/[clubId]/members
 * Remove a member from a club (admin only)
 */
export async function DELETE(req: Request, { params }: { params: Promise<{ clubId: string }> }) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    const authUser = await getUserByAccessToken(token ?? undefined);
    if (!authUser) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { clubId } = await params;
    const { searchParams } = new URL(req.url);
    const memberIdToRemove = searchParams.get("userId");

    if (!memberIdToRemove) {
      return NextResponse.json({ error: "Missing userId parameter" }, { status: 400 });
    }

    // Verify requester is admin
    const { data: membership } = await supabaseAdmin
      .from("memberships")
      .select("role")
      .eq("user_id", authUser.id)
      .eq("club_id", clubId)
      .limit(1)
      .maybeSingle();

    if (!membership || membership.role !== "admin") {
      return NextResponse.json({ error: "Only admins can remove members" }, { status: 403 });
    }

    // Delete the membership
    await supabaseAdmin
      .from("memberships")
      .delete()
      .eq("user_id", memberIdToRemove)
      .eq("club_id", clubId);

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("[DELETE /api/clubs/[clubId]/members]", e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
