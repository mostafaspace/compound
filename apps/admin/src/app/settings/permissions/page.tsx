import { getPermissions, getCurrentUser } from "@/lib/api";
import { requireAdminUser, requirePermission } from "@/lib/session";
import { SiteNav } from "@/components/site-nav";

import { PermissionsClient } from "./permissions-client";

export default async function PermissionsPage() {
  const user = await requireAdminUser(getCurrentUser);
  await requirePermission(user, "manage_roles");
  const permissions = await getPermissions();

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteNav
        breadcrumb={[
          { label: "Settings", href: "/settings" },
          { label: "Permissions" },
        ]}
      />
      <header className="border-b border-line bg-panel">
        <div className="mx-auto max-w-7xl px-5 py-6 lg:px-8">
          <h1 className="text-3xl font-semibold">Permissions</h1>
          <p className="mt-1 text-sm text-muted">
            Manage the available permission set. Core permissions cannot be deleted.
          </p>
        </div>
      </header>
      <section className="mx-auto max-w-7xl px-5 py-6 lg:px-8">
        <PermissionsClient initialPermissions={permissions} />
      </section>
    </main>
  );
}
