import { NextResponse } from "next/server";
import { supabaseAdmin, getUserByAccessToken } from "@/lib/supabase";

/**
 * POST /api/clubs/[clubId]/members/add
 * Add a new member to a club (creates user and membership)
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ clubId: string }> }
) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    const authUser = await getUserByAccessToken(token ?? undefined);
    if (!authUser)
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { clubId } = await params;

    // Verify requester is admin
    const { data: membership } = await supabaseAdmin
      .from("memberships")
      .select("role")
      .eq("user_id", authUser.id)
      .eq("club_id", clubId)
      .limit(1)
      .maybeSingle();

    if (!membership || membership.role !== "admin") {
      return NextResponse.json(
        { error: "Only admins can add members" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { firstName, lastName, phoneNumber, email } = body;

    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: "First name and last name are required" },
        { status: 400 }
      );
    }

    const nowIso = new Date().toISOString();
    const fullName = `${firstName} ${lastName}`;

    // If phone is provided, check if it already exists in this club
    if (phoneNumber) {
      const { data: existingByPhone } = await supabaseAdmin
        .from("users")
        .select(`
          id,
          memberships!inner(club_id)
        `)
        .eq("phone", phoneNumber)
        .eq("memberships.club_id", clubId)
        .limit(1);

      if (existingByPhone && existingByPhone.length > 0) {
        return NextResponse.json(
          { error: "A member with this phone number already exists in this club" },
          { status: 409 }
        );
      }
    }

    // Check if user with this phone or email already exists globally
    let user;
    if (phoneNumber) {
      const { data: existingByPhone } = await supabaseAdmin
        .from("users")
        .select("*")
        .eq("phone", phoneNumber)
        .limit(1);

      if (existingByPhone && existingByPhone.length > 0) {
        user = existingByPhone[0];

        // Update user info if it has changed
        await supabaseAdmin
          .from("users")
          .update({
            name: fullName,
            first_name: firstName,
            last_name: lastName,
            ...(email && { email }),
          })
          .eq("id", user.id);
      }
    }

    if (!user && email) {
      const { data: existingByEmail } = await supabaseAdmin
        .from("users")
        .select("*")
        .eq("email", email)
        .limit(1);

      if (existingByEmail && existingByEmail.length > 0) {
        user = existingByEmail[0];

        // Update user info
        await supabaseAdmin
          .from("users")
          .update({
            name: fullName,
            first_name: firstName,
            last_name: lastName,
            ...(phoneNumber && { phone: phoneNumber }),
          })
          .eq("id", user.id);
      }
    }

    // Create new user if not found
    if (!user) {
      const userId = `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const newUser = {
        id: userId,
        name: fullName,
        first_name: firstName,
        last_name: lastName,
        phone: phoneNumber || null,
        email: email || null,
        created_at: nowIso,
      };

      await supabaseAdmin.from("users").insert(newUser);
      user = newUser;
    }

    // Check if user is already a member
    const { data: existingMembership } = await supabaseAdmin
      .from("memberships")
      .select("*")
      .eq("club_id", clubId)
      .eq("user_id", user.id)
      .limit(1);

    if (!existingMembership || existingMembership.length === 0) {
      // Add membership
      await supabaseAdmin.from("memberships").insert({
        club_id: clubId,
        user_id: user.id,
        role: "member",
        created_at: nowIso,
      });
    }

    // Return the user data
    return NextResponse.json({
      success: true,
      member: {
        id: user.id,
        name: user.name,
        firstName: user.first_name || firstName,
        lastName: user.last_name || lastName,
        phone: user.phone,
        email: user.email,
        joinedAt: nowIso,
      role: "member",
    },
  });
  } catch (e) {
    console.error("[POST /api/clubs/[clubId]/members/add]", e);
    const error = e as Error;
    return NextResponse.json(
      { error: error.message || "Server error" },
      { status: 500 }
    );
  }
}