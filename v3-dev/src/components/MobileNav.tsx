"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  LayoutDashboard,
  CalendarDays,
  Users,
  CreditCard,
  DollarSign,
  Settings,
  LogOut,
  Activity,
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

type MobileNavLinkProps = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
  isActive?: boolean;
  onClick?: () => void;
};

function MobileNavLink({
  icon: Icon,
  label,
  href,
  isActive,
  onClick,
}: MobileNavLinkProps) {
  return (
    <Button
      asChild
      variant="ghost"
      size="sm"
      className={`w-full justify-start gap-3 px-4 py-6 text-base font-normal transition-colors ${
        isActive
          ? "bg-muted text-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
      onClick={onClick}
    >
      <Link href={href}>
        <Icon className="h-5 w-5" />
        <span>{label}</span>
      </Link>
    </Button>
  );
}

export default function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { clubs, activeClubId, setActiveClubId, isLoading } = useClub();

  const closeMenu = () => setIsOpen(false);

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between border-b border-border bg-prussian-blue/95 backdrop-blur-sm px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2">
          <img
            src="/tally-logo-transparent.png"
            alt="Tally Logo"
            className="h-14 w-14"
          />
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(!isOpen)}
          className="text-foreground"
        >
          {isOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </Button>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={closeMenu}
        />
      )}

      {/* Slide-out Menu */}
      <aside
        className={`fixed top-0 right-0 z-50 h-full w-72 transform border-l border-border bg-prussian-blue/95 backdrop-blur-sm transition-transform duration-300 ease-in-out lg:hidden ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col px-4 py-4 overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-border/50">
            <div className="flex items-center gap-2">
              <img
                src="/tally-logo-transparent.png"
                alt="Tally Logo"
                className="h-16 w-16"
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={closeMenu}
              className="text-foreground"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>

          {/* Club Switcher */}
          {!isLoading && clubs.length > 0 && (
            <div className="mb-6 px-2">
              <label className="text-xs font-medium text-muted-foreground mb-2 block">
                Active Club
              </label>
              <Select
                value={activeClubId || undefined}
                onValueChange={(val: string) => {
                  setActiveClubId(val);
                  closeMenu();
                }}
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

          {/* Navigation Links */}
          <nav className="flex flex-1 flex-col">
            <div className="space-y-1">
              <MobileNavLink
                icon={LayoutDashboard}
                label="Overview"
                href="/home"
                isActive={pathname === "/home"}
                onClick={closeMenu}
              />
              <MobileNavLink
                icon={Activity}
                label="Activity"
                href="/activity"
                isActive={pathname === "/activity"}
                onClick={closeMenu}
              />
              <MobileNavLink
                icon={CalendarDays}
                label="Events"
                href="/events"
                isActive={pathname === "/events"}
                onClick={closeMenu}
              />
              <MobileNavLink
                icon={Users}
                label="Members"
                href="/members"
                isActive={pathname === "/members"}
                onClick={closeMenu}
              />
              <MobileNavLink
                icon={CreditCard}
                label="Payments"
                href="/payments"
                isActive={pathname === "/payments"}
                onClick={closeMenu}
              />
              <MobileNavLink
                icon={DollarSign}
                label="Payouts"
                href="/payouts"
                isActive={pathname === "/payouts"}
                onClick={closeMenu}
              />
            </div>

            {/* Settings and Sign out at bottom */}
            <div className="mt-auto mb-2 space-y-1 border-t border-border/50 pt-4">
              <MobileNavLink
                icon={Settings}
                label="Settings"
                href="/settings"
                isActive={pathname === "/settings"}
                onClick={closeMenu}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  localStorage.removeItem("token");
                  window.location.href = "/login";
                }}
                className="w-full justify-start gap-3 px-4 py-6 text-base font-normal text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <LogOut className="h-5 w-5" />
                <span>Sign out</span>
              </Button>
            </div>
          </nav>
        </div>
      </aside>
    </>
  );
}
