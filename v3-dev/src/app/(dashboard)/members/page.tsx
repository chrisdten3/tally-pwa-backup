"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, UserPlus } from "lucide-react";

export default function MembersPage() {
  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Members
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
            <CardDescription>Across all clubs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">240</div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Active Members
            </CardTitle>
            <CardDescription>Members with recent activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">198</div>
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
            <div className="text-3xl font-semibold">12</div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 border-border/70 bg-card/60">
        <CardHeader>
          <CardTitle>Member List</CardTitle>
          <CardDescription>All members across your clubs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/40 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-indigo-500/20 flex items-center justify-center">
                    <span className="text-sm font-semibold">M{i}</span>
                  </div>
                  <div>
                    <div className="font-medium">Member {i}</div>
                    <div className="text-sm text-muted-foreground">member{i}@example.com</div>
                  </div>
                </div>
                <Button variant="outline" size="sm">View</Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
