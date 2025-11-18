"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, Send, CheckCircle } from "lucide-react";

export default function PayoutsPage() {
  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Payouts
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
            <div className="text-3xl font-semibold">$3,240.00</div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-blue-400" />
              Pending Payouts
            </CardTitle>
            <CardDescription>Processing transfers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">$1,120.00</div>
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
            <div className="text-3xl font-semibold">$8,650.00</div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 border-border/70 bg-card/60">
        <CardHeader>
          <CardTitle>Payout History</CardTitle>
          <CardDescription>Recent payout transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { status: "completed", amount: 450.00, date: "3 days ago" },
              { status: "pending", amount: 680.00, date: "1 day ago" },
              { status: "completed", amount: 920.00, date: "1 week ago" },
              { status: "completed", amount: 340.00, date: "2 weeks ago" },
              { status: "pending", amount: 440.00, date: "Today" },
            ].map((payout, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/40 px-4 py-3">
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
                      {payout.status === "completed" ? "Completed" : "Pending"} • {payout.date}
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
        </CardContent>
      </Card>
    </div>
  );
}
