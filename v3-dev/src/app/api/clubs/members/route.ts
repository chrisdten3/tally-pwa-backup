import { NextResponse } from "next/server";
import { supabaseAdmin, getUserByAccessToken } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    const authUser = await getUserByAccessToken(token ?? undefined);
    if (!authUser) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const body = (await req.json().catch(() => ({}))) as { clubId?: string; userId?: string; userEmail?: string };
    if (!body.clubId || (!body.userId && !body.userEmail)) {
      return NextResponse.json({ error: "Missing clubId and userId/userEmail" }, { status: 400 });
    }

    let userId = body.userId;
    if (!userId && body.userEmail) {
      const { data: users } = await supabaseAdmin.from("users").select("id").eq("email", body.userEmail).limit(1);
      userId = users?.[0]?.id;
      if (!userId) return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Upsert membership as "member". If the user is already an admin, do not downgrade them.
    const { data: existing } = await supabaseAdmin
      .from("memberships")
      .select("role")
      .eq("user_id", userId)
      .eq("club_id", body.clubId)
      .limit(1)
      .maybeSingle();

    if (existing && existing.role === "admin") {
      // already admin; nothing to change
      return NextResponse.json({ ok: true });
    }

    await supabaseAdmin.from("memberships").upsert({ user_id: userId, club_id: body.clubId, role: "member" });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
