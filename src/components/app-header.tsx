"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  BookOpenCheck,
  Bug,
  ChevronDown,
  Flag,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  User,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types/database";
import { LevelSwitcher } from "@/components/level-switcher";
import { ReportIssueModal } from "@/components/report-issue-modal";
import { cn } from "@/lib/utils";

interface AppHeaderProps {
  profile: Profile;
}

export function AppHeader({ profile }: AppHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [bugModalOpen, setBugModalOpen] = useState(false);

  async function handleSignOut() {
    setMenuOpen(false);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const navItems = [
    { href: "/dashboard", label: "Study Path", icon: LayoutDashboard },
  ];

  if (profile.role === "admin") {
    navItems.push({ href: "/admin", label: "Admin Panel", icon: ShieldCheck });
  }

  const isProfileActive =
    pathname === "/profile" || pathname === "/analytics";

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link
            href={
              profile.role === "admin" && pathname.startsWith("/admin")
                ? "/admin"
                : "/dashboard"
            }
            className="flex items-center gap-2.5 font-bold text-[#0f2544]"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0f2544] text-white">
              <BookOpenCheck className="h-5 w-5" />
            </span>
            <span className="hidden text-base tracking-tight sm:inline">
              Cambridge<span className="text-[#0f766e]">Prep</span>
            </span>
          </Link>

          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/admin"
                  ? pathname.startsWith("/admin")
                  : pathname === item.href ||
                    (item.href === "/dashboard" &&
                      (pathname.startsWith("/steps") ||
                        pathname.startsWith("/assignments")));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-slate-100 text-[#0f2544]"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden md:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {profile.selected_level && !pathname.startsWith("/admin") && (
            <LevelSwitcher
              currentLevel={profile.selected_level}
              userId={profile.id}
            />
          )}

          {/* Avatar + Name Hover Dropdown Menu */}
          <div
            className="relative"
            onMouseEnter={() => setMenuOpen(true)}
            onMouseLeave={() => setMenuOpen(false)}
          >
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-full border py-1 pr-2.5 pl-1 transition-colors",
                isProfileActive || menuOpen
                  ? "border-[#0f766e] bg-teal-50/50 text-[#0f2544]"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              )}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-slate-600">
                <User className="h-4 w-4" />
              </span>
              <span className="hidden max-w-[140px] truncate text-xs font-semibold text-slate-900 sm:inline">
                {profile.full_name?.trim() || "Profile"}
              </span>
              <ChevronDown
                className={cn(
                  "hidden h-3.5 w-3.5 text-slate-400 transition-transform sm:inline",
                  menuOpen && "rotate-180"
                )}
              />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full z-50 w-48 pt-1.5">
                <div
                  role="menu"
                  className="overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg"
                >
                  <Link
                    href="/profile"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      pathname === "/profile"
                        ? "bg-slate-100 text-[#0f2544]"
                        : "text-slate-700 hover:bg-slate-50 hover:text-[#0f2544]"
                    )}
                  >
                    <User className="h-4 w-4 text-slate-500" />
                    Profile
                  </Link>
                  <Link
                    href="/analytics"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      pathname === "/analytics"
                        ? "bg-slate-100 text-[#0f2544]"
                        : "text-slate-700 hover:bg-slate-50 hover:text-[#0f2544]"
                    )}
                  >
                    <BarChart3 className="h-4 w-4 text-slate-500" />
                    Analytics
                  </Link>
                  {profile.role === "admin" && (
                    <Link
                      href="/admin/reports"
                      role="menuitem"
                      onClick={() => setMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        pathname === "/admin/reports"
                          ? "bg-slate-100 text-[#0f2544]"
                          : "text-slate-700 hover:bg-slate-50 hover:text-[#0f2544]"
                      )}
                    >
                      <Flag className="h-4 w-4 text-slate-500" />
                      Reports Inbox
                    </Link>
                  )}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      setBugModalOpen(true);
                    }}
                    className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-[#0f2544]"
                  >
                    <Bug className="h-4 w-4 text-slate-500" />
                    Report a Bug
                  </button>
                  <div className="my-1 border-t border-slate-100" />
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleSignOut}
                    className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <ReportIssueModal
        open={bugModalOpen}
        onOpenChange={setBugModalOpen}
        mode="WEBSITE_BUG"
        userId={profile.id}
      />
    </header>
  );
}
