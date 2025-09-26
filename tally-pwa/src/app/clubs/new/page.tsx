"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import FormInput from "@/components/FormInput";
import Button from "@/components/Button";
import { Building2 } from "lucide-react";
import { addUserToClubAsAdmin } from "@/utils/memberships";

export default function NewClubPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function validate() {
    if (!name.trim()) return "Please enter a club name";
    if (!email.includes("@")) return "Please enter a valid email";
    return null;
  }

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const v = validate();
    setError(v);
    if (v) return;
    setLoading(true);
    try {
      const res = await fetch("/api/clubs", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), description: description.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to create club");
      // store created club so profile can optimistically show it, then client-side navigate
      try {
        if (data && data.club) localStorage.setItem("justCreatedClub", JSON.stringify(data.club));
        // also add current user to local memberships join table
        const userRaw = localStorage.getItem("user");
        if (userRaw && data?.club?.id) {
          const user = JSON.parse(userRaw);
          if (user?.id) addUserToClubAsAdmin(String(user.id), String(data.club.id));
        }
      } catch {}
      router.push("/profile");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="mb-6 flex items-center gap-4" style={{ animation: "fadeUp 320ms ease both" }}>
          <div className="w-14 h-14 rounded-lg flex items-center justify-center bg-indigo-700/20 text-indigo-300">
            <Building2 size={28} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-indigo-200">Create a club</h1>
            <p className="mt-1 text-sm text-zinc-400">Add a name, contact email, and a short description.</p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <FormInput id="clubName" label="Club name" value={name} onChange={setName} placeholder="The Awesome Club" />
          <FormInput id="clubEmail" label="Contact email" type="email" value={email} onChange={setEmail} placeholder="club@tally.com" />
          <label className="block">
            <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300">Description</span>
            <textarea
              id="clubDescription"
              name="clubDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A short description of the club"
              className="mt-2 w-full rounded-lg border border-black/[.06] dark:border-white/[.06] bg-transparent px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              rows={4}
            />
          </label>

          {error && <div className="text-sm text-red-600">{error}</div>}

          <div className="flex items-center gap-3">
            <Button type="submit">{loading ? "Creating..." : "Create club"}</Button>
            <Button type="button" variant="ghost" onClick={() => (window.location.href = "/profile")}>
              Cancel
            </Button>
          </div>
        </form>
      </div>

      <style>{`@keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </main>
  );
}
