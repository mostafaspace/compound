"use client";

import { useState, useTransition } from "react";
import type { RoleRecord, PermissionRecord } from "@/lib/api";
import { updateRolePermissions, deleteRole, createRole } from "./actions";

type FeatureAccess = {
  id: string;
  group: string;
  title: string;
  description: string;
  permissions: string[];
  danger?: boolean;
};

const featureAccessCatalog: FeatureAccess[] = [
  {
    id: "compounds",
    group: "Platform",
    title: "Compounds",
    description: "Create, edit, and inspect compound records. Usually super-admin only.",
    permissions: ["view_compounds", "manage_compounds"],
    danger: true,
  },
  {
    id: "users",
    group: "People",
    title: "Users and residents",
    description: "See user accounts, invite residents, assign users to units, and manage account access.",
    permissions: ["view_users", "manage_users"],
  },
  {
    id: "roles",
    group: "People",
    title: "Roles and permissions",
    description: "Change what each role can do. Keep this restricted to the smallest trusted admin group.",
    permissions: ["manage_roles"],
    danger: true,
  },
  {
    id: "units",
    group: "Property",
    title: "Apartments and units",
    description: "Manage apartment files, residents, documents, violations, and penalty points.",
    permissions: [
      "apartments_admin",
      "apply_apartment_violation",
      "manage_apartment_penalty_points",
    ],
  },
  {
    id: "vehicles",
    group: "Property",
    title: "Vehicles",
    description: "Lookup resident vehicles, plates, stickers, and related security information.",
    permissions: ["lookup_vehicles"],
  },
  {
    id: "visitors",
    group: "Community",
    title: "Visitors and QR passes",
    description: "Create, view, validate, and manage visitor passes.",
    permissions: ["view_visitors", "manage_visitors"],
  },
  {
    id: "security",
    group: "Security",
    title: "Security operations",
    description: "Use guard workflows, gate logs, manual entries, shifts, incidents, and devices.",
    permissions: [
      "view_security",
      "manage_security",
      "view_admin_security",
      "manage_admin_security",
    ],
  },
  {
    id: "finance",
    group: "Money",
    title: "Contributions and finance",
    description: "Review balances, request contributions, approve resident payment proof, and manage ledgers.",
    permissions: ["view_finance", "manage_finance"],
  },
  {
    id: "announcements",
    group: "Communication",
    title: "Announcements",
    description: "Send compound, building, and floor announcements.",
    permissions: ["view_announcements", "manage_announcements"],
  },
  {
    id: "polls",
    group: "Governance",
    title: "Polls and voting",
    description: "Create transparent polls, vote, view results, and manage poll governance.",
    permissions: ["view_governance", "manage_governance"],
  },
  {
    id: "issues",
    group: "Community",
    title: "Issues and complaints",
    description: "Report, view, triage, escalate, and resolve resident issues.",
    permissions: ["view_issues", "manage_issues"],
  },
  {
    id: "org-chart",
    group: "Governance",
    title: "Org chart",
    description: "View leadership, representatives, responsibilities, and contact visibility.",
    permissions: ["view_org_chart"],
  },
  {
    id: "meetings",
    group: "Governance",
    title: "Meetings",
    description: "View and manage meetings, minutes, and action items.",
    permissions: ["view_meetings", "manage_meetings"],
  },
  {
    id: "maintenance",
    group: "Operations",
    title: "Maintenance and work orders",
    description: "View and manage maintenance requests, vendors, and work orders.",
    permissions: ["view_maintenance", "manage_maintenance"],
  },
  {
    id: "analytics",
    group: "Operations",
    title: "Dashboards and analytics",
    description: "See operational dashboards, insights, and reports.",
    permissions: ["view_analytics"],
  },
  {
    id: "audit",
    group: "Security",
    title: "Audit logs",
    description: "Inspect sensitive account, security, and platform activity trails.",
    permissions: ["view_audit_logs"],
    danger: true,
  },
  {
    id: "settings",
    group: "Platform",
    title: "System settings",
    description: "Manage compound-level configuration, privacy, channels, and platform settings.",
    permissions: ["manage_settings"],
    danger: true,
  },
];

function formatPermissionName(permission: string): string {
  return permission.replace(/_/g, " ");
}

export function RolesClient({
  initialRoles,
  allPermissions,
}: {
  initialRoles: RoleRecord[];
  allPermissions: PermissionRecord[];
}) {
  const [roles, setRoles] = useState(initialRoles);
  const [selected, setSelected] = useState<RoleRecord | null>(initialRoles[0] ?? null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [newRoleName, setNewRoleName] = useState("");

  const togglePermission = (perm: string) => {
    if (!selected) return;
    const has = selected.permissions.includes(perm);
    const next = has
      ? selected.permissions.filter((p) => p !== perm)
      : [...selected.permissions, perm];

    const optimistic = { ...selected, permissions: next };
    setSelected(optimistic);
    setRoles((prev) => prev.map((r) => r.id === selected.id ? optimistic : r));

    startTransition(async () => {
      try {
        const saved = await updateRolePermissions(selected.id, next);
        setRoles((prev) => prev.map((r) => r.id === saved.id ? saved : r));
        setSelected(saved);
        setError(null);
      } catch (e: unknown) {
        // revert
        setSelected(selected);
        setRoles((prev) => prev.map((r) => r.id === selected.id ? selected : r));
        setError(e instanceof Error ? e.message : "Failed to update permissions.");
      }
    });
  };

  const handleDeleteRole = (role: RoleRecord) => {
    if (role.users_count > 0) {
      setError(`Cannot delete '${role.name}': ${role.users_count} user(s) assigned.`);
      return;
    }
    startTransition(async () => {
      try {
        await deleteRole(role.id);
        const remaining = roles.filter((r) => r.id !== role.id);
        setRoles(remaining);
        setSelected(remaining[0] ?? null);
        setError(null);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to delete role.");
      }
    });
  };

  const handleCreateRole = () => {
    const name = newRoleName.trim().toLowerCase().replace(/\s+/g, "_");
    if (!name) return;
    startTransition(async () => {
      try {
        const role = await createRole(name, []);
        setRoles((prev) => [...prev, role]);
        setSelected(role);
        setNewRoleName("");
        setError(null);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to create role.");
      }
    });
  };

  const permissionsByName = new Map(allPermissions.map((permission) => [permission.name, permission]));
  const catalogPermissionNames = new Set(featureAccessCatalog.flatMap((feature) => feature.permissions));
  const uncataloguedPermissions = allPermissions.filter((permission) => !catalogPermissionNames.has(permission.name));
  const groupNames = [...new Set(featureAccessCatalog.map((feature) => feature.group))];
  const isSuperAdminSelected = selected?.name === "super_admin";

  return (
    <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
      {/* Left: role list */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <input
            className="h-9 flex-1 rounded-lg border border-line bg-background px-3 text-sm focus:border-brand focus:outline-none"
            placeholder="new_role_name"
            value={newRoleName}
            onChange={(e) => setNewRoleName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateRole()}
          />
          <button
            onClick={handleCreateRole}
            disabled={isPending || !newRoleName.trim()}
            className="h-9 rounded-lg bg-brand px-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            +
          </button>
        </div>

        {roles.map((role) => (
          <div
            key={role.id}
            onClick={() => { setSelected(role); setError(null); }}
            className={`flex cursor-pointer items-center justify-between rounded-lg border px-4 py-3 transition ${
              selected?.id === role.id
                ? "border-brand bg-brand/5"
                : "border-line bg-panel hover:border-brand/50"
            }`}
          >
            <div>
              <p className="text-sm font-semibold">{role.name}</p>
              <p className="text-xs text-muted">{role.users_count} users</p>
            </div>
            {role.is_system ? (
              <span className="rounded border border-line px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                System
              </span>
            ) : role.users_count === 0 ? (
              <button
                onClick={(e) => { e.stopPropagation(); handleDeleteRole(role); }}
                disabled={isPending}
                className="text-xs text-danger hover:underline disabled:opacity-50"
              >
                Delete
              </button>
            ) : null}
          </div>
        ))}
      </div>

      {/* Right: permissions for selected role */}
      {selected ? (
        <div className="space-y-5">
          <div className="overflow-hidden rounded-2xl border border-line bg-panel">
            <div className="border-b border-line bg-background/50 p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">Access matrix</p>
                  <h2 className="mt-1 text-2xl font-semibold">{selected.name.replace(/_/g, " ")}</h2>
                  <p className="mt-2 max-w-2xl text-sm text-muted">
                    Toggle product features for this role. View permissions usually expose screens and data;
                    manage permissions allow creation, editing, approval, or operational actions.
                  </p>
                </div>
                <div className="rounded-xl border border-line bg-panel px-4 py-3 text-sm">
                  <p className="font-semibold">{selected.permissions.length} permissions assigned</p>
                  <p className="text-xs text-muted">{selected.users_count} users currently use this role</p>
                </div>
              </div>
              {isSuperAdminSelected && (
                <div className="mt-4 rounded-xl border border-amber-400/40 bg-amber-400/10 p-3 text-sm text-amber-100">
                  Super admin bypasses normal permission checks. These toggles are shown for visibility, but
                  they do not meaningfully restrict super-admin access.
                </div>
              )}
            </div>
            {error && <p className="mx-5 mt-4 rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">{error}</p>}
            <div className="space-y-7 p-5">
              {groupNames.map((groupName) => (
                <section key={groupName} className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted">{groupName}</h3>
                    <div className="h-px flex-1 bg-line" />
                  </div>
                  <div className="grid gap-3 xl:grid-cols-2">
                    {featureAccessCatalog
                      .filter((feature) => feature.group === groupName)
                      .map((feature) => {
                        const availablePermissions = feature.permissions.filter((permission) => permissionsByName.has(permission));
                        const enabledCount = availablePermissions.filter((permission) => selected.permissions.includes(permission)).length;

                        return (
                          <article
                            key={feature.id}
                            className={`rounded-2xl border p-4 transition ${
                              feature.danger
                                ? "border-amber-400/30 bg-amber-400/[0.04]"
                                : "border-line bg-background/55"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h4 className="text-base font-semibold">{feature.title}</h4>
                                <p className="mt-1 text-sm leading-6 text-muted">{feature.description}</p>
                              </div>
                              <span className="shrink-0 rounded-full border border-line px-2.5 py-1 text-xs font-semibold text-muted">
                                {enabledCount}/{availablePermissions.length}
                              </span>
                            </div>
                            <div className="mt-4 grid gap-2 sm:grid-cols-2">
                              {availablePermissions.map((permission) => {
                                const checked = selected.permissions.includes(permission);
                                const kind = permission.startsWith("manage_") || permission.startsWith("apply_") ? "Manage" : "View";

                                return (
                                  <label
                                    key={permission}
                                    className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-3 py-2 text-sm transition ${
                                      checked
                                        ? "border-brand bg-brand/10 text-foreground"
                                        : "border-line bg-panel hover:border-brand/60"
                                    } ${isPending || isSuperAdminSelected ? "cursor-not-allowed opacity-70" : ""}`}
                                  >
                                    <span>
                                      <span className="block font-semibold">{kind}</span>
                                      <span className="block font-mono text-[11px] text-muted">{permission}</span>
                                    </span>
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => togglePermission(permission)}
                                      disabled={isPending || isSuperAdminSelected}
                                      className="h-4 w-4 accent-brand"
                                      aria-label={`${selected.name} ${formatPermissionName(permission)}`}
                                    />
                                  </label>
                                );
                              })}
                            </div>
                          </article>
                        );
                      })}
                  </div>
                </section>
              ))}
            </div>
          </div>

          {uncataloguedPermissions.length > 0 && (
            <div className="rounded-2xl border border-line bg-panel p-5">
              <h3 className="text-lg font-semibold">Advanced permissions</h3>
              <p className="mt-1 text-sm text-muted">
                These permissions exist in the backend but are not yet mapped to a product feature card.
              </p>
              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {uncataloguedPermissions.map((permission) => {
                  const checked = selected.permissions.includes(permission.name);

                  return (
                    <label
                      key={permission.id}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border border-line bg-background px-3 py-2 text-sm transition hover:border-brand/50"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => togglePermission(permission.name)}
                        disabled={isPending || isSuperAdminSelected}
                        className="accent-brand"
                      />
                      <span className="font-mono text-xs">{permission.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center rounded-lg border border-line bg-panel p-10 text-sm text-muted">
          Select a role to manage its permissions.
        </div>
      )}
    </div>
  );
}
