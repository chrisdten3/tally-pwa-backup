import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DB_PATH = path.join(process.cwd(), "mock-db.json");

function readDb() {
  try {
    if (!fs.existsSync(DB_PATH)) return {};
    return JSON.parse(fs.readFileSync(DB_PATH, "utf8") || "{}");
  } catch {
    return {};
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
  if (!clubId) return NextResponse.json({ error: "Missing clubId" }, { status: 400 });

  const db = readDb() as any;
  const club = (db.clubs || []).find((c: any) => c.id === clubId);
  if (!club) return NextResponse.json({ error: "Club not found" }, { status: 404 });

  // require admin to view ledger
  const memberships = db.memberships || {};
  const role = memberships[user.id] && memberships[user.id][clubId];
  if (!role || role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const ledger = (db.ledgers || []).filter((l: any) => l.club_id === clubId);
  return NextResponse.json({ ledger, balance: club.balance || 0 });
}
