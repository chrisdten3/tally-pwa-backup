import React from "react";

export const metadata = {
  title: "Auth - Tally PWA",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[linear-gradient(180deg,#f7fbff,white)] dark:bg-[linear-gradient(180deg,#05060a,#0b0b0f)]">
      {children}
    </div>
  );
}
