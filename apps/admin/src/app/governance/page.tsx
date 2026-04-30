import type { VoteEligibility, VoteStatus, VoteType } from "@compound/contracts";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

import { LogoutButton } from "@/components/logout-button";
import { getCompounds, getCurrentUser, getSystemStatus, getVotes } from "@/lib/api";
import { hasEffectiveRole } from "@/lib/auth-access";
import { getCompoundContext, requireAdminUser } from "@/lib/session";

import { activateVoteAction, cancelVoteAction, createVoteAction } from "./actions";

interface GovernancePageProps {
  searchParams?: Promise<{
    created?: string;
    activated?: string;
    cancelled?: string;
  }>;
}

function statusTone(status: VoteStatus): string {
  if (status === "active") return "bg-[#e6f3ef] text-brand";
  if (status === "closed") return "bg-[#eaf0ff] text-[#244a8f]";
  if (status === "cancelled") return "bg-[#fff3f2] text-danger";
  return "bg-[#f3ead7] text-accent";
}

function formatDate(value: string | null, locale: string): string {
  if (!value) return "-";
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(value));
}

export default async function GovernancePage({ searchParams }: GovernancePageProps) {
  await requireAdminUser(getCurrentUser);
  const locale = await getLocale();
  const t = await getTranslations("Governance");
  const params = searchParams ? await searchParams : {};
  const [votes, systemStatus, currentUser, compounds, activeCompoundId] = await Promise.all([
    getVotes(),
    getSystemStatus(),
    getCurrentUser(),
    getCompounds(),
    getCompoundContext(),
  ]);
  const isDegraded = systemStatus?.status !== "ok";
  const showDegradedWarning = isDegraded && votes.length === 0;
  const isSuperAdmin = currentUser ? hasEffectiveRole(currentUser, "super_admin") : false;
  const defaultCompoundId = activeCompoundId ?? compounds[0]?.id ?? "";
  const lockedCompound = compounds.find((compound) => compound.id === defaultCompoundId) ?? compounds[0] ?? null;
  const canCreateVote = isSuperAdmin ? compounds.length > 0 : Boolean(lockedCompound);

  const typeLabel: Record<VoteType, string> = {
    poll: t("types.poll"),
    election: t("types.election"),
    decision: t("types.decision"),
  };

  const statusLabel: Record<VoteStatus, string> = {
    draft: t("statuses.draft"),
    active: t("statuses.active"),
    closed: t("statuses.closed"),
    cancelled: t("statuses.cancelled"),
  };

  const eligibilityLabel: Record<VoteEligibility, string> = {
    owners_only: t("eligibility.owners_only"),
    owners_and_residents: t("eligibility.owners_and_residents"),
    all_verified: t("eligibility.all_verified"),
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <Link className="text-sm font-semibold text-brand hover:text-brand-strong" href="/">
              {"<"} {t("back")}
            </Link>
            <h1 className="mt-2 text-3xl font-semibold">{t("title")}</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted">{t("subtitle")}</p>
          </div>
          <LogoutButton />
        </div>
      </header>

      <section className="mx-auto max-w-7xl space-y-8 px-5 py-6 lg:px-8">
        {params.created ? (
          <p className="rounded-lg bg-[#e6f3ef] px-4 py-3 text-sm font-medium text-brand">{t("messages.created")}</p>
        ) : null}
        {params.activated ? (
          <p className="rounded-lg bg-[#e6f3ef] px-4 py-3 text-sm font-medium text-brand">{t("messages.activated")}</p>
        ) : null}
        {params.cancelled ? (
          <p className="rounded-lg bg-[#fff3f2] px-4 py-3 text-sm font-medium text-danger">{t("messages.cancelled")}</p>
        ) : null}

        {showDegradedWarning ? (
          <div className="rounded-lg border border-[#e7d7a9] bg-[#fff8e8] px-4 py-3 text-sm text-[#7a5d1a]">
            <p className="font-semibold">{t("degraded.title")}</p>
            <p className="mt-1">{t("degraded.description")}</p>
          </div>
        ) : null}

        <div className="rounded-lg border border-line bg-panel p-5">
          <h2 className="text-lg font-semibold">{t("create.title")}</h2>
          <p className="mt-1 text-sm text-muted">{t("create.subtitle")}</p>

          <form action={createVoteAction} className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-semibold text-muted">
                {t("create.compoundId")}
                {isSuperAdmin ? (
                  <select
                    className="mt-1 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm"
                    defaultValue={defaultCompoundId}
                    name="compoundId"
                    required
                  >
                    {compounds.map((compound) => (
                      <option key={compound.id} value={compound.id}>
                        {compound.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <>
                    <input name="compoundId" type="hidden" value={lockedCompound?.id ?? ""} />
                    <div className="mt-1 rounded-lg border border-line bg-background px-3 py-2 text-sm text-foreground">
                      <div className="font-semibold">{lockedCompound?.name ?? t("create.noCompoundAccess")}</div>
                      <div className="mt-1 text-xs text-muted">{t("create.compoundLocked")}</div>
                    </div>
                  </>
                )}
              </label>
              <label className="text-xs font-semibold text-muted">
                {t("fields.type")}
                <select className="mt-1 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm" name="type">
                  <option value="poll">{typeLabel.poll}</option>
                  <option value="election">{typeLabel.election}</option>
                  <option value="decision">{typeLabel.decision}</option>
                </select>
              </label>
              <label className="text-xs font-semibold text-muted sm:col-span-2">
                {t("fields.title")}
                <input
                  className="mt-1 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm"
                  name="title"
                  required
                />
              </label>
              <label className="text-xs font-semibold text-muted sm:col-span-2">
                {t("fields.description")}
                <textarea
                  className="mt-1 h-20 w-full rounded-lg border border-line bg-background px-3 py-2 text-sm"
                  name="description"
                />
              </label>
              <label className="text-xs font-semibold text-muted">
                {t("fields.eligibility")}
                <select
                  className="mt-1 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm"
                  name="eligibility"
                >
                  <option value="owners_only">{eligibilityLabel.owners_only}</option>
                  <option value="owners_and_residents">{eligibilityLabel.owners_and_residents}</option>
                  <option value="all_verified">{eligibilityLabel.all_verified}</option>
                </select>
              </label>
              <label className="text-xs font-semibold text-muted">
                {t("fields.endsAt")}
                <input
                  className="mt-1 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm"
                  name="endsAt"
                  type="datetime-local"
                />
              </label>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted">{t("fields.options")} (min. 2)</p>
              {[0, 1, 2, 3].map((i) => (
                <input
                  key={i}
                  className="h-10 w-full rounded-lg border border-line bg-background px-3 text-sm"
                  name={`option_${i}`}
                  placeholder={`${t("fields.options")} ${i + 1}${i < 2 ? " *" : ""}`}
                  required={i < 2}
                />
              ))}
            </div>

            <button
              className="inline-flex h-10 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!canCreateVote}
              type="submit"
            >
              {t("create.submit")}
            </button>
            {!canCreateVote ? <p className="text-xs text-danger">{t("create.noCompoundAccess")}</p> : null}
          </form>
        </div>

        <div className="rounded-lg border border-line bg-panel p-5">
          <h2 className="text-lg font-semibold">{t("title")}</h2>

          {votes.length === 0 ? (
            <p className="mt-4 text-sm text-muted">{t("noVotes")}</p>
          ) : (
            <div className="mt-4 space-y-3">
              {votes.map((vote) => (
                <div key={vote.id} className="rounded-lg border border-line bg-background p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusTone(vote.status)}`}>
                          {statusLabel[vote.status]}
                        </span>
                        <span className="text-xs text-muted">{typeLabel[vote.type]}</span>
                        <span className="text-xs text-muted">{eligibilityLabel[vote.eligibility]}</span>
                      </div>
                      <p className="mt-1 font-semibold">{vote.title}</p>
                      {vote.description ? (
                        <p className="mt-1 text-sm text-muted line-clamp-2">{vote.description}</p>
                      ) : null}
                      <p className="mt-1 text-xs text-muted">
                        {vote.endsAt ? `Ends ${formatDate(vote.endsAt, locale)}` : null}
                      </p>
                      {vote.options && vote.options.length > 0 ? (
                        <p className="mt-1 text-xs text-muted">{vote.options.map((o) => o.label).join(" | ")}</p>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Link
                        className="inline-flex h-8 items-center rounded-lg border border-line px-3 text-xs font-semibold hover:border-brand"
                        href={`/governance/${vote.id}`}
                      >
                        {t("viewResults")}
                      </Link>

                      {vote.status === "draft" ? (
                        <form action={activateVoteAction.bind(null, vote.id)}>
                          <button
                            className="inline-flex h-8 items-center rounded-lg bg-brand px-3 text-xs font-semibold text-white hover:bg-brand-strong"
                            type="submit"
                          >
                            {t("activate")}
                          </button>
                        </form>
                      ) : null}

                      {vote.status !== "closed" && vote.status !== "cancelled" ? (
                        <form action={cancelVoteAction.bind(null, vote.id)}>
                          <button
                            className="inline-flex h-8 items-center rounded-lg border border-danger px-3 text-xs font-semibold text-danger hover:bg-[#fff3f2]"
                            type="submit"
                          >
                            {t("cancel")}
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
