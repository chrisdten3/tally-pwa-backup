"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Settings, User, Bell, CreditCard, Shield } from "lucide-react";

export default function SettingsPage() {
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

      <div className="space-y-6 max-w-4xl">
        <Card className="border-border/70 bg-card/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
            <CardDescription>Update your account profile information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Full Name</label>
              <Input className="mt-1" placeholder="John Doe" />
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input className="mt-1" type="email" placeholder="john@example.com" />
            </div>
            <div>
              <label className="text-sm font-medium">Phone Number</label>
              <Input className="mt-1" type="tel" placeholder="+1 (555) 000-0000" />
            </div>
            <Button>Save Changes</Button>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>Manage your notification preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Email Notifications</div>
                <div className="text-sm text-muted-foreground">Receive email updates about payments</div>
              </div>
              <Button variant="outline" size="sm">Enable</Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Payment Reminders</div>
                <div className="text-sm text-muted-foreground">Get reminded about upcoming payments</div>
              </div>
              <Button variant="outline" size="sm">Enable</Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Event Notifications</div>
                <div className="text-sm text-muted-foreground">Stay updated on new events</div>
              </div>
              <Button variant="outline" size="sm">Disable</Button>
            </div>
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
            <div className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/40 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-md bg-indigo-500/20 flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-indigo-400" />
                </div>
                <div>
                  <div className="font-medium">Stripe Account</div>
                  <div className="text-sm text-muted-foreground">Connected</div>
                </div>
              </div>
              <Button variant="outline" size="sm">Manage</Button>
            </div>
            <Button variant="outline" className="w-full">
              + Add Payment Method
            </Button>
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
