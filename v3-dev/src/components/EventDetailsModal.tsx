"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Calendar, 
  DollarSign, 
  Users, 
  CheckCircle, 
  Clock, 
  User,
  Share2
} from "lucide-react";
import { EventShareLink } from "./EventShareLink";

type EventDetailsModalProps = {
  event: {
    id: string;
    title: string;
    description: string;
    amount: number;
    createdAt: string;
    expiresAt: string | null;
    author: {
      id?: string;
      name?: string;
      email?: string;
    };
    stats: {
      totalAssignees: number;
      paidCount: number;
      totalCollected: number;
      pendingCount: number;
    };
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function EventDetailsModal({ event, open, onOpenChange }: EventDetailsModalProps) {
  const paymentPercentage = event.stats.totalAssignees > 0
    ? Math.round((event.stats.paidCount / event.stats.totalAssignees) * 100)
    : 0;

  const isExpired = event.expiresAt ? new Date(event.expiresAt) < new Date() : false;
  const hasAssignees = event.stats.totalAssignees > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-2xl mb-2">{event.title}</DialogTitle>
              <DialogDescription className="text-base">
                {event.description || "No description provided"}
              </DialogDescription>
            </div>
            {isExpired && (
              <Badge variant="error">Expired</Badge>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Amount Card */}
          <div className="rounded-lg border bg-muted/50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Amount Due</p>
                <p className="text-3xl font-bold text-emerald-600">
                  ${(event.amount / 100).toFixed(2)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-emerald-600" />
            </div>
          </div>

          {/* Payment Stats */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Users className="h-4 w-4" />
              Payment Statistics
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border bg-card p-3">
                <p className="text-xs font-medium text-muted-foreground">Total Assigned</p>
                <p className="text-2xl font-semibold mt-1">
                  {hasAssignees ? event.stats.totalAssignees : "Open to all"}
                </p>
              </div>
              <div className="rounded-lg border bg-card p-3">
                <p className="text-xs font-medium text-muted-foreground">Paid</p>
                <p className="text-2xl font-semibold mt-1 text-emerald-600">
                  {event.stats.paidCount}
                </p>
              </div>
              <div className="rounded-lg border bg-card p-3">
                <p className="text-xs font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-semibold mt-1 text-amber-600">
                  {event.stats.pendingCount}
                </p>
              </div>
              <div className="rounded-lg border bg-card p-3">
                <p className="text-xs font-medium text-muted-foreground">Total Collected</p>
                <p className="text-2xl font-semibold mt-1 text-blue-600">
                  ${(event.stats.totalCollected / 100).toFixed(2)}
                </p>
              </div>
            </div>

            {hasAssignees && (
              <div className="rounded-lg border bg-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">Payment Completion</p>
                  <p className="text-sm font-semibold">{paymentPercentage}%</p>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 transition-all duration-300"
                    style={{ width: `${paymentPercentage}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Event Details */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Event Details
            </h3>
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Created:</span>
                <span className="font-medium">
                  {new Date(event.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>

              {event.expiresAt && (
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Expires:</span>
                  <span className={`font-medium ${isExpired ? 'text-red-600' : ''}`}>
                    {new Date(event.expiresAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              )}

              {event.author?.name && (
                <div className="flex items-center gap-3 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Created by:</span>
                  <span className="font-medium">{event.author.name}</span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Share Section */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Share2 className="h-4 w-4" />
              Share Event
            </h3>
            <div className="flex items-center gap-2">
              <EventShareLink eventId={event.id} eventTitle={event.title} />
              <p className="text-sm text-muted-foreground">
                {hasAssignees 
                  ? "Share with assigned members or let anyone pay via link"
                  : "Anyone with this link can pay and join the club"}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
            {event.stats.pendingCount > 0 && (
              <Button className="flex-1">
                Send Reminders ({event.stats.pendingCount})
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
