"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Button from "@/components/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import ClubDashboardShell from "@/components/ClubDashboardShell";
import {
  Users,
  UserPlus,
  DollarSign,
  Activity,
  ArrowRight,
  Bell,
  Plus,
  Edit,
  MoreHorizontal,
  AlertTriangle,
} from "lucide-react";

type User = { 
  id?: string | number; 
  name?: string; 
  email?: string; 
  stripe_account_id?: string 
} | null;

type Club = { 
  id?: string; 
  name?: string; 
  description?: string; 
  color?: string; 
  role?: string 
};

type ActivityItem = {
  id: string;
  type: string;
  user: string;
  amount: number;
  club: string;
  time: string;
  clubColor: string;
};

type ActionItem = {
  id: string;
  club: string;
  title: string;
  amount: number;
  assigned_at: string;
  clubColor: string;
};

export default function HomePage() {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [stats, setStats] = useState({
    totalPaid: 0,
    totalReceived: 0,
    pendingPayments: 0,
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/login";
      return;
    }

    let currentUser: any = null;

    fetch("/api/auth/session", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => {
        if (!r.ok) {
          throw new Error("Not authenticated");
        }
        return r.json();
      })
      .then((data) => {
        if (!data.user) {
          throw new Error("No user in session");
        }
        setUser(data.user ?? null);
        currentUser = data.user ?? null;
        return fetch("/api/clubs", { headers: { Authorization: `Bearer ${token}` } });
      })
      .then((r) => {
        if (!r || !r.ok) {
          setClubs([]);
          return null;
        }
        return r.json();
      })
      .then((clubsData) => {
        const fetchedClubs: Club[] = Array.isArray(clubsData) ? clubsData : [];
        setClubs(fetchedClubs);

        // Fetch additional dashboard data (don't fail if these error)
        return Promise.allSettled([
          fetch("/api/events", { headers: { Authorization: `Bearer ${token}` } })
            .then((r) => (r.ok ? r.json() : { assigned: [], created: [] }))
            .catch(() => ({ assigned: [], created: [] })),
          fetch("/api/ledgers/user", { headers: { Authorization: `Bearer ${token}` } })
            .then((r) => (r.ok ? r.json() : { ledgers: [] }))
            .catch(() => ({ ledgers: [] })),
        ]);
      })
      .then((results) => {
        if (!results) return; // clubs fetch failed but user is authenticated
        
        const eventsData = results[0].status === 'fulfilled' ? results[0].value : { assigned: [], created: [] };
        const ledgersData = results[1].status === 'fulfilled' ? results[1].value : { ledgers: [] };
        
        // Process action items (assigned events that need payment)
        const assigned = eventsData?.assigned || [];
        const actions = assigned
          .filter((a: any) => 
            !a.assignment?.is_waived && 
            !a.assignment?.is_cancelled && 
            Number(a.amount || a.assigned_amount || 0) > 0
          )
          .map((a: any) => ({
            id: a.id,
            club: a.club?.name || a.club || a.club_id,
            title: a.title || a.name || "Event",
            amount: a.amount ?? a.assigned_amount ?? 0,
            assigned_at: a.assignment?.assigned_at,
            clubColor: "indigo",
          }))
          .slice(0, 5);
        setActionItems(actions);

        // Process recent activity
        const ledgers = ledgersData?.ledgers || [];
        const activity = ledgers
          .map((l: any) => ({
            id: l.id,
            type: l.type || (l.amount < 0 ? "payout" : "payment"),
            user: l.completed_by_name || l.completed_by_email || l.user_id || "Unknown",
            amount: l.amount,
            club: l.club?.name || String(l.club_id || ""),
            time: l.created_at || l.createdAt,
            clubColor: "indigo",
          }))
          .slice(0, 5);
        setRecentActivity(activity);

        // Calculate stats
        const totalPaid = ledgers
          .filter((l: any) => l.amount < 0)
          .reduce((sum: number, l: any) => sum + Math.abs(l.amount), 0);
        const totalReceived = ledgers
          .filter((l: any) => l.amount > 0)
          .reduce((sum: number, l: any) => sum + l.amount, 0);
        const pendingPayments = actions.reduce((sum: number, a: any) => sum + a.amount, 0);

        setStats({ totalPaid, totalReceived, pendingPayments });
      })
      .catch((err) => {
        // Only redirect to login if session validation failed
        console.error("[Home] Critical error:", err);
        localStorage.removeItem("token");
        window.location.href = "/login";
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-[#0B0B0E] text-zinc-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-zinc-400">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const hasClubs = clubs.length > 0;
  const needsStripeOnboarding = !user.stripe_account_id;
  const isAdmin = clubs.some((c) => c.role === "admin");

  // Helper
  const initials = (name?: string) =>
    (name || "")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join("") || "U";

  return (
    <div className={`${hasClubs && !needsStripeOnboarding ? 'w-full' : 'mx-auto max-w-7xl px-4 sm:px-6'} py-6 md:py-8`}>

        {/* Setup flow - show only if incomplete */}
        {(!hasClubs || needsStripeOnboarding) && (
          <div className="space-y-6">
            <div className="mb-8 text-center">
              <h2 className="mb-3 text-3xl font-bold">
                {!hasClubs && needsStripeOnboarding 
                  ? "Let's Get You Set Up" 
                  : "Complete Your Setup"}
              </h2>
              <p className="mx-auto max-w-2xl text-lg text-zinc-400">
                {!hasClubs && needsStripeOnboarding
                  ? "Complete these two steps to start managing your club payments and events."
                  : "One more step to get started!"}
              </p>
            </div>

            <div className={`mx-auto grid max-w-5xl grid-cols-1 gap-6 ${!hasClubs && needsStripeOnboarding ? 'md:grid-cols-2' : 'md:grid-cols-1 max-w-2xl'}`}>
            {/* Create Club Card - only show if user has no clubs */}
            {!hasClubs && (
              <Link href="/clubs/new">
                <div className="group cursor-pointer rounded-3xl border border-zinc-800 bg-zinc-950/80 p-8 transition-all hover:border-bright-indigo hover:bg-zinc-900/90 hover:shadow-[0_0_40px_rgba(90,67,255,0.25)]">
                <div className="flex flex-col items-center space-y-6 text-center">
                    <div className="grid h-24 w-24 place-items-center rounded-2xl bg-[rgba(90,67,255,0.18)] shadow-[0_0_30px_rgba(90,67,255,0.45)] transition group-hover:bg-[rgba(90,67,255,0.28)]">
                    <UserPlus size={48} className="text-white" />
                    </div>
                    <div>
                    <h3 className="mb-3 text-2xl font-bold">Create Your Club</h3>
                    <p className="text-base leading-relaxed text-zinc-300">
                        Start your own club and invite members to manage payments and events together.
                    </p>
                    </div>
                    <div className="pt-4">
                    <div className="inline-flex items-center gap-2 rounded-xl bg-bright-indigo px-8 py-3 text-base font-semibold text-white shadow-[0_0_24px_rgba(90,67,255,0.35)] transition group-hover:bg-[#6C57FF]">
                        Create Club
                        <ArrowRight size={18} />
                    </div>
                    </div>
                </div>
                </div>
              </Link>
            )}

            {/* Stripe Onboarding Card - only show if user needs to onboard */}
            {needsStripeOnboarding && (
              <div
                onClick={async () => {
                const token = localStorage.getItem("token");
                if (!token) return;
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
                className="group cursor-pointer rounded-3xl border border-zinc-800 bg-zinc-950/80 p-8 transition-all hover:border-[#47E6B1] hover:bg-zinc-900/90 hover:shadow-[0_0_40px_rgba(71,230,177,0.25)]"
              >
                <div className="flex flex-col items-center space-y-6 text-center">
                <div className="grid h-24 w-24 place-items-center rounded-2xl bg-[rgba(71,230,177,0.16)] p-4 shadow-[0_0_26px_rgba(71,230,177,0.4)] transition group-hover:bg-mint-leaf">
                    <Image
                    src="/icons8-stripe-100.png"
                    alt="Stripe"
                    width={80}
                    height={80}
                    className="object-contain"
                    />
                </div>
                <div>
                    <h3 className="mb-3 text-2xl font-bold">Onboard with Stripe</h3>
                    <p className="text-base leading-relaxed text-zinc-300">
                    Connect your bank account through Stripe to receive payments from your club.
                    </p>
                </div>
                <div className="pt-4">
                    <div className="inline-flex items-center gap-2 rounded-xl bg-[#47E6B1] px-8 py-3 text-base font-semibold text-slate-950 shadow-[0_0_24px_rgba(71,230,177,0.35)] transition group-hover:bg-[#63F0C3]">
                    Connect Account
                    <ArrowRight size={18} />
                    </div>
                </div>
                </div>
              </div>
            )}
            </div>
          </div>
        )}

        {/* Main Dashboard Content - only show when both setup steps are complete */}
        {hasClubs && !needsStripeOnboarding && (
          <ClubDashboardShell
            userName={user?.name?.split(" ")[0] || "User"}
          />
        )}
      </div>
  );
}
