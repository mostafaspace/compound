import type { InvitationStatus, ResidentInvitation, VerificationRequest, VerificationRequestStatus } from "@compound/contracts";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

import { LogoutButton } from "@/components/logout-button";
import { getCurrentUser, getResidentInvitations, getSystemStatus, getVerificationRequests } from "@/lib/api";
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
    error?: string;
    status?: string;
  }>;
}

const statusValues: Array<InvitationStatus | "all"> = ["all", "pending", "expired", "accepted", "revoked"];
const reviewStatusValues: Array<VerificationRequestStatus | "all"> = [
  "all",
  "pending_review",
  "more_info_requested",
  "approved",
  "rejected",
];

function parseStatus(value?: string): InvitationStatus | "all" {
  return statusValues.includes(value as InvitationStatus | "all") ? (value as InvitationStatus | "all") : "all";
}

function parseReviewStatus(value?: string): VerificationRequestStatus | "all" {
  return reviewStatusValues.includes(value as VerificationRequestStatus | "all")
    ? (value as VerificationRequestStatus | "all")
    : "all";
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

function formatDate(value: string | null, locale: string, emptyLabel: string): string {
  if (!value) {
    return emptyLabel;
  }

  return new Intl.DateTimeFormat(locale, {
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

function canReview(request: VerificationRequest): boolean {
  return request.status === "pending_review" || request.status === "more_info_requested";
}

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  await requireAdminUser(getCurrentUser);
  const params = searchParams ? await searchParams : {};
  const activeStatus = parseStatus(params.status);
  const activeReviewStatus = parseReviewStatus(params.reviewStatus);
  const query = params.q ?? "";
  const [invitations, verificationRequests, systemStatus, t, locale] = await Promise.all([
    getResidentInvitations({ q: query, status: activeStatus }),
    getVerificationRequests({ q: query, status: activeReviewStatus }),
    getSystemStatus(),
    getTranslations("Onboarding"),
    getLocale(),
  ]);
  const isDegraded = systemStatus?.status !== "ok";
  const showVerificationWarning = isDegraded && verificationRequests.length === 0;
  const showInvitationsWarning = isDegraded && invitations.length === 0;
  const errorMessage =
    params.error === "resend_failed"
      ? t("messages.resendFailed")
      : params.error === "revoke_failed"
        ? t("messages.revokeFailed")
        : params.error === "approve_failed"
          ? t("messages.approveFailed")
          : params.error === "reject_failed"
            ? t("messages.rejectFailed")
            : params.error === "more_info_failed"
              ? t("messages.moreInfoFailed")
              : null;

  const invitationStatuses: Array<{ label: string; value: InvitationStatus | "all" }> = [
    { label: t("filters.all"), value: "all" },
    { label: t("invitationStatuses.pending"), value: "pending" },
    { label: t("invitationStatuses.expired"), value: "expired" },
    { label: t("invitationStatuses.accepted"), value: "accepted" },
    { label: t("invitationStatuses.revoked"), value: "revoked" },
  ];

  const reviewStatuses: Array<{ label: string; value: VerificationRequestStatus | "all" }> = [
    { label: t("filters.all"), value: "all" },
    { label: t("reviewStatuses.pending_review"), value: "pending_review" },
    { label: t("reviewStatuses.more_info_requested"), value: "more_info_requested" },
    { label: t("reviewStatuses.approved"), value: "approved" },
    { label: t("reviewStatuses.rejected"), value: "rejected" },
  ];

  const invitationStatusLabel: Record<InvitationStatus, string> = {
    accepted: t("invitationStatuses.accepted"),
    expired: t("invitationStatuses.expired"),
    pending: t("invitationStatuses.pending"),
    revoked: t("invitationStatuses.revoked"),
  };

  const reviewStatusLabel: Record<VerificationRequestStatus, string> = {
    approved: t("reviewStatuses.approved"),
    more_info_requested: t("reviewStatuses.more_info_requested"),
    pending_review: t("reviewStatuses.pending_review"),
    rejected: t("reviewStatuses.rejected"),
  };

  const roleLabel: Record<string, string> = {
    board_member: t("roles.board_member"),
    compound_admin: t("roles.compound_admin"),
    finance_reviewer: t("roles.finance_reviewer"),
    resident_owner: t("roles.resident_owner"),
    resident_tenant: t("roles.resident_tenant"),
    security_guard: t("roles.security_guard"),
    super_admin: t("roles.super_admin"),
    support_agent: t("roles.support_agent"),
  };

  const relationLabel: Record<string, string> = {
    owner: t("relations.owner"),
    representative: t("relations.representative"),
    resident: t("relations.resident"),
    tenant: t("relations.tenant"),
  };

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
              {t("back")}
            </Link>
            <h1 className="mt-2 text-3xl font-semibold">{t("title")}</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              {t("subtitle")}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              className="inline-flex h-11 items-center justify-center rounded-lg border border-line bg-panel px-4 text-sm font-semibold hover:border-brand"
              href="/compounds"
            >
              {t("propertyRegistry")}
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-6 lg:px-8">
        {params.resent ? (
          <p className="mb-4 rounded-lg bg-[#e6f3ef] px-4 py-3 text-sm font-medium text-brand">
            {t("messages.resent")}
          </p>
        ) : null}
        {params.revoked ? (
          <p className="mb-4 rounded-lg bg-[#fff3f2] px-4 py-3 text-sm font-medium text-danger">
            {t("messages.revoked")}
          </p>
        ) : null}
        {params.approved ? (
          <p className="mb-4 rounded-lg bg-[#e6f3ef] px-4 py-3 text-sm font-medium text-brand">
            {t("messages.approved")}
          </p>
        ) : null}
        {params.rejected ? (
          <p className="mb-4 rounded-lg bg-[#fff3f2] px-4 py-3 text-sm font-medium text-danger">
            {t("messages.rejected")}
          </p>
        ) : null}
        {params.moreInfo ? (
          <p className="mb-4 rounded-lg bg-[#eaf0ff] px-4 py-3 text-sm font-medium text-[#244a8f]">
            {t("messages.moreInfo")}
          </p>
        ) : null}
        {errorMessage ? (
          <p className="mb-4 rounded-lg bg-[#fff3f2] px-4 py-3 text-sm font-medium text-danger">
            {errorMessage}
          </p>
        ) : null}

        <div className="mb-8">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-xl font-semibold">{t("verification.title")}</h2>
              <p className="mt-1 max-w-2xl text-sm text-muted">
                {t("verification.subtitle")}
              </p>
            </div>
            <nav className="flex flex-wrap gap-2" aria-label={t("verification.filtersLabel")}>
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

          {showVerificationWarning ? (
            <div className="mb-4 rounded-lg border border-[#e7d7a9] bg-[#fff8e8] px-4 py-3 text-sm text-[#7a5d1a]">
              <p className="font-semibold">{t("degraded.verificationTitle")}</p>
              <p className="mt-1">{t("degraded.verificationDescription")}</p>
            </div>
          ) : null}

          <div className="overflow-x-auto rounded-lg border border-line bg-panel">
            <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
              <thead className="bg-background text-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">{t("fields.resident")}</th>
                  <th className="px-4 py-3 font-semibold">{t("fields.requestedAccess")}</th>
                  <th className="px-4 py-3 font-semibold">{t("fields.unit")}</th>
                  <th className="px-4 py-3 font-semibold">{t("fields.reviewStatus")}</th>
                  <th className="px-4 py-3 font-semibold">{t("fields.decisionNotes")}</th>
                  <th className="px-4 py-3 font-semibold">{t("fields.reviewActions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {verificationRequests.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-muted" colSpan={6}>
                      {t("verification.empty")}
                    </td>
                  </tr>
                ) : (
                  verificationRequests.map((request) => (
                    <tr key={request.id}>
                      <td className="px-4 py-4 align-top">
                        <div className="font-semibold">{request.user?.name ?? t("fallback.user", { id: request.userId })}</div>
                        <div className="text-muted">{request.user?.email ?? t("fallback.emailUnavailable")}</div>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div>{roleLabel[request.requestedRole] ?? request.requestedRole}</div>
                        <div className="text-muted">
                          {request.relationType ? relationLabel[request.relationType] ?? request.relationType : t("fallback.notSet")}
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top">
                        {request.unit ? (
                          <Link className="font-semibold text-brand hover:text-brand-strong" href={`/units/${request.unit.id}`}>
                            {request.unit.unitNumber}
                          </Link>
                        ) : (
                          <span className="text-muted">{t("fallback.notLinked")}</span>
                        )}
                      </td>
                      <td className="px-4 py-4 align-top">
                        <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${reviewStatusTone(request.status)}`}>
                          {reviewStatusLabel[request.status]}
                        </span>
                        <div className="mt-2 text-xs text-muted">
                          {t("dates.submitted", { date: formatDate(request.submittedAt, locale, t("fallback.notSet")) })}
                        </div>
                        {request.reviewedAt ? (
                          <div className="text-xs text-muted">
                            {t("dates.reviewed", { date: formatDate(request.reviewedAt, locale, t("fallback.notSet")) })}
                          </div>
                        ) : null}
                      </td>
                      <td className="max-w-64 px-4 py-4 align-top text-sm">
                        {request.decisionNote ? <p>{request.decisionNote}</p> : null}
                        {request.moreInfoNote ? <p className="mt-2 text-[#244a8f]">{request.moreInfoNote}</p> : null}
                        {!request.decisionNote && !request.moreInfoNote ? <span className="text-muted">{t("fallback.noNote")}</span> : null}
                      </td>
                      <td className="px-4 py-4 align-top">
                        {canReview(request) ? (
                          <div className="grid min-w-80 gap-2">
                            <form action={approveVerificationRequestAction.bind(null, request.id)} className="flex gap-2">
                              <input
                                className="h-10 min-w-0 flex-1 rounded-lg border border-line px-2"
                                name="note"
                                placeholder={t("actions.approvalNote")}
                              />
                              <button
                                className="inline-flex h-10 items-center justify-center rounded-lg bg-brand px-3 text-sm font-semibold text-white hover:bg-brand-strong"
                                type="submit"
                              >
                                {t("actions.approve")}
                              </button>
                            </form>
                            <form action={rejectVerificationRequestAction.bind(null, request.id)} className="flex gap-2">
                              <input
                                className="h-10 min-w-0 flex-1 rounded-lg border border-line px-2"
                                name="note"
                                placeholder={t("actions.rejectionReason")}
                                required
                              />
                              <button
                                className="inline-flex h-10 items-center justify-center rounded-lg border border-danger px-3 text-sm font-semibold text-danger"
                                type="submit"
                              >
                                {t("actions.reject")}
                              </button>
                            </form>
                            <form action={requestMoreInfoAction.bind(null, request.id)} className="flex gap-2">
                              <input
                                className="h-10 min-w-0 flex-1 rounded-lg border border-line px-2"
                                name="note"
                                placeholder={t("actions.requestedInformation")}
                                required
                              />
                              <button
                                className="inline-flex h-10 items-center justify-center rounded-lg border border-line px-3 text-sm font-semibold hover:border-brand"
                                type="submit"
                              >
                                {t("actions.askInfo")}
                              </button>
                            </form>
                          </div>
                        ) : (
                          <span className="text-muted">{t("actions.closed")}</span>
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
            <h2 className="text-xl font-semibold">{t("invitations.title")}</h2>
            <nav className="mt-3 flex flex-wrap gap-2" aria-label={t("invitations.filtersLabel")}>
              {invitationStatuses.map((status) => (
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
              placeholder={t("filters.searchPlaceholder")}
              type="search"
            />
            <button
              className="inline-flex h-11 items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong"
              type="submit"
            >
              {t("filters.search")}
            </button>
          </form>
        </div>

        {showInvitationsWarning ? (
          <div className="mb-4 rounded-lg border border-[#e7d7a9] bg-[#fff8e8] px-4 py-3 text-sm text-[#7a5d1a]">
            <p className="font-semibold">{t("degraded.invitationsTitle")}</p>
            <p className="mt-1">{t("degraded.invitationsDescription")}</p>
          </div>
        ) : null}

        <div className="overflow-hidden rounded-lg border border-line bg-panel">
          <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-background text-muted">
                <tr>
                <th className="px-4 py-3 font-semibold">{t("fields.resident")}</th>
                <th className="px-4 py-3 font-semibold">{t("fields.role")}</th>
                <th className="px-4 py-3 font-semibold">{t("fields.unit")}</th>
                <th className="px-4 py-3 font-semibold">{t("fields.status")}</th>
                <th className="px-4 py-3 font-semibold">{t("fields.delivery")}</th>
                <th className="px-4 py-3 font-semibold">{t("fields.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {invitations.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-muted" colSpan={6}>
                    {t("invitations.empty")}
                    </td>
                  </tr>
              ) : (
                invitations.map((invitation) => (
                  <tr key={invitation.id}>
                    <td className="px-4 py-4">
                      <div className="font-semibold">{invitation.user?.name ?? t("fallback.pendingResident")}</div>
                      <div className="text-muted">{invitation.email}</div>
                    </td>
                    <td className="px-4 py-4">{roleLabel[invitation.role] ?? invitation.role}</td>
                    <td className="px-4 py-4">
                      {invitation.unit ? (
                        <Link className="font-semibold text-brand hover:text-brand-strong" href={`/units/${invitation.unit.id}`}>
                          {invitation.unit.unitNumber}
                        </Link>
                      ) : (
                        <span className="text-muted">{t("fallback.notLinked")}</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${statusTone(invitation.status)}`}>
                        {invitationStatusLabel[invitation.status]}
                      </span>
                      <div className="mt-2 text-xs text-muted">
                        {t("dates.expires", { date: formatDate(invitation.expiresAt, locale, t("fallback.notSet")) })}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div>{t("delivery.sent", { count: invitation.deliveryCount })}</div>
                      <div className="text-muted">{formatDate(invitation.lastSentAt, locale, t("fallback.notSet"))}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        {canResend(invitation) ? (
                          <form action={resendInvitationAction.bind(null, invitation.id)}>
                            <button
                              className="inline-flex h-10 items-center justify-center rounded-lg border border-line px-3 text-sm font-semibold hover:border-brand"
                              type="submit"
                            >
                              {t("actions.resend")}
                            </button>
                          </form>
                        ) : null}
                        {canRevoke(invitation) ? (
                          <form action={revokeInvitationAction.bind(null, invitation.id)}>
                            <button
                              className="inline-flex h-10 items-center justify-center rounded-lg border border-danger px-3 text-sm font-semibold text-danger"
                              type="submit"
                            >
                              {t("actions.revoke")}
                            </button>
                          </form>
                        ) : null}
                        {!canResend(invitation) && !canRevoke(invitation) ? <span className="text-muted">{t("actions.noAction")}</span> : null}
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
