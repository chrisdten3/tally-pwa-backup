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

export async function GET(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

  if (!token) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  if (!token.startsWith("mock-token-")) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const email = token.slice("mock-token-".length);
  const db = readDb();
  const stored = db.users?.[email.toLowerCase()];
  const user = stored ?? {
    id: `user_${email.replace(/[^a-z0-9]/gi, "")}`,
    name: "",
    firstName: "",
    lastName: "",
    email,
  };

  return NextResponse.json({ user });
}
