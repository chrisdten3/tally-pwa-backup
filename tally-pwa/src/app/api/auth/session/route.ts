import { NextResponse } from "next/server";
import { supabaseAdmin, getUserByAccessToken } from "@/lib/supabase";

export async function GET(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

  if (!token) return NextResponse.json({ user: null }, { status: 401 });

  const authUser = await getUserByAccessToken(token);
  if (!authUser) return NextResponse.json({ user: null }, { status: 401 });

  // Try to resolve profile row from users table by email
  const email = (authUser.email || authUser.user_metadata?.email) as string | undefined;
  let profile = null;
  if (email) {
    const { data } = await supabaseAdmin.from("users").select("*").eq("email", email).maybeSingle();
    if (data) profile = data;
  }

  const user = profile ?? { id: authUser.id, email: authUser.email };
  return NextResponse.json({ user });
}
