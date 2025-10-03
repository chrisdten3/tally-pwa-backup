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

function writeDb(db: any) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf8");
  } catch {
    // ignore
  }
}

function getUserFromReq(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token || !token.startsWith("mock-token-")) return null;
  const email = token.slice("mock-token-".length);
  return { id: `user_${email.replace(/[^a-z0-9]/gi, "")}`, email };
}

export async function POST(req: Request) {
  const user = getUserFromReq(req);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { clubId?: string; amount?: number; to?: string };
  if (!body.clubId || typeof body.amount !== "number") return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const db = readDb() as any;
  const club = (db.clubs || []).find((c: any) => c.id === body.clubId);
  if (!club) return NextResponse.json({ error: "Club not found" }, { status: 404 });

  // require admin
  const memberships = db.memberships || {};
  const role = memberships[user.id] && memberships[user.id][body.clubId];
  if (!role || role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const amount = Number(body.amount);
  if ((club.balance || 0) < amount) return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });

  const before = club.balance || 0;
  club.balance = before - amount;
  db.ledgers = db.ledgers || [];
  const entry = {
    id: `ledger_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    club_id: club.id,
    type: "payout",
    amount: -amount,
    balance_before: before,
    balance_after: club.balance,
    // entry actor
    user_id: user.id,
    completed_by_user_id: user.id,
    completed_by_email: user.email,
    completed_by_name: user.email,
    createdAt: new Date().toISOString(),
    description: `Payout to ${body.to || "external"}`,
  };
  db.ledgers.push(entry);
  writeDb(db);

  return NextResponse.json({ ok: true, balance: club.balance });
}
