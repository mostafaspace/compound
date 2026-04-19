import type { InvitationStatus, ResidentInvitation, VerificationRequest, VerificationRequestStatus } from "@compound/contracts";
import Link from "next/link";

import { LogoutButton } from "@/components/logout-button";
import { getCurrentUser, getResidentInvitations, getVerificationRequests } from "@/lib/api";
import { requireAdminUser } from "@/lib/session";

import {
  approveVerificationRequestAction,
  rejectVerificationRequestAction,
  requestMoreInfoAction,
  resendInvitationAction,
  revokeInvitationAction,
} from "./actions";

interface OnboardingPageProps {
  searchParams?: Promise<{
    q?: string;
    approved?: string;
    moreInfo?: string;
    rejected?: string;
    reviewStatus?: string;
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

const reviewStatuses: Array<{ label: string; value: VerificationRequestStatus | "all" }> = [
  { label: "All", value: "all" },
  { label: "Pending review", value: "pending_review" },
  { label: "More info requested", value: "more_info_requested" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
];

function parseStatus(value?: string): InvitationStatus | "all" {
  return statuses.some((status) => status.value === value) ? (value as InvitationStatus | "all") : "all";
}

function parseReviewStatus(value?: string): VerificationRequestStatus | "all" {
  return reviewStatuses.some((status) => status.value === value) ? (value as VerificationRequestStatus | "all") : "all";
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

function reviewStatusTone(status: VerificationRequestStatus): string {
  if (status === "approved") {
    return "bg-[#e6f3ef] text-brand";
  }

  if (status === "rejected") {
    return "bg-[#fff3f2] text-danger";
  }

  if (status === "more_info_requested") {
    return "bg-[#eaf0ff] text-[#244a8f]";
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

function formatEnum(value: string | null): string {
  return value ? value.replaceAll("_", " ") : "Not set";
}

function canResend(invitation: ResidentInvitation): boolean {
  return invitation.status !== "accepted";
}

function canRevoke(invitation: ResidentInvitation): boolean {
  return invitation.status === "pending" || invitation.status === "expired";
}

function canReview(request: VerificationRequest): boolean {
  return request.status === "pending_review" || request.status === "more_info_requested";
}

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  await requireAdminUser(getCurrentUser);
  const params = searchParams ? await searchParams : {};
  const activeStatus = parseStatus(params.status);
  const activeReviewStatus = parseReviewStatus(params.reviewStatus);
  const query = params.q ?? "";
  const [invitations, verificationRequests] = await Promise.all([
    getResidentInvitations({ q: query, status: activeStatus }),
    getVerificationRequests({ q: query, status: activeReviewStatus }),
  ]);

  const onboardingHref = (nextStatus: InvitationStatus | "all", nextReviewStatus: VerificationRequestStatus | "all") => {
    const hrefParams = new URLSearchParams();

    if (nextStatus !== "all") {
      hrefParams.set("status", nextStatus);
    }

    if (nextReviewStatus !== "all") {
      hrefParams.set("reviewStatus", nextReviewStatus);
    }

    if (query.trim()) {
      hrefParams.set("q", query.trim());
    }

    const queryString = hrefParams.toString();

    return `/onboarding${queryString ? `?${queryString}` : ""}`;
  };

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
        {params.approved ? (
          <p className="mb-4 rounded-lg bg-[#e6f3ef] px-4 py-3 text-sm font-medium text-brand">
            Verification approved. The resident account is now active and the linked membership is verified.
          </p>
        ) : null}
        {params.rejected ? (
          <p className="mb-4 rounded-lg bg-[#fff3f2] px-4 py-3 text-sm font-medium text-danger">
            Verification rejected. The account was suspended and the linked membership was marked rejected.
          </p>
        ) : null}
        {params.moreInfo ? (
          <p className="mb-4 rounded-lg bg-[#eaf0ff] px-4 py-3 text-sm font-medium text-[#244a8f]">
            More information requested. The resident remains in pending review until an admin approves or rejects.
          </p>
        ) : null}

        <div className="mb-8">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Verification review queue</h2>
              <p className="mt-1 max-w-2xl text-sm text-muted">
                Review accepted residents before account activation and keep membership verification aligned with the decision.
              </p>
            </div>
            <nav className="flex flex-wrap gap-2" aria-label="Verification status filters">
              {reviewStatuses.map((status) => (
                <Link
                  className={`inline-flex h-10 items-center justify-center rounded-lg border px-3 text-sm font-semibold ${
                    activeReviewStatus === status.value
                      ? "border-brand bg-[#e6f3ef] text-brand"
                      : "border-line bg-panel text-foreground hover:border-brand"
                  }`}
                  href={onboardingHref(activeStatus, status.value)}
                  key={status.value}
                >
                  {status.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="overflow-x-auto rounded-lg border border-line bg-panel">
            <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
              <thead className="bg-background text-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">Resident</th>
                  <th className="px-4 py-3 font-semibold">Requested access</th>
                  <th className="px-4 py-3 font-semibold">Unit</th>
                  <th className="px-4 py-3 font-semibold">Review status</th>
                  <th className="px-4 py-3 font-semibold">Decision notes</th>
                  <th className="px-4 py-3 font-semibold">Review actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {verificationRequests.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-muted" colSpan={6}>
                      No verification requests match the current filters.
                    </td>
                  </tr>
                ) : (
                  verificationRequests.map((request) => (
                    <tr key={request.id}>
                      <td className="px-4 py-4 align-top">
                        <div className="font-semibold">{request.user?.name ?? `User ${request.userId}`}</div>
                        <div className="text-muted">{request.user?.email ?? "Email unavailable"}</div>
                      </td>
                      <td className="px-4 py-4 align-top capitalize">
                        <div>{formatEnum(request.requestedRole)}</div>
                        <div className="text-muted">{formatEnum(request.relationType)}</div>
                      </td>
                      <td className="px-4 py-4 align-top">
                        {request.unit ? (
                          <Link className="font-semibold text-brand hover:text-brand-strong" href={`/units/${request.unit.id}`}>
                            {request.unit.unitNumber}
                          </Link>
                        ) : (
                          <span className="text-muted">Not linked</span>
                        )}
                      </td>
                      <td className="px-4 py-4 align-top">
                        <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold capitalize ${reviewStatusTone(request.status)}`}>
                          {formatEnum(request.status)}
                        </span>
                        <div className="mt-2 text-xs text-muted">Submitted {formatDate(request.submittedAt)}</div>
                        {request.reviewedAt ? <div className="text-xs text-muted">Reviewed {formatDate(request.reviewedAt)}</div> : null}
                      </td>
                      <td className="max-w-64 px-4 py-4 align-top text-sm">
                        {request.decisionNote ? <p>{request.decisionNote}</p> : null}
                        {request.moreInfoNote ? <p className="mt-2 text-[#244a8f]">{request.moreInfoNote}</p> : null}
                        {!request.decisionNote && !request.moreInfoNote ? <span className="text-muted">No note yet</span> : null}
                      </td>
                      <td className="px-4 py-4 align-top">
                        {canReview(request) ? (
                          <div className="grid min-w-80 gap-2">
                            <form action={approveVerificationRequestAction.bind(null, request.id)} className="flex gap-2">
                              <input
                                className="h-10 min-w-0 flex-1 rounded-lg border border-line px-2"
                                name="note"
                                placeholder="Optional approval note"
                              />
                              <button
                                className="inline-flex h-10 items-center justify-center rounded-lg bg-brand px-3 text-sm font-semibold text-white hover:bg-brand-strong"
                                type="submit"
                              >
                                Approve
                              </button>
                            </form>
                            <form action={rejectVerificationRequestAction.bind(null, request.id)} className="flex gap-2">
                              <input
                                className="h-10 min-w-0 flex-1 rounded-lg border border-line px-2"
                                name="note"
                                placeholder="Rejection reason"
                                required
                              />
                              <button
                                className="inline-flex h-10 items-center justify-center rounded-lg border border-danger px-3 text-sm font-semibold text-danger"
                                type="submit"
                              >
                                Reject
                              </button>
                            </form>
                            <form action={requestMoreInfoAction.bind(null, request.id)} className="flex gap-2">
                              <input
                                className="h-10 min-w-0 flex-1 rounded-lg border border-line px-2"
                                name="note"
                                placeholder="Requested information"
                                required
                              />
                              <button
                                className="inline-flex h-10 items-center justify-center rounded-lg border border-line px-3 text-sm font-semibold hover:border-brand"
                                type="submit"
                              >
                                Ask info
                              </button>
                            </form>
                          </div>
                        ) : (
                          <span className="text-muted">Closed</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Invitation delivery</h2>
            <nav className="mt-3 flex flex-wrap gap-2" aria-label="Invitation status filters">
              {statuses.map((status) => (
                <Link
                  className={`inline-flex h-10 items-center justify-center rounded-lg border px-3 text-sm font-semibold ${
                    activeStatus === status.value
                      ? "border-brand bg-[#e6f3ef] text-brand"
                      : "border-line bg-panel text-foreground hover:border-brand"
                  }`}
                  href={onboardingHref(status.value, activeReviewStatus)}
                  key={status.value}
                >
                  {status.label}
                </Link>
              ))}
            </nav>
          </div>

          <form action="/onboarding" className="flex w-full gap-2 md:w-auto">
            {activeStatus !== "all" ? <input name="status" type="hidden" value={activeStatus} /> : null}
            {activeReviewStatus !== "all" ? <input name="reviewStatus" type="hidden" value={activeReviewStatus} /> : null}
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
