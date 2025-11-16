"use client";
import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Button from "@/components/Button";
import {
  Users,
  UserPlus,
  DollarSign,
  Activity as ActivityIcon,
  ArrowRight,
} from "lucide-react";
import { getUserClubIds } from "@/utils/memberships";

type User = { id?: string | number; name?: string; email?: string; stripe_account_id?: string } | null;
type Club = { id?: string; name?: string; description?: string; color?: string; role?: string };

export default function ProfilePage() {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);
  const [clubsCount, setClubsCount] = useState<number | null>(null);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [_celebrate, setCelebrate] = useState(false);
  const [activeClubId, setActiveClubId] = useState<string | null>(null);

  const activeClub = useMemo<Club | null>(() => {
    if (!clubs || clubs.length === 0) return null;
    const found = clubs.find((c) => c.id === activeClubId);
    return found || clubs[0] || null;
  }, [clubs, activeClubId]);

  useEffect(() => {
    let currentUserLocal: any = null;
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/login";
      return;
    }

    fetch("/api/auth/session", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => {
        if (!r.ok) throw new Error("Not authenticated");
        return r.json();
      })
      .then((data) => {
        setUser(data.user ?? null);
        currentUserLocal = data.user ?? null;
        return fetch("/api/clubs", { headers: { Authorization: `Bearer ${token}` } });
      })
      .then((r) => {
        if (!r || !r.ok) {
          setClubsCount(null);
          return;
        }
        return r.json();
      })
      .then((clubsData) => {
        let fetchedClubs: Club[] = Array.isArray(clubsData) ? clubsData : [];

        try {
          const localCount = currentUserLocal ? getUserClubIds(String(currentUserLocal.id)).length : 0;
          const effectiveCount = Math.max(localCount, fetchedClubs.length);
          setClubsCount(effectiveCount);
        } catch {
          setClubsCount(fetchedClubs.length);
        }

        try {
          const raw = localStorage.getItem("justCreatedClub");
          if (raw) {
            const created = JSON.parse(raw) as Club | null;
            if (created) {
              const exists = created.id ? fetchedClubs.some((c) => c.id === created.id) : false;
              if (!exists) fetchedClubs = [created, ...fetchedClubs];
            }
            localStorage.removeItem("justCreatedClub");
            setCelebrate(true);
            setTimeout(() => setCelebrate(false), 3500);
          }
        } catch {}

        setClubs(fetchedClubs);

        // After clubs are set, fetch ledger rows and assigned events to compute activity and action items
        (async () => {
          try {
            const token = localStorage.getItem("token");
            if (!token) return;

            // fetch assigned events + created events
            const eventsRes = await fetch("/api/events", { headers: { Authorization: `Bearer ${token}` } });
            const eventsJson = eventsRes.ok ? await eventsRes.json() : { assigned: [], created: [] };

            // fetch ledger rows involving the user
            const ledgersRes = await fetch("/api/ledgers/user", { headers: { Authorization: `Bearer ${token}` } });
            const ledgersJson = ledgersRes.ok ? await ledgersRes.json() : { ledgers: [] };

            // fetch ledger rows for admin clubs (payments/payouts for clubs the user administers)
            const adminClubIds = (fetchedClubs || []).filter((c: any) => c?.role === "admin").map((c: any) => String(c.id));
            const clubLedgerPromises = adminClubIds.map((id: string) =>
              fetch(`/api/clubs/ledger?clubId=${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => (r.ok ? r.json() : null)).catch(() => null)
            );
            const clubLedgers = (await Promise.all(clubLedgerPromises)).filter(Boolean).flatMap((r: any) => (r?.ledger || []));

            // merge ledgers (user-involved + admin club ledgers), dedupe by id
            const allLedgers = [...(ledgersJson.ledgers || []), ...clubLedgers];
            const byId: Record<string, any> = {};
            allLedgers.forEach((l: any) => {
              if (!l || !l.id) return;
              byId[l.id] = l;
            });
            const mergedLedgers = Object.values(byId).slice(0, 50);

            // compute recentActivity state shaped for UI
            const recent = mergedLedgers.map((l: any) => {
              // type - prefer l.type
              const type = l.type || (l.amount < 0 ? 'payout' : 'payment');
              const clubRow = (fetchedClubs || []).find((c: any) => String(c.id) === String(l.club_id || l.clubId || l.club?.id));
              return {
                id: l.id,
                type,
                user: l.completed_by_name || l.completed_by_email || l.user_id || l.assignee_user_id || '',
                amount: l.amount,
                club: clubRow?.name || (l.club && (l.club.name || l.club.id)) || String(l.club_id || l.clubId || ''),
                time: l.created_at || l.createdAt || l.created_at,
                clubColor: clubRow?.color || 'indigo',
              };
            });

            // action required: any assigned events for this user that are unpaid / not waived
            const assigned = eventsJson.assigned || [];
            const actionItems = (assigned || []).filter((a: any) => !a.assignment?.is_waived && !a.assignment?.is_cancelled && Number(a.amount || a.assigned_amount || 0) > 0).map((a: any) => ({
              id: a.id,
              club: a.club?.name || a.club || a.club_id,
              title: a.title || a.name || '',
              amount: a.amount ?? a.assigned_amount ?? 0,
              assigned_at: a.assignment?.assigned_at,
              clubColor: 'indigo',
            }));

            // attach to window for debugging (optional)
            (window as any).__profile_recent_activity = recent;
            (window as any).__profile_action_items = actionItems;

            // store these in local component state by setting clubsCount etc (we'll reuse render-time calls to read window vars)
            try { localStorage.setItem('__profile_recent_activity', JSON.stringify(recent)); } catch {}
            try { localStorage.setItem('__profile_action_items', JSON.stringify(actionItems)); } catch {}
          } catch (e) {
            // ignore failures but don't break UI
            console.error('Failed to fetch profile auxiliary data', e);
          }
        })();

        try {
          const saved = localStorage.getItem("activeClubId");
          const exists = saved && fetchedClubs.some((c) => c.id === saved);
          const initial = exists ? saved : fetchedClubs[0]?.id || null;
          if (initial) {
            setActiveClubId(initial);
            localStorage.setItem("activeClubId", String(initial));
          }
        } catch {}
      })
      .catch(() => {
        localStorage.removeItem("token");
        window.location.href = "/login";
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("justCreatedClub");
      if (!raw) return;
      sessionStorage.removeItem("justCreatedClub");
      setClubsCount((prev) => (typeof prev === "number" ? prev + 1 : 1));
      setCelebrate(true);
      const t = setTimeout(() => setCelebrate(false), 3500);
      return () => clearTimeout(t);
    } catch {}
  }, []);

  useEffect(() => {
    if (clubsCount === 1) {
      setCelebrate(true);
      const t = setTimeout(() => setCelebrate(false), 3500);
      return () => clearTimeout(t);
    }
  }, [clubsCount]);

  if (loading) return <div className="p-6">Loading...</div>;
  if (!user) return null;

  const hasClubs = !!clubsCount && clubsCount > 0;

  // helpers
  const initials = (name?: string) =>
    (name || "")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join("") || "U";

  return (
    <main className="min-h-screen w-full bg-[#0B0B0E] text-zinc-100">
      {/* Top container */}
      <div className="mx-auto max-w-6xl px-5 py-6 md:py-8">
        {/* ===== Header ===== */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-indigo-700/30 grid place-items-center font-semibold">
              {initials(user?.name)}
            </div>
            <div>
              <div className="text-base font-semibold leading-tight">{user?.name ?? "User"}</div>
              <div className="text-xs text-zinc-400 leading-tight">{user?.email}</div>
            </div>
          </div>
        </header>



        {/* ===== Empty state (no clubs) — your original CTA retained ===== */}
        {!hasClubs && (
          <div className="mx-auto mt-8 max-w-2xl">
            <style>{`@keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
            <div
              className="rounded-2xl p-6 bg-gradient-to-r from-indigo-900/20 via-violet-900/10 to-indigo-800/10"
              style={{ animation: "fadeUp 360ms ease both" }}
            >
              <h2 className="text-2xl sm:text-3xl font-extrabold text-indigo-200">You don&apos;t have any clubs yet.</h2>
              <p className="mt-3 text-sm text-zinc-400">Create or join your first one to get started.</p>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div
                role="button"
                tabIndex={0}
                onClick={() => (window.location.href = "/clubs/join")}
                className="rounded-xl border border-white/5 bg-zinc-900/40 p-4 flex items-center gap-4 cursor-pointer transform transition-transform duration-200 ease-out hover:-translate-y-1 hover:shadow-lg"
                style={{ animation: "fadeUp 420ms ease both", animationDelay: "60ms" }}
              >
                <div className="w-12 h-12 flex items-center justify-center rounded-lg bg-indigo-700/20 text-indigo-300">
                  <Users size={24} />
                </div>
                <div>
                  <div className="font-medium">Join a club</div>
                  <div className="text-sm text-zinc-500">Browse existing clubs and join one</div>
                </div>
              </div>

              <div
                role="button"
                tabIndex={0}
                onClick={() => (window.location.href = "/clubs/new")}
                className="rounded-xl border border-white/5 bg-zinc-900/40 p-4 flex items-center gap-4 cursor-pointer transform transition-transform duration-200 ease-out hover:-translate-y-1 hover:shadow-lg"
                style={{ animation: "fadeUp 420ms ease both", animationDelay: "120ms" }}
              >
                <div className="w-12 h-12 flex items-center justify-center rounded-lg bg-indigo-700/20 text-indigo-300">
                  <UserPlus size={24} />
                </div>
                <div>
                  <div className="font-medium">Create a club</div>
                  <div className="text-sm text-zinc-500">Set up a new club and invite members</div>
                </div>
              </div>

              {!user?.stripe_account_id && (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={async () => {
                    const token = localStorage.getItem("token");
                    if (!token) return window.location.href = "/login";
                    try {
                      const res = await fetch("/api/stripe/connect/onboard", {
                        method: "POST",
                        headers: { "Authorization": `Bearer ${token}` },
                      });
                      const data = await res.json();
                      if (data?.url) {
                        window.location.href = data.url;
                      } else {
                        alert(data?.error || "Failed to start onboarding");
                      }
                    } catch {
                      alert("Failed to start onboarding");
                    }
                  }}
                  className="rounded-xl border border-white/5 bg-zinc-900/40 p-4 flex items-center gap-4 cursor-pointer transform transition-transform duration-200 ease-out hover:-translate-y-1 hover:shadow-lg"
                  style={{ animation: "fadeUp 420ms ease both", animationDelay: "180ms" }}
                >
                  <div className="w-12 h-12 flex items-center justify-center rounded-lg bg-indigo-700/20 text-indigo-300">
                    <DollarSign size={24} />
                  </div>
                  <div>
                    <div className="font-medium">Onboard for payouts</div>
                    <div className="text-sm text-zinc-500">Set up your Stripe Express account for payouts</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== Dashboard (has clubs) ===== */}
        {hasClubs && activeClub && (
          <div className="mt-6 space-y-6">

            {/* Action Required (events assigned to user that need payment) */}
            <section className="rounded-2xl bg-zinc-900/60 border border-white/5 p-0 overflow-hidden">
              <div className="px-6 py-4">
                <div className="font-semibold">Action Required</div>
                <div className="text-sm text-zinc-400">{(typeof window !== 'undefined' && (JSON.parse(localStorage.getItem('__profile_action_items') || '[]')).length) || 0} tasks need your attention</div>
              </div>

              <div className="divide-y divide-white/5">
                {(typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('__profile_action_items') || '[]') : []).map((task: any) => (
                  <div key={task.id} className="mx-4 rounded-xl bg-zinc-800/60 px-4 py-3 flex items-center justify-between hover:bg-zinc-800 transition">
                    <div className="flex items-center gap-3">
                      <span className={`h-2.5 w-2.5 rounded-full ${task.amount > 0 ? 'bg-rose-500' : 'bg-amber-500'}`} />
                      <div>
                        <div className="text-sm">{task.title}</div>
                        <div className="text-xs text-zinc-400">{task.club}</div>
                      </div>
                    </div>
                    <ArrowRight size={18} className="text-zinc-300" />
                  </div>
                ))}
              </div>

              <div className="px-6 py-4">
                <Link
                  href="/events"
                  className="inline-flex items-center justify-center rounded-xl bg-indigo-600 text-white font-medium px-4 py-2 hover:bg-indigo-700 transition"
                >
                  Review All Tasks <ArrowRight size={16} className="ml-2" />
                </Link>
              </div>
            </section>

            {/* Quick Actions */}
            <section className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link
                href="/clubs"
                className="rounded-2xl bg-zinc-900/60 border border-white/5 p-5 hover:bg-white/5 transition"
              >
                <div className="h-10 w-10 rounded-xl bg-zinc-800 grid place-items-center mb-3">
                  <Users size={20} />
                </div>
                <div className="font-medium">My Clubs</div>
                <div className="text-sm text-zinc-400">{clubs.length} active {clubs.length === 1 ? "club" : "clubs"}</div>
              </Link>


              <Link
                href="/clubs/invite"
                className="rounded-2xl bg-zinc-900/60 border border-white/5 p-5 hover:bg-white/5 transition"
              >
                <div className="h-10 w-10 rounded-xl bg-zinc-800 grid place-items-center mb-3">
                  <UserPlus size={20} />
                </div>
                <div className="font-medium">Invite</div>
                <div className="text-sm text-zinc-400">Add members</div>
              </Link>

              {!user?.stripe_account_id && (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={async () => {
                    const token = localStorage.getItem("token");
                    if (!token) return window.location.href = "/login";
                    try {
                      const res = await fetch("/api/stripe/connect/onboard", {
                        method: "POST",
                        headers: { "Authorization": `Bearer ${token}` },
                      });
                      const data = await res.json();
                      if (data?.url) {
                        window.location.href = data.url;
                      } else {
                        alert(data?.error || "Failed to start onboarding");
                      }
                    } catch {
                      alert("Failed to start onboarding");
                    }
                  }}
                  className="rounded-2xl bg-zinc-900/60 border border-white/5 p-5 hover:bg-white/5 transition cursor-pointer"
                >
                  <div className="h-10 w-10 rounded-xl bg-zinc-800 grid place-items-center mb-3">
                    <DollarSign size={20} />
                  </div>
                  <div className="font-medium">Onboard</div>
                  <div className="text-sm text-zinc-400">Set up payouts</div>
                </div>
              )}

            </section>

            {/* Upcoming Events 
            <section className="rounded-2xl bg-zinc-900/60 border border-white/5">
              <div className="flex items-center justify-between px-6 py-4">
                <div className="font-semibold">Upcoming Events</div>
                <Link href="/events" className="text-sm text-zinc-400 hover:text-zinc-200">
                  View All
                </Link>
              </div>

              <div className="px-2 pb-2">
                <div className="mx-4 mb-2 rounded-xl bg-zinc-800/60 px-4 py-3 flex items-center justify-between hover:bg-zinc-800">
                  <div>
                    <div className="text-sm">Tech Meetup <CheckCircle2 className="inline ml-1" size={14} /></div>
                    <div className="text-xs text-zinc-400">MSBTC</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm">Oct 18</div>
                    <div className="text-xs text-zinc-400">6:00 PM</div>
                  </div>
                </div>

                <div className="mx-4 mb-4 rounded-xl bg-zinc-800/60 px-4 py-3 flex items-center justify-between hover:bg-zinc-800">
                  <div>
                    <div className="text-sm">Data Workshop</div>
                    <div className="text-xs text-zinc-400">Hoyalytics</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm">Oct 22</div>
                    <div className="text-xs text-zinc-400">3:00 PM</div>
                  </div>
                </div>
              </div>
            </section> */}

            {/* Recent Activity */}
            <section className="rounded-2xl bg-zinc-900/60 border border-white/5">
              <div className="flex items-center justify-between px-6 py-4">
                <div className="font-semibold">Recent Activity</div>
                <Link href="/activity" className="text-sm text-zinc-400 hover:text-zinc-200">
                  View All
                </Link>
              </div>

              <div className="px-2 pb-4 space-y-3">
                {(typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('__profile_recent_activity') || '[]') : []).map((activity: any) => (
                  <div key={activity.id} className="mx-4 rounded-xl bg-zinc-800/60 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-zinc-700 grid place-items-center">
                        {activity.type === 'payment' ? <ActivityIcon size={16} /> : activity.type === 'payout' ? <DollarSign size={16} /> : <Users size={16} />}
                      </div>
                      <div>
                        <div className="text-sm">{activity.user ? String(activity.user).slice(0,20) : 'Unknown'} {activity.type === 'payment' ? 'paid' : activity.type === 'payout' ? 'payout' : ''}</div>
                        <div className="text-xs text-zinc-400">{activity.club} · {activity.time ? new Date(activity.time).toLocaleString() : ''}</div>
                      </div>
                    </div>
                    {activity.amount !== undefined && (
                      <div className={`font-medium ${activity.amount > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{activity.amount > 0 ? '+' : ''}${Math.abs(activity.amount).toFixed(2)}</div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Footer / Account */}
            <div className="pt-2 text-center">
              <Button
                onClick={() => {
                  localStorage.removeItem("token");
                  window.location.href = "/login";
                }}
                variant="ghost"
              >
                Sign out
              </Button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

