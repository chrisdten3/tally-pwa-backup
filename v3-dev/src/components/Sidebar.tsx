"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  CreditCard,
  DollarSign,
  Settings,
  LogOut,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { useClub } from "@/contexts/ClubContext";

type SidebarLinkProps = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
  isActive?: boolean;
};

function SidebarLink({ icon: Icon, label, href, isActive }: SidebarLinkProps) {
  return (
    <Button
      asChild
      variant="ghost"
      size="sm"
      className={`w-full justify-start gap-2 px-2 text-sm font-normal transition-colors ${
        isActive
          ? "bg-muted text-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      <Link href={href}>
        <Icon className="h-4 w-4" />
        <span>{label}</span>
      </Link>
    </Button>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const { clubs, activeClubId, activeClub, setActiveClubId, isLoading } = useClub();

  return (
    <aside className="hidden w-60 border-r border-border bg-prussian-blue/40 px-4 py-4 pb-8 lg:flex lg:flex-col lg:fixed lg:h-screen lg:overflow-y-auto">
      <div className="flex items-center gap-2 px-2">
        <img 
          src="/tally-logo-transparent.png" 
          alt="Tally Logo" 
          className="h-30 w-30"
        />
      </div>

      {/* Club Switcher */}
      {!isLoading && clubs.length > 0 && (
        <div className="mb-6 px-2">
          <label className="text-xs font-medium text-muted-foreground mb-2 block">
            Active Club
          </label>
          <Select
            value={activeClubId || undefined}
            onValueChange={(val: string) => setActiveClubId(val)}
          >
            <SelectTrigger className="w-full bg-background/80">
              <SelectValue placeholder="Select a club" />
            </SelectTrigger>
            <SelectContent>
              {clubs.map((club) => (
                <SelectItem key={club.id} value={club.id}>
                  {club.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <nav className="flex flex-1 flex-col text-sm">
        <div className="space-y-1">
          <SidebarLink
            icon={LayoutDashboard}
            label="Overview"
            href="/home"
            isActive={pathname === "/home"}
          />
          <SidebarLink
            icon={CalendarDays}
            label="Events"
            href="/events"
            isActive={pathname === "/events"}
          />
          <SidebarLink
            icon={Users}
            label="Members"
            href="/members"
            isActive={pathname === "/members"}
          />
          <SidebarLink
            icon={CreditCard}
            label="Payments"
            href="/payments"
            isActive={pathname === "/payments"}
          />
          <SidebarLink
            icon={DollarSign}
            label="Payouts"
            href="/payouts"
            isActive={pathname === "/payouts"}
          />
        </div>

        {/* Push settings and sign-out to bottom */}
        <div className="mt-auto mb-2 space-y-1 border-t border-border/50 pt-4">
          <SidebarLink
            icon={Settings}
            label="Settings"
            href="/settings"
            isActive={pathname === "/settings"}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              localStorage.removeItem("token");
              window.location.href = "/login";
            }}
            className="w-full justify-start gap-2 px-2 text-sm font-normal text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign out</span>
          </Button>
        </div>
      </nav>
    </aside>
  );
}
