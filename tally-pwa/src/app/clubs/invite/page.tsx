"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import Button from "@/components/Button";
import { ArrowRight, ChevronLeft } from "lucide-react";

type Club = { id?: string; name?: string; join_code?: string };

export default function ClubsInvitePage() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/login";
      return;
    }

    fetch("/api/clubs", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        const arr = Array.isArray(data) ? data : [];
        setClubs(arr.map((c: any) => ({ id: c.id, name: c.name, join_code: c.join_code || c.joinCode || c.code || '' })));
      })
      .catch(() => setClubs([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <main className="min-h-screen w-full bg-[#0B0B0E] text-zinc-100">
      <div className="mx-auto max-w-4xl px-5 py-6 md:py-8">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/profile" className="inline-flex items-center gap-2 text-zinc-300 hover:text-zinc-100">
            <ChevronLeft size={18} /> Back
          </Link>
          <h1 className="text-lg font-semibold">Invite — your clubs</h1>
        </div>

        {clubs.length === 0 ? (
          <div className="rounded-2xl p-6 bg-zinc-900/60 border border-white/5">
            <div className="text-sm text-zinc-400">You're not a member of any clubs yet.</div>
            <div className="mt-3">
              <Link href="/clubs/new" className="inline-block">
                <Button variant="ghost">Create a club</Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {clubs.map((c) => (
              <div key={c.id} className="rounded-xl bg-zinc-900/60 border border-white/5 p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-zinc-400">Join code</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="rounded-md bg-zinc-800/60 px-3 py-2 font-mono text-sm text-zinc-100">{c.join_code || '—'}</div>
                  <button
                    className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-white hover:bg-indigo-700 transition"
                    onClick={() => {
                      try {
                        navigator.clipboard.writeText(c.join_code || "");
                        alert('Join code copied to clipboard');
                      } catch {
                        // fallback
                      }
                    }}
                  >
                    Copy <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6">
          <Link href="/profile">
            <Button variant="ghost">Back to Home</Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
