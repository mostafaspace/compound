"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { AuthenticatedUser } from "@compound/contracts";

import { getAdminSections, shouldShowCompoundContext } from "@/lib/admin-navigation";

const groupLabels: Record<string, string> = {
  operate: "Operations",
  community: "Community",
  govern: "Governance",
  secure: "Security",
  system: "System",
};

export function AdminSidebar({ user }: { user: AuthenticatedUser }) {
  const pathname = usePathname();
  const sections = getAdminSections({ roles: user.roles ?? [] });
  const showCompound = shouldShowCompoundContext({ roles: user.roles ?? [] });

  const grouped = sections.reduce<Record<string, typeof sections>>((acc, s) => {
    acc[s.group] = acc[s.group] ?? [];
    acc[s.group].push(s);
    return acc;
  }, {});

  return (
    <aside className="hidden border-r border-line bg-panel lg:flex lg:flex-col">
      {/* Brand */}
      <div className="flex h-14 shrink-0 items-center border-b border-line px-5">
        <Link
          href="/"
          className="text-sm font-bold text-brand transition-colors hover:text-brand-strong"
        >
          Compound
        </Link>
        {showCompound && (
          <span className="ml-2 rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand">
            Super
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {Object.entries(grouped).map(([group, items]) => (
          <div key={group}>
            <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-widest text-muted">
              {groupLabels[group] ?? group}
            </p>
            <ul className="space-y-0.5">
              {items.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                        isActive
                          ? "bg-brand/10 text-brand"
                          : "text-muted hover:bg-background hover:text-foreground"
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="shrink-0 border-t border-line px-5 py-3">
        <p className="truncate text-xs text-muted">{user.name}</p>
        <p className="truncate text-[11px] text-muted/70">{user.email}</p>
      </div>
    </aside>
  );
}
