import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

type MembershipRole = "admin" | "member";

type MockDB = {
  clubs?: Array<{ id: string; name: string; email: string; description: string; createdAt: string }>;
  memberships?: Record<string, Record<string, MembershipRole> | string[]>; // userId -> { clubId: role } | legacy string[]
  users?: Record<string, { id: string; firstName: string; lastName: string; name: string; email: string }>;
  club_events?: Array<{
    id: string;
    author_id: string;
    club_id: string;
    title: string;
    description: string;
    amount: number;
    createdAt: string;
    expires_at: string | null;
  }>;
  club_event_assignees?: Array<{
    id: string;
    club_event_id: string;
    club_id: string;
    user_id: string;
    assigned_amount: number;
    role_at_assign: MembershipRole;
    assigned_by: string;
    assigned_at: string;
    is_waived: boolean;
    is_cancelled: boolean;
  }>;
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

function writeDb(db: MockDB) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf8");
  } catch {
    // ignore write errors in mock env
  }
}

function getUserFromReq(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token || !token.startsWith("mock-token-")) return null;
  const email = token.slice("mock-token-".length);
  return { id: `user_${email.replace(/[^a-z0-9]/gi, "")}`, email };
}

function getRole(db: MockDB, userId: string, clubId: string): MembershipRole | null {
  const entry = db.memberships?.[userId];
  if (!entry) return null;
  if (Array.isArray(entry)) {
    return entry.includes(clubId) ? "member" : null;
  }
  const map = entry as Record<string, MembershipRole>;
  return (map[clubId] as MembershipRole) ?? null;
}

export async function GET(req: Request) {
  try {
    const user = getUserFromReq(req);
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const db = readDb();
    const events = db.club_events || [];
    const assignees = db.club_event_assignees || [];
    const clubs = db.clubs || [];
    const users = db.users || {};

    // Helper to get club name
    const getClubName = (clubId: string) => {
      const club = clubs.find(c => c.id === clubId);
      return club?.name || clubId;
    };

    // Helper to get user name
    const getUserName = (userId: string) => {
      const user = Object.values(users).find(u => u.id === userId);
      return user?.name || userId;
    };

    // Get events assigned to current user
    const assignedEvents = assignees
      .filter(a => a.user_id === user.id && !a.is_cancelled)
      .map(assignment => {
        const event = events.find(e => e.id === assignment.club_event_id);
        if (!event) return null;
        
        return {
          id: event.id,
          title: event.title,
          description: event.description,
          amount: assignment.assigned_amount,
          createdAt: event.createdAt,
          expires_at: event.expires_at,
          club: {
            id: event.club_id,
            name: getClubName(event.club_id)
          },
          assignment: {
            assigned_by: assignment.assigned_by,
            assigned_by_name: getUserName(assignment.assigned_by),
            assigned_at: assignment.assigned_at,
            is_waived: assignment.is_waived,
            is_cancelled: assignment.is_cancelled,
            role_at_assign: assignment.role_at_assign
          }
        };
      })
      .filter(Boolean);

    // Get events created by current user
    const createdEvents = events
      .filter(e => e.author_id === user.id)
      .map(event => {
        const eventAssignees = assignees.filter(a => a.club_event_id === event.id);
        const stats = {
          assigneeCount: eventAssignees.length,
          cancelledCount: eventAssignees.filter(a => a.is_cancelled).length,
          waivedCount: eventAssignees.filter(a => a.is_waived).length
        };

        return {
          id: event.id,
          title: event.title,
          description: event.description,
          amount: event.amount,
          createdAt: event.createdAt,
          expires_at: event.expires_at,
          club: {
            id: event.club_id,
            name: getClubName(event.club_id)
          },
          stats
        };
      });

    return NextResponse.json({
      assigned: assignedEvents,
      created: createdEvents
    });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = getUserFromReq(req);
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const body = (await req.json().catch(() => ({}))) as Partial<{
      clubId: string;
      title: string;
      description?: string;
      amount: number;
      expiresAt?: string | null;
      assigneeUserIds: string[];
    }>;

    const { clubId, title, description, amount, expiresAt, assigneeUserIds } = body;
    if (!clubId || !title || typeof amount !== "number" || !Array.isArray(assigneeUserIds)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const db = readDb();
    db.club_events = db.club_events || [];
    db.club_event_assignees = db.club_event_assignees || [];
    db.memberships = db.memberships || {};

    const role = getRole(db, user.id, clubId);
    if (role !== "admin") {
      return NextResponse.json({ error: "Only admins can create events" }, { status: 403 });
    }

    const nowIso = new Date().toISOString();
    const slug = String(title).replace(/[^a-z0-9]/gi, "").toLowerCase();
    const eventId = `event_${slug}_${Date.now()}`;

    const event = {
      id: eventId,
      author_id: user.id,
      club_id: clubId,
      title: String(title),
      description: String(description || ""),
      amount: Math.trunc(Number(amount)),
      createdAt: nowIso,
      expires_at: expiresAt ? String(expiresAt) : null,
    };

    db.club_events.push(event);

    for (const uid of assigneeUserIds) {
      const assigneeRole = getRole(db, uid, clubId) || "member";
      db.club_event_assignees.push({
        id: `assign_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        club_event_id: eventId,
        club_id: clubId,
        user_id: uid,
        assigned_amount: event.amount,
        role_at_assign: assigneeRole,
        assigned_by: user.id,
        assigned_at: nowIso,
        is_waived: false,
        is_cancelled: false,
      });
    }

    writeDb(db);
    return NextResponse.json({ event }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}


