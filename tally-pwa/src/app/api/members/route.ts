import { NextResponse } from "next/server";
import { supabaseAdmin, getUserByAccessToken } from "@/lib/supabase";

type MembershipRole = "admin" | "member";

export async function GET(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  const authUser = await getUserByAccessToken(token ?? undefined);
  if (!authUser) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const url = new URL(req.url);
  const clubId = url.searchParams.get("clubId");
  if (!clubId) return NextResponse.json({ error: "clubId required" }, { status: 400 });

  // Query memberships and users to build member list
  const { data: memberships } = await supabaseAdmin
    .from("memberships")
    .select("user_id, role")
    .eq("club_id", clubId as string);

  const userIds = (memberships || []).map((m: any) => m.user_id);
  const { data: users } = await supabaseAdmin.from("users").select("id, name, email").in("id", userIds || []);

  const usersById: Record<string, any> = {};
  (users || []).forEach((u: any) => (usersById[u.id] = u));

  const members = (memberships || []).map((m: any) => ({
    id: m.user_id,
    name: usersById[m.user_id]?.name || m.user_id,
    email: usersById[m.user_id]?.email || "",
    role: m.role as MembershipRole,
  }));

  return NextResponse.json({ members });
}

export async function PATCH(req: Request) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    const authUser = await getUserByAccessToken(token ?? undefined);
    if (!authUser) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const body = (await req.json().catch(() => ({}))) as { clubId?: string; userId?: string; promoteTo?: string };
    if (!body.clubId || !body.userId || !body.promoteTo) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    // ensure caller is admin for the club
    const { data: membershipRows } = await supabaseAdmin
      .from("memberships")
      .select("role")
      .eq("club_id", body.clubId)
      .eq("user_id", authUser.id)
      .limit(1);
    const role = membershipRows?.[0]?.role;
    if (role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    if (body.promoteTo === "admin") {
      await supabaseAdmin.from("memberships").upsert({ user_id: body.userId, club_id: body.clubId, role: "admin" });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}


