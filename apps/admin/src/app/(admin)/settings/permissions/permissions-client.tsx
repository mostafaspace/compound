"use client";

import { useState, useTransition } from "react";
import type { PermissionRecord } from "@/lib/api";
import { createPermission, deletePermission } from "./actions";

export function PermissionsClient({ initialPermissions }: { initialPermissions: PermissionRecord[] }) {
  const [permissions, setPermissions] = useState(initialPermissions);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleAdd = () => {
    const name = newName.trim().toLowerCase().replace(/\s+/g, "_");
    if (!name || !/^[a-z_]+$/.test(name)) {
      setError("Permission name must be lowercase letters and underscores only.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const created = await createPermission(name);
        setPermissions((prev) => [...prev, created]);
        setNewName("");
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to create permission.");
      }
    });
  };

  const handleDelete = (id: number, isCore: boolean, rolesCount: number) => {
    if (isCore) return;
    if (rolesCount > 0) return;
    startTransition(async () => {
      try {
        await deletePermission(id);
        setPermissions((prev) => prev.filter((p) => p.id !== id));
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to delete permission.");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Add permission */}
      <div className="rounded-lg border border-line bg-panel p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">Add Permission</h2>
        <div className="flex gap-3">
          <input
            className="h-10 flex-1 rounded-lg border border-line bg-background px-3 text-sm focus:border-brand focus:outline-none"
            placeholder="e.g. view_reports"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <button
            onClick={handleAdd}
            disabled={isPending || !newName.trim()}
            className="inline-flex h-10 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            Add
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      </div>

      {/* Permissions table */}
      <div className="overflow-hidden rounded-lg border border-line bg-panel">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-background text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">Permission</th>
              <th className="px-4 py-3 font-semibold">Used by Roles</th>
              <th className="px-4 py-3 font-semibold">Type</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {permissions.map((p) => (
              <tr key={p.id} className="hover:bg-background/50">
                <td className="px-4 py-3 font-mono text-xs">{p.name}</td>
                <td className="px-4 py-3 text-muted">{p.roles_count}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${
                      p.is_core
                        ? "bg-brand/10 text-brand"
                        : "bg-muted/10 text-muted"
                    }`}
                  >
                    {p.is_core ? "Core" : "Custom"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {!p.is_core && (
                    <button
                      onClick={() => handleDelete(p.id, p.is_core, p.roles_count)}
                      disabled={isPending || p.roles_count > 0}
                      title={p.roles_count > 0 ? "Remove from all roles first" : "Delete"}
                      className="text-sm text-danger hover:underline disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
