import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { LogoutButton } from "@/components/logout-button";
import { getCurrentUser, getSecurityShifts } from "@/lib/api";
import { requireAdminUser } from "@/lib/session";

interface SearchParams {
  status?: string;
}

function shiftStatusTone(status: string): string {
  if (status === "active") return "bg-[#e6f3ef] text-brand";
  if (status === "closed") return "bg-background text-muted";
  return "bg-[#f3ead7] text-[#8a520c]"; // draft
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
}

export default async function SecurityShiftsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  await requireAdminUser(getCurrentUser, ["super_admin", "compound_admin", "support_agent"]);

  const params = searchParams ? await searchParams : {};
  const status = params.status ?? "all";

  const [t, shifts] = await Promise.all([
    getTranslations("Security"),
    getSecurityShifts(status !== "all" ? { status } : {}),
  ]);

  const statusFilters = ["all", "draft", "active", "closed"];

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <Link className="text-sm font-semibold text-brand hover:text-brand-strong" href="/security">
              {t("back")}
            </Link>
            <h1 className="mt-2 text-3xl font-semibold">{t("shifts.title")}</h1>
            <p className="mt-1 text-sm text-muted">{t("shifts.subtitle")}</p>
          </div>
          <LogoutButton />
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-6 lg:px-8">
        {/* Status filter */}
        <div className="mb-5 flex flex-wrap gap-2">
          {statusFilters.map((s) => (
            <Link
              key={s}
              href={s === "all" ? "/security/shifts" : `/security/shifts?status=${s}`}
              className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition ${
                status === s
                  ? "border-brand bg-brand text-white"
                  : "border-line bg-panel text-foreground hover:border-brand"
              }`}
            >
              {t(`shifts.status.${s}`)}
            </Link>
          ))}
        </div>

        {shifts.length === 0 ? (
          <div className="rounded-lg border border-line bg-panel px-6 py-12 text-center text-sm text-muted">
            {t("shifts.empty")}
          </div>
        ) : (
          <div className="space-y-4">
            {shifts.map((shift) => (
              <div key={shift.id} className="rounded-lg border border-line bg-panel p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{shift.name}</span>
                      <span
                        className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${shiftStatusTone(shift.status)}`}
                      >
                        {shift.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted">
                      {t("shifts.createdBy")}: {shift.creator?.name ?? "—"}
                    </p>
                    {shift.startedAt && (
                      <p className="text-sm text-muted">
                        {t("shifts.startedAt")}: {formatDateTime(shift.startedAt)}
                      </p>
                    )}
                    {shift.endedAt && (
                      <p className="text-sm text-muted">
                        {t("shifts.endedAt")}: {formatDateTime(shift.endedAt)} · {t("shifts.closedBy")}: {shift.closer?.name ?? "—"}
                      </p>
                    )}
                  </div>
                </div>
                {shift.handoverNotes && (
                  <div className="mt-3 rounded-lg bg-background p-3 text-sm">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
                      {t("shifts.handoverNotes")}
                    </p>
                    <p className="whitespace-pre-line text-foreground">{shift.handoverNotes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
