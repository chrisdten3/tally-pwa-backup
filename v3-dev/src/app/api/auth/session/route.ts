import { NextResponse } from "next/server";
import { supabaseAdmin, getUserByAccessToken } from "@/lib/supabase";

export async function GET(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

  if (!token) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const authUser = await getUserByAccessToken(token);
  
  if (!authUser) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  // Try to resolve profile row from users table by email or id
  const email = (authUser.email || authUser.user_metadata?.email) as string | undefined;
  let profile = null;
  
  if (authUser.id) {
    // First try to find by ID
    const { data: profileById } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("id", authUser.id)
      .maybeSingle();
    
    if (profileById) {
      profile = profileById;
    } else if (email) {
      // If not found by ID, try by email
      const { data: profileByEmail } = await supabaseAdmin
        .from("users")
        .select("*")
        .eq("email", email)
        .maybeSingle();
      
      if (profileByEmail) {
        profile = profileByEmail;
      } else {
        // Profile doesn't exist - create it from auth metadata
        console.log("[Session] Creating missing profile for user:", authUser.id);
        const firstName = authUser.user_metadata?.first_name || "";
        const lastName = authUser.user_metadata?.last_name || "";
        const name = authUser.user_metadata?.name || `${firstName} ${lastName}`.trim() || email?.split("@")[0] || "User";
        
        const newProfile = {
          id: authUser.id,
          email: email || "",
          first_name: firstName,
          last_name: lastName,
          name: name,
          created_at: new Date().toISOString()
        };
        
        const { data: insertedProfile, error: insertError } = await supabaseAdmin
          .from("users")
          .insert(newProfile)
          .select()
          .single();
        
        if (insertError) {
          console.error("[Session] Failed to create profile:", insertError);
        } else {
          profile = insertedProfile;
          console.log("[Session] Profile created successfully");
        }
      }
    }
  }

  const user = profile ?? { 
    id: authUser.id, 
    email: authUser.email,
    name: authUser.user_metadata?.name || authUser.email?.split("@")[0] || "User"
  };
  
  return NextResponse.json({ user });
}
