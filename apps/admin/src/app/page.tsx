import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { CompoundContextBanner } from "@/components/compound-context-banner";
import { SiteNav } from "@/components/site-nav";
import { getCurrentUser, getSystemStatus } from "@/lib/api";
import { requireAdminUser } from "@/lib/session";

const workstreams = [
  { key: "financeReview", value: "12", tone: "text-brand" },
  { key: "visitorGate", value: "38", tone: "text-accent" },
  { key: "residentIssues", value: "7", tone: "text-danger" },
  { key: "governance", value: "3", tone: "text-brand-strong" },
];

const priorityQueue = ["ownerOnboarding", "bankReceipts", "vendorEstimate", "boardActions"];

// Module cards replace the old inline nav buttons
const modules = [
  { href: "/compounds",             key: "compounds",           icon: "🏛️" },
  { href: "/visitors",              key: "visitors",            icon: "🚗" },
  { href: "/issues",                key: "issues",              icon: "🔧" },
  { href: "/announcements",         key: "announcements",       icon: "📢" },
  { href: "/finance",               key: "finance",             icon: "💳" },
  { href: "/dues",                  key: "dues",                icon: "📄" },
  { href: "/governance",            key: "governance",          icon: "⚖️" },
  { href: "/documents",             key: "documents",           icon: "📁" },
  { href: "/security",              key: "security",            icon: "🔒" },
  { href: "/meetings",              key: "meetings",            icon: "🤝" },
  { href: "/notifications/channels",key: "notificationChannels",icon: "🔔" },
  { href: "/audit-logs",            key: "auditLogs",           icon: "📋" },
  { href: "/analytics/operational", key: "analytics",           icon: "📊" },
  { href: "/settings",              key: "settings",            icon: "⚙️" },
];

function CheckIcon() {
  return (
    <svg aria-hidden="true" className="size-5" viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M16.704 5.29a1 1 0 0 1 .006 1.414l-7.25 7.32a1 1 0 0 1-1.421.002L3.29 9.227a1 1 0 1 1 1.42-1.408l4.04 4.08 6.54-6.603a1 1 0 0 1 1.414-.006Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export default async function Home() {
  const user = await requireAdminUser(getCurrentUser);
  const t = await getTranslations("Dashboard");
  const nav = await getTranslations("Navigation");
  const status = await getSystemStatus();
  const apiOnline = status?.status === "ok";
  const role = user.role.replaceAll("_", " ");
  const isSuperAdmin = user.role === "super_admin";

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteNav />

      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase text-brand">{t("eyebrow")}</p>
            <h1 className="mt-1 text-3xl font-semibold md:text-4xl">{t("title")}</h1>
            <p className="mt-1 text-sm text-muted">{t("signedInAs", { name: user.name, role })}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand-strong"
              href="#priority-queue"
            >
              <CheckIcon />
              {t("actions.reviewQueue")}
            </a>
            <a
              className="inline-flex h-11 items-center rounded-lg border border-line bg-panel px-4 text-sm font-semibold text-foreground transition hover:border-brand"
              href="#system-status"
            >
              {t("actions.systemStatus")}
            </a>
          </div>
        </div>
      </header>

      <CompoundContextBanner isSuperAdmin={isSuperAdmin} />

      {/* KPI cards */}
      <section className="mx-auto grid max-w-7xl gap-5 px-5 py-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
        {workstreams.map((item) => (
          <article className="rounded-lg border border-line bg-panel p-5" key={item.key}>
            <p className="text-sm font-medium text-muted">{t(`workstreams.${item.key}.label`)}</p>
            <p className={`mt-4 text-4xl font-semibold ${item.tone}`}>{item.value}</p>
            <p className="mt-2 text-sm text-muted">{t(`workstreams.${item.key}.detail`)}</p>
          </article>
        ))}
      </section>

      {/* Module grid — replaces the old inline button nav */}
      <section className="mx-auto max-w-7xl px-5 pb-6 lg:px-8">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">{t("modules", { defaultValue: "Modules" })}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
          {modules.map((m) => (
            <Link
              key={m.href}
              href={m.href}
              className="flex flex-col items-center gap-2 rounded-xl border border-line bg-panel px-3 py-4 text-center transition hover:border-brand hover:bg-background"
            >
              <span className="text-2xl" aria-hidden="true">{m.icon}</span>
              <span className="text-xs font-medium text-foreground leading-tight">{nav(m.key)}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Priority queue + system status */}
      <section className="mx-auto grid max-w-7xl gap-5 px-5 pb-8 md:grid-cols-[1.4fr_0.9fr] lg:px-8">
        <div id="priority-queue" className="rounded-lg border border-line bg-panel p-5">
          <div className="flex items-center justify-between gap-4 border-b border-line pb-4">
            <div>
              <h2 className="text-xl font-semibold">{t("priorityQueue.title")}</h2>
              <p className="mt-1 text-sm text-muted">{t("priorityQueue.subtitle")}</p>
            </div>
            <span className="rounded-lg bg-[#e6f3ef] px-3 py-1 text-sm font-semibold text-brand">{t("priorityQueue.live")}</span>
          </div>
          <ol className="mt-4 divide-y divide-line">
            {priorityQueue.map((item, index) => (
              <li className="flex items-center gap-4 py-4" key={item}>
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-background text-sm font-semibold">
                  {index + 1}
                </span>
                <span className="text-base font-medium">{t(`priorityQueue.items.${item}`)}</span>
              </li>
            ))}
          </ol>
        </div>

        <aside id="system-status" className="rounded-lg border border-line bg-panel p-5">
          <h2 className="text-xl font-semibold">{t("systemStatus.title")}</h2>
          <div className="mt-5 space-y-4 text-sm">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <span className="text-muted">{t("systemStatus.api")}</span>
              <span className={apiOnline ? "font-semibold text-brand" : "font-semibold text-danger"}>
                {apiOnline ? t("systemStatus.online") : t("systemStatus.offline")}
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-line pb-3">
              <span className="text-muted">{t("systemStatus.environment")}</span>
              <span className="font-semibold">{status?.environment ?? t("systemStatus.notConnected")}</span>
            </div>
            <div className="flex items-center justify-between border-b border-line pb-3">
              <span className="text-muted">{t("systemStatus.timezone")}</span>
              <span className="font-semibold">{status?.timezone ?? t("systemStatus.pending")}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted">{t("systemStatus.realtime")}</span>
              <span className="font-semibold text-accent">{t("systemStatus.reverbFirst")}</span>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
