"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, Send, CheckCircle, AlertCircle } from "lucide-react";
import { useClub } from "@/contexts/ClubContext";
import { useRouter } from "next/navigation";

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
  const router = useRouter();
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [stats, setStats] = useState<Stats>({
    availableBalance: 0,
    totalPaidOut: 0,
    pendingTotal: 0,
    totalCount: 0,
    pendingCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [userHasPhone, setUserHasPhone] = useState(true);

  useEffect(() => {
    if (!activeClub?.id) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    // Check if user has phone number
    fetch('/api/auth/user', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          setUserHasPhone(!!data.user.phone);
        }
      })
      .catch((err) => console.error("Failed to fetch user:", err));

    // Fetch payouts
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
          Transfers • {activeClub.name}
        </p>
        <div className="mt-1">
          <h1 className="text-2xl font-semibold sm:text-3xl">
            Transfer History
          </h1>
        </div>
      </div>

      {!userHasPhone && (
        <Card className="mb-6 border-amber-500/50 bg-amber-500/10">
          <CardContent className="flex items-start gap-3 pt-6">
            <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-amber-500 mb-1">Phone Number Required for Auto-Transfer Notifications</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Add your phone number to receive instant SMS notifications when payments are automatically transferred to your Stripe account.
              </p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => router.push('/settings')}
                className="border-amber-500/50 hover:bg-amber-500/20"
              >
                Update Profile
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mb-6 border-blue-500/50 bg-blue-500/10">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <DollarSign className="h-5 w-5 text-blue-400 mt-0.5 shrink-0" />
            <div>
              <h3 className="font-semibold text-blue-400 mb-1">� Instant Payouts to Bank</h3>
              <p className="text-sm text-muted-foreground">
                When members pay, funds are <strong>automatically sent to your bank account</strong> within minutes after a <strong>5.5% + $0.30</strong> platform fee.
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Example: Member pays $100 → Platform fee $5.80 → $94.20 arrives in your bank within minutes
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="border-border/70 bg-card/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-emerald-400" />
              Available to Withdraw
            </CardTitle>
            <CardDescription>Club balance after fees</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">${stats.availableBalance.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-blue-400" />
              In Transit
            </CardTitle>
            <CardDescription>Currently processing ({stats.pendingCount})</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">${stats.pendingTotal.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-400" />
              Total Transferred
            </CardTitle>
            <CardDescription>All-time transfers to your account</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">${stats.totalPaidOut.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 border-border/70 bg-card/60">
        <CardHeader>
          <CardTitle>Transfer History</CardTitle>
          <CardDescription>Recent automatic and manual transfers in {activeClub.name}</CardDescription>
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
