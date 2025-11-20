"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, Bell } from "lucide-react";
import { useClub } from "@/contexts/ClubContext";
import { CreateEventModal } from "@/components/CreateEventModal";
import { EventShareLink } from "@/components/EventShareLink";
import { EventDetailsModal } from "@/components/EventDetailsModal";
import { SendRemindersModal } from "@/components/SendRemindersModal";

type Event = {
  id: string;
  title: string;
  description: string;
  amount: number;
  createdAt: string;
  expiresAt: string | null;
  isActive: boolean;
  author: {
    name: string;
    email: string;
  };
  stats: {
    totalAssignees: number;
    paidCount: number;
    totalCollected: number;
    pendingCount: number;
  };
};

export default function EventsPage() {
  const { activeClub } = useClub();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [reminderEvent, setReminderEvent] = useState<Event | null>(null);

  useEffect(() => {
    if (!activeClub?.id) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    setLoading(true);
    fetch(`/api/clubs/${activeClub.id}/events`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        console.log("Events API response:", data);
        if (data.events) {
          setEvents(data.events);
        } else if (data.error) {
          console.error("Events API error:", data.error);
        }
      })
      .catch((err) => console.error("Failed to fetch events:", err))
      .finally(() => setLoading(false));
  }, [activeClub?.id]);

  if (!activeClub) {
    return (
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <p className="text-muted-foreground">Please select a club to view events.</p>
      </div>
    );
  }

  const now = new Date();
  const upcomingEvents = events.filter((e) => 
    !e.expiresAt || new Date(e.expiresAt) > now
  );
  const pastEvents = events.filter((e) => 
    e.expiresAt && new Date(e.expiresAt) <= now
  );
  const totalAttendance = events.length > 0
    ? events.reduce((sum, e) => sum + (e.stats.totalAssignees > 0 ? (e.stats.paidCount / e.stats.totalAssignees) : 0), 0) / events.length * 100
    : 0;

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Events • {activeClub.name}
        </p>
        <div className="mt-1 flex items-center justify-between">
          <h1 className="text-2xl font-semibold sm:text-3xl">
            Manage Events
          </h1>
          <CreateEventModal onEventCreated={() => {
            // Refetch events after creating a new one
            if (!activeClub?.id) return;
            const token = localStorage.getItem("token");
            if (!token) return;
            fetch(`/api/clubs/${activeClub.id}/events`, {
              headers: { Authorization: `Bearer ${token}` },
            })
              .then((r) => r.json())
              .then((data) => {
                if (data.events) setEvents(data.events);
              })
              .catch((err) => console.error("Failed to fetch events:", err));
          }} />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="border-border/70 bg-card/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Upcoming Events
            </CardTitle>
            <CardDescription>Active and future events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{upcomingEvents.length}</div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Past Events
            </CardTitle>
            <CardDescription>Events that have occurred</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{pastEvents.length}</div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Avg Payment Rate
            </CardTitle>
            <CardDescription>Average payment completion</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{totalAttendance.toFixed(0)}%</div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 border-border/70 bg-card/60">
        <CardHeader>
          <CardTitle>Recent Events</CardTitle>
          <CardDescription>Latest events in {activeClub.name}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading events...</p>
          ) : events.length === 0 ? (
            <p className="text-muted-foreground">No events yet. Create your first event!</p>
          ) : (
            <div className="space-y-4">
              {events.slice(0, 10).map((event) => (
                <div key={event.id} className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/40 px-4 py-3">
                  <div>
                    <div className="font-medium">{event.title}</div>
                    <div className="text-sm text-muted-foreground">
                      ${(event.amount / 100).toFixed(2)}
                      {event.stats.totalAssignees > 0 && ` • ${event.stats.paidCount}/${event.stats.totalAssignees} paid`}
                      {event.stats.totalAssignees === 0 && " • Open to all (via link)"}
                      {event.expiresAt && ` • Expires ${new Date(event.expiresAt).toLocaleDateString()}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <EventShareLink eventId={event.id} eventTitle={event.title} />
                    {event.stats.pendingCount > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setReminderEvent(event);
                        }}
                      >
                        <Bell className="mr-1 h-3.5 w-3.5" />
                        Remind ({event.stats.pendingCount})
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedEvent(event)}
                    >
                      View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Event Details Modal */}
      {selectedEvent && (
        <EventDetailsModal
          event={selectedEvent}
          open={!!selectedEvent}
          onOpenChange={(open) => !open && setSelectedEvent(null)}
        />
      )}

      {/* Send Reminders Modal */}
      {reminderEvent && (
        <SendRemindersModal
          eventId={reminderEvent.id}
          eventTitle={reminderEvent.title}
          pendingCount={reminderEvent.stats.pendingCount}
          open={!!reminderEvent}
          onOpenChange={(open) => !open && setReminderEvent(null)}
        />
      )}
    </div>
  );
}
