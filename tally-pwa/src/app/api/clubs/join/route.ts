import { NextResponse } from "next/server";
import { supabaseAdmin, getUserByAccessToken } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    const authUser = await getUserByAccessToken(token ?? undefined);
    if (!authUser) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const body = (await req.json().catch(() => ({}))) as { code?: string };
    const code = (body.code || "").trim().toUpperCase();
    if (!code) return NextResponse.json({ error: "Missing code" }, { status: 400 });

    // find club by join code
    const { data: clubs } = await supabaseAdmin.from("clubs").select("id").eq("join_code", code).limit(1);
    const clubId = clubs?.[0]?.id;
    if (!clubId) return NextResponse.json({ error: "Invalid code" }, { status: 404 });

    // upsert membership as member (don't downgrade admins)
    const { data: existing } = await supabaseAdmin
      .from("memberships")
      .select("role")
      .eq("user_id", authUser.id)
      .eq("club_id", clubId)
      .limit(1)
      .maybeSingle();

    if (existing && existing.role === "admin") return NextResponse.json({ ok: true });

    await supabaseAdmin.from("memberships").upsert({ user_id: authUser.id, club_id: clubId, role: "member" });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
