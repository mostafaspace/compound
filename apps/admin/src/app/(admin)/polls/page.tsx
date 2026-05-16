import type { PollStatus } from "@compound/contracts";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

import { AdminPagination } from "@/components/admin-pagination";
import { SiteNav } from "@/components/site-nav";
import { getCurrentUser, getPollsPage } from "@/lib/api";
import { requireAdminUser } from "@/lib/session";
import { publishPollAction, closePollAction } from "./actions";

function statusTone(status: PollStatus): string {
  if (status === "active") return "bg-[#e6f3ef] text-brand";
  if (status === "closed") return "bg-[#eaf0ff] text-[#244a8f]";
  if (status === "archived") return "bg-[#f3f4f6] text-[#6b7280]";
  return "bg-[#f3ead7] text-accent";
}

function formatDate(value: string | null, locale: string): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(value));
}

interface PollsPageProps {
  searchParams?: Promise<{ page?: string; published?: string }>;
}

export default async function PollsPage({ searchParams }: PollsPageProps) {
  await requireAdminUser(getCurrentUser);
  const params = searchParams ? await searchParams : {};
  const page = Math.max(1, Number(params.page ?? "1") || 1);
  const [locale, commonT, t, pollsPage] = await Promise.all([
    getLocale(),
    getTranslations("Common"),
    getTranslations("PollsVoting"),
    getPollsPage({ page }),
  ]);
  const polls = pollsPage.data;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteNav breadcrumb={[{ label: t("title") }]} />
      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <Link className="text-sm font-semibold text-brand hover:text-brand-strong" href="/">
              {t("back")}
            </Link>
            <h1 className="mt-2 text-3xl font-semibold">{t("title")}</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted">{t("subtitle")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/polls/types"
              className="inline-flex h-10 items-center rounded-lg border border-line px-4 text-sm font-semibold hover:border-brand"
            >
              {t("list.categories")}
            </Link>
            <Link
              href="/polls/new"
              className="inline-flex h-10 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong"
            >
              {t("list.newPoll")}
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl space-y-8 px-5 py-6 lg:px-8">
        {params.published ? (
          <p className="rounded-lg bg-[#e6f3ef] px-4 py-3 text-sm font-medium text-brand">
            {t("list.publishedSuccessfully")}
          </p>
        ) : null}

        <div className="rounded-lg border border-line bg-panel p-5">
          <div className="flex flex-col gap-1 border-b border-line pb-4">
            <h2 className="text-lg font-semibold">{t("list.allPolls")}</h2>
            <p className="text-sm text-muted">
              {commonT("pagination.summary", {
                from: pollsPage.meta.from ?? 0,
                to: pollsPage.meta.to ?? 0,
                total: pollsPage.meta.total,
              })}
            </p>
          </div>

          {polls.length === 0 ? (
            <p className="mt-4 text-sm text-muted">{t("list.empty")}</p>
          ) : (
            <div className="mt-4 space-y-3">
              {polls.map((poll) => (
                <div key={poll.id} className="rounded-lg border border-line bg-background p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusTone(poll.status)}`}
                        >
                          {t(`statuses.${poll.status}`)}
                        </span>
                        {poll.pollType ? (
                          <span
                            className="rounded-full px-2 py-0.5 text-xs font-semibold"
                            style={{
                              backgroundColor: poll.pollType.color + "22",
                              color: poll.pollType.color,
                            }}
                          >
                            {poll.pollType.name}
                          </span>
                        ) : null}
                        {poll.allowMultiple ? (
                          <span className="text-xs text-muted">{t("detail.multiChoice")}</span>
                        ) : null}
                        <span className="text-xs text-muted">{t("tally.votes", { count: poll.votesCount })}</span>
                      </div>
                      <p className="mt-1 font-semibold">{poll.title}</p>
                      {poll.description ? (
                        <p className="mt-1 text-sm text-muted line-clamp-2">{poll.description}</p>
                      ) : null}
                      {poll.endsAt ? (
                        <p className="mt-1 text-xs text-muted">
                          {t("list.ends", { date: formatDate(poll.endsAt, locale) })}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/polls/${poll.id}`}
                        className="inline-flex h-8 items-center rounded-lg border border-line px-3 text-xs font-semibold hover:border-brand"
                      >
                        {t("viewResults")}
                      </Link>
                      {poll.status === "draft" ? (
                        <form action={publishPollAction.bind(null, poll.id)}>
                          <button
                            type="submit"
                            className="inline-flex h-8 items-center rounded-lg bg-brand px-3 text-xs font-semibold text-white hover:bg-brand-strong"
                          >
                            {t("detail.publish")}
                          </button>
                        </form>
                      ) : null}
                      {poll.status === "active" ? (
                        <form action={closePollAction.bind(null, poll.id)}>
                          <button
                            type="submit"
                            className="inline-flex h-8 items-center rounded-lg border border-line px-3 text-xs font-semibold hover:border-brand"
                          >
                            {t("close")}
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <AdminPagination
            basePath="/polls"
            labels={{
              first: commonT("pagination.first"),
              last: commonT("pagination.last"),
              next: commonT("pagination.next"),
              previous: commonT("pagination.previous"),
              summary: commonT("pagination.summary", {
                from: pollsPage.meta.from ?? 0,
                to: pollsPage.meta.to ?? 0,
                total: pollsPage.meta.total,
              }),
            }}
            meta={pollsPage.meta}
          />
        </div>
      </section>
    </main>
  );
}
