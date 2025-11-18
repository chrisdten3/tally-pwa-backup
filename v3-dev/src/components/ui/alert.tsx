import React from "react";
import { AlertCircle, CheckCircle, Info, XCircle } from "lucide-react";

export function Alert({ 
  children, 
  variant = "default",
  className = "" 
}: { 
  children: React.ReactNode; 
  variant?: "default" | "success" | "warning" | "error" | "info";
  className?: string; 
}) {
  const variants = {
    default: "bg-zinc-800/40 border-zinc-700/50 text-zinc-200",
    success: "bg-emerald-500/10 border-emerald-500/20 text-emerald-300",
    warning: "bg-amber-500/10 border-amber-500/20 text-amber-300",
    error: "bg-rose-500/10 border-rose-500/20 text-rose-300",
    info: "bg-blue-500/10 border-blue-500/20 text-blue-300",
  };

  const icons = {
    default: Info,
    success: CheckCircle,
    warning: AlertCircle,
    error: XCircle,
    info: Info,
  };

  const Icon = icons[variant];

  return (
    <div className={`rounded-xl border p-4 ${variants[variant]} ${className}`}>
      <div className="flex gap-3">
        <Icon size={20} className="shrink-0 mt-0.5" />
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}

export function AlertTitle({ 
  children, 
  className = "" 
}: { 
  children: React.ReactNode; 
  className?: string; 
}) {
  return (
    <h5 className={`font-semibold text-sm mb-1 ${className}`}>
      {children}
    </h5>
  );
}

export function AlertDescription({ 
  children, 
  className = "" 
}: { 
  children: React.ReactNode; 
  className?: string; 
}) {
  return (
    <div className={`text-sm opacity-90 ${className}`}>
      {children}
    </div>
  );
}
