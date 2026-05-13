import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { CompoundContextBanner } from "@/components/compound-context-banner";
import { getCurrentUser, getDashboard, getSystemStatus } from "@/lib/api";
import { formatRoleLabel, getPrimaryEffectiveRole } from "@/lib/auth-access";
import { sanitizeDashboardCollection } from "@/lib/dashboard-routes";
import { getCompoundContext, hasEffectiveRole, requireAdminUser } from "@/lib/session";

const shortcutIcons: Record<string, string> = {
  "user-plus": "US",
  "home": "HM",
  "sitemap": "OC",
  "bar-chart": "PL",
  "qr-code": "QR",
  "alert-circle": "IS",
  "gavel": "MT",
  "scan": "SC",
  "clock": "HS",
  "edit": "ME",
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
  const activeCompoundId = (await getCompoundContext()) ?? user.compoundId;

  const attentionItems = sanitizeDashboardCollection(dashboard?.attentionItems ?? [], { activeCompoundId });
  const shortcuts = sanitizeDashboardCollection(dashboard?.shortcuts ?? [], { activeCompoundId });
  const stats = dashboard?.stats ?? {};
  const hasStats = Object.keys(stats).length > 0;
  const orgChartHref = activeCompoundId ? `/compounds/${activeCompoundId}/org-chart` : "/compounds";

  const operatorActions = [
    {
      detail:
        attentionItems.length > 0
          ? t("operatorActions.reviewQueueDetail", { count: attentionItems.length })
          : t("operatorActions.openIssueOperationsDetail"),
      href: attentionItems.length > 0 ? "#attention" : "/issues",
      label: attentionItems.length > 0 ? t("operatorActions.reviewQueueLabel") : t("operatorActions.openIssueOperationsLabel"),
    },
    {
      detail: t("operatorActions.assignApartmentsDetail"),
      href: "/units/assign",
      label: t("operatorActions.assignApartmentsLabel"),
    },
    {
      detail: activeCompoundId
        ? t("operatorActions.reviewOrgChartCoverageDetail")
        : t("operatorActions.setActiveCompoundDetail"),
      href: activeCompoundId ? `/compounds/${activeCompoundId}/org-chart` : "/compounds",
      label: activeCompoundId ? t("operatorActions.reviewOrgChartCoverageLabel") : t("operatorActions.setActiveCompoundLabel"),
    },
  ];

  // Module cards replace the old inline nav buttons
  const modules = [
    { href: "/compounds",             key: "compounds",           icon: "CP" },
    { href: "/visitors",              key: "visitors",            icon: "VI" },
    { href: "/issues",                key: "issues",              icon: "IS" },
    { href: "/announcements",         key: "announcements",       icon: "AN" },
    { href: "/finance",               key: "finance",             icon: "FN" },
    { href: "/dues",                  key: "dues",                icon: "DU" },
    { href: "/polls",                 key: "polls",               icon: "PL" },
    { href: "/documents",             key: "documents",           icon: "DC" },
    { href: "/security",              key: "security",            icon: "SE" },
    { href: "/meetings",              key: "meetings",            icon: "MT" },
    { href: "/notifications/channels",key: "notificationChannels",icon: "NT" },
    { href: "/audit-logs",            key: "auditLogs",           icon: "AU" },
    { href: "/analytics/operational", key: "analytics",           icon: "OP" },
    { href: orgChartHref,                     key: "orgChart",        icon: "OC" },
    { href: "/settings",              key: "settings",            icon: "ST" },
  ];

  return (
    <main className="min-h-screen bg-background text-foreground">

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

      <section className="mx-auto max-w-7xl px-5 py-6 lg:px-8">
        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-xl border border-line bg-panel p-5 shadow-premium-md">
            <div className="flex flex-col gap-2 border-b border-line pb-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold">{t("panels.operatorNextSteps.title")}</h2>
                <p className="mt-1 text-sm text-muted">{t("panels.operatorNextSteps.subtitle")}</p>
              </div>
              {!apiOnline ? (
                <span className="rounded-full bg-[#fff3f2] px-3 py-1 text-xs font-semibold text-danger">
                  {t("panels.operatorNextSteps.apiDegraded")}
                </span>
              ) : null}
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {operatorActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="rounded-xl border border-line bg-background/60 p-4 transition hover:border-brand hover:shadow-premium-sm"
                >
                  <p className="text-sm font-semibold text-foreground">{action.label}</p>
                  <p className="mt-2 text-sm text-muted">{action.detail}</p>
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-line bg-panel p-5 shadow-premium-md">
            <h2 className="text-lg font-semibold">{t("panels.runtimeClarity.title")}</h2>
            <div className="mt-4 space-y-3 text-sm">
              {!apiOnline ? (
                <div className="rounded-lg border border-[#f1c7c2] bg-[#fff3f2] px-4 py-3 text-danger">
                  {t("panels.runtimeClarity.apiDegraded")}
                </div>
              ) : null}
              {!activeCompoundId ? (
                <div className="rounded-lg border border-[#e7d7a9] bg-[#fff8e8] px-4 py-3 text-[#7a5d1a]">
                  {t("panels.runtimeClarity.noActiveCompound")}
                </div>
              ) : null}
              {!hasStats ? (
                <div className="rounded-lg border border-line bg-background/60 px-4 py-3 text-muted">
                  {t("panels.runtimeClarity.noStats")}
                </div>
              ) : null}
              {apiOnline && activeCompoundId && hasStats ? (
                <div className="rounded-lg border border-[#d3eadf] bg-[#f5fbf8] px-4 py-3 text-brand">
                  {t("panels.runtimeClarity.ready")}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* Stats cards — only show if stats available */}
      {hasStats ? (
        <section className="mx-auto grid max-w-7xl gap-5 px-5 py-6 md:grid-cols-2 lg:grid-cols-3 lg:px-8">
          {stats.totalResidents !== undefined && (
            <article className="rounded-xl border border-line bg-panel p-5 shadow-premium-md">
              <p className="text-sm font-medium text-muted">{t("stats.totalResidents")}</p>
              <p className="mt-4 text-4xl font-semibold tracking-tight text-brand">{stats.totalResidents}</p>
            </article>
          )}
          {stats.activeVisitors !== undefined && (
            <article className="rounded-xl border border-line bg-panel p-5 shadow-premium-md">
              <p className="text-sm font-medium text-muted">{t("stats.activeVisitors")}</p>
              <p className="mt-4 text-4xl font-semibold tracking-tight text-accent">{stats.activeVisitors}</p>
            </article>
          )}
          {stats.openIssues !== undefined && (
            <article className="rounded-xl border border-line bg-panel p-5 shadow-premium-md">
              <p className="text-sm font-medium text-muted">{t("stats.openIssues")}</p>
              <p className="mt-4 text-4xl font-semibold tracking-tight text-danger">{stats.openIssues}</p>
            </article>
          )}
        </section>
      ) : null}

      {/* Quick shortcuts — clickable, role-based */}
      {shortcuts.length > 0 ? (
        <section className="mx-auto max-w-7xl px-5 pb-6 lg:px-8">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">{t("shortcuts.title")}</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {shortcuts.map((s) => (
              <Link
                key={s.key}
                href={s.route}
                className="glass flex flex-col items-center gap-2 rounded-xl px-3 py-4 text-center transition hover:border-brand hover:shadow-premium-md hover:-translate-y-0.5"
              >
                <span className="inline-flex size-10 items-center justify-center rounded-full border border-line bg-background text-xs font-black tracking-[0.18em] text-brand" aria-hidden="true">
                  {shortcutIcons[s.icon] ?? "GO"}
                </span>
                <span className="text-xs font-medium text-foreground leading-tight">{s.label}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <section className="mx-auto max-w-7xl px-5 pb-6 lg:px-8">
          <div className="rounded-xl border border-dashed border-line bg-panel px-5 py-4">
            <p className="text-sm font-medium text-foreground">{t("shortcuts.empty.title")}</p>
            <p className="mt-2 text-sm text-muted">{t("shortcuts.empty.description")}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                className="inline-flex h-10 items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong"
                href="/units/assign"
              >
                {t("shortcuts.empty.openAssignment")}
              </Link>
              <Link
                className="inline-flex h-10 items-center justify-center rounded-lg border border-line bg-panel px-4 text-sm font-semibold hover:border-brand"
                href={activeCompoundId ? orgChartHref : "/compounds"}
              >
                {activeCompoundId ? t("shortcuts.empty.reviewOrgChartCoverage") : t("shortcuts.empty.selectActiveCompound")}
              </Link>
            </div>
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
              <span className="inline-flex size-10 items-center justify-center rounded-full border border-line bg-background text-xs font-black tracking-[0.18em] text-brand" aria-hidden="true">
                {m.icon}
              </span>
              <span className="text-xs font-medium text-foreground leading-tight">{nav(m.key)}</span>
            </Link>
          ))}
        </div>
        {!activeCompoundId ? (
          <p className="mt-3 text-sm text-muted">
            {t("modulesDisabled.orgChart")}
          </p>
        ) : null}
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
            <div className="py-8 text-center">
              <p className="text-sm font-medium text-foreground">{t("priorityQueue.empty.title")}</p>
              <p className="mt-2 text-sm text-muted">{t("priorityQueue.empty.description")}</p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                <Link
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong"
                  href="/units/assign"
                >
                  {t("priorityQueue.empty.checkAssignment")}
                </Link>
                <Link
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-line bg-panel px-4 text-sm font-semibold hover:border-brand"
                  href={activeCompoundId ? orgChartHref : "/compounds"}
                >
                  {activeCompoundId ? t("priorityQueue.empty.reviewOrgChart") : t("priorityQueue.empty.selectCompound")}
                </Link>
              </div>
            </div>
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
          <div className="mt-5 rounded-lg border border-line bg-background/60 px-4 py-3 text-sm">
            {apiOnline ? (
              <p className="text-muted">{t("systemStatus.runtimeReady")}</p>
            ) : (
              <p className="text-danger">{t("systemStatus.runtimeDegraded")}</p>
            )}
          </div>
        </aside>
      </section>
    </main>
  );
}
