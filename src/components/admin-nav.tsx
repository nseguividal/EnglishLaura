"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  ClipboardCheck,
  Layers,
  Library,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ADMIN_TABS = [
  { href: "/admin", label: "Overview & Analytics", icon: BarChart3, exact: true },
  { href: "/admin/steps", label: "Steps & Path", icon: Layers },
  { href: "/admin/assignments", label: "Assignment Bank", icon: Library },
  { href: "/admin/reviews", label: "Submissions & Grading", icon: ClipboardCheck },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <div className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4 sm:px-6 lg:px-8">
        {ADMIN_TABS.map((tab) => {
          const Icon = tab.icon;
          const active = tab.exact
            ? pathname === tab.href
            : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors",
                active
                  ? "border-[#0f766e] text-[#0f2544]"
                  : "border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900"
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
