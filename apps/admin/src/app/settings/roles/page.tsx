import { getRoles, getPermissions, getCurrentUser } from "@/lib/api";
import { SiteNav } from "@/components/site-nav";
import { requireAdminUser, requirePermission } from "@/lib/session";
import { RolesClient } from "./roles-client";

export default async function RolesPage() {
  const user = await requireAdminUser(getCurrentUser);
  await requirePermission(user, "manage_roles");
  const [roles, permissions] = await Promise.all([getRoles(), getPermissions()]);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteNav breadcrumb={[
        { label: "Settings", href: "/settings" },
        { label: "Roles" },
      ]} />
      <header className="border-b border-line bg-panel">
        <div className="mx-auto max-w-7xl px-5 py-6 lg:px-8">
          <h1 className="text-3xl font-semibold">Roles</h1>
          <p className="mt-1 text-sm text-muted">
            Define roles and assign permissions to each role.
          </p>
        </div>
      </header>
      <section className="mx-auto max-w-7xl px-5 py-6 lg:px-8">
        <RolesClient initialRoles={roles} allPermissions={permissions} />
      </section>
    </main>
  );
}
