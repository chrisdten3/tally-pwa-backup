// Simple localStorage-backed memberships utility to simulate a join table with roles
// New shape: userId -> { [clubId]: role }
// Back-compat: if old shape (string[]), assume role "member"

export type MembershipRole = "admin" | "member";
type MembershipMap = Record<string, MembershipRole>; // clubId -> role
type Memberships = Record<string, MembershipMap>; // userId -> map

const STORAGE_KEY = "memberships";

function normalizeToNewShape(input: any): Memberships {
  if (!input || typeof input !== "object") return {};
  // If already new shape (userId -> obj of clubId -> role)
  const looksNew = Object.values(input).every(
    (v) => v && typeof v === "object" && !Array.isArray(v)
  );
  if (looksNew) return input as Memberships;
  // Old shape: userId -> string[]
  const result: Memberships = {};
  for (const [userId, clubs] of Object.entries(input as Record<string, any>)) {
    if (Array.isArray(clubs)) {
      result[userId] = Object.fromEntries(
        (clubs as string[]).map((clubId) => [String(clubId), "member" as MembershipRole])
      );
    }
  }
  return result;
}

function readMemberships(): Memberships {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return normalizeToNewShape(parsed);
  } catch {
    return {};
  }
}

function writeMemberships(data: Memberships) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore write errors
  }
}

export function addUserToClub(
  userId: string,
  clubId: string,
  role: MembershipRole = "member"
) {
  const db = readMemberships();
  db[userId] = db[userId] || {};
  // Do not downgrade admin to member if already admin
  const existing = db[userId][clubId];
  if (existing === "admin") {
    // keep admin
  } else {
    db[userId][clubId] = role;
  }
  writeMemberships(db);
}

export function addUserToClubAsAdmin(userId: string, clubId: string) {
  addUserToClub(userId, clubId, "admin");
}

export function addUserToClubAsMember(userId: string, clubId: string) {
  addUserToClub(userId, clubId, "member");
}

export function removeUserFromClub(userId: string, clubId: string) {
  const db = readMemberships();
  if (!db[userId]) return;
  const map = { ...db[userId] };
  delete map[clubId];
  db[userId] = map;
  writeMemberships(db);
}

export function getUserClubIds(userId: string): string[] {
  const db = readMemberships();
  const map = db[userId] || {};
  return Object.keys(map);
}

export function getUserRoleInClub(
  userId: string,
  clubId: string
): MembershipRole | null {
  const db = readMemberships();
  return db[userId]?.[clubId] ?? null;
}

export function getUserClubsWithRoles(
  userId: string
): Array<{ clubId: string; role: MembershipRole }> {
  const db = readMemberships();
  const map = db[userId] || {};
  return Object.entries(map).map(([clubId, role]) => ({ clubId, role }));
}

export function getMemberships(): Memberships {
  return readMemberships();
}


