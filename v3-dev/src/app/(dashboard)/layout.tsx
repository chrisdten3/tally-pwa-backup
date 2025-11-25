"use client";

import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";
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
        <MobileNav />
        <main className="flex-1 pt-16 lg:pt-0 lg:ml-60">{children}</main>
        <FeedbackButton />
      </div>
    </ClubProvider>
  );
}
