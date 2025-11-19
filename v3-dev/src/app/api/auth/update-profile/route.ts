import { NextResponse } from "next/server";
import { getUserByAccessToken, supabaseAdmin } from "@/lib/supabase";

export async function PATCH(req: Request) {
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
    const body = await req.json().catch(() => ({}));
    const { name, email, phone } = body;

    // Validate inputs
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }

    // Build update object
    const updateData: {
      name: string;
      email: string;
      phone?: string | null;
    } = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
    };

    if (phone !== undefined) {
      updateData.phone = phone ? String(phone).trim() : null;
    }

    // Update user in Supabase
    const { data: updatedUser, error } = await supabaseAdmin
      .from("users")
      .update(updateData)
      .eq("id", authUser.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating user:", error);
      return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
    }

    // If email changed, update auth user email as well
    if (email.trim().toLowerCase() !== authUser.email) {
      try {
        await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
          email: email.trim().toLowerCase(),
        });
      } catch (emailError) {
        console.error("Failed to update auth email:", emailError);
        // Continue anyway - the users table is updated
      }
    }

    return NextResponse.json({ 
      user: updatedUser,
      message: "Profile updated successfully" 
    });
  } catch (e) {
    console.error("Profile update error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
