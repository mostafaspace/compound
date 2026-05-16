import type { PollStatus } from "@compound/contracts";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { SiteNav } from "@/components/site-nav";
import { getCurrentUser, getPoll, getPollVoters } from "@/lib/api";
import { summarizePollEngagement, summarizePollTransparency } from "@/lib/poll-transparency";
import { requireAdminUser } from "@/lib/session";
import { closePollDetailAction, publishPollDetailAction } from "./actions";

interface PollDetailPageProps {
  params: Promise<{ pollId: string }>;
  searchParams?: Promise<{ published?: string; closed?: string }>;
}

function statusTone(status: PollStatus): string {
  if (status === "active") return "bg-[#e6f3ef] text-brand";
  if (status === "closed") return "bg-[#eaf0ff] text-[#244a8f]";
  if (status === "archived") return "bg-[#f3f4f6] text-[#6b7280]";
  return "bg-[#f3ead7] text-accent";
}

function pct(count: number, total: number): string {
  if (total === 0) return "0%";
  return `${Math.round((count / total) * 100)}%`;
}

function formatDate(value: string | null, locale: string): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}

function StatCard({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return (
    <div className="rounded-lg border border-line bg-panel p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
      {helper ? <p className="mt-1 text-sm text-muted">{helper}</p> : null}
    </div>
  );
}

export default async function PollDetailPage({ params, searchParams }: PollDetailPageProps) {
  await requireAdminUser(getCurrentUser);
  const { pollId } = await params;
  const sp = searchParams ? await searchParams : {};
  const locale = await getLocale();
  const t = await getTranslations("PollsVoting");

  const poll = await getPoll(pollId);
  if (!poll) notFound();

  const fetchedVoters = await getPollVoters(poll.id);
  const voters = fetchedVoters ?? poll.voters ?? [];
  const options = poll.options ?? [];
  const totalVotes = poll.votesCount ?? 0;
  const transparency = summarizePollTransparency({
    ...poll,
    voters,
  });
  const engagement = summarizePollEngagement({
    ...poll,
    voters,
  });

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteNav breadcrumb={[{ label: t("detail.pollsBreadcrumb"), href: "/polls" }, { label: poll.title }]} />
      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <Link className="text-sm font-semibold text-brand hover:text-brand-strong" href="/polls">
              {t("detail.backToPolls")}
            </Link>
            <h1 className="mt-2 text-3xl font-semibold">{poll.title}</h1>
            <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted">
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusTone(poll.status)}`}>
                {t(`statuses.${poll.status}`)}
              </span>
              <span>{poll.allowMultiple ? t("detail.multiChoice") : t("detail.singleChoice")}</span>
              <span>·</span>
              <span>{t(`eligibility.${poll.eligibility}`)}</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {poll.status === "draft" ? (
              <form action={publishPollDetailAction.bind(null, poll.id)}>
                <button
                  type="submit"
                  className="inline-flex h-10 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong"
                >
                  {t("detail.publish")}
                </button>
              </form>
            ) : null}
            {poll.status === "active" ? (
              <form action={closePollDetailAction.bind(null, poll.id)}>
                <button
                  type="submit"
                  className="inline-flex h-10 items-center rounded-lg border border-line px-4 text-sm font-semibold hover:border-brand"
                >
                  {t("detail.closePoll")}
                </button>
              </form>
            ) : null}

          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl space-y-6 px-5 py-6 lg:px-8">
        {sp.published ? (
          <p className="rounded-lg bg-[#e6f3ef] px-4 py-3 text-sm font-medium text-brand">
            {t("detail.publishedMessage")}
          </p>
        ) : null}
        {sp.closed ? (
          <p className="rounded-lg bg-[#eaf0ff] px-4 py-3 text-sm font-medium text-[#244a8f]">
            {t("detail.closedMessage")}
          </p>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label={t("detail.deliveryProof")}
            value={`${transparency.deliveryRate}%`}
            helper={t("detail.notificationsDelivered", {
              delivered: transparency.deliveredNotifications,
              total: transparency.totalNotifications,
            })}
          />
          <StatCard
            label={t("detail.readership")}
            value={`${transparency.uniqueViewers}`}
            helper={t("detail.totalOpens", { count: transparency.totalViews })}
          />
          <StatCard
            label={t("detail.namedBallots")}
            value={`${transparency.uniqueVoterCount}`}
            helper={t("detail.representedUnits", { count: transparency.uniqueUnitCount })}
          />
          <StatCard
            label={t("detail.awaitingApartmentVote")}
            value={`${engagement.awaitingApartmentVoteCount}`}
            helper={t("detail.awaitingApartmentVoteHelp")}
          />
          <StatCard
            label={t("detail.latestLifecycleEvent")}
            value={formatDate(transparency.latestActivityAt, locale)}
            helper={t("detail.latestLifecycleEventHelp")}
          />
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="space-y-6 md:col-span-2">
            {poll.description ? (
              <div className="rounded-lg border border-line bg-panel p-5">
                <h2 className="text-lg font-semibold">{t("fields.description")}</h2>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{poll.description}</p>
              </div>
            ) : null}

            <div className="rounded-lg border border-line bg-panel p-5">
              <h2 className="text-lg font-semibold">{t("tally.title")}</h2>
              <p className="mt-1 text-sm text-muted">{t("tally.votes", { count: totalVotes })}</p>

              {options.length === 0 ? (
                <p className="mt-4 text-sm text-muted">{t("detail.noOptions")}</p>
              ) : (
                <div className="mt-4 space-y-4">
                  {options.map((opt) => (
                    <div key={opt.id}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{opt.label}</span>
                        <span className="tabular-nums text-muted">
                          {opt.votesCount} ({pct(opt.votesCount, totalVotes)})
                        </span>
                      </div>
                      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-line">
                        <div
                          className="h-2 rounded-full bg-brand transition-all"
                          style={{ width: pct(opt.votesCount, totalVotes) }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-lg border border-line bg-panel p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">{t("detail.participationLedger")}</h2>
                  <p className="mt-1 text-sm text-muted">
                    {t("detail.participationLedgerSubtitle")}
                  </p>
                </div>
                <div className="rounded-lg bg-background px-3 py-2 text-end text-sm">
                  <div className="font-semibold">{t("detail.ballotsCaptured", { count: voters.length })}</div>
                  <div className="text-muted">{t("detail.representedUnits", { count: transparency.uniqueUnitCount })}</div>
                </div>
              </div>

              {voters.length === 0 ? (
                <p className="mt-4 text-sm text-muted">{t("detail.noBallots")}</p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-line text-start text-xs font-semibold text-muted">
                        <th className="pb-2">{t("transparency.resident")}</th>
                        <th className="pb-2">{t("transparency.unit")}</th>
                        <th className="pb-2">{t("detail.choices")}</th>
                        <th className="pb-2">{t("transparency.votedAt")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {voters.map((voter, idx) => (
                        <tr key={`${voter.userId}-${idx}`} className="border-b border-line last:border-0">
                          <td className="py-2 font-medium">{voter.userName ?? t("detail.unknown")}</td>
                          <td className="py-2">{voter.unitNumber ?? t("detail.emptyValue")}</td>
                          <td className="py-2">{voter.options.join(", ") || t("detail.emptyValue")}</td>
                          <td className="py-2 text-muted">{formatDate(voter.votedAt, locale)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="rounded-lg border border-line bg-panel p-5">
              <h2 className="text-lg font-semibold">{t("detail.transparencyGaps")}</h2>
              <p className="mt-1 text-sm text-muted">
                {t("detail.transparencyGapsSubtitle")}
              </p>

              <div className="mt-4 grid gap-4 xl:grid-cols-2">
                <div className="rounded-lg bg-background p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">{t("detail.deliveredButNotOpened")}</div>
                  {engagement.deliveredButNotOpened.length === 0 ? (
                    <p className="mt-3 text-sm text-muted">{t("detail.everyoneOpened")}</p>
                  ) : (
                    <ul className="mt-3 space-y-2 text-sm">
                      {engagement.deliveredButNotOpened.map((log, idx) => (
                        <li key={`${log.userId}-${idx}`} className="flex items-center justify-between gap-3">
                          <span className="font-medium">{log.userName ?? t("detail.unknown")}</span>
                          <span className="text-muted">{formatDate(log.notifiedAt, locale)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="rounded-lg bg-background p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">{t("detail.openedButApartmentNotVoted")}</div>
                  {engagement.openedButApartmentNotVoted.length === 0 ? (
                    <p className="mt-3 text-sm text-muted">{t("detail.everyOpenedApartmentVoted")}</p>
                  ) : (
                    <ul className="mt-3 space-y-2 text-sm">
                      {engagement.openedButApartmentNotVoted.map((log, idx) => (
                        <li key={`${log.userId}-${idx}`} className="flex items-center justify-between gap-3">
                          <span className="font-medium">{log.userName ?? t("detail.unknown")}</span>
                          <span className="text-muted">{formatDate(log.lastViewedAt, locale)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <div className="rounded-lg border border-line bg-panel p-5">
                <h2 className="text-lg font-semibold">{t("detail.notificationDelivery")}</h2>
                <p className="mt-1 text-sm text-muted">
                  {t("detail.notificationDeliverySubtitle")}
                </p>

                {poll.notificationLogs && poll.notificationLogs.length > 0 ? (
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-line text-start text-xs font-semibold text-muted">
                          <th className="pb-2">{t("transparency.resident")}</th>
                          <th className="pb-2">{t("detail.channel")}</th>
                          <th className="pb-2">{t("detail.notifiedAt")}</th>
                          <th className="pb-2">{t("fields.status")}</th>
                          <th className="pb-2">{t("detail.deliveredAt")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {poll.notificationLogs.map((log, idx) => (
                          <tr key={`${log.userName ?? "unknown"}-${idx}`} className="border-b border-line last:border-0">
                            <td className="py-2 font-medium">{log.userName ?? t("detail.unknown")}</td>
                            <td className="py-2 text-muted">{log.channel}</td>
                            <td className="py-2 text-muted">{formatDate(log.notifiedAt, locale)}</td>
                            <td className="py-2">
                              <span
                                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                  log.delivered ? "bg-[#e6f3ef] text-brand" : "bg-[#fff3f2] text-danger"
                                }`}
                              >
                                {log.delivered ? t("detail.delivered") : t("detail.pending")}
                              </span>
                            </td>
                            <td className="py-2 text-muted">{formatDate(log.deliveredAt, locale)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-muted">{t("detail.noNotificationReceipts")}</p>
                )}
              </div>

              <div className="rounded-lg border border-line bg-panel p-5">
                <h2 className="text-lg font-semibold">{t("detail.readReceipts")}</h2>
                <p className="mt-1 text-sm text-muted">
                  {t("detail.readReceiptsSubtitle")}
                </p>

                {engagement.openedButApartmentNotVoted.length > 0 || (poll.viewLogs ?? []).some((log) => log.unitId !== null) ? (
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-line text-start text-xs font-semibold text-muted">
                          <th className="pb-2">{t("transparency.resident")}</th>
                          <th className="pb-2">{t("detail.firstViewed")}</th>
                          <th className="pb-2">{t("detail.lastViewed")}</th>
                          <th className="pb-2">{t("detail.views")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(poll.viewLogs ?? [])
                          .filter((log) => log.unitId !== null)
                          .map((log, idx) => (
                          <tr key={`${log.userName ?? "unknown"}-${idx}`} className="border-b border-line last:border-0">
                            <td className="py-2 font-medium">{log.userName ?? t("detail.unknown")}</td>
                            <td className="py-2 text-muted">{formatDate(log.firstViewedAt, locale)}</td>
                            <td className="py-2 text-muted">{formatDate(log.lastViewedAt, locale)}</td>
                            <td className="py-2">{log.viewCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-muted">{t("detail.noReadReceipts")}</p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="self-start rounded-lg border border-line bg-panel p-5 space-y-4">
              <div>
                <span className="text-xs font-semibold text-muted">{t("fields.status")}</span>
                <div className="mt-1">
                  <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${statusTone(poll.status)}`}>
                    {t(`statuses.${poll.status}`)}
                  </span>
                </div>
              </div>
              {poll.pollType ? (
                <div>
                  <span className="text-xs font-semibold text-muted">{t("detail.category")}</span>
                  <div
                    className="mt-1 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold"
                    style={{ backgroundColor: poll.pollType.color + "22", color: poll.pollType.color }}
                  >
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: poll.pollType.color }}
                    />
                    {poll.pollType.name}
                  </div>
                </div>
              ) : null}
              <div>
                <span className="text-xs font-semibold text-muted">{t("fields.eligibility")}</span>
                <div className="mt-1 text-sm">{t(`eligibility.${poll.eligibility}`)}</div>
              </div>
              <div>
                <span className="text-xs font-semibold text-muted">{t("fields.scope")}</span>
                <div className="mt-1 text-sm">{t(`scopes.${poll.scope}`)}</div>
              </div>
              <div>
                <span className="text-xs font-semibold text-muted">{t("detail.transparency")}</span>
                <div className="mt-1 text-sm">{t("detail.transparencySummary")}</div>
              </div>
              <div>
                <span className="text-xs font-semibold text-muted">{t("detail.multipleChoices")}</span>
                <div className="mt-1 text-sm">
                  {poll.allowMultiple
                    ? poll.maxChoices
                      ? t("detail.yesMax", { count: poll.maxChoices })
                      : t("detail.yes")
                    : t("detail.no")}
                </div>
              </div>
              <div>
                <span className="text-xs font-semibold text-muted">{t("fields.startsAt")}</span>
                <div className="mt-1 text-sm">{formatDate(poll.startsAt, locale)}</div>
              </div>
              <div>
                <span className="text-xs font-semibold text-muted">{t("detail.publishedAt")}</span>
                <div className="mt-1 text-sm">{formatDate(transparency.firstPublicationAt, locale)}</div>
              </div>
              <div>
                <span className="text-xs font-semibold text-muted">{t("fields.endsAt")}</span>
                <div className="mt-1 text-sm">{formatDate(poll.endsAt, locale)}</div>
              </div>
              <div>
                <span className="text-xs font-semibold text-muted">{t("detail.closedAt")}</span>
                <div className="mt-1 text-sm">{formatDate(transparency.closedAt, locale)}</div>
              </div>
              <div>
                <span className="text-xs font-semibold text-muted">{t("detail.totalVotes")}</span>
                <div className="mt-1 text-2xl font-bold">{totalVotes}</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
