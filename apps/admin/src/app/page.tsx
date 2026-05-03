import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { CompoundContextBanner } from "@/components/compound-context-banner";
import { SiteNav } from "@/components/site-nav";
import { getCurrentUser, getDashboard, getSystemStatus } from "@/lib/api";
import { formatRoleLabel, getPrimaryEffectiveRole } from "@/lib/auth-access";
import { getCompoundContext, hasEffectiveRole, requireAdminUser } from "@/lib/session";

const shortcutIcons: Record<string, string> = {
  "user-plus": "👤",
  "home": "🏠",
  "sitemap": "🌳",
  "bar-chart": "📊",
  "qr-code": "🚗",
  "alert-circle": "🔧",
  "gavel": "⚖️",
  "scan": "📷",
  "clock": "🕐",
  "edit": "✏️",
};

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
  const dashboard = await getDashboard();
  const apiOnline = status?.status === "ok";
  const role = formatRoleLabel(getPrimaryEffectiveRole(user));
  const isSuperAdmin = hasEffectiveRole(user, "super_admin");
  const activeCompoundId = await getCompoundContext();

  const attentionItems = dashboard?.attentionItems ?? [];
  const shortcuts = dashboard?.shortcuts ?? [];
  const stats = dashboard?.stats ?? {};

  // Module cards replace the old inline nav buttons
  const modules = [
    { href: "/compounds",             key: "compounds",           icon: "🏛️" },
    { href: "/visitors",              key: "visitors",            icon: "🚗" },
    { href: "/issues",                key: "issues",              icon: "🔧" },
    { href: "/announcements",         key: "announcements",       icon: "📢" },
    { href: "/finance",               key: "finance",             icon: "💳" },
    { href: "/dues",                  key: "dues",                icon: "📄" },
    { href: "/polls",                 key: "polls",               icon: "📊" },
    { href: "/documents",             key: "documents",           icon: "📁" },
    { href: "/security",              key: "security",            icon: "🔒" },
    { href: "/meetings",              key: "meetings",            icon: "🤝" },
    { href: "/notifications/channels",key: "notificationChannels",icon: "🔔" },
    { href: "/audit-logs",            key: "auditLogs",           icon: "📋" },
    { href: "/analytics/operational", key: "analytics",           icon: "📊" },
    { href: `/compounds/${activeCompoundId ?? 'none'}/org-chart`, key: "orgChart",        icon: "🌳" },
    { href: "/settings",              key: "settings",            icon: "⚙️" },
  ];

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
            {attentionItems.length > 0 && (
              <a
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand-strong"
                href="#attention"
              >
                <CheckIcon />
                {t("actions.reviewQueue")} ({attentionItems.length})
              </a>
            )}
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

      {/* Stats cards — only show if stats available */}
      {Object.keys(stats).length > 0 && (
        <section className="mx-auto grid max-w-7xl gap-5 px-5 py-6 md:grid-cols-2 lg:grid-cols-3 lg:px-8">
          {stats.totalResidents !== undefined && (
            <article className="rounded-xl border border-line bg-panel p-5 shadow-premium-md">
              <p className="text-sm font-medium text-muted">Total Residents</p>
              <p className="mt-4 text-4xl font-semibold tracking-tight text-brand">{stats.totalResidents}</p>
            </article>
          )}
          {stats.activeVisitors !== undefined && (
            <article className="rounded-xl border border-line bg-panel p-5 shadow-premium-md">
              <p className="text-sm font-medium text-muted">Active Visitors</p>
              <p className="mt-4 text-4xl font-semibold tracking-tight text-accent">{stats.activeVisitors}</p>
            </article>
          )}
          {stats.openIssues !== undefined && (
            <article className="rounded-xl border border-line bg-panel p-5 shadow-premium-md">
              <p className="text-sm font-medium text-muted">Open Issues</p>
              <p className="mt-4 text-4xl font-semibold tracking-tight text-danger">{stats.openIssues}</p>
            </article>
          )}
        </section>
      )}

      {/* Quick shortcuts — clickable, role-based */}
      {shortcuts.length > 0 && (
        <section className="mx-auto max-w-7xl px-5 pb-6 lg:px-8">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {shortcuts.map((s) => (
              <Link
                key={s.key}
                href={s.route}
                className="glass flex flex-col items-center gap-2 rounded-xl px-3 py-4 text-center transition hover:border-brand hover:shadow-premium-md hover:-translate-y-0.5"
              >
                <span className="text-2xl" aria-hidden="true">{shortcutIcons[s.icon] ?? "⚡"}</span>
                <span className="text-xs font-medium text-foreground leading-tight">{s.label}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Module grid */}
      <section className="mx-auto max-w-7xl px-5 pb-6 lg:px-8">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">{t("modules", { defaultValue: "Modules" })}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
          {modules.map((m) => (
            <Link
              key={m.href}
              href={m.href}
              className={`glass flex flex-col items-center gap-2 rounded-xl px-3 py-4 text-center transition hover:border-brand hover:shadow-premium-md hover:-translate-y-0.5 ${(m.key === 'orgChart' && !activeCompoundId) ? 'opacity-40 grayscale pointer-events-none' : ''}`}
            >
              <span className="text-2xl" aria-hidden="true">{m.icon}</span>
              <span className="text-xs font-medium text-foreground leading-tight">{nav(m.key)}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Attention items + system status */}
      <section className="mx-auto grid max-w-7xl gap-5 px-5 pb-8 md:grid-cols-[1.4fr_0.9fr] lg:px-8">
        <div id="attention" className="rounded-xl border border-line bg-panel p-6 shadow-premium-lg">
          <div className="flex items-center justify-between gap-4 border-b border-line pb-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight">{t("priorityQueue.title")}</h2>
              <p className="mt-1 text-sm text-muted">{t("priorityQueue.subtitle")}</p>
            </div>
            {attentionItems.length > 0 && (
              <span className="relative flex h-6 items-center gap-2 rounded-full bg-brand/10 px-3 text-xs font-bold uppercase tracking-wider text-brand">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-75"></span>
                  <span className="relative inline-flex size-2 rounded-full bg-brand"></span>
                </span>
                {t("priorityQueue.live")}
              </span>
            )}
          </div>
          {attentionItems.length > 0 ? (
            <ol className="mt-4 divide-y divide-line">
              {attentionItems.map((item, index) => (
                <li key={item.type + index} className="py-4">
                  <Link href={item.route} className="flex items-center gap-4 group">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-danger/10 text-sm font-semibold text-danger">
                      {item.count}
                    </span>
                    <span className="text-base font-medium group-hover:text-brand transition-colors">
                      {item.label}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-6 text-sm text-muted text-center py-8">Nothing needs your attention right now.</p>
          )}
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
