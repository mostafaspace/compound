import type { VoteEligibility, VoteStatus, VoteType } from "@compound/contracts";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { LogoutButton } from "@/components/logout-button";
import { getCurrentUser, getVote } from "@/lib/api";
import { requireAdminUser } from "@/lib/session";

import { activateVoteAction, cancelVoteAction, closeVoteAction } from "../actions";

interface VoteDetailPageProps {
  params: Promise<{ voteId: string }>;
  searchParams?: Promise<{ closed?: string }>;
}

function statusTone(status: VoteStatus): string {
  if (status === "active") return "bg-[#e6f3ef] text-brand";
  if (status === "closed") return "bg-[#eaf0ff] text-[#244a8f]";
  if (status === "cancelled") return "bg-[#fff3f2] text-danger";
  return "bg-[#f3ead7] text-accent";
}

function formatDate(value: string | null, locale: string): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function pct(count: number, total: number): string {
  if (total === 0) return "0%";
  return `${Math.round((count / total) * 100)}%`;
}

export default async function VoteDetailPage({ params, searchParams }: VoteDetailPageProps) {
  await requireAdminUser(getCurrentUser);
  const { voteId } = await params;
  const sp = searchParams ? await searchParams : {};
  const locale = await getLocale();
  const t = await getTranslations("Governance");

  const vote = await getVote(voteId);
  if (!vote) notFound();

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

  const totalVotes = vote.participationsCount ?? 0;
  const tally = vote.tally ?? [];

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <Link className="text-sm font-semibold text-brand hover:text-brand-strong" href="/governance">
              ← {t("title")}
            </Link>
            <h1 className="mt-2 text-3xl font-semibold">{vote.title}</h1>
            <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted">
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusTone(vote.status)}`}>
                {statusLabel[vote.status]}
              </span>
              <span>{typeLabel[vote.type]}</span>
              <span>·</span>
              <span>{eligibilityLabel[vote.eligibility]}</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {vote.status === "active" ? (
              <form action={closeVoteAction.bind(null, vote.id)}>
                <button
                  className="inline-flex h-10 items-center rounded-lg border border-line px-4 text-sm font-semibold hover:border-brand"
                  type="submit"
                >
                  {t("close")}
                </button>
              </form>
            ) : null}
            {vote.status === "draft" ? (
              <form action={activateVoteAction.bind(null, vote.id)}>
                <button
                  className="inline-flex h-10 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong"
                  type="submit"
                >
                  {t("activate")}
                </button>
              </form>
            ) : null}
            {vote.status !== "closed" && vote.status !== "cancelled" ? (
              <form action={cancelVoteAction.bind(null, vote.id)}>
                <button
                  className="inline-flex h-10 items-center rounded-lg border border-danger px-4 text-sm font-semibold text-danger hover:bg-[#fff3f2]"
                  type="submit"
                >
                  {t("cancel")}
                </button>
              </form>
            ) : null}
            <LogoutButton />
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl space-y-6 px-5 py-6 lg:px-8">
        {sp.closed ? (
          <p className="rounded-lg bg-[#eaf0ff] px-4 py-3 text-sm font-medium text-[#244a8f]">
            {t("messages.closed")}
          </p>
        ) : null}

        <div className="grid gap-6 md:grid-cols-3">
          {/* Left: description + tally */}
          <div className="md:col-span-2 space-y-6">
            {vote.description ? (
              <div className="rounded-lg border border-line bg-panel p-5">
                <h2 className="text-lg font-semibold">{t("fields.description")}</h2>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{vote.description}</p>
              </div>
            ) : null}

            {/* Results tally */}
            <div className="rounded-lg border border-line bg-panel p-5">
              <h2 className="text-lg font-semibold">{t("tally.title")}</h2>
              <p className="mt-1 text-sm text-muted">{totalVotes} {t("fields.participants").toLowerCase()}</p>

              {tally.length === 0 ? (
                <p className="mt-4 text-sm text-muted">{t("noVotes")}</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {tally.map((row) => (
                    <div key={row.optionId}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{row.label}</span>
                        <span className="font-semibold tabular-nums">
                          {row.count} ({pct(row.count, totalVotes)})
                        </span>
                      </div>
                      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-line">
                        <div
                          className="h-2 rounded-full bg-brand transition-all"
                          style={{ width: pct(row.count, totalVotes) }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: metadata */}
          <div className="space-y-6">
            <div className="rounded-lg border border-line bg-panel p-5 space-y-4">
              <div>
                <span className="text-xs font-semibold text-muted">{t("fields.status")}</span>
                <div className="mt-1">
                  <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${statusTone(vote.status)}`}>
                    {statusLabel[vote.status]}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-xs font-semibold text-muted">{t("fields.type")}</span>
                <div className="mt-1 text-sm">{typeLabel[vote.type]}</div>
              </div>
              <div>
                <span className="text-xs font-semibold text-muted">{t("fields.eligibility")}</span>
                <div className="mt-1 text-sm">{eligibilityLabel[vote.eligibility]}</div>
              </div>
              <div>
                <span className="text-xs font-semibold text-muted">{t("fields.startsAt")}</span>
                <div className="mt-1 text-sm">{formatDate(vote.startsAt, locale)}</div>
              </div>
              <div>
                <span className="text-xs font-semibold text-muted">{t("fields.endsAt")}</span>
                <div className="mt-1 text-sm">{formatDate(vote.endsAt, locale)}</div>
              </div>
              <div>
                <span className="text-xs font-semibold text-muted">{t("fields.participants")}</span>
                <div className="mt-1 text-2xl font-bold">{totalVotes}</div>
              </div>
            </div>

            {/* Options list */}
            {vote.options && vote.options.length > 0 ? (
              <div className="rounded-lg border border-line bg-panel p-5">
                <h3 className="text-sm font-semibold">{t("fields.options")}</h3>
                <ul className="mt-3 divide-y divide-line">
                  {vote.options.map((opt) => (
                    <li key={opt.id} className="py-2 text-sm">
                      {opt.label}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}
