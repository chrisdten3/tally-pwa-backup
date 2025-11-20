"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function JoinClubPage() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) {
      setError("You must be signed in to join a club.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/clubs/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Failed to join club");
      } else {
        setSuccess(true);
        setTimeout(() => router.push("/clubs"), 900);
      }
    } catch (err: any) {
      setError(err?.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-md px-4 pt-4 pb-28">
        {/* Back to clubs */}
        <div className="mb-4">
          <Link
            href="/clubs"
            className="inline-flex items-center gap-2 text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to clubs
          </Link>
        </div>

        {/* Header */}
        <h1 className="mb-6 text-3xl font-semibold tracking-tight">Join a Club</h1>

        {/* Form */}
        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="text-sm text-zinc-300">Enter join code</span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              autoFocus
              autoCapitalize="characters"
              autoComplete="off"
              inputMode="text"
              className="mt-2 block w-full h-11 rounded-xl border border-zinc-700 bg-zinc-900/60 px-3 text-zinc-100 placeholder:text-zinc-500 outline-none ring-0 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 transition"
            />
          </label>

          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
              Joined! Redirecting…
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !code}
            className="inline-flex items-center justify-center rounded-xl bg-indigo-500 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-400 disabled:opacity-50 disabled:hover:bg-indigo-500"
          >
            {loading ? "Joining…" : "Join"}
          </button>
        </form>
      </div>
    </main>
  );
}
