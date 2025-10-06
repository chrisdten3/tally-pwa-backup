"use client";
import React, { useEffect, useState } from "react";
import { CreditCard } from "lucide-react";

type Club = { id?: string; name?: string; balance?: number };

export default function PaymentsPage() {
  const [loading, setLoading] = useState(true);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [to, setTo] = useState<string>(""); // Venmo username / destination
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  useEffect(() => {
    if (!token) {
      window.location.href = "/login";
      return;
    }
    const run = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/clubs", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Failed to load clubs");
        const data = await res.json();
        setClubs(Array.isArray(data) ? (data as Club[]) : []);
      } catch (e: any) {
        console.error(e);
        setMessage("Unable to load clubs");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [token]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setMessage(null);
    if (!token) {
      setMessage("Not authenticated");
      return;
    }
    if (!selectedClubId) {
      setMessage("Choose a club");
      return;
    }
    const num = Number(amount);
    if (isNaN(num) || num <= 0) {
      setMessage("Enter a valid amount");
      return;
    }
    const club = clubs.find((c) => c.id === selectedClubId);
    if (!club) {
      setMessage("Club not found");
      return;
    }
    if ((club.balance ?? 0) < num) {
      setMessage("Insufficient club balance");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/clubs/payout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ clubId: selectedClubId, amount: num, to: to || undefined }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "Payout failed");
      // endpoint returns { ok: true, balance: club.balance } on success
      const updatedBalance = typeof j.balance === "number" ? j.balance : undefined;
      setClubs((prev) => prev.map((c) => (c.id === selectedClubId ? { ...c, balance: updatedBalance ?? (c.balance ?? 0) - num } : c)));
      setAmount("");
      setTo("");
      setMessage("Payout submitted");
    } catch (err: any) {
      setMessage(err?.message || "Error submitting payout");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;

  const adminClubs = clubs.filter((c) => typeof c.balance === "number");

  return (
    <main className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-indigo-700/20 text-indigo-300 flex items-center justify-center">
          <CreditCard size={28} />
        </div>
        <h1 className="mt-4 text-2xl font-semibold">Payouts</h1>
        <p className="mt-2 text-sm text-zinc-500">Admins can withdraw club balance and record a payout (Venmo username stored).</p>

        {adminClubs.length === 0 ? (
          <div className="mt-6 text-sm text-zinc-500">You have no clubs with a balance.</div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="text-sm block">
              Club
              <select
                className="mt-1 w-full rounded-lg border border-black/[.06] bg-transparent p-2"
                value={selectedClubId}
                onChange={(e) => setSelectedClubId(e.target.value)}
              >
                <option value="">Select a club</option>
                {adminClubs.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — ${((c.balance as number) || 0).toFixed(2)}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm block">
              Amount
              <input
                type="number"
                step="0.01"
                min="0"
                className="mt-1 w-full rounded-lg border border-black/[.06] bg-transparent p-2"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 25.00"
              />
            </label>

            <label className="text-sm block">
              Venmo username (optional)
              <input
                className="mt-1 w-full rounded-lg border border-black/[.06] bg-transparent p-2"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="e.g. @username or phone/email"
              />
            </label>

            {message && <div className="text-sm text-zinc-600">{message}</div>}

            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Submit Payout"}
              </button>
              <button
                type="button"
                onClick={() => {
                  // refresh clubs
                  setLoading(true);
                  fetch("/api/clubs", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })
                    .then((r) => (r.ok ? r.json() : Promise.reject()))
                    .then((data) => setClubs(Array.isArray(data) ? (data as Club[]) : []))
                    .catch(() => setMessage("Failed to refresh"))
                    .finally(() => setLoading(false));
                }}
                className="text-sm text-indigo-500 hover:underline"
              >
                Refresh
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}