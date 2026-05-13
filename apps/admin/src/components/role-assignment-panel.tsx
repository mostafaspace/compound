"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import type { AdminScopeAssignment, RoleRecord } from "@/lib/api";
import {
  getUserRoleAssignments, assignUserRole, revokeUserRole,
  getRoles
} from "@/app/(admin)/support/users/actions";

interface Props {
  userId: number;
  userName: string;
  onClose: () => void;
}

export function RoleAssignmentPanel({ userId, userName, onClose }: Props) {
  const t = useTranslations("RoleAssignments");
  const commonT = useTranslations("Common");
  const [assignments, setAssignments] = useState<AdminScopeAssignment[]>([]);
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Assign form state
  const [selectedRole, setSelectedRole] = useState("");
  const [scopeType, setScopeType] = useState("global");
  const [scopeId, setScopeId] = useState("");

  useEffect(() => {
    Promise.all([getUserRoleAssignments(userId), getRoles()])
      .then(([assignData, rolesData]) => {
        setAssignments(assignData.scope_assignments);
        setRoles(rolesData);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : t("error"));
      })
      .finally(() => setLoading(false));
  }, [userId]);

  const handleAssign = () => {
    if (!selectedRole) return;
    startTransition(async () => {
      try {
        const created = await assignUserRole(
          userId,
          selectedRole,
          scopeType,
          scopeType !== "global" ? (scopeId || null) : null,
        );
        setAssignments((prev) => [...prev, created]);
        setSelectedRole("");
        setScopeType("global");
        setScopeId("");
        setError(null);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : t("assignError"));
      }
    });
  };

  const handleRevoke = (assignmentId: number) => {
    startTransition(async () => {
      try {
        await revokeUserRole(userId, assignmentId);
        setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
        setError(null);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : t("revokeError"));
      }
    });
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 end-0 z-40 flex w-full max-w-md flex-col border-s border-line bg-panel shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h2 className="font-semibold">{t("title")}</h2>
            <p className="text-sm text-muted">{userName}</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-background text-muted hover:text-foreground transition"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {error && (
            <p className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}

          {/* Current assignments */}
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
              {t("currentRoles")}
            </h3>
            {loading && <p className="text-sm text-muted">{t("loading")}</p>}
            {!loading && assignments.length === 0 && (
              <p className="text-sm text-muted">{t("noRoles")}</p>
            )}
            <div className="space-y-2">
              {assignments.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between rounded-lg border border-line bg-background px-3 py-2"
                >
                  <div className="min-w-0">
                    <span className="text-sm font-semibold">{a.role_name}</span>
                    <span className="ms-2 inline-block rounded border border-line bg-background px-1.5 py-0.5 text-xs text-muted">
                      {a.scope_type}{a.scope_id ? ` · ${a.scope_id}` : ""}
                    </span>
                  </div>
                  <button
                    onClick={() => handleRevoke(a.id)}
                    disabled={isPending}
                    className="ms-3 shrink-0 text-xs text-danger hover:underline disabled:opacity-50"
                  >
                    {t("revoke")}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Assign new role */}
          <div className="rounded-lg border border-line bg-background p-4 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
              {t("assignRole")}
            </h3>

            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="h-10 w-full rounded-lg border border-line bg-panel px-3 text-sm focus:border-brand focus:outline-none"
            >
              <option value="">{t("selectRole")}</option>
              {roles.map((r) => (
                <option key={r.id} value={r.name}>{r.name}</option>
              ))}
            </select>

            <select
              value={scopeType}
              onChange={(e) => { setScopeType(e.target.value); setScopeId(""); }}
              className="h-10 w-full rounded-lg border border-line bg-panel px-3 text-sm focus:border-brand focus:outline-none"
            >
              <option value="global">{t("global")}</option>
              <option value="compound">{commonT("compound")}</option>
              <option value="building">{commonT("building")}</option>
              <option value="floor">{commonT("floor")}</option>
              <option value="unit">{commonT("unit")}</option>
            </select>

            {scopeType !== "global" && (
              <input
                type="text"
                value={scopeId}
                onChange={(e) => setScopeId(e.target.value)}
                placeholder={t("scopeIdPlaceholder", { type: commonT(scopeType) })}
                className="h-10 w-full rounded-lg border border-line bg-panel px-3 text-sm font-mono focus:border-brand focus:outline-none"
              />
            )}

            <button
              onClick={handleAssign}
              disabled={isPending || !selectedRole || (scopeType !== "global" && !scopeId.trim())}
              className="h-10 w-full rounded-lg bg-brand text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {t("assignRole")}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
