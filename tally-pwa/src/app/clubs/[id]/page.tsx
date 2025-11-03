"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Users, Receipt, Mail, Calendar, Crown, X } from "lucide-react";

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

type ClubMember = {
  id: string;
  user_id: string;
  name?: string;
  email: string;
  role: "admin" | "member" | string;
  joined_at: string;
  status?: "active" | "inactive";
};

function fmtUSD(n?: number | null) {
  return (n ?? 0).toLocaleString("en-US", { style: "currency", currency: "USD" });
}
function fmtDate(d: string) {
  const t = new Date(d);
  return isNaN(t.getTime()) ? "Invalid Date" : t.toLocaleString();
}

/* ---------- Modal ---------- */
function MemberModal({
  open,
  member,
  clubId,
  onClose,
  onPromoted,
}: {
  open: boolean;
  member: ClubMember | null;
  clubId: string;
  onClose: () => void;
  onPromoted: (userId: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  // close on ESC
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // click outside to close
  const onOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  const canPromote = member && member.role !== "admin";

  const promote = async () => {
    if (!member) return;
    setErr(null);
    setLoading(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (!token) throw new Error("Not signed in");

      // Build payload with fallbacks and log it so we can inspect what is sent
      const payload = { clubId: clubId || "", userId: (member.user_id || (member as any).id || ""), promoteTo: "admin" };
      console.log("promote payload:", payload);

      // Call existing members API (PATCH /api/members) which accepts promoteTo
      const res = await fetch("/api/members", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      // parse JSON if possible, otherwise text
      let data: any = null;
      try {
        data = await res.clone().json();
      } catch {
        try {
          data = await res.clone().text();
        } catch {
          data = null;
        }
      }

      if (!res.ok) {
        const msg = typeof data === "string" ? data : data?.error || JSON.stringify(data);
        throw new Error(`Status ${res.status}: ${msg || "Failed to promote"}`);
      }

      // optimistic: tell parent to set role=admin
      onPromoted(member.user_id);
    } catch (e: any) {
      setErr(e?.message || "Failed to promote");
    } finally {
      setLoading(false);
    }
  };

  if (!open || !member) return null;

  const joinedLabel = (() => {
    const j = member.joined_at;
    if (!j) return "Unknown";
    const label = fmtDate(j);
    return label === "Invalid Date" ? "Unknown" : label.split(",")[0];
  })();

  return (
    <div
      ref={overlayRef}
      onMouseDown={onOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      aria-modal="true"
      role="dialog"
    >
      <div
        className="w-full mx-4 sm:mx-0 sm:max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:p-5 shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-zinc-100">
                {member.name || "Member"}
              </h2>
              {member.role === "admin" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/15 px-2 py-0.5 text-xs font-medium text-indigo-300">
                  <Crown size={12} />
                  Admin
                </span>
              )}
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs text-zinc-400">
              <Mail size={12} />
              <span className="truncate">{member.email}</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-md p-1 text-zinc-400 hover:text-zinc-200"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-4 grid gap-2 text-sm">
          <div className="flex items-center gap-2 text-zinc-400">
            <Calendar size={14} />
            Joined <span className="text-zinc-200">{joinedLabel}</span>
          </div>
          <div className="text-zinc-400">
            Role: <span className="text-zinc-200 capitalize">{member.role}</span>
          </div>
        </div>

        {err && (
          <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {err}
          </div>
        )}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-300 hover:text-white"
          >
            Close
          </button>
          {canPromote && (
            <button
              onClick={promote}
              disabled={loading}
              className="inline-flex items-center justify-center rounded-lg bg-indigo-500 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-400 disabled:opacity-50"
            >
              {loading ? "Promoting…" : "Promote to admin"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Page ---------- */
export default function ClubDetailPage({ params }: { params?: { id: string } }) {
  const [activeTab, setActiveTab] = useState<"ledger" | "members">("ledger");
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [clubName, setClubName] = useState<string | null>(null);

  // modal state
  const [selected, setSelected] = useState<ClubMember | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const clubId = params?.id || "demo-club-123";

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const run = async () => {
      setLoading(true);
      try {
        const ledgerRes = await fetch(`/api/clubs/ledger?clubId=${encodeURIComponent(clubId)}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (ledgerRes.ok) {
          const data = await ledgerRes.json();
          setLedger(data.ledger || []);
          setBalance(data.balance ?? 0);
        }

        const membersRes = await fetch(`/api/members?clubId=${encodeURIComponent(clubId)}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (membersRes.ok) {
          const data = await membersRes.json();
          setMembers(data.members || []);
        }

        const clubsRes = await fetch(`/api/clubs`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }).catch(() => null);
        if (clubsRes?.ok) {
          const clubsData = await clubsRes.json();
          const found = (clubsData || []).find((c: any) => c.id === clubId);
          if (found) setClubName(found.name || null);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [clubId]);

  // callback when promotion succeeds
  const handlePromoted = (userId: string) => {
    setMembers((prev) =>
      prev.map((m) => (m.user_id === userId ? { ...m, role: "admin" } as ClubMember : m))
    );
    setModalOpen(false);
    setSelected(null);
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-5xl px-4 pb-24 pt-4">
        {/* Back link */}
        <div className="mb-4">
          <Link
            href="/clubs"
            className="inline-flex items-center gap-2 text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to clubs
          </Link>
        </div>

        {/* Header card */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 md:p-5">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold leading-tight">{clubName ?? "Club Dashboard"}</h1>

            <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="inline-flex items-center gap-1">
                Balance:
                <span className="font-medium text-zinc-100">{fmtUSD(balance)}</span>
              </span>
              <span className="inline-flex items-center gap-1">
                {members.length} member{members.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Tabs */}
            <div className="mt-3 border-b border-zinc-800">
              <div className="flex items-center gap-6">
                <button
                  onClick={() => setActiveTab("ledger")}
                  className={`relative -mb-px inline-flex items-center gap-2 py-2 text-sm transition-colors ${
                    activeTab === "ledger" ? "text-indigo-400" : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <Receipt size={16} />
                  Ledger
                  {activeTab === "ledger" && (
                    <span className="absolute inset-x-0 -bottom-[1px] h-0.5 bg-indigo-400 rounded-full" />
                  )}
                </button>

                <button
                  onClick={() => setActiveTab("members")}
                  className={`relative -mb-px inline-flex items-center gap-2 py-2 text-sm transition-colors ${
                    activeTab === "members" ? "text-indigo-400" : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <Users size={16} />
                  Members
                  {activeTab === "members" && (
                    <span className="absolute inset-x-0 -bottom-[1px] h-0.5 bg-indigo-400 rounded-full" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="mt-6">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-sm text-zinc-400">Loading…</div>
          ) : activeTab === "ledger" ? (
            ledger.length === 0 ? (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-10 text-center text-zinc-400">
                No ledger entries
              </div>
            ) : (
              <div className="space-y-3">
                {ledger
                  .slice()
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((entry) => {
                    const actor =
                      entry.completed_by_name ||
                      entry.completed_by_email ||
                      entry.user_id ||
                      entry.assignee_user_id ||
                      "unknown";

                    const title =
                      entry.type === "payment"
                        ? `Payment — paid by ${actor}`
                        : entry.type === "payout"
                        ? `Payout — initiated by ${actor}`
                        : `${entry.type} — ${actor}`;

                    const isPayment = entry.type === "payment";
                    const amount = fmtUSD(entry.amount);

                    return (
                      <div key={entry.id} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-zinc-100">{title}</div>
                            {entry.event_id && (
                              <div className="text-xs text-zinc-400">Event: {entry.event_id}</div>
                            )}
                            {entry.payment_provider && (
                              <div className="text-xs text-zinc-400">
                                Via: {entry.payment_provider}
                                {entry.payment_id ? ` • ${entry.payment_id}` : ""}
                              </div>
                            )}
                            {entry.description && (
                              <div className="mt-1 text-xs text-zinc-400">{entry.description}</div>
                            )}
                            <div className="mt-1 text-xs text-zinc-500">{fmtDate(entry.createdAt)}</div>
                            {(entry.balance_before !== undefined || entry.balance_after !== undefined) && (
                              <div className="mt-2 text-xs text-zinc-500">
                                Balance: {(entry.balance_before ?? 0).toFixed(2)} →{" "}
                                {(entry.balance_after ?? 0).toFixed(2)}
                              </div>
                            )}
                          </div>

                          <div
                            className={`shrink-0 text-sm font-medium ${
                              isPayment ? "text-emerald-400" : "text-red-400"
                            }`}
                          >
                            {isPayment ? "+" : "-"}
                            {amount}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )
          ) : members.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-10 text-center text-zinc-400">
              No members found
            </div>
          ) : (
            <div className="space-y-3">
              {members
                .slice()
                .sort((a, b) => {
                  if (a.role === "admin" && b.role !== "admin") return -1;
                  if (a.role !== "admin" && b.role === "admin") return 1;
                  return new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime();
                })
                .map((m) => (
                  <div key={m.id} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="mb-1 flex items-center gap-2">
                          <div className="truncate text-sm font-medium text-zinc-100">
                            {m.name || "Unnamed Member"}
                          </div>
                          {m.role === "admin" && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/15 px-2 py-0.5 text-xs font-medium text-indigo-300">
                              <Crown size={12} />
                              Admin
                            </span>
                          )}
                          {m.status === "inactive" && (
                            <span className="rounded-full bg-zinc-700 px-2 py-0.5 text-xs font-medium text-zinc-200">
                              Inactive
                            </span>
                          )}
                        </div>

                        <div className="mb-1 flex items-center gap-2 text-xs text-zinc-400">
                          <Mail size={12} />
                          <span className="truncate">{m.email}</span>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-zinc-400">
                          <Calendar size={12} />
                          <span>Joined {fmtDate(m.joined_at).split(",")[0]}</span>
                        </div>
                      </div>

                      {/* Open modal instead of navigating */}
                      <button
                        onClick={() => {
                          // ensure selected member includes user_id (API returns id)
                          setSelected({ ...m, user_id: (m as any).user_id || m.id, joined_at: (m as any).joined_at || "" });
                          setModalOpen(true);
                        }}
                        className="rounded-md px-3 py-1 text-xs font-medium text-indigo-300 hover:text-indigo-200"
                      >
                        Manage
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal portal (simple inline render) */}
      <MemberModal
        open={modalOpen}
        member={selected}
        clubId={clubId}
        onClose={() => {
          setModalOpen(false);
          setSelected(null);
        }}
        onPromoted={handlePromoted}
      />
    </main>
  );
}
