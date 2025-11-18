import React from "react";

export default function Button({ children, onClick, variant = "primary", type = "button" }: { children: React.ReactNode; onClick?: () => void; variant?: "primary" | "ghost"; type?: "button" | "submit"; }) {
  const base = "w-full rounded-lg py-2 font-medium transition-colors";
  if (variant === "primary") {
    return (
      <button type={type} onClick={onClick} className={`${base} bg-bright-indigo text-white hover:bg-bright-indigo/90`}>
        {children}
      </button>
    );
  }
  return (
    <button type={type} onClick={onClick} className={`${base} border border-border bg-transparent hover:bg-prussian-blue`}>
      {children}
    </button>
  );
}
