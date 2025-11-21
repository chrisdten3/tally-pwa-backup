"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, DollarSign, CreditCard, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useClub } from "@/contexts/ClubContext";

type LedgerEntry = {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  club_id: string;
  user_id: string | null;
  completed_by_user_id: string | null;
  completed_by_name: string | null;
  completed_by_email: string | null;
  created_at: string;
  event_id: string | null;
  metadata: Record<string, unknown> | null;
  club_events?: {
    id: string;
    title: string;
  } | null;
};

export default function ActivityPage() {
  const router = useRouter();
  const { activeClub } = useClub();
  const [ledger, setLedger] = React.useState<LedgerEntry[]>([]);
  const [balance, setBalance] = React.useState(0);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!activeClub?.id) {
      setLoading(false);
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    fetch(`/api/clubs/ledger?clubId=${activeClub.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.ledger) {
          setLedger(data.ledger);
          setBalance(data.balance || 0);
        }
      })
      .catch((err) => console.error("Failed to fetch ledger:", err))
      .finally(() => setLoading(false));
  }, [activeClub?.id, router]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "payment":
        return { label: "Payment", variant: "success" as const, icon: DollarSign };
      case "payout":
        return { label: "Payout", variant: "info" as const, icon: CreditCard };
      case "fee":
        return { label: "Fee", variant: "warning" as const, icon: TrendingDown };
      default:
        return { label: type, variant: "default" as const, icon: TrendingUp };
    }
  };

  if (loading) {
    return (
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading activity...</p>
        </div>
      </div>
    );
  }

  if (!activeClub) {
    return (
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>
        <Card className="mt-10 border-dashed border-border/70 bg-card/40">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <h2 className="text-lg font-semibold">No club selected</h2>
            <p className="max-w-sm text-sm text-muted-foreground">
              Please select a club to view its activity.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Activity
            </p>
            <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">
              {activeClub.name}
            </h1>
          </div>
          <Card className="border-border/70 bg-card/60">
            <CardHeader className="pb-2 px-4 pt-3">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Current balance
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="text-2xl font-semibold">
                ${(balance / 100).toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Activity Table */}
      <Card className="border-border/70 bg-card/60">
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            All transactions
          </CardTitle>
          <CardDescription>
            Complete ledger history for {activeClub.name}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {ledger.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground">
                No transactions yet. Once members start paying or payouts are made,
                they&apos;ll appear here.
              </p>
            </div>
          ) : (
            <div className="rounded-md border border-border/70">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[140px]">Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ledger.map((entry) => {
                    const typeInfo = getTypeLabel(entry.type);
                    const TypeIcon = typeInfo.icon;
                    const isPositive = entry.amount > 0;

                    return (
                      <TableRow key={entry.id}>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(entry.created_at)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={typeInfo.variant} className="gap-1">
                            <TypeIcon className="h-3 w-3" />
                            {typeInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[300px]">
                          <div className="truncate">
                            {entry.club_events?.title || entry.description || "—"}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {entry.completed_by_name ||
                            entry.completed_by_email?.split("@")[0] ||
                            "System"}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          <span
                            className={
                              isPositive
                                ? "text-emerald-500"
                                : "text-rose-500"
                            }
                          >
                            {isPositive ? "+" : "-"}$
                            {(Math.abs(entry.amount) / 100).toFixed(2)}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
