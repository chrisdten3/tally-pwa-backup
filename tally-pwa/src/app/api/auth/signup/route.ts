import { NextResponse } from "next/server";
import { supabaseAdmin, supabaseClient } from "@/lib/supabase";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({})) as any;
  const { firstName, lastName, email, password } = body;

  if (!firstName || !lastName || !email || !password) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  if (String(password).length < 6) {
    return NextResponse.json({ error: "Password too short" }, { status: 400 });
  }

  try {
    // Create auth user using service role (admin)
    // @ts-ignore - admin API may be available depending on supabase-js version
    const { data: createdUser, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) return NextResponse.json({ error: error.message || "Signup failed" }, { status: 400 });

    const userId = createdUser?.user?.id ?? `user_${String(email).replace(/[^a-z0-9]/gi, "")}`;

    // insert profile row into users table
    const profile = { id: userId, first_name: firstName, last_name: lastName, name: `${firstName} ${lastName}`, email };
    await supabaseAdmin.from("users").upsert(profile);

    // Sign in to return a session token for client
    try {
      const signIn = await supabaseClient.auth.signInWithPassword({ email, password });
      if (signIn.error) {
        // return profile but warn client to sign in manually
        return NextResponse.json({ user: profile, warning: signIn.error.message }, { status: 201 });
      }
      const session = signIn.data.session;
      const user = signIn.data.user;
      return NextResponse.json({ token: session?.access_token, user: user ?? profile }, { status: 201 });
    } catch (_e) {
      return NextResponse.json({ user: profile }, { status: 201 });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
