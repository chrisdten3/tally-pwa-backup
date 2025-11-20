"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  Bell, 
  CheckCircle, 
  AlertCircle, 
  Phone,
  Mail,
  User,
  Loader2
} from "lucide-react";

type SendRemindersModalProps = {
  eventId: string;
  eventTitle: string;
  pendingCount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type ReminderResult = {
  name: string;
  email: string;
  phone: string | null;
  hasPhone: boolean;
  sent: boolean;
  error?: string;
};

export function SendRemindersModal({
  eventId,
  eventTitle,
  pendingCount,
  open,
  onOpenChange,
}: SendRemindersModalProps) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [results, setResults] = useState<{
    sent: number;
    failed: number;
    details: ReminderResult[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSendReminders = async () => {
    setSending(true);
    setError(null);
    setResults(null);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Not authenticated");
        return;
      }

      const response = await fetch(`/api/events/${eventId}/reminders`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send reminders");
      }

      setResults({
        sent: data.sent,
        failed: data.failed,
        details: data.details || [],
      });
      setSent(true);
    } catch (err) {
      console.error("Error sending reminders:", err);
      setError(err instanceof Error ? err.message : "Failed to send reminders");
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setSent(false);
    setResults(null);
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Send Payment Reminders
          </DialogTitle>
          <DialogDescription>
            Send text message reminders to members who haven&apos;t paid for &quot;{eventTitle}&quot;
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!sent && !results && (
            <>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  You are about to send SMS reminders to <strong>{pendingCount}</strong> member
                  {pendingCount !== 1 ? "s" : ""} with unpaid assignments.
                  <br />
                  <br />
                  Only members with phone numbers on file will receive reminders.
                </AlertDescription>
              </Alert>

              <div className="rounded-lg border bg-muted/30 p-4">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  What members will receive:
                </h4>
                <p className="text-sm text-muted-foreground">
                  A text message with the event details, payment amount, and a direct link to pay.
                </p>
              </div>
            </>
          )}

          {error && (
            <Alert variant="error">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {results && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border bg-card p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="h-4 w-4 text-mint-leaf" />
                    <p className="text-sm font-medium text-muted-foreground">Sent</p>
                  </div>
                  <p className="text-2xl font-bold text-mint-leaf">{results.sent}</p>
                </div>
                <div className="rounded-lg border bg-card p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className="h-4 w-4 text-danger-red" />
                    <p className="text-sm font-medium text-muted-foreground">Failed</p>
                  </div>
                  <p className="text-2xl font-bold text-danger-red">{results.failed}</p>
                </div>
              </div>

              {/* Detailed Results */}
              <div className="rounded-lg border">
                <div className="p-3 border-b bg-muted/50">
                  <h4 className="font-medium text-sm">Detailed Results</h4>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {results.details.map((detail, idx) => (
                    <div
                      key={idx}
                      className="p-3 border-b last:border-b-0 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <p className="font-medium text-sm truncate">{detail.name}</p>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                            <Mail className="h-3 w-3 shrink-0" />
                            <p className="truncate">{detail.email}</p>
                          </div>
                          {detail.phone && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3 shrink-0" />
                              <p>{detail.phone}</p>
                            </div>
                          )}
                        </div>
                        <div className="shrink-0">
                          {detail.sent ? (
                            <Badge className="bg-mint-leaf/20 text-mint-leaf hover:bg-mint-leaf/30">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Sent
                            </Badge>
                          ) : (
                            <Badge variant="error">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              {detail.error || "Failed"}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {results.sent > 0 && (
                <Alert className="border-mint-leaf/50 bg-mint-leaf/10">
                  <CheckCircle className="h-4 w-4 text-mint-leaf" />
                  <AlertDescription>
                    Successfully sent {results.sent} reminder{results.sent !== 1 ? "s" : ""}!
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {!sent && !results && (
            <>
              <Button variant="outline" onClick={handleClose} disabled={sending}>
                Cancel
              </Button>
              <Button onClick={handleSendReminders} disabled={sending}>
                {sending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Bell className="mr-2 h-4 w-4" />
                    Send Reminders ({pendingCount})
                  </>
                )}
              </Button>
            </>
          )}
          {results && (
            <Button onClick={handleClose} className="w-full sm:w-auto">
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
