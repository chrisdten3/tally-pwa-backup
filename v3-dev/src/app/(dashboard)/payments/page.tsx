"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, DollarSign, TrendingUp } from "lucide-react";
import { useClub } from "@/contexts/ClubContext";

type Ledger = {
  id: string;
  amount: number;
  type: string;
  paymentProvider: string;
  createdAt: string;
  description: string;
  user: {
    name: string;
    email: string;
  };
  event: {
    id: string;
    title: string;
  } | null;
};

type Stats = {
  totalReceived: number;
  monthlyTotal: number;
  pendingTotal: number;
  totalCount: number;
};

export default function PaymentsPage() {
  const { activeClub } = useClub();
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalReceived: 0,
    monthlyTotal: 0,
    pendingTotal: 0,
    totalCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeClub?.id) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    fetch(`/api/clubs/${activeClub.id}/payments`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.ledgers) {
          setLedgers(data.ledgers);
        }
        if (data.stats) {
          setStats(data.stats);
        }
      })
      .catch((err) => console.error("Failed to fetch payments:", err))
      .finally(() => setLoading(false));
  }, [activeClub?.id]);

  if (!activeClub) {
    return (
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <p className="text-muted-foreground">Please select a club to view payments.</p>
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
          Payments • {activeClub.name}
        </p>
        <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">
          Payment History
        </h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="border-border/70 bg-card/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-emerald-400" />
              Total Received
            </CardTitle>
            <CardDescription>All-time payment total</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">${stats.totalReceived.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-400" />
              This Month
            </CardTitle>
            <CardDescription>Payments received this month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">${stats.monthlyTotal.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-indigo-400" />
              Pending
            </CardTitle>
            <CardDescription>Awaiting payment</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">${stats.pendingTotal.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 border-border/70 bg-card/60">
        <CardHeader>
          <CardTitle>Recent Payments</CardTitle>
          <CardDescription>Latest payment transactions in {activeClub.name}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading payments...</p>
          ) : ledgers.length === 0 ? (
            <p className="text-muted-foreground">No payments yet.</p>
          ) : (
            <div className="space-y-4">
              {ledgers.slice(0, 10).map((ledger) => (
                <div key={ledger.id} className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/40 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-md bg-emerald-500/20 flex items-center justify-center">
                      <DollarSign className="h-4 w-4 text-emerald-400" />
                    </div>
                    <div>
                      <div className="font-medium">+${ledger.amount.toFixed(2)}</div>
                      <div className="text-sm text-muted-foreground">
                        {ledger.user.name || ledger.user.email}
                        {ledger.event && ` • ${ledger.event.title}`}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">{formatTimeAgo(ledger.createdAt)}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
