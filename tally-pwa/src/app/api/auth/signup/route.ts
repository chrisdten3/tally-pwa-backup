import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

type MockDB = {
  users?: Record<string, {
    id: string;
    firstName: string;
    lastName: string;
    name: string;
    email: string;
  }>;
};

const DB_PATH = path.join(process.cwd(), "mock-db.json");

function readDb(): MockDB {
  try {
    if (!fs.existsSync(DB_PATH)) return {};
    const raw = fs.readFileSync(DB_PATH, "utf8");
    return JSON.parse(raw || "{}") as MockDB;
  } catch {
    return {};
  }
}

function writeDb(db: MockDB) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf8");
  } catch {
    // ignore write errors in mock
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({})) as any;
  const { firstName, lastName, email, password } = body;

  if (!firstName || !lastName || !email || !password) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  if (String(password).length < 6) {
    return NextResponse.json({ error: "Password too short" }, { status: 400 });
  }

  const token = `mock-token-${email}`;
  const user = {
    id: `user_${email.replace(/[^a-z0-9]/gi, "")}`,
    firstName,
    lastName,
    name: `${firstName} ${lastName}`,
    email,
  };

  // persist user in mock db keyed by email
  const db = readDb();
  db.users = db.users || {};
  db.users[email.toLowerCase()] = user;
  writeDb(db);

  return NextResponse.json({ token, user }, { status: 201 });
}
