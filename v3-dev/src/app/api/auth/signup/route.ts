import { NextResponse } from "next/server";
import { supabaseAdmin, supabaseClient } from "@/lib/supabase";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({})) as any;
  const { firstName, lastName, email, password } = body;

  console.log("[Signup] Received data:", { firstName, lastName, email, hasPassword: !!password });

  if (!firstName || !lastName || !email || !password) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  if (String(password).length < 6) {
    return NextResponse.json({ error: "Password too short" }, { status: 400 });
  }

  try {
    // Create auth user using service role (admin)
    console.log("[Signup] Creating auth user...");
    const { data: createdUser, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        name: `${firstName} ${lastName}`
      }
    });
    
    if (error) {
      console.error("[Signup] Auth creation error:", error);
      return NextResponse.json({ error: error.message || "Signup failed" }, { status: 400 });
    }

    console.log("[Signup] Auth user created:", createdUser?.user?.id);

    const userId = createdUser?.user?.id;
    if (!userId) {
      console.error("[Signup] No user ID returned");
      return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
    }

    // Insert profile row into users table
    const profile = { 
      id: userId, 
      first_name: firstName, 
      last_name: lastName, 
      name: `${firstName} ${lastName}`, 
      email,
      created_at: new Date().toISOString()
    };

    console.log("[Signup] Inserting profile:", profile);
    
    const { data: insertedProfile, error: profileError } = await supabaseAdmin
      .from("users")
      .upsert(profile, { onConflict: 'id' })
      .select()
      .single();

    if (profileError) {
      console.error("[Signup] Profile insert error:", profileError);
      // Don't fail completely - auth user is created
    } else {
      console.log("[Signup] Profile inserted successfully:", insertedProfile);
    }

    // Sign in to return a session token for client
    console.log("[Signup] Signing in user...");
    try {
      const signIn = await supabaseClient.auth.signInWithPassword({ email, password });
      if (signIn.error) {
        console.error("[Signup] Sign in error:", signIn.error);
        // return profile but warn client to sign in manually
        return NextResponse.json({ 
          user: insertedProfile || profile, 
          warning: signIn.error.message 
        }, { status: 201 });
      }
      const session = signIn.data.session;
      const user = signIn.data.user;
      
      console.log("[Signup] Sign in successful, token:", session?.access_token ? "present" : "missing");
      
      return NextResponse.json({ 
        token: session?.access_token, 
        user: insertedProfile || user || profile 
      }, { status: 201 });
    } catch (signInErr: any) {
      console.error("[Signup] Sign in exception:", signInErr);
      return NextResponse.json({ user: insertedProfile || profile }, { status: 201 });
    }
  } catch (e: any) {
    console.error("[Signup] Outer exception:", e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
