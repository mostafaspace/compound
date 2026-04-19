import type { InvitationStatus, ResidentInvitation } from "@compound/contracts";
import Link from "next/link";

import { LogoutButton } from "@/components/logout-button";
import { getCurrentUser, getResidentInvitations } from "@/lib/api";
import { requireAdminUser } from "@/lib/session";

import { resendInvitationAction, revokeInvitationAction } from "./actions";

interface OnboardingPageProps {
  searchParams?: Promise<{
    q?: string;
    revoked?: string;
    resent?: string;
    status?: string;
  }>;
}

const statuses: Array<{ label: string; value: InvitationStatus | "all" }> = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Expired", value: "expired" },
  { label: "Accepted", value: "accepted" },
  { label: "Revoked", value: "revoked" },
];

function parseStatus(value?: string): InvitationStatus | "all" {
  return statuses.some((status) => status.value === value) ? (value as InvitationStatus | "all") : "all";
}

function statusTone(status: InvitationStatus): string {
  if (status === "accepted") {
    return "bg-[#e6f3ef] text-brand";
  }

  if (status === "revoked" || status === "expired") {
    return "bg-[#fff3f2] text-danger";
  }

  return "bg-[#f3ead7] text-accent";
}

function formatDate(value: string | null): string {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function canResend(invitation: ResidentInvitation): boolean {
  return invitation.status !== "accepted";
}

function canRevoke(invitation: ResidentInvitation): boolean {
  return invitation.status === "pending" || invitation.status === "expired";
}

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  await requireAdminUser(getCurrentUser);
  const params = searchParams ? await searchParams : {};
  const activeStatus = parseStatus(params.status);
  const query = params.q ?? "";
  const invitations = await getResidentInvitations({ q: query, status: activeStatus });

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <Link className="text-sm font-semibold text-brand hover:text-brand-strong" href="/">
              Dashboard
            </Link>
            <h1 className="mt-2 text-3xl font-semibold">Resident onboarding</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              Track invite delivery, resend expired links, and revoke pending access before residents complete their account.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              className="inline-flex h-11 items-center justify-center rounded-lg border border-line bg-panel px-4 text-sm font-semibold hover:border-brand"
              href="/compounds"
            >
              Property registry
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-6 lg:px-8">
        {params.resent ? (
          <p className="mb-4 rounded-lg bg-[#e6f3ef] px-4 py-3 text-sm font-medium text-brand">
            Invitation resent with a new secure acceptance link.
          </p>
        ) : null}
        {params.revoked ? (
          <p className="mb-4 rounded-lg bg-[#fff3f2] px-4 py-3 text-sm font-medium text-danger">
            Invitation revoked. The previous acceptance link can no longer be used.
          </p>
        ) : null}

        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <nav className="flex flex-wrap gap-2" aria-label="Invitation status filters">
            {statuses.map((status) => (
              <Link
                className={`inline-flex h-10 items-center justify-center rounded-lg border px-3 text-sm font-semibold ${
                  activeStatus === status.value
                    ? "border-brand bg-[#e6f3ef] text-brand"
                    : "border-line bg-panel text-foreground hover:border-brand"
                }`}
                href={`/onboarding${status.value === "all" ? "" : `?status=${status.value}`}`}
                key={status.value}
              >
                {status.label}
              </Link>
            ))}
          </nav>

          <form action="/onboarding" className="flex w-full gap-2 md:w-auto">
            {activeStatus !== "all" ? <input name="status" type="hidden" value={activeStatus} /> : null}
            <input
              className="h-11 min-w-0 flex-1 rounded-lg border border-line bg-panel px-3 text-sm outline-none focus:border-brand md:w-80"
              defaultValue={query}
              name="q"
              placeholder="Search name or email"
              type="search"
            />
            <button
              className="inline-flex h-11 items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong"
              type="submit"
            >
              Search
            </button>
          </form>
        </div>

        <div className="overflow-hidden rounded-lg border border-line bg-panel">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-background text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Resident</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Unit</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Delivery</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {invitations.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-muted" colSpan={6}>
                    No invitations match the current filters.
                  </td>
                </tr>
              ) : (
                invitations.map((invitation) => (
                  <tr key={invitation.id}>
                    <td className="px-4 py-4">
                      <div className="font-semibold">{invitation.user?.name ?? "Pending resident"}</div>
                      <div className="text-muted">{invitation.email}</div>
                    </td>
                    <td className="px-4 py-4 capitalize">{invitation.role.replaceAll("_", " ")}</td>
                    <td className="px-4 py-4">
                      {invitation.unit ? (
                        <Link className="font-semibold text-brand hover:text-brand-strong" href={`/units/${invitation.unit.id}`}>
                          {invitation.unit.unitNumber}
                        </Link>
                      ) : (
                        <span className="text-muted">Not linked</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold capitalize ${statusTone(invitation.status)}`}>
                        {invitation.status}
                      </span>
                      <div className="mt-2 text-xs text-muted">Expires {formatDate(invitation.expiresAt)}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div>{invitation.deliveryCount} sent</div>
                      <div className="text-muted">{formatDate(invitation.lastSentAt)}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        {canResend(invitation) ? (
                          <form action={resendInvitationAction.bind(null, invitation.id)}>
                            <button
                              className="inline-flex h-10 items-center justify-center rounded-lg border border-line px-3 text-sm font-semibold hover:border-brand"
                              type="submit"
                            >
                              Resend
                            </button>
                          </form>
                        ) : null}
                        {canRevoke(invitation) ? (
                          <form action={revokeInvitationAction.bind(null, invitation.id)}>
                            <button
                              className="inline-flex h-10 items-center justify-center rounded-lg border border-danger px-3 text-sm font-semibold text-danger"
                              type="submit"
                            >
                              Revoke
                            </button>
                          </form>
                        ) : null}
                        {!canResend(invitation) && !canRevoke(invitation) ? <span className="text-muted">No action</span> : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
