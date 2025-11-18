import { NextResponse } from "next/server";
import { supabaseAdmin, getUserByAccessToken } from "@/lib/supabase";

/**
 * POST /api/clubs/[clubId]/members/import
 * Bulk import members from CSV data
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
        { error: "Only admins can import members" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { members } = body;

    if (!members || !Array.isArray(members) || members.length === 0) {
      return NextResponse.json(
        { error: "Members array is required and cannot be empty" },
        { status: 400 }
      );
    }

    const nowIso = new Date().toISOString();
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
      addedMembers: [] as any[],
    };

    for (const member of members) {
      try {
        const { firstName, lastName, phone, email } = member;

        // Validate required fields
        if (!firstName || !lastName) {
          results.failed++;
          results.errors.push(
            `Row skipped: Missing first or last name (${firstName || "?"} ${lastName || "?"})`
          );
          continue;
        }

        const fullName = `${firstName.trim()} ${lastName.trim()}`;
        const cleanPhone = phone ? phone.toString().trim() : null;
        const cleanEmail = email ? email.toString().trim().toLowerCase() : null;

        // Check if user with this phone or email already exists
        let user = null;
        
        if (cleanPhone) {
          const { data: existingByPhone } = await supabaseAdmin
            .from("users")
            .select("*")
            .eq("phone", cleanPhone)
            .limit(1);

          if (existingByPhone && existingByPhone.length > 0) {
            user = existingByPhone[0];
            
            // Update user info
            await supabaseAdmin
              .from("users")
              .update({
                name: fullName,
                first_name: firstName.trim(),
                last_name: lastName.trim(),
                ...(cleanEmail && { email: cleanEmail }),
              })
              .eq("id", user.id);
          }
        }

        if (!user && cleanEmail) {
          const { data: existingByEmail } = await supabaseAdmin
            .from("users")
            .select("*")
            .eq("email", cleanEmail)
            .limit(1);

          if (existingByEmail && existingByEmail.length > 0) {
            user = existingByEmail[0];
            
            // Update user info
            await supabaseAdmin
              .from("users")
              .update({
                name: fullName,
                first_name: firstName.trim(),
                last_name: lastName.trim(),
                ...(cleanPhone && { phone: cleanPhone }),
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
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            phone: cleanPhone,
            email: cleanEmail,
            created_at: nowIso,
          };

          const { error: insertError } = await supabaseAdmin
            .from("users")
            .insert(newUser);

          if (insertError) {
            results.failed++;
            results.errors.push(
              `Failed to create user ${fullName}: ${insertError.message}`
            );
            continue;
          }

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
          const { error: membershipError } = await supabaseAdmin
            .from("memberships")
            .insert({
              club_id: clubId,
              user_id: user.id,
              role: "member",
              created_at: nowIso,
            });

          if (membershipError) {
            results.failed++;
            results.errors.push(
              `Failed to add membership for ${fullName}: ${membershipError.message}`
            );
            continue;
          }
        }

        results.success++;
        results.addedMembers.push({
          id: user.id,
          name: fullName,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: cleanPhone,
          email: cleanEmail,
        });
      } catch (error: any) {
        results.failed++;
        results.errors.push(
          `Error processing member: ${error.message}`
        );
      }
    }

    return NextResponse.json({
      success: true,
      imported: results.success,
      failed: results.failed,
      errors: results.errors,
      members: results.addedMembers,
    });
  } catch (e: any) {
    console.error("[POST /api/clubs/[clubId]/members/import]", e);
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}
