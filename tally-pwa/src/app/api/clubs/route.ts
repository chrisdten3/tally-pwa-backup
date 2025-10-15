import { NextResponse } from "next/server";
import { supabaseAdmin, getUserByAccessToken } from "@/lib/supabase";

export async function GET(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  const authUser = await getUserByAccessToken(token ?? undefined);
  if (!authUser) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // get club ids for this user
  const { data: memberships } = await supabaseAdmin.from("memberships").select("club_id").eq("user_id", authUser.id);
  const clubIds = (memberships || []).map((m: any) => m.club_id);

  const { data: clubs } = await supabaseAdmin.from("clubs").select("*").in("id", clubIds || []);
  return NextResponse.json(clubs || []);
}

export async function POST(req: Request) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    const authUser = await getUserByAccessToken(token ?? undefined);
    if (!authUser) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const body = (await req.json().catch(() => ({}))) as Partial<{
      name: string;
      email: string;
      description?: string;
    }>;
    const { name, email, description } = body ?? {};

    if (!name || !email) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const id = `club_${String(name).replace(/[^a-z0-9]/gi, "").toLowerCase()}`;

    // upsert club
    const nowIso = new Date().toISOString();
    await supabaseAdmin.from("clubs").insert({ id, name, email, description: description || "", created_at: nowIso });

    // ensure membership for creator as admin
    await supabaseAdmin.from("memberships").upsert({ user_id: authUser.id, club_id: id, role: "admin" });

    const { data: clubRow } = await supabaseAdmin.from("clubs").select("*").eq("id", id).limit(1).maybeSingle();
    return NextResponse.json({ club: clubRow }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
