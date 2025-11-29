import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getServerUser } from "@/lib/supabaseServer";

export async function GET() {
  // Try to get user from server-side cookies first (for OAuth/session-based auth)
  const authUser = await getServerUser();
  
  // Fallback to Bearer token if no session (for API/token-based auth)
  if (!authUser) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // get memberships (including role) for this user
  const { data: memberships } = await supabaseAdmin
    .from("memberships")
    .select("club_id, role")
    .eq("user_id", authUser.id);
  const clubIds = (memberships || []).map((m) => m.club_id);

  const { data: clubs } = await supabaseAdmin.from("clubs").select("*").in("id", clubIds || []);

  // attach role from memberships to each club for client-side UI decisions
  const clubsWithRole = (clubs || []).map((c) => {
    const m = (memberships || []).find((mm) => mm.club_id === c.id);
    return { ...c, role: m?.role || "member" };
  });

  return NextResponse.json(clubsWithRole || []);
}

export async function POST(req: Request) {
  try {
    const authUser = await getServerUser();
    if (!authUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

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

    // generate a short, human-friendly join code if not provided
    function genCode(len = 6) {
      const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // avoid ambiguous chars
      let s = "";
      for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
      return s;
    }

    let joinCode: string | null = null;
    // attempt a few times to generate a unique join code
    for (let attempt = 0; attempt < 6 && !joinCode; attempt++) {
      const candidate = genCode();
      const { data: existing } = await supabaseAdmin.from("clubs").select("id").eq("join_code", candidate).limit(1);
      if (!existing || (Array.isArray(existing) && existing.length === 0)) {
        joinCode = candidate;
      }
    }

    // upsert club
    const nowIso = new Date().toISOString();
    await supabaseAdmin.from("clubs").insert({ id, name, email, description: description || "", created_at: nowIso, join_code: joinCode });

    // ensure membership for creator as admin
    await supabaseAdmin.from("memberships").upsert({ user_id: authUser.id, club_id: id, role: "admin" });

    const { data: clubRow } = await supabaseAdmin.from("clubs").select("*").eq("id", id).limit(1).maybeSingle();
    return NextResponse.json({ club: clubRow }, { status: 201 });
  } catch (e) {
    const error = e as Error;
    return NextResponse.json({ error: error?.message || "Server error" }, { status: 500 });
  }
}