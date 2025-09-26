import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({})) as any;
  const { email, password } = body;

  if (!email || !password) {
    return NextResponse.json({ error: "Missing email or password" }, { status: 400 });
  }

  if (String(password).length < 6) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = `mock-token-${email}`;
  const user = {
    id: `user_${email.replace(/[^a-z0-9]/gi, "")}`,
    firstName: "John",
    lastName: "Richards",
    name: "John Richards",
    email,
  };

  return NextResponse.json({ token, user });
}
