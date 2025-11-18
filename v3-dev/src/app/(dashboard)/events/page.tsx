"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, Plus } from "lucide-react";

export default function EventsPage() {
  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Events
        </p>
        <div className="mt-1 flex items-center justify-between">
          <h1 className="text-2xl font-semibold sm:text-3xl">
            Manage Events
          </h1>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Event
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="border-border/70 bg-card/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Upcoming Events
            </CardTitle>
            <CardDescription>Events scheduled in the next 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">12</div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Past Events
            </CardTitle>
            <CardDescription>Events that have already occurred</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">45</div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Total Attendance
            </CardTitle>
            <CardDescription>Average attendance across all events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">87%</div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 border-border/70 bg-card/60">
        <CardHeader>
          <CardTitle>Recent Events</CardTitle>
          <CardDescription>Latest events across all your clubs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/40 px-4 py-3">
                <div>
                  <div className="font-medium">Event {i}</div>
                  <div className="text-sm text-muted-foreground">Club Name • Date</div>
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
