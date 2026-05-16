"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { AdminClientPagination } from "@/components/admin-client-pagination";

const ASSIGNMENT_PAGE_SIZE = 10;
const UNITS_PAGE_SIZE = 12;

interface UnassignedUserRow {
  id: number;
  name: string;
  email: string;
  phone: string | null;
}

interface UnitRow {
  id: string;
  buildingName: string;
  memberships?: unknown[];
  status: string;
  unitNumber: string;
}

interface AssignmentWorkspaceProps {
  assignAction: (formData: FormData) => void | Promise<void>;
  hasUnits: boolean;
  labels: {
    assignmentCountLabel: string;
    assignmentTitle: string;
    assignmentDescription: string;
    availableCountLabel: string;
    availableTitle: string;
    availableDescription: string;
    emptyAssignmentTitle: string;
    emptyAssignmentDescription: string;
    returnToDashboard: string;
    reviewCompoundRegistry: string;
    userColumn: string;
    assignmentColumn: string;
    noPhone: string;
    unitLabel: string;
    unitOptionTemplate: string;
    selectUnit: string;
    assignButton: string;
    unitSetupRequired: string;
    openRegistry: string;
    buildingColumn: string;
    unitColumn: string;
    statusColumn: string;
    residentsColumn: string;
    emptyUnitsTitle: string;
    emptyUnitsDescription: string;
    paginationFirst: string;
    paginationPrevious: string;
    paginationNext: string;
    paginationLast: string;
    paginationSummaryTemplate: string;
  };
  units: UnitRow[];
  users: UnassignedUserRow[];
}

function paginate<T>(items: T[], page: number, perPage: number) {
  const total = items.length;
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  const currentPage = Math.min(Math.max(1, page), lastPage);
  const fromIndex = total === 0 ? 0 : (currentPage - 1) * perPage;
  const toIndex = Math.min(fromIndex + perPage, total);

  return {
    currentPage,
    data: items.slice(fromIndex, toIndex),
    from: total === 0 ? 0 : fromIndex + 1,
    lastPage,
    to: total === 0 ? 0 : toIndex,
    total,
  };
}

function summary(template: string, from: number, to: number, total: number): string {
  return template
    .replace("__FROM__", String(from))
    .replace("__TO__", String(to))
    .replace("__TOTAL__", String(total));
}

function unitOption(template: string, unit: UnitRow): string {
  return template
    .replace("__BUILDING__", unit.buildingName)
    .replace("__UNIT__", unit.unitNumber);
}

export function AssignmentWorkspace({
  assignAction,
  hasUnits,
  labels,
  units,
  users,
}: AssignmentWorkspaceProps) {
  const [queuePage, setQueuePage] = useState(1);
  const [unitsPage, setUnitsPage] = useState(1);
  const pagedUsers = useMemo(() => paginate(users, queuePage, ASSIGNMENT_PAGE_SIZE), [queuePage, users]);
  const pagedUnits = useMemo(() => paginate(units, unitsPage, UNITS_PAGE_SIZE), [units, unitsPage]);
  const hasUnassignedUsers = users.length > 0;
  const paginationLabels = {
    first: labels.paginationFirst,
    previous: labels.paginationPrevious,
    next: labels.paginationNext,
    last: labels.paginationLast,
  };

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-lg border border-line bg-panel">
        <div className="flex flex-col gap-4 border-b border-line px-5 py-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-xl font-semibold">{labels.assignmentTitle}</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted">{labels.assignmentDescription}</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-semibold text-muted">
            <span className="rounded-full border border-line bg-background px-3 py-1">
              {labels.assignmentCountLabel}: {users.length}
            </span>
            <span className="rounded-full border border-line bg-background px-3 py-1">
              {labels.availableCountLabel}: {units.length}
            </span>
          </div>
        </div>

        {!hasUnassignedUsers ? (
          <div className="px-5 py-8">
            <p className="text-sm font-medium text-foreground">{labels.emptyAssignmentTitle}</p>
            <p className="mt-2 text-sm text-muted">{labels.emptyAssignmentDescription}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                className="inline-flex h-10 items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong"
                href="/"
              >
                {labels.returnToDashboard}
              </Link>
              <Link
                className="inline-flex h-10 items-center justify-center rounded-lg border border-line bg-panel px-4 text-sm font-semibold hover:border-brand"
                href="/compounds"
              >
                {labels.reviewCompoundRegistry}
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-start text-sm">
                <thead className="bg-background text-muted">
                  <tr>
                    <th className="px-5 py-3 font-semibold">{labels.userColumn}</th>
                    <th className="px-5 py-3 font-semibold">{labels.assignmentColumn}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {pagedUsers.data.map((user) => (
                    <tr className="align-top hover:bg-background/60" key={user.id}>
                      <td className="px-5 py-4">
                        <p className="font-semibold">{user.name}</p>
                        <p className="mt-1 text-sm text-muted">{user.email}</p>
                        <p className="mt-1 text-xs text-muted">{user.phone ?? labels.noPhone}</p>
                      </td>
                      <td className="px-5 py-4">
                        {hasUnits ? (
                          <form action={assignAction} className="grid gap-2 lg:grid-cols-[1fr_auto]">
                            <input type="hidden" name="userId" value={user.id} />
                            <select
                              aria-label={labels.unitLabel}
                              className="h-10 min-w-72 rounded-lg border border-line bg-background px-3 text-sm"
                              defaultValue=""
                              name="unitId"
                              required
                            >
                              <option value="" disabled>{labels.selectUnit}</option>
                              {units.map((unit) => (
                                <option key={unit.id} value={unit.id}>
                                  {unitOption(labels.unitOptionTemplate, unit)}
                                </option>
                              ))}
                            </select>
                            <button
                              className="inline-flex h-10 items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong"
                              type="submit"
                            >
                              {labels.assignButton}
                            </button>
                          </form>
                        ) : (
                          <div className="rounded-lg border border-dashed border-line bg-panel px-4 py-3 text-sm text-muted">
                            {labels.unitSetupRequired}
                            <Link className="ms-2 font-semibold text-brand hover:text-brand-strong" href="/compounds">
                              {labels.openRegistry}
                            </Link>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <AdminClientPagination
              currentPage={pagedUsers.currentPage}
              labels={{
                ...paginationLabels,
                summary: summary(labels.paginationSummaryTemplate, pagedUsers.from, pagedUsers.to, pagedUsers.total),
              }}
              lastPage={pagedUsers.lastPage}
              onPageChange={setQueuePage}
            />
          </>
        )}
      </div>

      <details className="overflow-hidden rounded-lg border border-line bg-panel">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold">{labels.availableTitle}</h2>
            <p className="mt-1 text-sm text-muted">{labels.availableDescription}</p>
          </div>
          <span className="rounded-full border border-line bg-background px-3 py-1 text-xs font-semibold text-muted">
            {units.length}
          </span>
        </summary>
        {!hasUnits ? (
          <div className="border-t border-line px-5 py-8">
            <p className="text-sm font-medium text-foreground">{labels.emptyUnitsTitle}</p>
            <p className="mt-2 text-sm text-muted">{labels.emptyUnitsDescription}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                className="inline-flex h-10 items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong"
                href="/compounds"
              >
                {labels.reviewCompoundRegistry}
              </Link>
              <Link
                className="inline-flex h-10 items-center justify-center rounded-lg border border-line bg-panel px-4 text-sm font-semibold hover:border-brand"
                href="/"
              >
                {labels.returnToDashboard}
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto border-t border-line">
              <table className="w-full border-collapse text-start text-sm">
                <thead className="bg-background text-muted">
                  <tr>
                    <th className="px-4 py-3 font-semibold">{labels.buildingColumn}</th>
                    <th className="px-4 py-3 font-semibold">{labels.unitColumn}</th>
                    <th className="px-4 py-3 font-semibold">{labels.statusColumn}</th>
                    <th className="px-4 py-3 font-semibold">{labels.residentsColumn}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {pagedUnits.data.map((unit) => (
                    <tr key={unit.id}>
                      <td className="px-4 py-4">{unit.buildingName}</td>
                      <td className="px-4 py-4">
                        <Link className="font-semibold text-brand hover:text-brand-strong" href={`/units/${unit.id}`}>
                          {unit.unitNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-4 capitalize">{unit.status}</td>
                      <td className="px-4 py-4">{unit.memberships?.length ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <AdminClientPagination
              currentPage={pagedUnits.currentPage}
              labels={{
                ...paginationLabels,
                summary: summary(labels.paginationSummaryTemplate, pagedUnits.from, pagedUnits.to, pagedUnits.total),
              }}
              lastPage={pagedUnits.lastPage}
              onPageChange={setUnitsPage}
            />
          </>
        )}
      </details>
    </div>
  );
}
