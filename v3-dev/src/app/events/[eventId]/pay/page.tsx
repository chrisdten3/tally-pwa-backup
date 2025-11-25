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
  const [smsConsent, setSmsConsent] = useState(false);
  const [isExistingUser, setIsExistingUser] = useState(false);

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
          setIsExistingUser(true);
        } else {
          setPhoneChecked(false);
          setIsExistingUser(false);
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
        body: JSON.stringify({
          ...formData,
          smsConsent,
        }),
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-soft-white to-cool-gray/20 dark:from-onyx dark:to-prussian-blue p-3">
      <Card className="max-w-lg w-full shadow-xl">
        <CardHeader className="space-y-2 pb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-xl mb-1.5">{event.title}</CardTitle>
              <div className="flex items-center gap-2 text-muted-foreground mb-0.5">
                <Building2 className="h-3.5 w-3.5" />
                <span className="text-xs">{event.club.name}</span>
              </div>
              {event.expiresAt && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span className="text-xs">
                    Expires: {new Date(event.expiresAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-cool-gray dark:text-soft-white">
                ${(event.amount / 100).toFixed(2)}
              </div>
            </div>
          </div>
          {event.description && (
            <CardDescription className="text-sm">{event.description}</CardDescription>
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
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1.5">
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
                {phoneChecked && (
                  <p className="text-xs text-mint-leaf">
                    ✓ Information auto-filled from your club profile
                  </p>
                )}
              </div>

              {!isExistingUser && (
                <div className="bg-muted/50 p-3 rounded-lg border">
                  <div className="flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      id="smsConsent"
                      checked={smsConsent}
                      onChange={(e) => setSmsConsent(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-bright-indigo focus:ring-bright-indigo cursor-pointer"
                      required
                    />
                    <label htmlFor="smsConsent" className="text-xs cursor-pointer flex-1">
                      <span className="font-medium">SMS Consent Required</span>
                      <p className="mt-0.5 text-xs text-muted-foreground leading-snug">
                        By providing your phone number, you consent to receive text messages from Tally with updates on payments, membership, or club activity. Message and data rates apply. Frequency varies. Reply HELP for help or STOP to opt out. See our privacy policy.
                      </p>
                    </label>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
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

              <div className="space-y-1.5">
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

              <div className="space-y-1.5">
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
                <div className="bg-danger-red/10 dark:bg-danger-red/20 border border-danger-red/30 dark:border-danger-red/50 rounded-lg p-2.5">
                  <p className="text-xs text-danger-red">{error}</p>
                </div>
              )}

              <div className="bg-mint-leaf/10 dark:bg-mint-leaf/20 border border-mint-leaf/30 dark:border-mint-leaf/50 rounded-lg p-2.5">
                <p className="text-xs text-prussian-blue dark:text-mint-leaf">
                  <strong>Note:</strong> After payment, you&apos;ll be automatically added to{" "}
                  {event.club.name}
                </p>
              </div>

              <Button
                type="submit"
                className="w-full h-11 text-base"
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

        <CardFooter className="flex justify-center border-t pt-4">
          <p className="text-xs text-muted-foreground text-center">
            Secure payment powered by Stripe
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
