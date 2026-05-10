"use client";

import { useState, useTransition } from "react";
import type { RoleRecord, PermissionRecord } from "@/lib/api";
import { updateRolePermissions, deleteRole, createRole } from "./actions";

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

  // Group permissions by domain (strip view_/manage_ prefix to get domain)
  const grouped = allPermissions.reduce<Record<string, PermissionRecord[]>>((acc, p) => {
    const parts = p.name.split("_");
    const domain = parts.length >= 2 ? parts.slice(1).join("_") : p.name;
    (acc[domain] ??= []).push(p);
    return acc;
  }, {});

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
        <div className="rounded-lg border border-line bg-panel p-5">
          <h2 className="mb-1 text-lg font-semibold">{selected.name}</h2>
          <p className="mb-4 text-xs text-muted">{selected.permissions.length} permissions assigned</p>
          {error && <p className="mb-3 text-sm text-danger">{error}</p>}
          <div className="space-y-5">
            {Object.entries(grouped).sort().map(([domain, perms]) => (
              <div key={domain}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{domain.replace(/_/g, " ")}</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {perms.map((p) => {
                    const checked = selected.permissions.includes(p.name);
                    return (
                      <label
                        key={p.id}
                        className="flex cursor-pointer items-center gap-2 rounded-lg border border-line bg-background px-3 py-2 text-sm transition hover:border-brand/50"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => togglePermission(p.name)}
                          disabled={isPending}
                          className="accent-brand"
                        />
                        <span className="font-mono text-xs">{p.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center rounded-lg border border-line bg-panel p-10 text-sm text-muted">
          Select a role to manage its permissions.
        </div>
      )}
    </div>
  );
}
