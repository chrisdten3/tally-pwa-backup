"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, UserPlus } from "lucide-react";
import { useClub } from "@/contexts/ClubContext";
import { MembersDataTable } from "@/components/MembersDataTable";

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

  const fetchMembers = () => {
    if (!activeClub?.id) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    setLoading(true);
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
  };

  useEffect(() => {
    fetchMembers();
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

      <div className="mt-6">
        <MembersDataTable
          members={members.map(m => ({
            ...m,
            firstName: m.name?.split(' ')[0],
            lastName: m.name?.split(' ').slice(1).join(' '),
            phone: m.email, // You may want to fetch actual phone from API
          }))}
          clubId={activeClub.id}
          onRefreshMembers={fetchMembers}
          onAddMember={async (member) => {
            const token = localStorage.getItem("token");
            const response = await fetch(`/api/clubs/${activeClub.id}/members/add`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(member),
            });
            if (response.ok) {
              fetchMembers();
            }
          }}
          onDeleteMember={async (memberId) => {
            const token = localStorage.getItem("token");
            const response = await fetch(`/api/clubs/${activeClub.id}/members?userId=${memberId}`, {
              method: "DELETE",
              headers: { Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
              fetchMembers();
            }
          }}
        />
      </div>
    </div>
  );
}
