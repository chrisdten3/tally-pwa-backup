"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, Send, CheckCircle } from "lucide-react";
import { useClub } from "@/contexts/ClubContext";

type Payout = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  provider: string;
  initiatedBy: {
    name: string;
    email: string;
  };
};

type Stats = {
  availableBalance: number;
  totalPaidOut: number;
  pendingTotal: number;
  totalCount: number;
  pendingCount: number;
};

export default function PayoutsPage() {
  const { activeClub } = useClub();
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [stats, setStats] = useState<Stats>({
    availableBalance: 0,
    totalPaidOut: 0,
    pendingTotal: 0,
    totalCount: 0,
    pendingCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeClub?.id) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    fetch(`/api/clubs/${activeClub.id}/payouts`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.payouts) {
          setPayouts(data.payouts);
        }
        if (data.stats) {
          setStats(data.stats);
        }
      })
      .catch((err) => console.error("Failed to fetch payouts:", err))
      .finally(() => setLoading(false));
  }, [activeClub?.id]);

  if (!activeClub) {
    return (
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <p className="text-muted-foreground">Please select a club to view payouts.</p>
      </div>
    );
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Payouts • {activeClub.name}
        </p>
        <div className="mt-1 flex items-center justify-between">
          <h1 className="text-2xl font-semibold sm:text-3xl">
            Payout Management
          </h1>
          <Button>
            <Send className="mr-2 h-4 w-4" />
            Request Payout
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="border-border/70 bg-card/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-emerald-400" />
              Available Balance
            </CardTitle>
            <CardDescription>Ready to withdraw</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">${stats.availableBalance.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-blue-400" />
              Pending Payouts
            </CardTitle>
            <CardDescription>Processing transfers ({stats.pendingCount})</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">${stats.pendingTotal.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-400" />
              Total Paid Out
            </CardTitle>
            <CardDescription>All-time payout total</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">${stats.totalPaidOut.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 border-border/70 bg-card/60">
        <CardHeader>
          <CardTitle>Payout History</CardTitle>
          <CardDescription>Recent payout transactions in {activeClub.name}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading payouts...</p>
          ) : payouts.length === 0 ? (
            <p className="text-muted-foreground">No payouts yet.</p>
          ) : (
            <div className="space-y-4">
              {payouts.slice(0, 10).map((payout) => (
                <div key={payout.id} className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/40 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-md flex items-center justify-center ${
                      payout.status === "completed" ? "bg-emerald-500/20" : "bg-blue-500/20"
                    }`}>
                      {payout.status === "completed" ? (
                        <CheckCircle className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <Send className="h-4 w-4 text-blue-400" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium">-${payout.amount.toFixed(2)}</div>
                      <div className="text-sm text-muted-foreground">
                        {payout.status === "completed" ? "Completed" : "Pending"} • {formatTimeAgo(payout.createdAt)}
                      </div>
                    </div>
                  </div>
                  <div className={`text-xs font-medium px-2 py-1 rounded ${
                    payout.status === "completed" 
                      ? "bg-emerald-500/10 text-emerald-400" 
                      : "bg-blue-500/10 text-blue-400"
                  }`}>
                    {payout.status}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
