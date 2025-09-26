import React from "react";

export default function Button({ children, onClick, variant = "primary", type = "button" }: { children: React.ReactNode; onClick?: () => void; variant?: "primary" | "ghost"; type?: "button" | "submit"; }) {
  const base = "w-full rounded-lg py-2 font-medium";
  if (variant === "primary") {
    return (
      <button type={type} onClick={onClick} className={`${base} bg-indigo-600 text-white hover:bg-indigo-700`}>
        {children}
      </button>
    );
  }
  return (
    <button type={type} onClick={onClick} className={`${base} border border-black/[.06] dark:border-white/[.06] bg-transparent`}>
      {children}
    </button>
  );
}
