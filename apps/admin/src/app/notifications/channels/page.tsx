import Link from "next/link";
import {
  deliveryStatusValues,
  notificationCategoryValues,
  notificationChannelValues,
  type DeliveryStatus,
  type NotificationDeliveryLog,
  type NotificationTemplate,
} from "@compound/contracts";
import { getLocale, getTranslations } from "next-intl/server";

import { CompoundContextBanner } from "@/components/compound-context-banner";
import { LogoutButton } from "@/components/logout-button";
import { retryDeliveryAction, toggleTemplateActiveAction, upsertNotificationTemplateAction } from "@/app/notifications/channel-actions";
import {
  getCurrentUser,
  getNotificationDeliveryLogs,
  getNotificationTemplates,
} from "@/lib/api";
import { getCompoundContext, requireAdminUser } from "@/lib/session";

interface NotificationChannelsPageProps {
  searchParams?: Promise<{
    channel?: string;
    locale?: string;
    category?: string;
    status?: string;
    template?: string;
    updated?: string;
  }>;
}

const previewVariables: Record<string, string> = {
  announcement_title: "Board meeting reminder",
  category: "finance",
  compound_name: "Palm Residence",
  issue_title: "Water leak in lobby",
  resident_name: "Mostafa Magdy",
  status: "approved",
  unit_number: "A-203",
};

function replacePreviewVariables(template: string): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, variable: string) => {
    return previewVariables[variable] ?? `[${variable}]`;
  });
}

function buildQuery(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      search.set(key, value);
    }
  }

  const query = search.toString();

  return query.length > 0 ? `?${query}` : "";
}

function metricTone(value: "neutral" | "success" | "danger" | "accent"): string {
  switch (value) {
    case "success":
      return "text-brand";
    case "danger":
      return "text-danger";
    case "accent":
      return "text-accent";
    default:
      return "text-foreground";
  }
}

function statusBadgeTone(status: DeliveryStatus): string {
  switch (status) {
    case "sent":
      return "border-[#cbe7de] bg-[#e6f3ef] text-brand";
    case "failed":
      return "border-[#f3c6c1] bg-[#fdecea] text-danger";
    case "retried":
      return "border-[#d8d1f0] bg-[#f1edfb] text-[#5a3ea5]";
    case "skipped":
      return "border-[#e7d7a9] bg-[#fff8e8] text-[#7a5d1a]";
    default:
      return "border-line bg-background text-muted";
  }
}

function localeBadgeTone(locale: string): string {
  return locale === "ar"
    ? "border-[#d8d1f0] bg-[#f1edfb] text-[#5a3ea5]"
    : "border-[#c8d8f0] bg-[#edf5ff] text-[#2357a5]";
}

function formatDate(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function countByStatus(logs: NotificationDeliveryLog[], status: DeliveryStatus): number {
  return logs.filter((log) => log.status === status).length;
}

function TemplateQuickToggle({
  template,
  label,
}: {
  template: NotificationTemplate;
  label: string;
}) {
  const action = toggleTemplateActiveAction.bind(null, template.id);

  return (
    <form action={action}>
      <input name="compound_id" type="hidden" value={template.compoundId ?? ""} />
      <input name="category" type="hidden" value={template.category} />
      <input name="channel" type="hidden" value={template.channel} />
      <input name="locale" type="hidden" value={template.locale} />
      <input name="subject" type="hidden" value={template.subject ?? ""} />
      <input name="title_template" type="hidden" value={template.titleTemplate} />
      <input name="body_template" type="hidden" value={template.bodyTemplate} />
      <input name="is_active" type="hidden" value={template.isActive ? "false" : "true"} />
      <button
        className="inline-flex h-9 items-center rounded-lg border border-line px-3 text-xs font-semibold text-foreground transition hover:border-brand"
        type="submit"
      >
        {label}
      </button>
    </form>
  );
}

export default async function NotificationChannelsPage({ searchParams }: NotificationChannelsPageProps) {
  const user = await requireAdminUser(getCurrentUser, [
    "super_admin",
    "compound_admin",
    "board_member",
    "finance_reviewer",
    "support_agent",
  ]);

  const params = (searchParams ? await searchParams : {}) ?? {};

  const [t, nav, notificationsT, locale, compoundContextId] = await Promise.all([
    getTranslations("NotificationChannels"),
    getTranslations("Navigation"),
    getTranslations("Notifications"),
    getLocale(),
    getCompoundContext(),
  ]);

  const isSuperAdmin = user.role === "super_admin";
  const channelFilter = params.channel && notificationChannelValues.includes(params.channel as (typeof notificationChannelValues)[number])
    ? params.channel
    : "all";
  const localeFilter = params.locale === "en" || params.locale === "ar" ? params.locale : "all";
  const categoryFilter = params.category && notificationCategoryValues.includes(params.category as (typeof notificationCategoryValues)[number])
    ? params.category
    : "all";
  const statusFilter = params.status && deliveryStatusValues.includes(params.status as DeliveryStatus)
    ? params.status
    : "all";
  const selectedTemplateId = params.template ?? null;

  const [templates, deliveryLogs] = await Promise.all([
    getNotificationTemplates(),
    getNotificationDeliveryLogs(statusFilter === "all" ? undefined : statusFilter),
  ]);

  const filteredTemplates = templates.filter((template) => {
    if (channelFilter !== "all" && template.channel !== channelFilter) return false;
    if (localeFilter !== "all" && template.locale !== localeFilter) return false;
    if (categoryFilter !== "all" && template.category !== categoryFilter) return false;

    return true;
  });
  const selectedTemplate = filteredTemplates.find((template) => template.id === selectedTemplateId)
    ?? templates.find((template) => template.id === selectedTemplateId)
    ?? null;
  const retryableLogs = deliveryLogs.filter((log) => log.status === "failed");

  const metrics = [
    {
      key: "templates",
      label: t("metrics.templates"),
      value: String(templates.length),
      tone: "neutral" as const,
    },
    {
      key: "activeTemplates",
      label: t("metrics.activeTemplates"),
      value: String(templates.filter((template) => template.isActive).length),
      tone: "success" as const,
    },
    {
      key: "failedDeliveries",
      label: t("metrics.failedDeliveries"),
      value: String(countByStatus(deliveryLogs, "failed")),
      tone: "danger" as const,
    },
    {
      key: "retryable",
      label: t("metrics.retryable"),
      value: String(retryableLogs.length),
      tone: "accent" as const,
    },
  ];

  const updatedMessageMap: Record<string, string> = {
    "template-created": t("messages.templateCreated"),
    "template-updated": t("messages.templateUpdated"),
    "template-status": t("messages.templateStatusUpdated"),
    "delivery-retried": t("messages.deliveryRetried"),
  };
  const updatedMessage = params.updated ? updatedMessageMap[params.updated] ?? null : null;

  const currentFilters = {
    channel: channelFilter !== "all" ? channelFilter : undefined,
    locale: localeFilter !== "all" ? localeFilter : undefined,
    category: categoryFilter !== "all" ? categoryFilter : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <Link className="text-sm font-semibold text-brand hover:text-brand-strong" href="/">
              {"< "} {nav("dashboard")}
            </Link>
            <h1 className="mt-2 text-3xl font-semibold">{t("title")}</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted">{t("subtitle")}</p>
          </div>
          <LogoutButton />
        </div>
      </header>

      <CompoundContextBanner isSuperAdmin={isSuperAdmin} />

      <section className="mx-auto max-w-7xl space-y-6 px-5 py-6 lg:px-8">
        {updatedMessage ? (
          <p className="rounded-lg bg-[#e6f3ef] px-4 py-3 text-sm font-medium text-brand">{updatedMessage}</p>
        ) : null}

        {isSuperAdmin && !compoundContextId ? (
          <div className="rounded-lg border border-[#e7d7a9] bg-[#fff8e8] px-4 py-3 text-sm text-[#7a5d1a]">
            <p className="font-semibold">{t("scopeWarning.title")}</p>
            <p className="mt-1">{t("scopeWarning.description")}</p>
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metrics.map((item) => (
            <article className="rounded-lg border border-line bg-panel p-5" key={item.key}>
              <p className="text-sm font-medium text-muted">{item.label}</p>
              <p className={`mt-3 text-3xl font-semibold ${metricTone(item.tone)}`}>{item.value}</p>
            </article>
          ))}
        </div>

        <div className="rounded-lg border border-line bg-panel p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold">{t("filters.title")}</h2>
              <p className="mt-1 text-sm text-muted">{t("filters.subtitle")}</p>
            </div>
            <form className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <label className="text-xs font-semibold text-muted">
                {t("filters.channel")}
                <select
                  className="mt-1 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm text-foreground"
                  defaultValue={channelFilter}
                  name="channel"
                >
                  <option value="all">{t("filters.all")}</option>
                  {notificationChannelValues.map((channel) => (
                    <option key={channel} value={channel}>
                      {t(`channels.${channel}`)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-semibold text-muted">
                {t("filters.locale")}
                <select
                  className="mt-1 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm text-foreground"
                  defaultValue={localeFilter}
                  name="locale"
                >
                  <option value="all">{t("filters.all")}</option>
                  <option value="en">{t("locales.en")}</option>
                  <option value="ar">{t("locales.ar")}</option>
                </select>
              </label>
              <label className="text-xs font-semibold text-muted">
                {t("filters.category")}
                <select
                  className="mt-1 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm text-foreground"
                  defaultValue={categoryFilter}
                  name="category"
                >
                  <option value="all">{t("filters.all")}</option>
                  {notificationCategoryValues.map((category) => (
                    <option key={category} value={category}>
                      {notificationsT(`categories.${category}`)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-semibold text-muted">
                {t("filters.status")}
                <select
                  className="mt-1 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm text-foreground"
                  defaultValue={statusFilter}
                  name="status"
                >
                  <option value="all">{t("filters.all")}</option>
                  {deliveryStatusValues.map((status) => (
                    <option key={status} value={status}>
                      {t(`statuses.${status}`)}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex gap-3 sm:col-span-2 xl:col-span-4">
                <button
                  className="inline-flex h-10 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand-strong"
                  type="submit"
                >
                  {t("filters.apply")}
                </button>
                <Link
                  className="inline-flex h-10 items-center rounded-lg border border-line px-4 text-sm font-semibold text-foreground transition hover:border-brand"
                  href="/notifications/channels"
                >
                  {t("filters.clear")}
                </Link>
              </div>
            </form>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_1.2fr]">
          <section className="rounded-lg border border-line bg-panel p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">{t("templates.title")}</h2>
                <p className="mt-1 text-sm text-muted">{t("templates.subtitle")}</p>
              </div>
              <Link
                className="inline-flex h-10 items-center rounded-lg border border-line px-4 text-sm font-semibold text-foreground transition hover:border-brand"
                href={`/notifications/channels${buildQuery(currentFilters)}`}
              >
                {t("templates.new")}
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {filteredTemplates.length > 0 ? (
                filteredTemplates.map((template) => {
                  const editQuery = buildQuery({
                    ...currentFilters,
                    template: template.id,
                  });

                  return (
                    <article
                      className={`rounded-lg border p-4 ${
                        selectedTemplate?.id === template.id ? "border-brand bg-[#f6fbf9]" : "border-line bg-background"
                      }`}
                      key={template.id}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-2">
                            <span className="rounded-full border border-line px-2.5 py-1 text-xs font-semibold text-foreground">
                              {notificationsT(`categories.${template.category}`)}
                            </span>
                            <span className="rounded-full border border-line px-2.5 py-1 text-xs font-semibold text-muted">
                              {t(`channels.${template.channel}`)}
                            </span>
                            <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${localeBadgeTone(template.locale)}`}>
                              {t(`locales.${template.locale}`)}
                            </span>
                            <span
                              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                                template.isActive
                                  ? "border-[#cbe7de] bg-[#e6f3ef] text-brand"
                                  : "border-line bg-panel text-muted"
                              }`}
                            >
                              {template.isActive ? t("templates.active") : t("templates.inactive")}
                            </span>
                          </div>
                          <p className="text-sm font-semibold text-foreground">{template.subject ?? t("templates.noSubject")}</p>
                          <p className="text-xs text-muted">{template.titleTemplate}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Link
                            className="inline-flex h-9 items-center rounded-lg border border-line px-3 text-xs font-semibold text-foreground transition hover:border-brand"
                            href={`/notifications/channels${editQuery}`}
                          >
                            {t("templates.edit")}
                          </Link>
                          <TemplateQuickToggle
                            label={template.isActive ? t("templates.deactivate") : t("templates.activate")}
                            template={template}
                          />
                        </div>
                      </div>
                    </article>
                  );
                })
              ) : (
                <div className="rounded-lg border border-dashed border-line bg-background px-4 py-6 text-sm text-muted">
                  {t("templates.empty")}
                </div>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-line bg-panel p-5">
            <h2 className="text-lg font-semibold">
              {selectedTemplate ? t("editor.editTitle") : t("editor.createTitle")}
            </h2>
            <p className="mt-1 text-sm text-muted">{t("editor.subtitle")}</p>

            <form action={upsertNotificationTemplateAction} className="mt-5 space-y-4">
              <input name="template_id" type="hidden" value={selectedTemplate?.id ?? ""} />
              <input name="compound_id" type="hidden" value={compoundContextId ?? ""} />

              <div className="grid gap-4 sm:grid-cols-3">
                <label className="text-xs font-semibold text-muted">
                  {t("editor.category")}
                  <select
                    className="mt-1 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm text-foreground"
                    defaultValue={selectedTemplate?.category ?? "finance"}
                    name="category"
                  >
                    {notificationCategoryValues.map((category) => (
                      <option key={category} value={category}>
                        {notificationsT(`categories.${category}`)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-semibold text-muted">
                  {t("editor.channel")}
                  <select
                    className="mt-1 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm text-foreground"
                    defaultValue={selectedTemplate?.channel ?? "push"}
                    name="channel"
                  >
                    {notificationChannelValues.map((channel) => (
                      <option key={channel} value={channel}>
                        {t(`channels.${channel}`)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-semibold text-muted">
                  {t("editor.locale")}
                  <select
                    className="mt-1 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm text-foreground"
                    defaultValue={selectedTemplate?.locale ?? "en"}
                    name="locale"
                  >
                    <option value="en">{t("locales.en")}</option>
                    <option value="ar">{t("locales.ar")}</option>
                  </select>
                </label>
              </div>

              <label className="block text-xs font-semibold text-muted">
                {t("editor.subject")}
                <input
                  className="mt-1 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm text-foreground"
                  defaultValue={selectedTemplate?.subject ?? ""}
                  name="subject"
                  placeholder={t("editor.subjectPlaceholder")}
                />
              </label>

              <label className="block text-xs font-semibold text-muted">
                {t("editor.titleTemplate")}
                <input
                  className="mt-1 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm text-foreground"
                  defaultValue={selectedTemplate?.titleTemplate ?? ""}
                  name="title_template"
                  placeholder={t("editor.titlePlaceholder")}
                  required
                />
              </label>

              <label className="block text-xs font-semibold text-muted">
                {t("editor.bodyTemplate")}
                <textarea
                  className="mt-1 min-h-32 w-full rounded-lg border border-line bg-background px-3 py-3 text-sm text-foreground"
                  defaultValue={selectedTemplate?.bodyTemplate ?? ""}
                  name="body_template"
                  placeholder={t("editor.bodyPlaceholder")}
                  required
                />
              </label>

              <label className="flex items-center gap-3 rounded-lg border border-line bg-background px-4 py-3 text-sm font-medium text-foreground">
                <input
                  defaultChecked={selectedTemplate?.isActive ?? true}
                  name="is_active"
                  type="checkbox"
                  value="true"
                />
                <span>{t("editor.activeToggle")}</span>
              </label>

              <div className="rounded-lg border border-dashed border-line bg-background p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("preview.title")}</p>
                <p className="mt-3 text-sm font-semibold text-foreground">
                  {replacePreviewVariables(selectedTemplate?.titleTemplate ?? "") || t("preview.titleFallback")}
                </p>
                <p className="mt-2 text-sm leading-6 text-muted">
                  {replacePreviewVariables(selectedTemplate?.bodyTemplate ?? "") || t("preview.bodyFallback")}
                </p>
                <p className="mt-4 text-xs text-muted">{t("preview.variables")}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {Object.entries(previewVariables).map(([key, value]) => (
                    <span className="rounded-full border border-line px-2.5 py-1 text-xs text-muted" key={key}>
                      {`{{${key}}}`} = {value}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  className="inline-flex h-10 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand-strong"
                  type="submit"
                >
                  {selectedTemplate ? t("editor.save") : t("editor.create")}
                </button>
                {selectedTemplate ? (
                  <Link
                    className="inline-flex h-10 items-center rounded-lg border border-line px-4 text-sm font-semibold text-foreground transition hover:border-brand"
                    href={`/notifications/channels${buildQuery(currentFilters)}`}
                  >
                    {t("editor.cancel")}
                  </Link>
                ) : null}
              </div>
            </form>
          </section>
        </div>

        <section className="rounded-lg border border-line bg-panel p-5">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold">{t("delivery.title")}</h2>
              <p className="mt-1 text-sm text-muted">{t("delivery.subtitle")}</p>
            </div>
            <p className="text-sm text-muted">
              {t("delivery.summary", {
                failed: countByStatus(deliveryLogs, "failed"),
                queued: countByStatus(deliveryLogs, "queued"),
                sent: countByStatus(deliveryLogs, "sent"),
              })}
            </p>
          </div>

          <div className="mt-5 overflow-x-auto">
            {deliveryLogs.length > 0 ? (
              <table className="min-w-full divide-y divide-line text-sm">
                <thead>
                  <tr className="text-start text-xs font-semibold uppercase tracking-wide text-muted">
                    <th className="px-3 py-3 text-start">{t("delivery.columns.channel")}</th>
                    <th className="px-3 py-3 text-start">{t("delivery.columns.status")}</th>
                    <th className="px-3 py-3 text-start">{t("delivery.columns.recipient")}</th>
                    <th className="px-3 py-3 text-start">{t("delivery.columns.provider")}</th>
                    <th className="px-3 py-3 text-start">{t("delivery.columns.attempt")}</th>
                    <th className="px-3 py-3 text-start">{t("delivery.columns.createdAt")}</th>
                    <th className="px-3 py-3 text-start">{t("delivery.columns.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {deliveryLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="px-3 py-3 font-medium text-foreground">{t(`channels.${log.channel}`)}</td>
                      <td className="px-3 py-3">
                        <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusBadgeTone(log.status)}`}>
                          {t(`statuses.${log.status}`)}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-muted">{log.recipient ?? t("delivery.notAvailable")}</td>
                      <td className="px-3 py-3 text-muted">{log.provider}</td>
                      <td className="px-3 py-3 text-muted">{log.attemptNumber}</td>
                      <td className="px-3 py-3 text-muted">{formatDate(log.createdAt, locale)}</td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-2">
                          {log.status === "failed" ? (
                            <form action={retryDeliveryAction.bind(null, log.id)}>
                              <button
                                className="inline-flex h-9 items-center rounded-lg border border-line px-3 text-xs font-semibold text-foreground transition hover:border-brand"
                                type="submit"
                              >
                                {t("delivery.retry")}
                              </button>
                            </form>
                          ) : null}
                          {log.errorMessage || log.providerResponse ? (
                            <details className="rounded-lg border border-line bg-background px-3 py-2 text-xs text-muted">
                              <summary className="cursor-pointer font-semibold text-foreground">
                                {t("delivery.details")}
                              </summary>
                              {log.errorMessage ? <p className="mt-2">{log.errorMessage}</p> : null}
                              {log.providerResponse ? (
                                <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">
                                  {JSON.stringify(log.providerResponse, null, 2)}
                                </pre>
                              ) : null}
                            </details>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="rounded-lg border border-dashed border-line bg-background px-4 py-6 text-sm text-muted">
                {t("delivery.empty")}
              </div>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
