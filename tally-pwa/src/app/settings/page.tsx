"use client";
import React, { useEffect, useState } from "react";
import Button from "@/components/Button";

type User = {
  id: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
};

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/login";
      return;
    }
    fetch("/api/auth/session", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        const u = (data?.user || null) as User | null;
        setUser(u);
        if (u) {
          setFirstName(u.firstName || "");
          setLastName(u.lastName || "");
          setEmail(u.email || "");
        }
      })
      .catch(() => {
        localStorage.removeItem("token");
        window.location.href = "/login";
      })
      .finally(() => setLoading(false));
  }, []);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    try {
      const updated = { ...user, firstName, lastName, email, name: `${firstName} ${lastName}`.trim() };
      localStorage.setItem("profile_settings", JSON.stringify(updated));
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch {
      // ignore
    }
  }

  if (loading) return <div className="p-6">Loading...</div>;
  if (!user) return null;

  return (
    <main className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="mt-1 text-sm text-zinc-500">Update your profile information.</p>

        <form className="mt-6 space-y-4" onSubmit={handleSave}>
          <div>
            <label className="text-sm text-zinc-400">First name</label>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/30"
              placeholder="First name"
            />
          </div>
          <div>
            <label className="text-sm text-zinc-400">Last name</label>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/30"
              placeholder="Last name"
            />
          </div>
          <div>
            <label className="text-sm text-zinc-400">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/30"
              placeholder="you@example.com"
            />
          </div>

          <Button type="submit">Save changes</Button>
          {saved && <div className="text-sm text-emerald-400 text-center">Saved</div>}
        </form>
      </div>
    </main>
  );
}


