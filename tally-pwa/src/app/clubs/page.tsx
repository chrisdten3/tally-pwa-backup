"use client";
import React, { useEffect, useState } from "react";
import { Users, UserPlus } from "lucide-react";

type Club = { id?: string; name?: string; description?: string; balance?: number };

export default function ClubsPage() {
  const [loading, setLoading] = useState(true);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/login";
      return;
    }
    // verify session then fetch clubs
    fetch("/api/auth/session", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => {
        if (!r.ok) throw new Error("Not authenticated");
        setAuthed(true);
        return fetch("/api/clubs", { headers: { Authorization: `Bearer ${token}` } });
      })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setClubs(data as Club[]);
      })
      .catch(() => {
        localStorage.removeItem("token");
        window.location.href = "/login";
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-6">Loading...</div>;
  if (!authed) return null;

  const _hasNoClubs = !clubs || clubs.length === 0;

  return (
    <main className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="w-full bg-transparent">
          {
            <><>
              <style>{`@keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>

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
            </><div className="mt-2">
                <h2 className="text-lg font-semibold">Your clubs</h2>
                <div className="mt-3 flex flex-col gap-2">
                  {clubs.map((c) => (
                    <div
                      key={c.id || c.name}
                      className="rounded-xl border border-white/10 bg-zinc-900/40 p-4 cursor-pointer"
                      role="button"
                      tabIndex={0}
                      onClick={() => (window.location.href = `/clubs/${c.id}`)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-medium">{c.name || "Unnamed club"}</div>
                        <div className="text-sm text-zinc-400">Balance: ${((c.balance as number) || 0).toFixed(2)}</div>
                      </div>
                      {c.description ? (
                        <div className="text-sm text-zinc-500 mt-1">{c.description}</div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div></>
          }
        </div>
      </div>
    </main>
  );
}


