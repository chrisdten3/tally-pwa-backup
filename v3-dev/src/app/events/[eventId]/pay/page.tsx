"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CreditCard, Clock, Building2 } from "lucide-react";

type EventData = {
  id: string;
  title: string;
  description: string;
  amount: number;
  expiresAt: string | null;
  isExpired: boolean;
  club: {
    id: string;
    name: string;
  };
};

export default function PublicEventPaymentPage() {
  const params = useParams();
  const eventId = params.eventId as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [event, setEvent] = useState<EventData | null>(null);
  const [error, setError] = useState<string>("");

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
  });
  const [phoneChecked, setPhoneChecked] = useState(false);
  const [isCheckingPhone, setIsCheckingPhone] = useState(false);

  // Check phone number when it changes
  useEffect(() => {
    const checkPhone = async () => {
      const phone = formData.phone.trim();
      
      // Only check if phone is valid (at least 10 digits)
      if (phone.replace(/\D/g, "").length < 10) {
        setPhoneChecked(false);
        return;
      }

      setIsCheckingPhone(true);
      try {
        const response = await fetch(`/api/events/${eventId}/check-phone?phone=${encodeURIComponent(phone)}`);
        const data = await response.json();

        if (data.exists && data.user) {
          // Auto-populate fields with existing user data
          setFormData({
            firstName: data.user.firstName,
            lastName: data.user.lastName,
            phone: data.user.phone,
            email: data.user.email,
          });
          setPhoneChecked(true);
        } else {
          setPhoneChecked(false);
        }
      } catch (err) {
        console.error("Failed to check phone:", err);
      } finally {
        setIsCheckingPhone(false);
      }
    };

    const debounce = setTimeout(checkPhone, 500);
    return () => clearTimeout(debounce);
  }, [formData.phone, eventId]);

  useEffect(() => {
    if (!eventId) return;

    fetch(`/api/events/${eventId}/pay`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setEvent(data.event);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch event:", err);
        setError("Failed to load event details");
      })
      .finally(() => setLoading(false));
  }, [eventId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch(`/api/events/${eventId}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create payment session");
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No payment URL returned");
      }
    } catch (err) {
      console.error("Payment error:", err);
      const error = err as Error;
      setError(error.message || "Failed to initiate payment");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-soft-white to-cool-gray/20 dark:from-onyx dark:to-prussian-blue p-4">
        <Loader2 className="h-8 w-8 animate-spin text-bright-indigo" />
      </div>
    );
  }

  if (error && !event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-soft-white to-cool-gray/20 dark:from-onyx dark:to-prussian-blue p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-danger-red">Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!event) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-soft-white to-cool-gray/20 dark:from-onyx dark:to-prussian-blue p-4">
      <Card className="max-w-lg w-full shadow-xl">
        <CardHeader className="space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-2xl mb-2">{event.title}</CardTitle>
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Building2 className="h-4 w-4" />
                <span className="text-sm">{event.club.name}</span>
              </div>
              {event.expiresAt && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">
                    Expires: {new Date(event.expiresAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-cool-gray dark:text-soft-white">
                ${(event.amount / 100).toFixed(2)}
              </div>
            </div>
          </div>
          {event.description && (
            <CardDescription className="text-base">{event.description}</CardDescription>
          )}
        </CardHeader>

        <CardContent>
          {event.isExpired ? (
            <div className="bg-danger-red/10 dark:bg-danger-red/20 border border-danger-red/30 dark:border-danger-red/50 rounded-lg p-4 text-center">
              <p className="text-danger-red font-medium">
                This event has expired and is no longer accepting payments.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="phone" className="text-sm font-medium">
                  Phone Number *
                </label>
                <div className="relative">
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    required
                    disabled={phoneChecked}
                  />
                  {isCheckingPhone && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>
                {phoneChecked ? (
                  <p className="text-xs text-mint-leaf">
                    ✓ Information auto-filled from your club profile
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Subject to SMS messaging rates.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="firstName" className="text-sm font-medium">
                  First Name *
                </label>
                <Input
                  id="firstName"
                  placeholder="John"
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData({ ...formData, firstName: e.target.value })
                  }
                  required
                  disabled={phoneChecked}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="lastName" className="text-sm font-medium">
                  Last Name *
                </label>
                <Input
                  id="lastName"
                  placeholder="Doe"
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData({ ...formData, lastName: e.target.value })
                  }
                  required
                  disabled={phoneChecked}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email (optional)
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </div>

              {error && (
                <div className="bg-danger-red/10 dark:bg-danger-red/20 border border-danger-red/30 dark:border-danger-red/50 rounded-lg p-3">
                  <p className="text-sm text-danger-red">{error}</p>
                </div>
              )}

              <div className="bg-mint-leaf/10 dark:bg-mint-leaf/20 border border-mint-leaf/30 dark:border-mint-leaf/50 rounded-lg p-3">
                <p className="text-sm text-prussian-blue dark:text-mint-leaf">
                  <strong>Note:</strong> After payment, you&apos;ll be automatically added to{" "}
                  {event.club.name}
                </p>
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-lg"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-5 w-5" />
                    Pay ${(event.amount / 100).toFixed(2)}
                  </>
                )}
              </Button>
            </form>
          )}
        </CardContent>

        <CardFooter className="flex justify-center border-t pt-6">
          <p className="text-xs text-muted-foreground text-center">
            Secure payment powered by Stripe
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
