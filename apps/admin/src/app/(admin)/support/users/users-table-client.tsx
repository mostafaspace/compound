"use client";

import type { AuthenticatedUser } from "@compound/contracts";
import { useState } from "react";
import Link from "next/link";

import { RoleAssignmentPanel } from "@/components/role-assignment-panel";
import { formatRoleLabel, getPrimaryEffectiveRole } from "@/lib/auth-access";

interface Props {
  users: AuthenticatedUser[];
  colName: string;
  colEmail: string;
  colRole: string;
  colStatus: string;
  colActions: string;
  empty: string;
  viewDetails: string;
}

function statusBadge(status: string): string {
  switch (status) {
    case "suspended":
      return "bg-[#fde8e5] text-danger";
    case "archived":
      return "bg-background text-muted";
    case "active":
      return "bg-[#e6f3ef] text-brand";
    default:
      return "bg-[#fff5e5] text-[#8a520c]";
  }
}

export function UsersTableClient({
  users,
  colName,
  colEmail,
  colRole,
  colStatus,
  colActions,
  empty,
  viewDetails,
}: Props) {
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedUserName, setSelectedUserName] = useState("");

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] border-collapse text-start text-sm">
          <thead className="bg-background text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">{colName}</th>
              <th className="px-4 py-3 font-semibold">{colEmail}</th>
              <th className="px-4 py-3 font-semibold">{colRole}</th>
              <th className="px-4 py-3 font-semibold">{colStatus}</th>
              <th className="px-4 py-3 font-semibold">{colActions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {users.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center text-muted" colSpan={5}>
                  {empty}
                </td>
              </tr>
            ) : (
              users.map((user: AuthenticatedUser) => (
                <tr key={user.id}>
                  <td className="px-4 py-4 font-semibold">{user.name}</td>
                  <td className="px-4 py-4 text-muted">{user.email}</td>
                  <td className="px-4 py-4 text-muted">{formatRoleLabel(getPrimaryEffectiveRole(user))}</td>
                  <td className="px-4 py-4">
                    <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${statusBadge(user.status)}`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <Link
                        className="text-sm font-semibold text-brand hover:text-brand-strong"
                        href={`/support/users/${user.id}`}
                      >
                        {viewDetails}
                      </Link>
                      <button
                        onClick={() => { setSelectedUserId(user.id); setSelectedUserName(user.name); }}
                        className="inline-flex h-8 items-center rounded-lg border border-line px-3 text-xs font-semibold hover:border-brand transition"
                      >
                        Roles
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedUserId !== null && (
        <RoleAssignmentPanel
          userId={selectedUserId}
          userName={selectedUserName}
          onClose={() => setSelectedUserId(null)}
        />
      )}
    </>
  );
}
