"use client";
import React, { useEffect, useMemo, useState } from "react";
import { CalendarDays, Plus, X, Clock, AlertCircle, CheckCircle, Users } from "lucide-react";

type Club = { id: string; name: string };
type Member = { id: string; name: string; email: string; role: "admin" | "member" };

type AssignedEvent = {
  id: string;
  title: string;
  description: string;
  amount: number;
  createdAt: string;
  expires_at: string | null;
  club: { id: string; name: string };
  assignment: {
    assigned_by: string;
    assigned_by_name: string;
    assigned_at: string;
    is_waived: boolean;
    is_cancelled: boolean;
    role_at_assign: "admin" | "member";
  };
};

type CreatedEvent = {
  id: string;
  title: string;
  description: string;
  amount: number;
  createdAt: string;
  expires_at: string | null;
  club: { id: string; name: string };
  stats: {
    assigneeCount: number;
    cancelledCount: number;
    waivedCount: number;
  };
};

export default function EventsPage() {
  const [showModal, setShowModal] = useState(false);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [selectedClubId, setSelectedClubId] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState<string>("");
  const [expiresAt, setExpiresAt] = useState<string>("");
  const [assignees, setAssignees] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // New state for events display
  const [assignedEvents, setAssignedEvents] = useState<AssignedEvent[]>([]);
  const [createdEvents, setCreatedEvents] = useState<CreatedEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"assigned" | "created">("assigned");

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  // Fetch events on component mount
  useEffect(() => {
    const fetchEvents = async () => {
      if (!token) return;
      setEventsLoading(true);
      try {
        const res = await fetch("/api/events", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("Failed to load events");
        const data = await res.json();
        setAssignedEvents(data.assigned || []);
        setCreatedEvents(data.created || []);
      } catch (e: any) {
        console.error("Error loading events:", e);
      } finally {
        setEventsLoading(false);
      }
    };
    fetchEvents();
  }, [token]);

  useEffect(() => {
    if (!showModal) return;
    // fetch clubs for current user
    const run = async () => {
      setError(null);
      try {
        const res = await fetch("/api/clubs", { headers: token ? { Authorization: `Bearer ${token}` } : {} });
        if (!res.ok) throw new Error("Failed to load clubs");
        const data = (await res.json()) as Array<{ id: string; name: string }>;
        setClubs(data);
        if (data.length && !selectedClubId) setSelectedClubId(data[0].id);
      } catch (e: any) {
        setError(e?.message || "Error loading clubs");
      }
    };
    run();
  }, [showModal]);

  useEffect(() => {
    if (!selectedClubId || !showModal) return;
    const run = async () => {
      setError(null);
      try {
        const res = await fetch(`/api/members?clubId=${encodeURIComponent(selectedClubId)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error("Failed to load members");
        const data = (await res.json()) as { members: Member[] };
        setMembers(data.members);
        // initialize assignees map
        const initial: Record<string, boolean> = {};
        data.members.forEach((m) => (initial[m.id] = false));
        setAssignees(initial);
      } catch (e: any) {
        setError(e?.message || "Error loading members");
      }
    };
    run();
  }, [selectedClubId, showModal]);

  const allSelected = useMemo(() => {
    const ids = Object.keys(assignees);
    return ids.length > 0 && ids.every((id) => assignees[id]);
  }, [assignees]);

  const toggleAll = () => {
    const next: Record<string, boolean> = {};
    const value = !allSelected;
    Object.keys(assignees).forEach((id) => (next[id] = value));
    setAssignees(next);
  };

  const toggleOne = (id: string) => setAssignees((s) => ({ ...s, [id]: !s[id] }));

  // Helper functions for status grouping
  const getEventStatus = (expiresAt: string | null) => {
    if (!expiresAt) return "no-due-date";
    const now = new Date();
    const dueDate = new Date(expiresAt);
    const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return "overdue";
    if (diffDays <= 7) return "due-soon";
    return "active";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const reset = () => {
    setSelectedClubId("");
    setMembers([]);
    setTitle("");
    setDescription("");
    setAmount("");
    setExpiresAt("");
    setAssignees({});
    setError(null);
    setSuccess(null);
  };

  const createEvent = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const chosen = Object.entries(assignees)
        .filter(([, v]) => v)
        .map(([k]) => k);
      const payload = {
        clubId: selectedClubId,
        title,
        description,
        amount: parseInt(amount || "0", 10),
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        assigneeUserIds: chosen,
      };
      const res = await fetch("/api/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to create event");
      setSuccess("Event created");
      // Refresh events list
      const eventsRes = await fetch("/api/events", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (eventsRes.ok) {
        const eventsData = await eventsRes.json();
        setAssignedEvents(eventsData.assigned || []);
        setCreatedEvents(eventsData.created || []);
      }
      setTimeout(() => {
        setShowModal(false);
        reset();
      }, 700);
    } catch (e: any) {
      setError(e?.message || "Error creating event");
    } finally {
      setLoading(false);
    }
  };

  // Group assigned events by status
  const groupedAssignedEvents = useMemo(() => {
    const groups = {
      overdue: [] as AssignedEvent[],
      "due-soon": [] as AssignedEvent[],
      active: [] as AssignedEvent[],
      "no-due-date": [] as AssignedEvent[]
    };
    
    assignedEvents.forEach(event => {
      const status = getEventStatus(event.expires_at);
      groups[status].push(event);
    });
    
    // Sort each group
    Object.keys(groups).forEach(key => {
      groups[key as keyof typeof groups].sort((a, b) => {
        if (key === "overdue") {
          // Most overdue first
          const aDays = Math.ceil((new Date(a.expires_at!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
          const bDays = Math.ceil((new Date(b.expires_at!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
          return aDays - bDays;
        }
        if (key === "due-soon" || key === "active") {
          // Nearest due first
          return new Date(a.expires_at!).getTime() - new Date(b.expires_at!).getTime();
        }
        // For no-due-date, sort by creation date
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    });
    
    return groups;
  }, [assignedEvents]);

  return (
    <main className="min-h-screen p-4 pb-20">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Events</h1>
            <p className="text-sm text-zinc-500">Manage your assigned and created events</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm hover:bg-indigo-500"
          >
            <Plus size={16} /> New Event
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab("assigned")}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === "assigned"
                ? "bg-white dark:bg-zinc-700 text-indigo-600 shadow-sm"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
            }`}
          >
            Assigned to you ({assignedEvents.length})
          </button>
          <button
            onClick={() => setActiveTab("created")}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === "created"
                ? "bg-white dark:bg-zinc-700 text-indigo-600 shadow-sm"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
            }`}
          >
            Created by you ({createdEvents.length})
          </button>
        </div>

        {/* Content */}
        {eventsLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-sm text-zinc-500">Loading events...</div>
          </div>
        ) : activeTab === "assigned" ? (
          <div className="space-y-6">
            {assignedEvents.length === 0 ? (
              <div className="text-center py-12">
                <CalendarDays size={48} className="mx-auto text-zinc-400 mb-4" />
                <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2">No events assigned to you</h3>
                <p className="text-sm text-zinc-500 mb-4">Nothing assigned to you across your clubs.</p>
                <button
                  onClick={() => setShowModal(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm hover:bg-indigo-500"
                >
                  <Plus size={16} /> Create Event
                </button>
              </div>
            ) : (
              <>
                {/* Overdue */}
                {groupedAssignedEvents.overdue.length > 0 && (
                  <div>
                    <h3 className="flex items-center gap-2 text-sm font-medium text-red-600 mb-3">
                      <AlertCircle size={16} />
                      Overdue ({groupedAssignedEvents.overdue.length})
                    </h3>
                    <div className="space-y-3">
                      {groupedAssignedEvents.overdue.map(event => (
                        <div key={event.id} className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-red-900 dark:text-red-100">{event.title}</h4>
                              <p className="text-sm text-red-700 dark:text-red-300">{event.club.name}</p>
                              <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                                Due {formatDate(event.expires_at!)} • {formatCurrency(event.amount)}
                              </p>
                              <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                                Assigned by {event.assignment.assigned_by_name} on {formatDate(event.assignment.assigned_at)}
                              </p>
                            </div>
                            <span className="px-2 py-1 bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-200 text-xs rounded-full">
                              Overdue
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Due Soon */}
                {groupedAssignedEvents["due-soon"].length > 0 && (
                  <div>
                    <h3 className="flex items-center gap-2 text-sm font-medium text-orange-600 mb-3">
                      <Clock size={16} />
                      Due Soon ({groupedAssignedEvents["due-soon"].length})
                    </h3>
                    <div className="space-y-3">
                      {groupedAssignedEvents["due-soon"].map(event => (
                        <div key={event.id} className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-orange-900 dark:text-orange-100">{event.title}</h4>
                              <p className="text-sm text-orange-700 dark:text-orange-300">{event.club.name}</p>
                              <p className="text-sm text-orange-600 dark:text-orange-400 mt-1">
                                Due {formatDate(event.expires_at!)} • {formatCurrency(event.amount)}
                              </p>
                              <p className="text-xs text-orange-500 dark:text-orange-400 mt-1">
                                Assigned by {event.assignment.assigned_by_name} on {formatDate(event.assignment.assigned_at)}
                              </p>
                            </div>
                            <span className="px-2 py-1 bg-orange-100 dark:bg-orange-800 text-orange-800 dark:text-orange-200 text-xs rounded-full">
                              Due Soon
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Active */}
                {groupedAssignedEvents.active.length > 0 && (
                  <div>
                    <h3 className="flex items-center gap-2 text-sm font-medium text-green-600 mb-3">
                      <CheckCircle size={16} />
                      Active ({groupedAssignedEvents.active.length})
                    </h3>
                    <div className="space-y-3">
                      {groupedAssignedEvents.active.map(event => (
                        <div key={event.id} className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-zinc-900 dark:text-zinc-100">{event.title}</h4>
                              <p className="text-sm text-zinc-600 dark:text-zinc-400">{event.club.name}</p>
                              <p className="text-sm text-zinc-500 dark:text-zinc-500 mt-1">
                                Due {formatDate(event.expires_at!)} • {formatCurrency(event.amount)}
                              </p>
                              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                                Assigned by {event.assignment.assigned_by_name} on {formatDate(event.assignment.assigned_at)}
                              </p>
                            </div>
                            <span className="px-2 py-1 bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 text-xs rounded-full">
                              Active
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* No Due Date */}
                {groupedAssignedEvents["no-due-date"].length > 0 && (
                  <div>
                    <h3 className="flex items-center gap-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-3">
                      <CalendarDays size={16} />
                      No Due Date ({groupedAssignedEvents["no-due-date"].length})
                    </h3>
                    <div className="space-y-3">
                      {groupedAssignedEvents["no-due-date"].map(event => (
                        <div key={event.id} className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-zinc-900 dark:text-zinc-100">{event.title}</h4>
                              <p className="text-sm text-zinc-600 dark:text-zinc-400">{event.club.name}</p>
                              <p className="text-sm text-zinc-500 dark:text-zinc-500 mt-1">
                                {formatCurrency(event.amount)}
                              </p>
                              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                                Assigned by {event.assignment.assigned_by_name} on {formatDate(event.assignment.assigned_at)}
                              </p>
                            </div>
                            <span className="px-2 py-1 bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 text-xs rounded-full">
                              No Due Date
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {createdEvents.length === 0 ? (
              <div className="text-center py-12">
                <CalendarDays size={48} className="mx-auto text-zinc-400 mb-4" />
                <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2">No events created by you</h3>
                <p className="text-sm text-zinc-500 mb-4">You haven't created any events yet.</p>
                <button
                  onClick={() => setShowModal(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm hover:bg-indigo-500"
                >
                  <Plus size={16} /> Create Event
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {createdEvents
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map(event => (
                    <div key={event.id} className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-zinc-900 dark:text-zinc-100">{event.title}</h4>
                          <p className="text-sm text-zinc-600 dark:text-zinc-400">{event.club.name}</p>
                          <p className="text-sm text-zinc-500 dark:text-zinc-500 mt-1">
                            {formatCurrency(event.amount)}
                            {event.expires_at && ` • Due ${formatDate(event.expires_at)}`}
                          </p>
                          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                            Created {formatDate(event.createdAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                            <Users size={12} />
                            {event.stats.assigneeCount} assigned
                          </div>
                          {event.stats.cancelledCount > 0 && (
                            <span className="px-2 py-1 bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-200 text-xs rounded-full">
                              {event.stats.cancelledCount} cancelled
                            </span>
                          )}
                          {event.stats.waivedCount > 0 && (
                            <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 text-xs rounded-full">
                              {event.stats.waivedCount} waived
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg bg-white dark:bg-[#0b0b0f] border border-black/10 dark:border-white/10 rounded-2xl p-5 text-left">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Create Event</h2>
              <button className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-white/10" onClick={() => { setShowModal(false); reset(); }}>
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 grid gap-3">
              <label className="text-sm">Club
                <select className="mt-1 w-full rounded-lg border border-black/10 dark:border-white/10 bg-transparent p-2"
                  value={selectedClubId}
                  onChange={(e) => setSelectedClubId(e.target.value)}>
                  <option value="">Select a club</option>
                  {clubs.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </label>

              <label className="text-sm">Title
                <input className="mt-1 w-full rounded-lg border border-black/10 dark:border-white/10 bg-transparent p-2" value={title} onChange={(e) => setTitle(e.target.value)} />
              </label>

              <label className="text-sm">Description
                <textarea className="mt-1 w-full rounded-lg border border-black/10 dark:border-white/10 bg-transparent p-2" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm">Amount
                  <input type="number" className="mt-1 w-full rounded-lg border border-black/10 dark:border-white/10 bg-transparent p-2" value={amount} onChange={(e) => setAmount(e.target.value)} />
                </label>
                <label className="text-sm">Expires
                  <input type="date" className="mt-1 w-full rounded-lg border border-black/10 dark:border-white/10 bg-transparent p-2" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
                </label>
              </div>

              <div className="mt-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Assignees</span>
                  <button onClick={toggleAll} className="text-xs text-indigo-500 hover:underline">
                    {allSelected ? "Unselect all" : "Select all"}
                  </button>
                </div>
                <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-black/10 dark:border-white/10">
                  {members.length === 0 ? (
                    <div className="p-3 text-sm text-zinc-500">No members</div>
                  ) : (
                    members.map((m) => (
                      <label key={m.id} className="flex items-center gap-2 p-2 text-sm border-b last:border-b-0 border-black/5 dark:border-white/5">
                        <input type="checkbox" checked={!!assignees[m.id]} onChange={() => toggleOne(m.id)} />
                        <span className="flex-1 text-left">{m.name || m.email || m.id}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-white/10">{m.role}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              {error && <div className="text-sm text-red-500">{error}</div>}
              {success && <div className="text-sm text-green-600">{success}</div>}

              <button
                disabled={loading || !selectedClubId || !title || !amount || Object.values(assignees).every((v) => !v)}
                onClick={createEvent}
                className="mt-2 inline-flex items-center justify-center rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm disabled:opacity-50"
              >
                {loading ? "Creating..." : "Create Event"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}


