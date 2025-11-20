"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, Bell, CreditCard, Shield, CheckCircle, AlertCircle, Trash2 } from "lucide-react";
import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // User profile state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  
  // Stripe state
  const [stripeStatus, setStripeStatus] = useState<"connected" | "not_connected" | "loading">("loading");
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  
  // Status messages
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error" | null; message: string }>({ 
    type: null, 
    message: "" 
  });

  const checkStripeStatus = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setStripeStatus("not_connected");
        return;
      }

      const res = await fetch("/api/auth/user", {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        const user = data.user;
        
        // Update form fields with user data
        setName(user?.name || "");
        setEmail(user?.email || "");
        setPhone(user?.phone || "");
        
        setStripeStatus(user?.stripe_account_id ? "connected" : "not_connected");
      } else {
        setStripeStatus("not_connected");
      }
    } catch (error) {
      console.error("Failed to check status:", error);
      setStripeStatus("not_connected");
    }
  }, []);

  useEffect(() => {
    // Check URL params for Stripe status
    const stripeParam = searchParams.get("stripe");
    if (stripeParam === "success") {
      setStatusMessage({ type: "success", message: "Stripe account successfully connected!" });
      // Clean up URL
      router.replace("/settings");
    } else if (stripeParam === "error") {
      setStatusMessage({ type: "error", message: "There was an error connecting your Stripe account." });
      router.replace("/settings");
    } else if (stripeParam === "refresh") {
      setStatusMessage({ type: "error", message: "Please complete the onboarding process." });
      router.replace("/settings");
    }

    // Check current Stripe status and load user data
    checkStripeStatus();
  }, [searchParams, router, checkStripeStatus]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    setStatusMessage({ type: null, message: "" });

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setStatusMessage({ type: "error", message: "Please log in to update your profile." });
        setIsUpdatingProfile(false);
        return;
      }

      const res = await fetch("/api/auth/update-profile", {
        method: "PATCH",
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ name, email, phone })
      });

      const data = await res.json();

      if (res.ok) {
        setStatusMessage({ 
          type: "success", 
          message: "Profile updated successfully!" 
        });
        // Update local storage if needed
        const userData = localStorage.getItem("user");
        if (userData) {
          const user = JSON.parse(userData);
          localStorage.setItem("user", JSON.stringify({ ...user, name, email, phone }));
        }
      } else {
        setStatusMessage({ 
          type: "error", 
          message: data.error || "Failed to update profile" 
        });
      }
    } catch (error) {
      console.error("Profile update error:", error);
      setStatusMessage({ 
        type: "error", 
        message: "An error occurred. Please try again." 
      });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleStripeOnboarding = async () => {
    setIsOnboarding(true);
    setStatusMessage({ type: null, message: "" });

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setStatusMessage({ type: "error", message: "Please log in to connect Stripe." });
        setIsOnboarding(false);
        return;
      }

      const res = await fetch("/api/stripe/connect/onboard", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();

      if (res.ok && data.url) {
        // Redirect to Stripe onboarding
        window.location.href = data.url;
      } else {
        setStatusMessage({ 
          type: "error", 
          message: data.error || "Failed to start Stripe onboarding" 
        });
        setIsOnboarding(false);
      }
    } catch (error) {
      console.error("Stripe onboarding error:", error);
      setStatusMessage({ 
        type: "error", 
        message: "An error occurred. Please try again." 
      });
      setIsOnboarding(false);
    }
  };

  const handleDisconnectStripe = async () => {
    if (!confirm("Are you sure you want to disconnect your Stripe account? This will prevent you from receiving payouts.")) {
      return;
    }

    setIsDisconnecting(true);
    setStatusMessage({ type: null, message: "" });

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setStatusMessage({ type: "error", message: "Please log in." });
        setIsDisconnecting(false);
        return;
      }

      const res = await fetch("/api/stripe/connect/disconnect", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();

      if (res.ok) {
        setStatusMessage({ 
          type: "success", 
          message: "Stripe account disconnected successfully" 
        });
        setStripeStatus("not_connected");
      } else {
        setStatusMessage({ 
          type: "error", 
          message: data.error || "Failed to disconnect Stripe account" 
        });
      }
    } catch (error) {
      console.error("Disconnect error:", error);
      setStatusMessage({ 
        type: "error", 
        message: "An error occurred. Please try again." 
      });
    } finally {
      setIsDisconnecting(false);
    }
  };
  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Settings
        </p>
        <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">
          Account Settings
        </h1>
      </div>

      {statusMessage.type && (
        <div className={`mb-6 rounded-lg border p-4 ${
          statusMessage.type === "success" 
            ? "border-green-500/50 bg-green-500/10 text-green-400" 
            : "border-red-500/50 bg-red-500/10 text-red-400"
        }`}>
          <div className="flex items-center gap-2">
            {statusMessage.type === "success" ? (
              <CheckCircle className="h-5 w-5" />
            ) : (
              <AlertCircle className="h-5 w-5" />
            )}
            <p>{statusMessage.message}</p>
          </div>
        </div>
      )}

      <div className="space-y-6 max-w-4xl">
        <Card className="border-border/70 bg-card/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
            <CardDescription>Update your account profile information</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Full Name</label>
                <Input 
                  className="mt-1" 
                  placeholder="John Doe" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input 
                  className="mt-1" 
                  type="email" 
                  placeholder="john@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Phone Number</label>
                <Input 
                  className="mt-1" 
                  type="tel" 
                  placeholder="+1 (555) 000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={isUpdatingProfile}>
                {isUpdatingProfile ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </CardContent>
        </Card>


        <Card className="border-border/70 bg-card/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Methods
            </CardTitle>
            <CardDescription>Manage your connected payment accounts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {stripeStatus === "loading" ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-muted-foreground">Loading...</div>
              </div>
            ) : stripeStatus === "connected" ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-md bg-green-500/20 flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-green-400" />
                    </div>
                    <div>
                      <div className="font-medium text-green-400">Stripe Account</div>
                      <div className="text-sm text-green-300/70">Connected and ready</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleStripeOnboarding}
                      disabled={isOnboarding}
                    >
                      Update
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleDisconnectStripe}
                      disabled={isDisconnecting}
                      className="text-red-400 hover:text-red-300 border-red-500/30 hover:border-red-500/50"
                    >
                      {isDisconnecting ? (
                        "Disconnecting..."
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4 mr-1" />
                          Disconnect
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Disconnecting will prevent you from receiving payouts until you reconnect
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-md bg-amber-500/20 flex items-center justify-center">
                      <AlertCircle className="h-5 w-5 text-amber-400" />
                    </div>
                    <div>
                      <div className="font-medium text-amber-400">Stripe Account</div>
                      <div className="text-sm text-amber-300/70">Not connected</div>
                    </div>
                  </div>
                </div>
                <Button 
                  onClick={handleStripeOnboarding}
                  disabled={isOnboarding}
                  className="w-full"
                >
                  {isOnboarding ? "Redirecting to Stripe..." : "Connect Stripe Account"}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Connect your Stripe account to receive payouts and accept payments
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security
            </CardTitle>
            <CardDescription>Manage your password and security settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Current Password</label>
              <Input className="mt-1" type="password" placeholder="••••••••" />
            </div>
            <div>
              <label className="text-sm font-medium">New Password</label>
              <Input className="mt-1" type="password" placeholder="••••••••" />
            </div>
            <div>
              <label className="text-sm font-medium">Confirm New Password</label>
              <Input className="mt-1" type="password" placeholder="••••••••" />
            </div>
            <Button>Update Password</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="px-4 py-6">Loading settings...</div>}>
      <SettingsContent />
    </Suspense>
  );
}
