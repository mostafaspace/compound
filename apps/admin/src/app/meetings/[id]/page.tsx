import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { LogoutButton } from "@/components/logout-button";
import { getCurrentUser, getMeeting } from "@/lib/api";
import { requireAdminUser } from "@/lib/session";

// ─── Badges ──────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    draft: "bg-background text-muted border border-line",
    scheduled: "bg-[#eaf0ff] text-[#244a8f]",
    in_progress: "bg-[#e6f3ef] text-brand",
    completed: "bg-[#f3f3f3] text-muted",
    cancelled: "bg-[#fff3f2] text-danger",
  };
  const cls = colorMap[status] ?? "bg-background text-muted";
  return (
    <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${cls}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

function RsvpBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    accepted: "bg-[#e6f3ef] text-brand",
    declined: "bg-[#fff3f2] text-danger",
    tentative: "bg-[#f3ead7] text-[#8a520c]",
    pending: "bg-background text-muted border border-line",
  };
  const cls = colorMap[status] ?? "bg-background text-muted";
  return (
    <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${cls}`}>
      {status}
    </span>
  );
}

function ActionItemStatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    open: "bg-[#eaf0ff] text-[#244a8f]",
    in_progress: "bg-[#e6f3ef] text-brand",
    done: "bg-[#f3f3f3] text-muted",
    cancelled: "bg-[#fff3f2] text-danger",
  };
  const cls = colorMap[status] ?? "bg-background text-muted";
  return (
    <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${cls}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">{title}</h2>
      <div className="rounded-lg border border-line bg-panel">{children}</div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

interface Props {
  params: Promise<{ id: string }>;
}

export default async function MeetingDetailPage({ params }: Props) {
  await requireAdminUser(getCurrentUser, ["super_admin", "compound_admin", "board_member"]);

  const { id } = await params;
  const [t, meeting] = await Promise.all([
    getTranslations("Meetings"),
    getMeeting(id),
  ]);

  if (!meeting) notFound();

  const agendaItems = meeting.agendaItems ?? [];
  const participants = meeting.participants ?? [];
  const decisions = meeting.decisions ?? [];
  const actionItems = meeting.actionItems ?? [];

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <Link className="text-sm font-semibold text-brand hover:text-brand-strong" href="/meetings">
              {t("detail.back")}
            </Link>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-semibold">{meeting.title}</h1>
              <StatusBadge status={meeting.status} />
            </div>
            <p className="mt-1 text-sm text-muted capitalize">{meeting.scope}</p>
          </div>
          <LogoutButton />
        </div>
      </header>

      <section className="mx-auto max-w-7xl space-y-6 px-5 py-6 lg:px-8">
        {/* Meta */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg border border-line bg-panel p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("fields.scheduledAt")}</p>
            <p className="mt-1 text-sm font-medium">
              {meeting.scheduledAt ? new Date(meeting.scheduledAt).toLocaleString() : "—"}
            </p>
          </div>
          <div className="rounded-lg border border-line bg-panel p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("fields.location")}</p>
            <p className="mt-1 text-sm font-medium">{meeting.location ?? "—"}</p>
          </div>
          <div className="rounded-lg border border-line bg-panel p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("fields.createdBy")}</p>
            <p className="mt-1 text-sm font-medium">{meeting.creator?.name ?? "—"}</p>
          </div>
          <div className="rounded-lg border border-line bg-panel p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("fields.participants")}</p>
            <p className="mt-1 text-sm font-medium">{participants.length}</p>
          </div>
        </div>

        {/* Description */}
        {meeting.description && (
          <div className="rounded-lg border border-line bg-panel p-5">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">{t("fields.description")}</h2>
            <p className="text-sm">{meeting.description}</p>
          </div>
        )}

        {/* Minutes */}
        {meeting.minutes && (
          <Section title={t("detail.minutes")}>
            <div className="px-5 py-4 space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted">{t("detail.author")}: {meeting.minutes.author?.name ?? "—"}</span>
                {meeting.minutes.publishedAt ? (
                  <span className="inline-flex rounded-md bg-[#e6f3ef] px-2 py-0.5 text-xs font-semibold text-brand">
                    {t("detail.published")}
                  </span>
                ) : (
                  <span className="inline-flex rounded-md border border-line bg-background px-2 py-0.5 text-xs font-semibold text-muted">
                    {t("detail.draft")}
                  </span>
                )}
              </div>
              <p className="whitespace-pre-wrap text-sm">{meeting.minutes.body}</p>
            </div>
          </Section>
        )}

        {/* Agenda */}
        {agendaItems.length > 0 && (
          <Section title={t("detail.agenda")}>
            {agendaItems
              .sort((a, b) => a.position - b.position)
              .map((item, idx) => (
                <div key={item.id} className="flex items-start gap-3 border-b border-line last:border-0 px-5 py-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm">{item.title}</p>
                    {item.description && <p className="mt-0.5 text-xs text-muted">{item.description}</p>}
                  </div>
                  {item.durationMinutes && (
                    <span className="shrink-0 text-xs text-muted">{item.durationMinutes} min</span>
                  )}
                </div>
              ))}
          </Section>
        )}

        {/* Participants */}
        {participants.length > 0 && (
          <Section title={t("detail.participants")}>
            {participants.map((p) => (
              <div key={p.id} className="flex items-center gap-3 border-b border-line last:border-0 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{p.user?.name ?? `User #${p.userId}`}</p>
                  <p className="text-xs text-muted">{p.user?.email}</p>
                </div>
                <RsvpBadge status={p.rsvpStatus} />
                {p.attended && (
                  <span className="text-xs font-semibold text-brand">{t("detail.attended")}</span>
                )}
              </div>
            ))}
          </Section>
        )}

        {/* Decisions */}
        {decisions.length > 0 && (
          <Section title={t("detail.decisions")}>
            {decisions.map((d) => (
              <div key={d.id} className="border-b border-line last:border-0 px-5 py-3">
                <p className="text-sm font-semibold">{d.title}</p>
                {d.description && <p className="mt-0.5 text-xs text-muted">{d.description}</p>}
                <p className="mt-1 text-xs text-muted">{t("detail.recordedBy")}: {d.creator?.name ?? "—"}</p>
              </div>
            ))}
          </Section>
        )}

        {/* Action Items */}
        {actionItems.length > 0 && (
          <Section title={t("detail.actionItems")}>
            {actionItems.map((item) => (
              <div key={item.id} className="flex items-start gap-3 border-b border-line last:border-0 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{item.title}</p>
                  {item.assignee && (
                    <p className="mt-0.5 text-xs text-muted">{t("detail.assignedTo")}: {item.assignee.name}</p>
                  )}
                  {item.dueDate && (
                    <p className="mt-0.5 text-xs text-muted">{t("detail.dueDate")}: {item.dueDate}</p>
                  )}
                </div>
                <ActionItemStatusBadge status={item.status} />
              </div>
            ))}
          </Section>
        )}
      </section>
    </main>
  );
}
