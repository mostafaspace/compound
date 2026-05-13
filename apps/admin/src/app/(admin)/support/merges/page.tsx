import type { AccountMerge } from "@compound/contracts";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";

import { getCurrentUser, getAccountMerges } from "@/lib/api";
import { requireAdminUser } from "@/lib/session";

function statusBadge(status: string): string {
  switch (status) {
    case "completed":
      return "bg-[#e6f3ef] text-brand";
    case "cancelled":
      return "bg-background text-muted";
    default:
      return "bg-[#fff5e5] text-[#8a520c]";
  }
}

export default async function AccountMergesPage() {
  await requireAdminUser(getCurrentUser, ["super_admin", "compound_admin", "support_agent"]);

  const [merges, t, locale] = await Promise.all([
    getAccountMerges(),
    getTranslations("AccountMerges"),
    getLocale(),
  ]);

  function formatDate(value: string | null | undefined): string {
    if (!value) return "—";
    return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(value));
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <Link className="text-sm font-semibold text-brand hover:text-brand-strong" href="/support/users">
              {t("back")}
            </Link>
            <h1 className="mt-2 text-3xl font-semibold">{t("title")}</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted">{t("subtitle")}</p>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-6 lg:px-8">
        <div className="overflow-hidden rounded-lg border border-line bg-panel">
          <div className="flex items-center justify-between border-b border-line p-4">
            <p className="text-sm text-muted">{merges.length} merge(s)</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] border-collapse text-start text-sm">
              <thead className="bg-background text-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">{t("colId")}</th>
                  <th className="px-4 py-3 font-semibold">{t("colSource")}</th>
                  <th className="px-4 py-3 font-semibold">{t("colTarget")}</th>
                  <th className="px-4 py-3 font-semibold">{t("colStatus")}</th>
                  <th className="px-4 py-3 font-semibold">{t("colInitiator")}</th>
                  <th className="px-4 py-3 font-semibold">{t("colDate")}</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {merges.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-muted" colSpan={7}>
                      {t("empty")}
                    </td>
                  </tr>
                ) : (
                  merges.map((merge: AccountMerge) => (
                    <tr key={merge.id}>
                      <td className="px-4 py-4 font-mono font-semibold">#{merge.id}</td>
                      <td className="px-4 py-4">
                        {merge.sourceUser ? (
                          <div>
                            <p className="font-semibold">{merge.sourceUser.name}</p>
                            <p className="text-muted">{merge.sourceUser.email}</p>
                          </div>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {merge.targetUser ? (
                          <div>
                            <p className="font-semibold">{merge.targetUser.name}</p>
                            <p className="text-muted">{merge.targetUser.email}</p>
                          </div>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${statusBadge(merge.status)}`}>
                          {merge.status === "pending" && t("statusPending")}
                          {merge.status === "completed" && t("statusCompleted")}
                          {merge.status === "cancelled" && t("statusCancelled")}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-muted">
                        {merge.initiator?.name ?? "—"}
                      </td>
                      <td className="px-4 py-4 text-muted">{formatDate(merge.createdAt)}</td>
                      <td className="px-4 py-4">
                        <Link
                          className="text-sm font-semibold text-brand hover:text-brand-strong"
                          href={`/support/merges/${merge.id}`}
                        >
                          {t("viewMerge")}
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}
