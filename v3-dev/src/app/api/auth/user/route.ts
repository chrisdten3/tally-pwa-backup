import { NextResponse } from "next/server";
import { getUserByAccessToken, supabaseAdmin } from "@/lib/supabase";

export async function GET(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  
  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const authUser = await getUserByAccessToken(token);
  if (!authUser) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  try {
    // Fetch user data from database
    const { data: user, error } = await supabaseAdmin
      .from("users")
      .select("id, email, name, phone, stripe_account_id, created_at")
      .eq("id", authUser.id)
      .single();

    if (error) {
      console.error("Error fetching user:", error);
      return NextResponse.json({ error: "Failed to fetch user data" }, { status: 500 });
    }

    return NextResponse.json({ user });
  } catch (e) {
    console.error("User fetch error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
