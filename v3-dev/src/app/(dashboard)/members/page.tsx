"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, UserPlus } from "lucide-react";
import { useClub } from "@/contexts/ClubContext";

type Member = {
  id: string;
  name: string;
  email: string;
  role: string;
  joinedAt: string;
  totalPaid: number;
  totalReceived: number;
};

export default function MembersPage() {
  const { activeClub } = useClub();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeClub?.id) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    fetch(`/api/clubs/${activeClub.id}/members`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.members) {
          setMembers(data.members);
        }
      })
      .catch((err) => console.error("Failed to fetch members:", err))
      .finally(() => setLoading(false));
  }, [activeClub?.id]);

  if (!activeClub) {
    return (
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <p className="text-muted-foreground">Please select a club to view members.</p>
      </div>
    );
  }

  const thisMonth = new Date();
  thisMonth.setDate(1);
  const newThisMonth = members.filter((m) => new Date(m.joinedAt) >= thisMonth).length;
  const activeMembers = members.filter((m) => m.totalPaid > 0 || m.totalReceived > 0).length;

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Members • {activeClub.name}
        </p>
        <div className="mt-1 flex items-center justify-between">
          <h1 className="text-2xl font-semibold sm:text-3xl">
            Manage Members
          </h1>
          <Button>
            <UserPlus className="mr-2 h-4 w-4" />
            Add Member
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="border-border/70 bg-card/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Total Members
            </CardTitle>
            <CardDescription>In {activeClub.name}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{members.length}</div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Active Members
            </CardTitle>
            <CardDescription>Members with activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{activeMembers}</div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              New This Month
            </CardTitle>
            <CardDescription>Members who joined this month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{newThisMonth}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 border-border/70 bg-card/60">
        <CardHeader>
          <CardTitle>Member List</CardTitle>
          <CardDescription>All members in {activeClub.name}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading members...</p>
          ) : members.length === 0 ? (
            <p className="text-muted-foreground">No members yet.</p>
          ) : (
            <div className="space-y-4">
              {members.map((member) => (
                <div key={member.id} className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/40 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-indigo-500/20 flex items-center justify-center">
                      <span className="text-sm font-semibold">
                        {member.name?.charAt(0)?.toUpperCase() || "U"}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium">{member.name || "Unnamed"}</div>
                      <div className="text-sm text-muted-foreground">{member.email}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Role: {member.role} • Paid: ${member.totalPaid.toFixed(2)}
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">View</Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
