import type { ReactNode } from "react";

import type { AuthenticatedUser } from "@compound/contracts";

import { AdminCommandBar } from "./admin-command-bar";
import { AdminSidebar } from "./admin-sidebar";

export function AdminShell({ children, user }: { children: ReactNode; user: AuthenticatedUser }) {
  return (
    <div className="min-h-screen bg-background text-foreground lg:grid lg:grid-cols-[280px_1fr]">
      <AdminSidebar user={user} />
      <div className="min-w-0">
        <AdminCommandBar user={user} />
        {children}
      </div>
    </div>
  );
}
