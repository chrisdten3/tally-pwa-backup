"use client";

import React, { useState } from "react";
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
        // redirect to clubs list after a short delay
        setTimeout(() => router.push("/clubs"), 900);
      }
    } catch (err: any) {
      setError(err?.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-8">
      <button className="mb-4 text-sm text-indigo-500" onClick={() => (window.location.href = "/clubs")}> 
        <ArrowLeft size={14} /> Back to clubs
      </button>
      <h1 className="text-2xl font-semibold mb-4">Join a Club</h1>
      <form onSubmit={submit} className="space-y-4">
        <label className="block">
          <span className="text-sm">Enter join code</span>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="mt-1 block w-full rounded border px-3 py-2 bg-zinc-900"
            placeholder="ABC123"
          />
        </label>

        {error && <div className="text-red-400">{error}</div>}
        {success && <div className="text-green-400">Joined! Redirecting…</div>}

        <div>
          <button
            disabled={loading}
            className="rounded bg-indigo-600 px-4 py-2 text-white disabled:opacity-50"
          >
            {loading ? "Joining…" : "Join"}
          </button>
        </div>
      </form>
    </div>
  );
}
