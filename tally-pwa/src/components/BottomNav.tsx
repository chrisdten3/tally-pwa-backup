"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Users, CreditCard, CalendarDays, Settings } from "lucide-react";
import { getUserClubIds } from "../utils/memberships";

type NavItem = {
  href: string;
  label: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/profile", label: "Home", Icon: User },
  { href: "/clubs", label: "Clubs", Icon: Users },
  { href: "/payments", label: "Payments", Icon: CreditCard },
  { href: "/events", label: "Events", Icon: CalendarDays },
  { href: "/settings", label: "Settings", Icon: Settings },
];

export default function BottomNav() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const evaluate = () => {
      if (!isMounted) return;
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (!token) {
        setShow(false);
        return;
      }

      // Determine userId from local user or derive from token
      let userId: string | null = null;
      try {
        const rawUser = localStorage.getItem("user");
        if (rawUser) {
          const parsed = JSON.parse(rawUser);
          if (parsed && typeof parsed === "object" && parsed.id) {
            userId = String(parsed.id);
          }
        }
      } catch {
        // ignore
      }

      if (!userId && token.startsWith("mock-token-")) {
        const email = token.slice("mock-token-".length);
        userId = `user_${email.replace(/[^a-z0-9]/gi, "")}`;
      }

      if (!userId) {
        setShow(false);
        return;
      }

      try {
        const count = getUserClubIds(userId).length;
        setShow(count > 0);
      } catch {
        setShow(false);
      }
    };

    // Initial check
    evaluate();

    // React to storage updates (cross-tab) and focus returns
    window.addEventListener("storage", evaluate);
    window.addEventListener("focus", evaluate);

    // Lightweight interval to catch same-tab mutations without refresh
    const interval = window.setInterval(evaluate, 500);

    return () => {
      isMounted = false;
      window.removeEventListener("storage", evaluate);
      window.removeEventListener("focus", evaluate);
      window.clearInterval(interval);
    };
  }, [pathname]);

  if (!show) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-zinc-950/70 backdrop-blur-xl"
      role="navigation"
      aria-label="Primary"
    >
      <div className="mx-auto max-w-md">
        <ul className="grid grid-cols-5">
          {NAV_ITEMS.map(({ href, label, Icon }) => {
            const active = pathname === href || pathname?.startsWith(href + "/");
            return (
              <li key={href} className="">
                <Link
                  href={href}
                  className={`flex flex-col items-center justify-center py-3 text-xs transition-colors ${
                    active ? "text-indigo-300" : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <Icon size={20} className={active ? "drop-shadow-[0_0_8px_rgba(99,102,241,0.35)]" : ""} />
                  <span className="mt-1">{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="pb-safe" />
      </div>
    </nav>
  );
}


