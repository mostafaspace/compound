import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { LogoutButton } from "@/components/logout-button";
import { getCurrentUser, getSecurityDevices } from "@/lib/api";
import { requireAdminUser } from "@/lib/session";

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
}

export default async function SecurityDevicesPage() {
  await requireAdminUser(getCurrentUser, ["super_admin", "compound_admin", "support_agent"]);

  const [t, devices] = await Promise.all([getTranslations("Security"), getSecurityDevices()]);

  const activeCount = devices.filter((d) => d.status === "active").length;
  const revokedCount = devices.filter((d) => d.status === "revoked").length;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <Link className="text-sm font-semibold text-brand hover:text-brand-strong" href="/security">
              {t("back")}
            </Link>
            <h1 className="mt-2 text-3xl font-semibold">{t("devices.title")}</h1>
            <p className="mt-1 text-sm text-muted">
              {t("devices.subtitle", { active: activeCount, revoked: revokedCount })}
            </p>
          </div>
          <LogoutButton />
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-6 lg:px-8">
        {devices.length === 0 ? (
          <div className="rounded-lg border border-line bg-panel px-6 py-12 text-center text-sm text-muted">
            {t("devices.empty")}
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-line bg-panel">
            <table className="w-full text-sm">
              <thead className="border-b border-line bg-background text-xs font-semibold uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3 text-start">{t("devices.cols.name")}</th>
                  <th className="px-4 py-3 text-start">{t("devices.cols.status")}</th>
                  <th className="px-4 py-3 text-start">{t("devices.cols.appVersion")}</th>
                  <th className="px-4 py-3 text-start">{t("devices.cols.lastSeen")}</th>
                  <th className="px-4 py-3 text-start">{t("devices.cols.registeredBy")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {devices.map((device) => (
                  <tr key={device.id} className={`hover:bg-background ${device.status === "revoked" ? "opacity-60" : ""}`}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{device.name}</p>
                      <p className="truncate text-xs text-muted" title={device.deviceIdentifier}>
                        {device.deviceIdentifier.slice(0, 16)}…
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${
                          device.status === "active" ? "bg-[#e6f3ef] text-brand" : "bg-[#fff3f2] text-danger"
                        }`}
                      >
                        {device.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted">{device.appVersion ?? "—"}</td>
                    <td className="px-4 py-3 text-muted">{formatDateTime(device.lastSeenAt)}</td>
                    <td className="px-4 py-3 text-muted">{device.registeredByUser?.name ?? `#${device.registeredBy}`}</td>
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
