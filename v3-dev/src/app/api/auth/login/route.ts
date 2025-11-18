import { NextResponse } from "next/server";
import { supabaseClient } from "@/lib/supabase";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({})) as any;
  const { email, password } = body;

  if (!email || !password) {
    return NextResponse.json({ error: "Missing email or password" }, { status: 400 });
  }

  try {
    const result = await supabaseClient.auth.signInWithPassword({ email, password });
    if (result.error) return NextResponse.json({ error: result.error.message }, { status: 401 });

    const session = result.data.session;
    const user = result.data.user;

    return NextResponse.json({ token: session?.access_token, user });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
