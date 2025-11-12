import { NextResponse } from "next/server";
import { supabaseAdmin, getUserByAccessToken } from "@/lib/supabase";
import { createExpressAccount, createAccountLink } from "@/lib/stripe";

export async function GET(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  const authUser = await getUserByAccessToken(token ?? undefined);
  if (!authUser) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // get memberships (including role) for this user
  const { data: memberships } = await supabaseAdmin
    .from("memberships")
    .select("club_id, role")
    .eq("user_id", authUser.id);
  const clubIds = (memberships || []).map((m: any) => m.club_id);

  const { data: clubs } = await supabaseAdmin.from("clubs").select("*").in("id", clubIds || []);

  // attach role from memberships to each club for client-side UI decisions
  const clubsWithRole = (clubs || []).map((c: any) => {
    const m = (memberships || []).find((mm: any) => mm.club_id === c.id);
    return { ...(c || {}), role: m?.role || "member" };
  });

  return NextResponse.json(clubsWithRole || []);
}

export async function POST(req: Request) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    const authUser = await getUserByAccessToken(token ?? undefined);
    if (!authUser) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const body = (await req.json().catch(() => ({}))) as Partial<{
      name: string;
      email: string;
      description?: string;
    }>;
    const { name, email, description } = body ?? {};

    if (!name || !email) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const id = `club_${String(name).replace(/[^a-z0-9]/gi, "").toLowerCase()}`;

    // generate a short, human-friendly join code if not provided
    function genCode(len = 6) {
      const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // avoid ambiguous chars
      let s = "";
      for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
      return s;
    }

    let joinCode: string | null = null;
    // attempt a few times to generate a unique join code
    for (let attempt = 0; attempt < 6 && !joinCode; attempt++) {
      const candidate = genCode();
      const { data: existing } = await supabaseAdmin.from("clubs").select("id").eq("join_code", candidate).limit(1);
      if (!existing || (Array.isArray(existing) && existing.length === 0)) {
        joinCode = candidate;
      }
    }

    // upsert club
    const nowIso = new Date().toISOString();
    await supabaseAdmin.from("clubs").insert({ id, name, email, description: description || "", created_at: nowIso, join_code: joinCode });

    // ensure membership for creator as admin
    await supabaseAdmin.from("memberships").upsert({ user_id: authUser.id, club_id: id, role: "admin" });
    const { data: clubRow } = await supabaseAdmin.from("clubs").select("*").eq("id", id).limit(1).maybeSingle();

    // Attempt to create a Stripe Express account and onboarding link for the new club.
    let onboardingError: string | null = null;
    try {
      let stripeAccountId = clubRow?.stripe_account_id;
      if (!stripeAccountId) {
        const acct = await createExpressAccount({ country: "US", email: clubRow?.email || undefined });
        stripeAccountId = acct?.id;
        if (stripeAccountId) {
          // best-effort persist
          try {
            await supabaseAdmin.from("clubs").update({ stripe_account_id: stripeAccountId }).eq("id", id);
          } catch (e) {
            console.error("Failed to persist stripe_account_id on club creation", e);
          }
        }
      }

      if (stripeAccountId) {
        const origin = (req.headers.get("x-forwarded-origin") as string) || new URL(req.url).origin;
        const returnUrl = `${origin}/profile`;
        const refreshUrl = `${origin}/profile`;
        const link = await createAccountLink({ accountId: stripeAccountId, refreshUrl, returnUrl });
        return NextResponse.json({ club: clubRow, onboarding: { url: link?.url || null, accountId: stripeAccountId } }, { status: 201 });
      }
    } catch (e: any) {
      console.error("Stripe onboarding failed for new club", e);
      onboardingError = e?.message || String(e);
    }

    return NextResponse.json({ club: clubRow, onboardingError }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
