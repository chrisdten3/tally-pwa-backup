import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DB_PATH = path.join(process.cwd(), "mock-db.json");

type MockDB = {
  clubs: Array<{ id: string; name: string; email: string; description: string; createdAt: string }>;
  // userId -> either legacy string[] of clubIds OR new { [clubId]: 'admin' | 'member' }
  memberships: Record<string, any>;
};

function readDb(): MockDB {
  try {
    if (!fs.existsSync(DB_PATH)) return { clubs: [], memberships: {} };
    const raw = fs.readFileSync(DB_PATH, "utf8");
    return JSON.parse(raw || "{}") as MockDB;
  } catch {
    return { clubs: [], memberships: {} };
  }
}

function writeDb(db: MockDB) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf8");
  } catch {
    // ignore write errors in mock
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

  const db = readDb();
  const memberships = db.memberships || {};
  const entry = memberships[user.id];
  let clubIds: string[] = [];
  if (Array.isArray(entry)) {
    // legacy shape
    clubIds = entry;
  } else if (entry && typeof entry === "object") {
    // new role map shape
    clubIds = Object.keys(entry);
  }

  const clubs = (db.clubs || []).filter((c) => clubIds.includes(c.id));
  return NextResponse.json(clubs);
}

export async function POST(req: Request) {
  try {
    const user = getUserFromReq(req);
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const body = (await req.json().catch(() => ({}))) as Partial<{
      name: string;
      email: string;
      description?: string;
    }>;
    const { name, email, description } = body ?? {};

    if (!name || !email) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const db = readDb();
  db.clubs = db.clubs || [];
  db.memberships = db.memberships || {};

    const id = `club_${String(name).replace(/[^a-z0-9]/gi, "").toLowerCase()}`;
  const existing = db.clubs.find((c) => c.id === id);
    const club = existing || {
      id,
      name,
      email,
      description: description || "",
      createdAt: new Date().toISOString(),
    };

    if (!existing) db.clubs.push(club);

    // add membership for creator as admin
    const current = db.memberships[user.id];
    if (Array.isArray(current)) {
      // migrate legacy array to role map
      const map: Record<string, "admin" | "member"> = {};
      for (const cid of current) map[cid] = "member";
      map[club.id] = "admin";
      db.memberships[user.id] = map;
    } else {
      db.memberships[user.id] = db.memberships[user.id] || {};
      db.memberships[user.id][club.id] = db.memberships[user.id][club.id] || "admin";
      // ensure admin if creator
      db.memberships[user.id][club.id] = "admin";
    }

    writeDb(db);

    return NextResponse.json({ club }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
