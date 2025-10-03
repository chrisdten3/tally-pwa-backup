"use client";
import React, { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";

type LedgerEntry = {
  id: string;
  club_id: string;
  type: "payment" | "payout" | string;
  amount: number;
  balance_before?: number;
  balance_after?: number;
  user_id?: string;
  event_id?: string;
  payment_provider?: string;
  payment_id?: string;
  assignee_user_id?: string;
  completed_by_user_id?: string;
  completed_by_name?: string;
  completed_by_email?: string;
  createdAt: string;
  description?: string;
};

export default function ClubDetailPage({ params }: { params: { id: string } }) {
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    const run = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/clubs/ledger?clubId=${encodeURIComponent(params.id)}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Failed to load ledger");
        const data = await res.json();
        setLedger(data.ledger || []);
        setBalance(data.balance ?? 0);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [params.id]);

  return (
    <main className="p-6">
      <div className="max-w-3xl mx-auto">
        <button className="mb-4 text-sm text-indigo-500" onClick={() => (window.location.href = "/clubs")}> 
          <ArrowLeft size={14} /> Back to clubs
        </button>
        <h1 className="text-2xl font-semibold">Club ledger</h1>
        <div className="text-sm text-zinc-500 mb-4">Current balance: ${balance ?? 0}</div>

        {loading ? (
          <div>Loading...</div>
        ) : ledger.length === 0 ? (
          <div className="text-sm text-zinc-500">No ledger entries</div>
        ) : (
          <div className="space-y-3">
            {ledger
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map((entry) => {
                const actor = entry.completed_by_name || entry.completed_by_email || entry.user_id || entry.assignee_user_id || "unknown";
                const lineLabel =
                  entry.type === "payment"
                    ? `Payment — paid by ${actor}`
                    : entry.type === "payout"
                    ? `Payout — initiated by ${actor}`
                    : `${entry.type} — ${actor}`;

                const amountLabel = (entry.amount || 0).toLocaleString("en-US", { style: "currency", currency: "USD" });

                return (
                  <div key={entry.id} className="rounded-lg border p-3 bg-white/5">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">{lineLabel}</div>
                      <div className="text-sm">{amountLabel}</div>
                    </div>
                    {entry.event_id && <div className="text-xs text-zinc-400">Event: {entry.event_id}</div>}
                    {entry.payment_provider && <div className="text-xs text-zinc-400">Via: {entry.payment_provider} {entry.payment_id ? `• ${entry.payment_id}` : ""}</div>}
                    {entry.description && <div className="text-xs text-zinc-400 mt-1">{entry.description}</div>}
                    <div className="text-xs text-zinc-400 mt-1">{new Date(entry.createdAt).toLocaleString()}</div>
                    {(entry.balance_before !== undefined || entry.balance_after !== undefined) && (
                      <div className="text-xs text-zinc-500 mt-2">Balance: {(entry.balance_before ?? 0).toFixed(2)} → {(entry.balance_after ?? 0).toFixed(2)}</div>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </main>
  );
}
