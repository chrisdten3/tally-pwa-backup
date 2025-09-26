import React from "react";

export default function AuthCard({ children, title, subtitle }: { children: React.ReactNode; title?: string; subtitle?: string; }) {
  return (
    <div className="w-full max-w-md bg-white dark:bg-[#0b0b0f] border border-black/[.06] dark:border-white/[.05] rounded-2xl p-6 shadow-lg">
      <div className="mb-4">
        {title && <h1 className="text-2xl font-semibold mb-1">{title}</h1>}
        {subtitle && <p className="text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</p>}
      </div>
      <div>{children}</div>
    </div>
  );
}
