"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, DollarSign, TrendingUp } from "lucide-react";
import { useClub } from "@/contexts/ClubContext";

export default function PaymentsPage() {
  const { activeClub } = useClub();

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Payments {activeClub && `• ${activeClub.name}`}
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
            <div className="text-3xl font-semibold">$12,450.00</div>
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
            <div className="text-3xl font-semibold">$2,340.00</div>
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
            <div className="text-3xl font-semibold">$580.00</div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 border-border/70 bg-card/60">
        <CardHeader>
          <CardTitle>Recent Payments</CardTitle>
          <CardDescription>Latest payment transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/40 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-md bg-emerald-500/20 flex items-center justify-center">
                    <DollarSign className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div>
                    <div className="font-medium">+${(Math.random() * 100 + 10).toFixed(2)}</div>
                    <div className="text-sm text-muted-foreground">Payment • Member {i}</div>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">2 days ago</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
