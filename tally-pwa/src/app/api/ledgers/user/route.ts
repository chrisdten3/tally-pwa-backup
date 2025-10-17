import { NextResponse } from "next/server";
import { supabaseAdmin, getUserByAccessToken } from "@/lib/supabase";

export async function GET(req: Request) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    const authUser = await getUserByAccessToken(token ?? undefined);
    if (!authUser) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    // Return recent ledger entries where the user is involved:
    // - user_id (the subject of the ledger row)
    // - assignee_user_id
    // - completed_by_user_id (the user who completed the payment)
    const { data: rows } = await supabaseAdmin
      .from("ledgers")
      .select("*")
      .or(`user_id.eq.${authUser.id},assignee_user_id.eq.${authUser.id},completed_by_user_id.eq.${authUser.id}`)
      .order("created_at", { ascending: false })
      .limit(50);

    return NextResponse.json({ ledgers: rows || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
