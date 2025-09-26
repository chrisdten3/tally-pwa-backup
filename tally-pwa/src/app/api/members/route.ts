import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

type MembershipRole = "admin" | "member";

type MockDB = {
  users?: Record<string, { id: string; firstName: string; lastName: string; name: string; email: string }>;
  memberships?: Record<string, Record<string, MembershipRole> | string[]>; // userId -> { clubId: role } | legacy
};

const DB_PATH = path.join(process.cwd(), "mock-db.json");

function readDb(): MockDB {
  try {
    if (!fs.existsSync(DB_PATH)) return {};
    const raw = fs.readFileSync(DB_PATH, "utf8");
    return JSON.parse(raw || "{}") as MockDB;
  } catch {
    return {} as MockDB;
  }
}

function getUserFromReq(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token || !token.startsWith("mock-token-")) return null;
  const email = token.slice("mock-token-".length);
  return { id: `user_${email.replace(/[^a-z0-9]/gi, "")}`, email };
}

export async function GET(req: Request) {
  const user = getUserFromReq(req);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const url = new URL(req.url);
  const clubId = url.searchParams.get("clubId");
  if (!clubId) return NextResponse.json({ error: "clubId required" }, { status: 400 });

  const db = readDb();
  const memberships = db.memberships || {};

  const members: Array<{ id: string; name: string; email: string; role: MembershipRole }> = [];
  for (const [userId, entry] of Object.entries(memberships)) {
    let role: MembershipRole | null = null;
    if (Array.isArray(entry)) {
      if (entry.includes(clubId)) role = "member";
    } else if (entry && typeof entry === "object") {
      const r = (entry as Record<string, MembershipRole>)[clubId];
      if (r) role = r;
    }
    if (role) {
      // try to find user by email map; if not present, fabricate name from id
      const byEmail = Object.values(db.users || {}).find((u) => u.id === userId);
      members.push({ id: userId, name: byEmail?.name || userId, email: byEmail?.email || "", role });
    }
  }

  return NextResponse.json({ members });
}


