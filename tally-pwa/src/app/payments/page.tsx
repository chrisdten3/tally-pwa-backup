"use client";
import React, { useEffect, useState } from "react";
import { CreditCard, AlertCircle } from "lucide-react";

type Club = { id?: string; name?: string; balance?: number };
type User = { id?: string | number; name?: string; email?: string; stripe_account_id?: string } | null;

export default function PaymentsPage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User>(null);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
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
        // Fetch user session to get stripe_account_id
        const userRes = await fetch("/api/auth/session", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!userRes.ok) throw new Error("Not authenticated");
        const userData = await userRes.json();
        setUser(userData.user ?? null);

        // Fetch clubs
        const res = await fetch("/api/clubs", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Failed to load clubs");
        const data = await res.json();
        // api now returns clubs with role attached
        const arr = Array.isArray(data) ? (data as any[]) : [];
        setClubs(arr.map((c) => ({ id: c.id, name: c.name, balance: c.balance, role: c.role })));
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
        body: JSON.stringify({ clubId: selectedClubId, amount: num }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "Payout failed");
      // endpoint returns { ok: true, balance: club.balance } on success
      const updatedBalance = typeof j.balance === "number" ? j.balance : undefined;
      setClubs((prev) => prev.map((c) => (c.id === selectedClubId ? { ...c, balance: updatedBalance ?? (c.balance ?? 0) - num } : c)));
      setAmount("");
      setMessage("Payout submitted");
    } catch (err: any) {
      setMessage(err?.message || "Error submitting payout");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;

  // Only clubs where the user is an admin should be eligible for payouts
  const adminClubs = clubs.filter((c: any) => (c as any).role === "admin");

  // Check if user needs to onboard for Stripe
  const needsOnboarding = !user?.stripe_account_id;

  return (
    <main className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-indigo-700/20 text-indigo-300 flex items-center justify-center">
          <CreditCard size={28} />
        </div>
        <h1 className="mt-4 text-2xl font-semibold">Payouts</h1>
        <p className="mt-2 text-sm text-zinc-500">Admins can withdraw club balance via Stripe.</p>

        {needsOnboarding ? (
          <div className="mt-6 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-amber-500 mt-0.5" size={20} />
              <div>
                <h3 className="font-medium text-amber-200">Stripe Onboarding Required</h3>
                <p className="mt-1 text-sm text-amber-100/80">
                  To receive payouts, you need to connect your Stripe account. This allows us to securely transfer funds directly to your bank account.
                </p>
                <button
                  onClick={async () => {
                    const token = localStorage.getItem("token");
                    if (!token) return window.location.href = "/login";
                    try {
                      const res = await fetch("/api/stripe/connect/onboard", {
                        method: "POST",
                        headers: { Authorization: `Bearer ${token}` },
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
                  className="mt-3 inline-flex items-center justify-center rounded-lg bg-amber-600 text-white px-4 py-2 text-sm hover:bg-amber-700 transition"
                >
                  Start Stripe Onboarding
                </button>
              </div>
            </div>
          </div>
        ) : adminClubs.length === 0 ? (
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

            {message && <div className="text-sm text-zinc-600">{message}</div>}

            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Submit Payout"}
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}