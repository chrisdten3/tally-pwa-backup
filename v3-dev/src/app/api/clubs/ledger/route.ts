import { NextResponse } from "next/server";
import { supabaseAdmin, getUserByAccessToken } from "@/lib/supabase";

export async function GET(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  const authUser = await getUserByAccessToken(token ?? undefined);
  if (!authUser) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const url = new URL(req.url);
  const clubId = url.searchParams.get("clubId");
  if (!clubId) return NextResponse.json({ error: "Missing clubId" }, { status: 400 });

  // fetch club
  const { data: clubRows } = await supabaseAdmin.from("clubs").select("id, balance").eq("id", clubId).limit(1);
  const club = clubRows?.[0];
  if (!club) return NextResponse.json({ error: "Club not found" }, { status: 404 });

  // require admin
  const { data: membershipRows } = await supabaseAdmin
    .from("memberships")
    .select("role")
    .eq("club_id", clubId)
    .eq("user_id", authUser.id)
    .limit(1);
  const role = membershipRows?.[0]?.role;
  if (!role || role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: ledger } = await supabaseAdmin.from("ledgers").select("*").eq("club_id", clubId).order("created_at", { ascending: false });

  return NextResponse.json({ ledger: ledger || [], balance: club.balance || 0 });
}
