import React from "react";

export default function AuthCard({ children, title, subtitle }: { children: React.ReactNode; title?: string; subtitle?: string; }) {
  return (
    <div className="w-full max-w-md bg-prussian-blue border border-border rounded-2xl p-6 shadow-lg">
      <div className="mb-4">
        {title && <h1 className="text-2xl font-semibold text-soft-white mb-1">{title}</h1>}
        {subtitle && <p className="text-sm text-cool-gray">{subtitle}</p>}
      </div>
      <div>{children}</div>
    </div>
  );
}
