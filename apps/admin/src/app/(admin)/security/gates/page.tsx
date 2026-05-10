import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { LogoutButton } from "@/components/logout-button";
import { getCurrentUser, getSecurityGates } from "@/lib/api";
import { requireAdminUser } from "@/lib/session";

export default async function SecurityGatesPage() {
  await requireAdminUser(getCurrentUser, ["super_admin", "compound_admin"]);

  const [t, gates] = await Promise.all([getTranslations("Security"), getSecurityGates()]);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <Link className="text-sm font-semibold text-brand hover:text-brand-strong" href="/security">
              {t("back")}
            </Link>
            <h1 className="mt-2 text-3xl font-semibold">{t("gates.title")}</h1>
            <p className="mt-1 text-sm text-muted">{t("gates.subtitle")}</p>
          </div>
          <LogoutButton />
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-6 lg:px-8">
        {gates.length === 0 ? (
          <div className="rounded-lg border border-line bg-panel px-6 py-12 text-center text-sm text-muted">
            {t("gates.empty")}
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-line bg-panel">
            <table className="w-full text-sm">
              <thead className="border-b border-line bg-background text-xs font-semibold uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3 text-start">{t("gates.cols.name")}</th>
                  <th className="px-4 py-3 text-start">{t("gates.cols.zone")}</th>
                  <th className="px-4 py-3 text-start">{t("gates.cols.building")}</th>
                  <th className="px-4 py-3 text-start">{t("gates.cols.status")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {gates.map((gate) => (
                  <tr key={gate.id} className="hover:bg-background">
                    <td className="px-4 py-3 font-medium">{gate.name}</td>
                    <td className="px-4 py-3 text-muted">{gate.zone ?? "—"}</td>
                    <td className="px-4 py-3 text-muted">{gate.building?.name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${
                          gate.isActive ? "bg-[#e6f3ef] text-brand" : "bg-background text-muted"
                        }`}
                      >
                        {gate.isActive ? t("gates.active") : t("gates.inactive")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
