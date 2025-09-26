"use client";
import React, { useEffect, useMemo, useState } from "react";
import Button from "@/components/Button";
import { Users, UserPlus, ChevronLeft, ChevronRight } from "lucide-react";
import { getUserClubIds } from "@/utils/memberships";

type User = { name: string; email?: string } | null;

export default function ProfilePage() {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);
  const [clubsCount, setClubsCount] = useState<number | null>(null);
  const [clubs, setClubs] = useState<Array<{ id?: string; name?: string; description?: string }>>([]);
  const [celebrate, setCelebrate] = useState(false);
  const [activeClubId, setActiveClubId] = useState<string | null>(null);

  const activeClub = useMemo(() => {
    if (!clubs || clubs.length === 0) return null as null | { id?: string; name?: string; description?: string };
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

    // Fetch session
    fetch("/api/auth/session", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => {
        if (!r.ok) throw new Error("Not authenticated");
        return r.json();
      })
      .then((data) => {
        setUser(data.user ?? null);
        currentUserLocal = data.user ?? null;

        // Try to fetch clubs to determine CTA
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
          // normalize fetched clubs to an array
          let fetchedClubs: Array<{ id?: string; name?: string; description?: string }> = [];
          if (Array.isArray(clubsData)) fetchedClubs = clubsData;

          // incorporate local memberships for CTA count (acts like a join table)
          try {
            const localCount = currentUserLocal ? getUserClubIds(String(currentUserLocal.id)).length : 0;
            const effectiveCount = Math.max(localCount, fetchedClubs.length);
            setClubsCount(effectiveCount);
          } catch {
            setClubsCount(fetchedClubs.length);
          }

          // Merge optimistic created club (if any) so a race with the fetch won't hide it
          try {
            const raw = localStorage.getItem("justCreatedClub");
            if (raw) {
              const created = JSON.parse(raw) as { id?: string; name?: string; description?: string } | null;
              if (created) {
                const exists = created.id ? fetchedClubs.some((c) => c.id === created.id) : false;
                if (!exists) fetchedClubs = [created, ...fetchedClubs];
              }
              localStorage.removeItem("justCreatedClub");
              setCelebrate(true);
              setTimeout(() => setCelebrate(false), 3500);
            }
          } catch {
            // ignore
          }

          setClubs(fetchedClubs);
          // initialize active club selection
          try {
            const saved = localStorage.getItem("activeClubId");
            const exists = saved && fetchedClubs.some((c) => c.id === saved);
            const initial = exists ? saved : fetchedClubs[0]?.id || null;
            if (initial) {
              setActiveClubId(initial);
              localStorage.setItem("activeClubId", String(initial));
            }
          } catch {
            /* ignore */
          }
        })
      .catch(() => {
        localStorage.removeItem("token");
        window.location.href = "/login";
      })
      .finally(() => setLoading(false));
  }, []);

  // Optimistically handle a just-created club passed via sessionStorage
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("justCreatedClub");
      if (!raw) return;
      sessionStorage.removeItem("justCreatedClub");
      // If clubsCount is null/0, set to 1; otherwise increment
      setClubsCount((prev) => (typeof prev === "number" ? prev + 1 : 1));
      // small celebrate effect for first join
      setCelebrate(true);
      const t = setTimeout(() => setCelebrate(false), 3500);
      return () => clearTimeout(t);
    } catch {
      /* ignore parse errors */
    }
  }, []);

  // greeting removed (unused)

  // Small demo: celebrate when clubsCount becomes 1 (first club created)
  useEffect(() => {
    if (clubsCount === 1) {
      setCelebrate(true);
      const t = setTimeout(() => setCelebrate(false), 3500);
      return () => clearTimeout(t);
    }
  }, [clubsCount]);

  if (loading) return <div className="p-6">Loading...</div>;
  if (!user) return null;

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">

        {/* Fintechy CTA + boxy actions */}
        <div className="w-full bg-transparent">
          {(!clubsCount || clubsCount === 0) ? (
            <>
              <style>{`@keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
              <div
                className="rounded-2xl p-6 bg-gradient-to-r from-indigo-900/10 via-violet-900/6 to-indigo-800/6"
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
                  className="rounded-xl border border-black/[.06] dark:border-white/[.04] bg-zinc-900/40 p-4 flex items-center gap-4 cursor-pointer transform transition-transform duration-200 ease-out hover:-translate-y-1 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
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
                  className="rounded-xl border border-black/[.06] dark:border-white/[.04] bg-zinc-900/40 p-4 flex items-center gap-4 cursor-pointer transform transition-transform duration-200 ease-out hover:-translate-y-1 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
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
              </div>
            </>
          ) : (
            <div className="mt-2">
              {/* Active club selector */}
              {clubs && clubs.length > 0 && (
                <div className="rounded-xl border border-black/[.06] dark:border-white/[.04] bg-zinc-900/40 p-4">
                  <div className="flex items-center justify-between">
                    <button
                      aria-label="Previous club"
                      className="p-2 rounded-lg hover:bg-white/5 transition"
                      onClick={() => {
                        if (!clubs || clubs.length === 0) return;
                        const idx = Math.max(0, clubs.findIndex((c) => c.id === activeClubId));
                        const prev = (idx - 1 + clubs.length) % clubs.length;
                        const nextId = clubs[prev]?.id || null;
                        setActiveClubId(nextId);
                        if (nextId) localStorage.setItem("activeClubId", String(nextId));
                      }}
                    >
                      <ChevronLeft size={18} />
                    </button>

                    <div className="text-center px-3">
                      <div className="text-xs uppercase tracking-wide text-zinc-500">Active club</div>
                      <div className="text-lg font-semibold">
                        {clubs.find((c) => c.id === activeClubId)?.name || clubs[0]?.name || "Club"}
                      </div>
                    </div>

                    <button
                      aria-label="Next club"
                      className="p-2 rounded-lg hover:bg-white/5 transition"
                      onClick={() => {
                        if (!clubs || clubs.length === 0) return;
                        const idx = Math.max(0, clubs.findIndex((c) => c.id === activeClubId));
                        const next = (idx + 1) % clubs.length;
                        const nextId = clubs[next]?.id || null;
                        setActiveClubId(nextId);
                        if (nextId) localStorage.setItem("activeClubId", String(nextId));
                      }}
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>

                  {/* mini carousel preview */}
                  <div className="mt-3 flex gap-2 overflow-x-auto">
                    {clubs.map((c) => {
                      const isActive = c.id === activeClubId;
                      return (
                        <button
                          key={c.id || c.name}
                          onClick={() => {
                            const id = c.id || null;
                            setActiveClubId(id);
                            if (id) localStorage.setItem("activeClubId", String(id));
                          }}
                          className={`px-3 py-2 rounded-lg border text-sm whitespace-nowrap ${
                            isActive
                              ? "border-indigo-500/50 bg-indigo-500/10 text-indigo-300"
                              : "border-white/10 hover:bg-white/5 text-zinc-300"
                          }`}
                        >
                          {c.name || "Unnamed club"}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>



        {/* Only show quick glance and what's next when user has an active club */}
        {clubsCount! > 0 && activeClub && (
          <>
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-zinc-700">Quick glance {activeClub?.name ? `· ${activeClub.name}` : ""}</h3>
              <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-zinc-600">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-zinc-500">Total balance</p>
                    <p className="font-medium">$0.00</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-zinc-500">Upcoming events</p>
                    <p className="font-medium">0</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-zinc-500">Pending tasks</p>
                    <p className="font-medium">0</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-semibold">What&apos;s next</h3>
              <p className="mt-1 text-sm text-zinc-500">We recommend adding your first payment method, inviting members, or creating an event for {activeClub?.name || "this club"}.</p>

              <div className="mt-3 flex flex-col gap-3">
                <Button onClick={() => (window.location.href = "/clubs/invite")} variant="ghost">
                  Invite members to {activeClub?.name || "this club"}
                </Button>
              </div>
            </div>
          </>
        )}
        
        <div className="mt-6 text-center ">
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
    </main>
  );
}
