"use client";

import * as React from "react";
import Link from "next/link";
import {
  Bell,
  Users,
  DollarSign,
  CalendarDays,
  ArrowRight,
  PlusCircle,
  CreditCard,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { MembersDataTable, type Member } from "@/components/MembersDataTable";
import { useClub } from "@/contexts/ClubContext";

type Club = {
  id: string;
  name: string;
  description?: string | null;
  balance?: number | null;
  memberCount?: number | null;
  role?: string;
};

type ActionItem = {
  id: string;
  title: string;
  amount: number;
  eventId: string;
  assignedAt: string;
};

type Activity = {
  id: string;
  type: string;
  amount: number;
  user: string;
  createdAt: string;
  description: string;
};

type Stats = {
  totalMembers: number;
  balance: number;
  upcomingDue: number;
};

type Props = {
  userName: string;
};

export default function ClubDashboardShell({ userName }: Props) {
  const { activeClub } = useClub();
  const [stats, setStats] = React.useState<Stats>({
    totalMembers: 0,
    balance: 0,
    upcomingDue: 0,
  });
  const [actionItems, setActionItems] = React.useState<ActionItem[]>([]);
  const [recentActivity, setRecentActivity] = React.useState<Activity[]>([]);
  const [members, setMembers] = React.useState<Member[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!activeClub?.id) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    setLoading(true);

    // Fetch stats and activity
    Promise.all([
      fetch(`/api/clubs/${activeClub.id}/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json()),
      fetch(`/api/clubs/${activeClub.id}/members`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json()),
    ])
      .then(([statsData, membersData]) => {
        if (statsData.stats) {
          setStats(statsData.stats);
        }
        if (statsData.recentActivity) {
          setRecentActivity(statsData.recentActivity);
        }
        if (statsData.actionItems) {
          setActionItems(statsData.actionItems);
        }
        if (membersData.members) {
          setMembers(membersData.members);
        }
      })
      .catch((err) => console.error("Failed to fetch dashboard data:", err))
      .finally(() => setLoading(false));
  }, [activeClub?.id]);

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
        {/* Top bar */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Dashboard
            </p>
            <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">
              Welcome back, {userName}
            </h1>
          </div>
          <Button
            variant="outline"
            size="icon"
            className="relative border-border/60"
          >
            <Bell className="h-4 w-4" />
            {/* unread dot */}
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-emerald-500" />
          </Button>
        </div>

        {/* Action buttons row */}
        <div className="mb-6 flex gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href="/clubs/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              New club
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/events/new">
              <CalendarDays className="mr-2 h-4 w-4" />
              New event
            </Link>
          </Button>
        </div>

        {activeClub ? (
          <ClubDashboard
            club={activeClub}
            stats={stats}
            actionItems={actionItems}
            recentActivity={recentActivity}
            members={members}
          />
        ) : (
          <EmptyState />
        )}
      </div>
  );
}

/* --- Sub-components --- */

function ClubDashboard({
  club,
  stats,
  actionItems,
  recentActivity,
  members,
}: {
  club: Club;
  stats: { totalMembers: number; balance: number; upcomingDue?: number };
  actionItems: ActionItem[];
  recentActivity: Activity[];
  members: Member[];
}) {
  return (
    <div className="space-y-6">
      {/* TOP METRICS */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/70 bg-card/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Total members
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-end justify-between">
            <div className="text-3xl font-semibold sm:text-4xl">
              {stats.totalMembers}
            </div>
            <Users className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Club balance
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-end justify-between">
            <div className="text-3xl font-semibold sm:text-4xl">
              ${stats.balance.toFixed(2)}
            </div>
            <DollarSign className="h-5 w-5 text-emerald-400" />
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Pending events
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-end justify-between">
            <div className="text-3xl font-semibold sm:text-4xl">
              {stats.upcomingDue ? `$${stats.upcomingDue.toFixed(2)}` : "—"}
            </div>
            <CalendarDays className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>
      </div>

      {/* MAIN GRID: quick actions + tasks + recent activity */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)]">
        {/* left column: quick actions + recent */}
        <div className="space-y-6">
          {/* Quick actions */}
          <Card className="border-border/70 bg-card/60">
            <CardHeader>
              <CardTitle className="text-sm font-semibold">
                Quick actions
              </CardTitle>
              <CardDescription>
                Common flows for {club.name ?? "your club"}.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <Button
                asChild
                variant="outline"
                className="justify-start gap-2"
              >
                <Link href="/events/new">
                  <CalendarDays className="h-4 w-4" />
                  Create event
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="justify-start gap-2"
              >
                <Link href="/members/add">
                  <Users className="h-4 w-4" />
                  Add member
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="justify-start gap-2"
              >
                <Link href="/payouts">
                  <DollarSign className="h-4 w-4" />
                  Request payout
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="justify-start gap-2"
              >
                <Link href="/reminders">
                  <Bell className="h-4 w-4" />
                  Send reminders
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Recent activity */}
          <Card className="border-border/70 bg-card/60">
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">
                  Recent activity
                </CardTitle>
                <CardDescription>
                  Latest payments and payouts in this club.
                </CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/activity">
                  View all
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentActivity.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No activity yet. Once members start paying, you’ll see it
                  here.
                </p>
              )}
              {recentActivity.slice(0, 5).map((item: Activity) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/40 px-3 py-2 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-background">
                      {item.type === "payment" ? (
                        <DollarSign className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <CreditCard className="h-4 w-4 text-indigo-400" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium">
                        {item.amount > 0 ? "+" : "-"}$
                        {Math.abs(item.amount).toFixed(2)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {item.type === "payment" ? "Payment" : "Payout"} •{" "}
                        {item.user.split("@")[0] || "Member"}
                      </div>
                    </div>
                  </div>
                  {/* You can add timestamp here */}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* right column: members data table */}
        <MembersDataTable
          members={members}
          clubId={club.id}
          onAddMember={(member) => {
            console.log("Add member:", member);
            // TODO: Implement API call to add member
          }}
          onDeleteMember={(memberId) => {
            console.log("Delete member:", memberId);
            // TODO: Implement API call to delete member
          }}
          onSendReminder={(memberId) => {
            console.log("Send reminder to:", memberId);
            // TODO: Implement API call to send reminder
          }}
          onImportCSV={(file) => {
            console.log("Import CSV:", file);
            // TODO: Implement CSV import logic
          }}
        />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <Card className="mt-10 border-dashed border-border/70 bg-card/40">
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        <h2 className="text-lg font-semibold">No clubs yet</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Create your first club to start tracking dues, payouts, and
          attendance in one place.
        </p>
        <Button asChild className="mt-2">
          <Link href="/clubs/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            Create a club
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
