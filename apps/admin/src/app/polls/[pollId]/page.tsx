import type { PollStatus } from "@compound/contracts";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";

import { LogoutButton } from "@/components/logout-button";
import { getCurrentUser, getPoll } from "@/lib/api";
import { requireAdminUser } from "@/lib/session";
import { publishPollDetailAction, closePollDetailAction } from "./actions";

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
    new Date(value)
  );
}

export default async function PollDetailPage({ params, searchParams }: PollDetailPageProps) {
  await requireAdminUser(getCurrentUser);
  const { pollId } = await params;
  const sp = searchParams ? await searchParams : {};
  const locale = await getLocale();

  const poll = await getPoll(pollId);
  if (!poll) notFound();

  const options = poll.options ?? [];
  const totalVotes = poll.votesCount ?? 0;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <Link className="text-sm font-semibold text-brand hover:text-brand-strong" href="/polls">
              ← Polls
            </Link>
            <h1 className="mt-2 text-3xl font-semibold">{poll.title}</h1>
            <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted">
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusTone(poll.status)}`}>
                {poll.status}
              </span>
              {poll.allowMultiple ? <span>Multi-choice</span> : null}
              <span>·</span>
              <span>{poll.eligibility.replace(/_/g, " ")}</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {poll.status === "draft" ? (
              <form action={publishPollDetailAction.bind(null, poll.id)}>
                <button
                  type="submit"
                  className="inline-flex h-10 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong"
                >
                  Publish
                </button>
              </form>
            ) : null}
            {poll.status === "active" ? (
              <form action={closePollDetailAction.bind(null, poll.id)}>
                <button
                  type="submit"
                  className="inline-flex h-10 items-center rounded-lg border border-line px-4 text-sm font-semibold hover:border-brand"
                >
                  Close Poll
                </button>
              </form>
            ) : null}
            <LogoutButton />
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl space-y-6 px-5 py-6 lg:px-8">
        {sp.published ? (
          <p className="rounded-lg bg-[#e6f3ef] px-4 py-3 text-sm font-medium text-brand">
            Poll is now live.
          </p>
        ) : null}
        {sp.closed ? (
          <p className="rounded-lg bg-[#eaf0ff] px-4 py-3 text-sm font-medium text-[#244a8f]">
            Poll has been closed.
          </p>
        ) : null}

        <div className="grid gap-6 md:grid-cols-3">
          {/* Results panel */}
          <div className="space-y-6 md:col-span-2">
            {poll.description ? (
              <div className="rounded-lg border border-line bg-panel p-5">
                <h2 className="text-lg font-semibold">Description</h2>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{poll.description}</p>
              </div>
            ) : null}

            <div className="rounded-lg border border-line bg-panel p-5">
              <h2 className="text-lg font-semibold">Results</h2>
              <p className="mt-1 text-sm text-muted">{totalVotes} total votes</p>

              {options.length === 0 ? (
                <p className="mt-4 text-sm text-muted">No options.</p>
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

            {poll.voters && poll.voters.length > 0 ? (
              <div className="rounded-lg border border-line bg-panel p-5">
                <h2 className="text-lg font-semibold">Voters ({poll.voters.length})</h2>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-line text-left text-xs font-semibold text-muted">
                        <th className="pb-2">Resident</th>
                        <th className="pb-2">Unit</th>
                        <th className="pb-2">Choice(s)</th>
                        <th className="pb-2">Voted At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {poll.voters.map((voter, idx) => (
                        <tr key={`${voter.userId}-${idx}`} className="border-b border-line last:border-0">
                          <td className="py-2 font-medium">{voter.userName ?? "Unknown"}</td>
                          <td className="py-2">{voter.unitNumber ?? "—"}</td>
                          <td className="py-2">{voter.options.join(", ")}</td>
                          <td className="py-2 text-muted">
                            {voter.votedAt ? formatDate(voter.votedAt, locale) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>

          {/* Metadata sidebar */}
          <div className="self-start rounded-lg border border-line bg-panel p-5 space-y-4">
            <div>
              <span className="text-xs font-semibold text-muted">Status</span>
              <div className="mt-1">
                <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${statusTone(poll.status)}`}>
                  {poll.status}
                </span>
              </div>
            </div>
            {poll.pollType ? (
              <div>
                <span className="text-xs font-semibold text-muted">Category</span>
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
              <span className="text-xs font-semibold text-muted">Eligibility</span>
              <div className="mt-1 text-sm">{poll.eligibility.replace(/_/g, " ")}</div>
            </div>
            <div>
              <span className="text-xs font-semibold text-muted">Transparency</span>
              <div className="mt-1 text-sm">All voters visible</div>
            </div>
            <div>
              <span className="text-xs font-semibold text-muted">Multiple choices</span>
              <div className="mt-1 text-sm">
                {poll.allowMultiple
                  ? `Yes${poll.maxChoices ? ` (max ${poll.maxChoices})` : ""}`
                  : "No"}
              </div>
            </div>
            <div>
              <span className="text-xs font-semibold text-muted">Ends At</span>
              <div className="mt-1 text-sm">{formatDate(poll.endsAt, locale)}</div>
            </div>
            <div>
              <span className="text-xs font-semibold text-muted">Total Votes</span>
              <div className="mt-1 text-2xl font-bold">{totalVotes}</div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
