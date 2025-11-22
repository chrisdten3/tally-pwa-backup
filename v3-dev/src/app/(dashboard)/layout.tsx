"use client";

import Sidebar from "@/components/Sidebar";
import { ClubProvider } from "@/contexts/ClubContext";
import FeedbackButton from "@/components/FeedbackButton";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClubProvider>
      <div className="flex min-h-screen bg-background text-foreground">
        <Sidebar />
        <main className="flex-1 lg:ml-60">{children}</main>
        <FeedbackButton />
      </div>
    </ClubProvider>
  );
}
