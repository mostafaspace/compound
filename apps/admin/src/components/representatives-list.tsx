"use client";

import type { RepresentativeAssignment } from "@/lib/orgchart";
import Link from "next/link";
import { useState } from "react";

interface RepresentativesListProps {
  assignments: RepresentativeAssignment[];
  compoundId: string;
}

export function RepresentativesList({ assignments, compoundId }: RepresentativesListProps) {
  const [activeOnly, setActiveOnly] = useState(true);

  const formatRoleLabel = (role: string): string => {
    return role
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const formatScopeName = (assignment: RepresentativeAssignment): string => {
    if (assignment.scopeLevel === "compound") return "Compound";
    if (assignment.scopeLevel === "building") return `Building ${assignment.buildingId?.substring(0, 8)}`;
    if (assignment.scopeLevel === "floor") return `Floor ${assignment.floorId?.substring(0, 8)}`;
    return "Unknown";
  };

  const filteredAssignments = assignments.filter((a) => {
    if (activeOnly) return a.isActive;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={activeOnly}
              onChange={(e) => setActiveOnly(e.target.checked)}
              className="rounded border-line"
            />
            Active only
          </label>
        </div>
        <Link
          className="inline-flex h-10 items-center justify-center rounded-lg bg-brand px-3 text-sm font-semibold text-white transition hover:bg-brand-strong"
          href={`/compounds/${compoundId}/representatives/new`}
        >
          Assign new
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border border-line bg-panel">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-background text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Role</th>
              <th className="px-4 py-3 font-semibold">Scope</th>
              <th className="px-4 py-3 font-semibold">Starts</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {filteredAssignments.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-muted" colSpan={6}>
                  {activeOnly ? "No active representatives found." : "No representatives found."}
                </td>
              </tr>
            ) : (
              filteredAssignments.map((assignment) => (
                <tr key={assignment.id}>
                  <td className="px-4 py-4 font-semibold">{assignment.user?.name ?? "Unknown"}</td>
                  <td className="px-4 py-4 text-xs">
                    <span className="rounded bg-brand/10 px-2 py-1 text-brand">{formatRoleLabel(assignment.role)}</span>
                  </td>
                  <td className="px-4 py-4 text-sm">{formatScopeName(assignment)}</td>
                  <td className="px-4 py-4 text-xs font-mono">{assignment.startsAt}</td>
                  <td className="px-4 py-4">
                    <span className={`rounded px-2 py-1 text-xs font-semibold ${assignment.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>
                      {assignment.isActive ? "Active" : "Expired"}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <Link
                      className="inline-flex h-9 items-center justify-center rounded border border-line px-3 text-sm font-semibold hover:border-brand"
                      href={`/representative-assignments/${assignment.id}/edit`}
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
