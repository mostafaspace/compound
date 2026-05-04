import type {
  Announcement,
  AnnouncementCategory,
  AnnouncementPriority,
  AnnouncementStatus,
  AnnouncementTargetType,
  UserRole,
} from "@compound/contracts";
import {
  announcementCategoryValues,
  announcementPriorityValues,
  announcementStatusValues,
  announcementTargetTypeValues,
  userRoleValues,
} from "@compound/contracts";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

import { SiteNav } from "@/components/site-nav";
import {
  getAnnouncement,
  getAnnouncementAcknowledgements,
  getAnnouncements,
  getCurrentUser,
} from "@/lib/api";
import { requireAdminUser } from "@/lib/session";

import {
  archiveAnnouncementAction,
  createAnnouncementAction,
  publishAnnouncementAction,
  updateAnnouncementAction,
} from "./actions";

interface AnnouncementsPageProps {
  searchParams?: Promise<{
    ack?: string;
    archived?: string;
    authorId?: string;
    category?: string;
    created?: string;
    edit?: string;
    from?: string;
    published?: string;
    q?: string;
    status?: string;
    targetId?: string;
    targetType?: string;
    to?: string;
    updated?: string;
  }>;
}

const categoryFilters: Array<AnnouncementCategory | "all"> = ["all", ...announcementCategoryValues];
const statusFilters: Array<AnnouncementStatus | "all"> = ["all", ...announcementStatusValues];
const targetTypeFilters: Array<AnnouncementTargetType | "all"> = ["all", ...announcementTargetTypeValues];

function parseCategory(value?: string): AnnouncementCategory | "all" {
  return categoryFilters.includes(value as AnnouncementCategory | "all") ? (value as AnnouncementCategory | "all") : "all";
}

function parseStatus(value?: string): AnnouncementStatus | "all" {
  return statusFilters.includes(value as AnnouncementStatus | "all") ? (value as AnnouncementStatus | "all") : "all";
}

function parseTargetType(value?: string): AnnouncementTargetType | "all" {
  return targetTypeFilters.includes(value as AnnouncementTargetType | "all") ? (value as AnnouncementTargetType | "all") : "all";
}

function formatDate(value: string | null | undefined, locale: string): string {
  if (!value) return "-";

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function toDateTimeLocal(value: string | null | undefined): string {
  if (!value) return "";

  return new Date(value).toISOString().slice(0, 16);
}

function statusTone(status: AnnouncementStatus): string {
  if (status === "published") return "bg-[#e6f3ef] text-brand";
  if (status === "scheduled") return "bg-[#f3ead7] text-accent";
  if (status === "archived" || status === "expired") return "bg-background text-muted";
  return "bg-[#eaf0ff] text-[#244a8f]";
}

function priorityTone(priority: AnnouncementPriority): string {
  if (priority === "critical") return "bg-[#fff3f2] text-danger";
  if (priority === "high") return "bg-[#f3ead7] text-accent";
  if (priority === "normal") return "bg-[#e6f3ef] text-brand";
  return "bg-background text-muted";
}

function fieldId(prefix: string, name: string): string {
  return `${prefix}-${name}`;
}

function selectedText(announcement: Announcement | null, fallback: string): string {
  return announcement ? announcement.targetIds.join(", ") : fallback;
}

export default async function AnnouncementsPage({ searchParams }: AnnouncementsPageProps) {
  await requireAdminUser(getCurrentUser, [
    "super_admin",
    "compound_admin",
    "board_member",
    "support_agent",
  ]);

  const locale = await getLocale();
  const t = await getTranslations("Announcements");
  const params = searchParams ? await searchParams : {};
  const status = parseStatus(params.status);
  const category = parseCategory(params.category);
  const targetType = parseTargetType(params.targetType);
  const authorId = params.authorId ? Number(params.authorId) : undefined;

  const [announcements, editingAnnouncement, acknowledgementDetails] = await Promise.all([
    getAnnouncements({
      authorId: Number.isFinite(authorId) ? authorId : undefined,
      category,
      from: params.from,
      perPage: 50,
      search: params.q,
      status,
      targetId: params.targetId,
      targetType,
      to: params.to,
    }),
    params.edit ? getAnnouncement(params.edit) : Promise.resolve(null),
    params.ack ? getAnnouncementAcknowledgements(params.ack) : Promise.resolve(null),
  ]);

  const composerPrefix = editingAnnouncement ? "edit-announcement" : "new-announcement";
  const composerAction = editingAnnouncement
    ? updateAnnouncementAction.bind(null, editingAnnouncement.id)
    : createAnnouncementAction;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteNav breadcrumb={[{ label: t("title") }]} />
      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <Link className="text-sm font-semibold text-brand hover:text-brand-strong" href="/">
              {t("back")}
            </Link>
            <h1 className="mt-2 text-3xl font-semibold md:text-4xl">{t("title")}</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted">{t("subtitle")}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              className="inline-flex h-11 items-center justify-center rounded-lg border border-line bg-panel px-4 text-sm font-semibold hover:border-brand"
              href="/announcements"
            >
              {t("actions.new")}
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl space-y-5 px-5 py-6 lg:px-8">
        <StatusMessages params={params} t={t} />

        <div className="grid gap-5 md:grid-cols-4">
          <MetricCard label={t("metrics.total")} value={announcements.length} />
          <MetricCard label={t("metrics.published")} value={announcements.filter((item) => item.status === "published").length} />
          <MetricCard label={t("metrics.scheduled")} value={announcements.filter((item) => item.status === "scheduled").length} />
          <MetricCard label={t("metrics.archived")} value={announcements.filter((item) => item.status === "archived").length} />
        </div>

        <form className="rounded-lg border border-line bg-panel p-5" method="get">
          <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
            <label className="text-xs font-semibold text-muted">
              {t("filters.search")}
              <input
                className="mt-1 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm"
                defaultValue={params.q ?? ""}
                name="q"
              />
            </label>
            <label className="text-xs font-semibold text-muted">
              {t("filters.status")}
              <select className="mt-1 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm" defaultValue={status} name="status">
                {statusFilters.map((value) => (
                  <option key={value} value={value}>
                    {value === "all" ? t("filters.all") : t(`statuses.${value}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-muted">
              {t("filters.category")}
              <select className="mt-1 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm" defaultValue={category} name="category">
                {categoryFilters.map((value) => (
                  <option key={value} value={value}>
                    {value === "all" ? t("filters.all") : t(`categories.${value}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-muted">
              {t("filters.targetType")}
              <select className="mt-1 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm" defaultValue={targetType} name="targetType">
                {targetTypeFilters.map((value) => (
                  <option key={value} value={value}>
                    {value === "all" ? t("filters.all") : t(`targetTypes.${value}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-muted">
              {t("filters.targetId")}
              <input
                className="mt-1 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm"
                defaultValue={params.targetId ?? ""}
                name="targetId"
              />
            </label>
            <label className="text-xs font-semibold text-muted">
              {t("filters.authorId")}
              <input
                className="mt-1 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm"
                defaultValue={params.authorId ?? ""}
                min={1}
                name="authorId"
                type="number"
              />
            </label>
            <label className="text-xs font-semibold text-muted">
              {t("filters.from")}
              <input
                className="mt-1 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm"
                defaultValue={params.from ?? ""}
                name="from"
                type="date"
              />
            </label>
            <label className="text-xs font-semibold text-muted">
              {t("filters.to")}
              <input
                className="mt-1 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm"
                defaultValue={params.to ?? ""}
                name="to"
                type="date"
              />
            </label>
            <div className="flex items-end gap-2 md:col-span-3 lg:col-span-4">
              <button className="inline-flex h-10 items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong" type="submit">
                {t("filters.apply")}
              </button>
              <Link className="inline-flex h-10 items-center justify-center rounded-lg border border-line px-4 text-sm font-semibold hover:border-brand" href="/announcements?status=archived">
                {t("filters.archive")}
              </Link>
              <Link className="inline-flex h-10 items-center justify-center rounded-lg border border-line px-4 text-sm font-semibold hover:border-brand" href="/announcements">
                {t("filters.clear")}
              </Link>
            </div>
          </div>
        </form>

        <div className="grid gap-5 xl:grid-cols-[0.95fr_1.45fr]">
          <form action={composerAction} className="rounded-lg border border-line bg-panel p-5">
            <div className="flex flex-col gap-2 border-b border-line pb-4">
              <h2 className="text-lg font-semibold">
                {editingAnnouncement ? t("composer.editTitle") : t("composer.newTitle")}
              </h2>
              {editingAnnouncement ? (
                <p className="text-xs text-muted">
                  {t("composer.revision", { revision: editingAnnouncement.revision })}
                </p>
              ) : null}
            </div>

            <div className="mt-4 grid gap-4">
              <div className="grid gap-3 md:grid-cols-2">
                <TextInput
                  defaultValue={editingAnnouncement?.title.en ?? ""}
                  id={fieldId(composerPrefix, "title-en")}
                  label={t("fields.titleEn")}
                  name="titleEn"
                  required
                />
                <TextInput
                  defaultValue={editingAnnouncement?.title.ar ?? ""}
                  dir="rtl"
                  id={fieldId(composerPrefix, "title-ar")}
                  label={t("fields.titleAr")}
                  name="titleAr"
                  required
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <TextArea
                  defaultValue={editingAnnouncement?.body.en ?? ""}
                  id={fieldId(composerPrefix, "body-en")}
                  label={t("fields.bodyEn")}
                  name="bodyEn"
                  required
                />
                <TextArea
                  defaultValue={editingAnnouncement?.body.ar ?? ""}
                  dir="rtl"
                  id={fieldId(composerPrefix, "body-ar")}
                  label={t("fields.bodyAr")}
                  name="bodyAr"
                  required
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-xs font-semibold text-muted" htmlFor={fieldId(composerPrefix, "category")}>
                  {t("fields.category")}
                  <select
                    className="mt-1 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm"
                    defaultValue={editingAnnouncement?.category ?? "general"}
                    id={fieldId(composerPrefix, "category")}
                    name="category"
                  >
                    {announcementCategoryValues.map((value) => (
                      <option key={value} value={value}>
                        {t(`categories.${value}`)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-semibold text-muted" htmlFor={fieldId(composerPrefix, "priority")}>
                  {t("fields.priority")}
                  <select
                    className="mt-1 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm"
                    defaultValue={editingAnnouncement?.priority ?? "normal"}
                    id={fieldId(composerPrefix, "priority")}
                    name="priority"
                  >
                    {announcementPriorityValues.map((value) => (
                      <option key={value} value={value}>
                        {t(`priorities.${value}`)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-semibold text-muted" htmlFor={fieldId(composerPrefix, "target-type")}>
                  {t("fields.targetType")}
                  <select
                    className="mt-1 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm"
                    defaultValue={editingAnnouncement?.targetType ?? "all"}
                    id={fieldId(composerPrefix, "target-type")}
                    name="targetType"
                  >
                    {announcementTargetTypeValues.map((value) => (
                      <option key={value} value={value}>
                        {t(`targetTypes.${value}`)}
                      </option>
                    ))}
                  </select>
                </label>
                <TextInput
                  defaultValue={selectedText(editingAnnouncement, "")}
                  id={fieldId(composerPrefix, "target-ids")}
                  label={t("fields.targetIds")}
                  name="targetIds"
                />
                <label className="text-xs font-semibold text-muted" htmlFor={fieldId(composerPrefix, "target-role")}>
                  {t("fields.targetRole")}
                  <select
                    className="mt-1 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm"
                    defaultValue={editingAnnouncement?.targetRole ?? ""}
                    id={fieldId(composerPrefix, "target-role")}
                    name="targetRole"
                  >
                    <option value="">{t("fields.noRole")}</option>
                    {userRoleValues.map((value) => (
                      <option key={value} value={value}>
                        {t(`roles.${value}`)}
                      </option>
                    ))}
                  </select>
                </label>
                <TextInput
                  defaultValue={toDateTimeLocal(editingAnnouncement?.scheduledAt)}
                  id={fieldId(composerPrefix, "scheduled-at")}
                  label={t("fields.scheduledAt")}
                  name="scheduledAt"
                  type="datetime-local"
                />
                <TextInput
                  defaultValue={toDateTimeLocal(editingAnnouncement?.expiresAt)}
                  id={fieldId(composerPrefix, "expires-at")}
                  label={t("fields.expiresAt")}
                  name="expiresAt"
                  type="datetime-local"
                />
                <TextInput
                  defaultValue={editingAnnouncement?.attachments.at(0)?.name ?? ""}
                  id={fieldId(composerPrefix, "attachment-name")}
                  label={t("fields.attachmentName")}
                  name="attachmentName"
                />
                <TextInput
                  defaultValue={editingAnnouncement?.attachments.at(0)?.url ?? ""}
                  id={fieldId(composerPrefix, "attachment-url")}
                  label={t("fields.attachmentUrl")}
                  name="attachmentUrl"
                  type="url"
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <Checkbox
                  defaultChecked={editingAnnouncement?.requiresVerifiedMembership ?? false}
                  label={t("fields.requiresVerifiedMembership")}
                  name="requiresVerifiedMembership"
                />
                <Checkbox
                  defaultChecked={editingAnnouncement?.requiresAcknowledgement ?? false}
                  label={t("fields.requiresAcknowledgement")}
                  name="requiresAcknowledgement"
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <button className="inline-flex h-10 items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong" type="submit">
                  {editingAnnouncement ? t("composer.update") : t("composer.create")}
                </button>
                {editingAnnouncement ? (
                  <Link className="inline-flex h-10 items-center justify-center rounded-lg border border-line px-4 text-sm font-semibold hover:border-brand" href="/announcements">
                    {t("composer.cancel")}
                  </Link>
                ) : null}
              </div>
            </div>
          </form>

          <section className="overflow-hidden rounded-lg border border-line bg-panel">
            <div className="border-b border-line p-5">
              <h2 className="text-lg font-semibold">{t("list.title")}</h2>
              <p className="mt-1 text-sm text-muted">{t("list.subtitle")}</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1120px] border-collapse text-sm">
                <thead className="bg-background text-muted">
                  <tr>
                    <th className="px-4 py-3 text-start font-semibold">{t("fields.notice")}</th>
                    <th className="px-4 py-3 text-start font-semibold">{t("fields.category")}</th>
                    <th className="px-4 py-3 text-start font-semibold">{t("fields.priority")}</th>
                    <th className="px-4 py-3 text-start font-semibold">{t("fields.target")}</th>
                    <th className="px-4 py-3 text-start font-semibold">{t("fields.status")}</th>
                    <th className="px-4 py-3 text-start font-semibold">{t("fields.acknowledgements")}</th>
                    <th className="px-4 py-3 text-start font-semibold">{t("fields.dates")}</th>
                    <th className="px-4 py-3 text-start font-semibold">{t("fields.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {announcements.length > 0 ? (
                    announcements.map((announcement) => (
                      <tr key={announcement.id}>
                        <td className="px-4 py-4">
                          <div className="max-w-[18rem]">
                            <p className="font-semibold">{announcement.title[locale === "ar" ? "ar" : "en"]}</p>
                            <p className="mt-1 line-clamp-2 text-xs text-muted" dir={locale === "ar" ? "rtl" : "ltr"}>
                              {announcement.body[locale === "ar" ? "ar" : "en"]}
                            </p>
                            <p className="mt-2 font-mono text-xs text-muted">{announcement.id.slice(0, 10)}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4">{t(`categories.${announcement.category}`)}</td>
                        <td className="px-4 py-4">
                          <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${priorityTone(announcement.priority)}`}>
                            {t(`priorities.${announcement.priority}`)}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <TargetSummary announcement={announcement} t={t} />
                        </td>
                        <td className="px-4 py-4">
                          <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${statusTone(announcement.status)}`}>
                            {t(`statuses.${announcement.status}`)}
                          </span>
                          <p className="mt-2 text-xs text-muted">
                            {t("list.revision", { revision: announcement.revision })}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <AcknowledgementSummary announcement={announcement} t={t} />
                        </td>
                        <td className="px-4 py-4 text-xs text-muted">
                          <p>{t("fields.publishedAt")}: {formatDate(announcement.publishedAt, locale)}</p>
                          <p>{t("fields.scheduledAt")}: {formatDate(announcement.scheduledAt, locale)}</p>
                          <p>{t("fields.archivedAt")}: {formatDate(announcement.archivedAt, locale)}</p>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-2">
                            <Link className="inline-flex h-9 items-center rounded-lg border border-line px-3 text-xs font-semibold hover:border-brand" href={`/announcements?edit=${announcement.id}`}>
                              {t("actions.edit")}
                            </Link>
                            {announcement.requiresAcknowledgement ? (
                              <Link className="inline-flex h-9 items-center rounded-lg border border-line px-3 text-xs font-semibold hover:border-brand" href={`/announcements?ack=${announcement.id}`}>
                                {t("actions.acknowledgements")}
                              </Link>
                            ) : null}
                            {announcement.status !== "archived" && announcement.status !== "published" ? (
                              <form action={publishAnnouncementAction.bind(null, announcement.id)}>
                                <button className="inline-flex h-9 items-center rounded-lg bg-brand px-3 text-xs font-semibold text-white hover:bg-brand-strong" type="submit">
                                  {t("actions.publish")}
                                </button>
                              </form>
                            ) : null}
                            {announcement.status !== "archived" ? (
                              <form action={archiveAnnouncementAction.bind(null, announcement.id)}>
                                <button className="inline-flex h-9 items-center rounded-lg border border-danger px-3 text-xs font-semibold text-danger hover:bg-[#fff3f2]" type="submit">
                                  {t("actions.archive")}
                                </button>
                              </form>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="px-4 py-6 text-muted" colSpan={8}>
                        {t("list.empty")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {acknowledgementDetails ? (
          <section className="rounded-lg border border-line bg-panel p-5">
            <div className="flex flex-col gap-2 border-b border-line pb-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold">{t("acknowledgements.title")}</h2>
                <p className="text-sm text-muted">
                  {t("acknowledgements.summary", {
                    acknowledged: acknowledgementDetails.summary.acknowledgedCount,
                    pending: acknowledgementDetails.summary.pendingCount,
                    targeted: acknowledgementDetails.summary.targetedCount,
                  })}
                </p>
              </div>
              <Link className="inline-flex h-10 items-center justify-center rounded-lg border border-line px-4 text-sm font-semibold hover:border-brand" href="/announcements">
                {t("acknowledgements.close")}
              </Link>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {acknowledgementDetails.data.length > 0 ? (
                acknowledgementDetails.data.map((acknowledgement) => (
                  <article className="rounded-lg border border-line bg-background p-4" key={`${acknowledgement.userId}-${acknowledgement.acknowledgedAt}`}>
                    <p className="font-semibold">{acknowledgement.userName ?? t("acknowledgements.unknownUser")}</p>
                    <p className="mt-1 text-xs text-muted">{formatDate(acknowledgement.acknowledgedAt, locale)}</p>
                  </article>
                ))
              ) : (
                <p className="text-sm text-muted">{t("acknowledgements.empty")}</p>
              )}
            </div>
          </section>
        ) : null}
      </section>
    </main>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-lg border border-line bg-panel p-5">
      <p className="text-sm font-medium text-muted">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-brand">{value}</p>
    </article>
  );
}

function StatusMessages({
  params,
  t,
}: {
  params: Record<string, string | undefined>;
  t: Awaited<ReturnType<typeof getTranslations>>;
}) {
  const messages = [
    params.created ? t("messages.created") : null,
    params.updated ? t("messages.updated") : null,
    params.published ? t("messages.published") : null,
    params.archived ? t("messages.archived") : null,
  ].filter(Boolean);

  return messages.map((message) => (
    <p className="rounded-lg bg-[#e6f3ef] px-4 py-3 text-sm font-medium text-brand" key={message}>
      {message}
    </p>
  ));
}

function TextInput({
  defaultValue,
  dir,
  id,
  label,
  name,
  required,
  type = "text",
}: {
  defaultValue: string;
  dir?: "ltr" | "rtl";
  id: string;
  label: string;
  name: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="text-xs font-semibold text-muted" htmlFor={id}>
      {label}
      <input
        className="mt-1 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm"
        defaultValue={defaultValue}
        dir={dir}
        id={id}
        name={name}
        required={required}
        type={type}
      />
    </label>
  );
}

function TextArea({
  defaultValue,
  dir,
  id,
  label,
  name,
  required,
}: {
  defaultValue: string;
  dir?: "ltr" | "rtl";
  id: string;
  label: string;
  name: string;
  required?: boolean;
}) {
  return (
    <label className="text-xs font-semibold text-muted" htmlFor={id}>
      {label}
      <textarea
        className="mt-1 min-h-32 w-full rounded-lg border border-line bg-background px-3 py-2 text-sm"
        defaultValue={defaultValue}
        dir={dir}
        id={id}
        name={name}
        required={required}
      />
    </label>
  );
}

function Checkbox({
  defaultChecked,
  label,
  name,
}: {
  defaultChecked: boolean;
  label: string;
  name: string;
}) {
  return (
    <label className="flex min-h-12 items-center gap-3 rounded-lg border border-line bg-background px-3 text-sm font-semibold">
      <input className="size-4 accent-[var(--brand)]" defaultChecked={defaultChecked} name={name} type="checkbox" value="1" />
      {label}
    </label>
  );
}

function TargetSummary({
  announcement,
  t,
}: {
  announcement: Announcement;
  t: Awaited<ReturnType<typeof getTranslations>>;
}) {
  const count = announcement.targetIds.length;

  if (announcement.targetType === "role" && announcement.targetRole) {
    return (
      <div>
        <p className="font-semibold">{t(`targetTypes.${announcement.targetType}`)}</p>
        <p className="text-xs text-muted">{t(`roles.${announcement.targetRole as UserRole}`)}</p>
      </div>
    );
  }

  return (
    <div>
      <p className="font-semibold">{t(`targetTypes.${announcement.targetType}`)}</p>
      <p className="text-xs text-muted">
        {count > 0 ? t("list.targetIds", { count }) : t("list.noTargetIds")}
      </p>
    </div>
  );
}

function AcknowledgementSummary({
  announcement,
  t,
}: {
  announcement: Announcement;
  t: Awaited<ReturnType<typeof getTranslations>>;
}) {
  if (!announcement.requiresAcknowledgement) {
    return <span className="text-xs text-muted">{t("acknowledgements.notRequired")}</span>;
  }

  const summary = announcement.acknowledgementSummary;

  if (!summary) {
    return <span className="text-xs text-muted">{t("acknowledgements.pendingSummary")}</span>;
  }

  return (
    <div className="min-w-36">
      <p className="text-xs font-semibold">
        {t("acknowledgements.counts", {
          acknowledged: summary.acknowledgedCount,
          targeted: summary.targetedCount,
        })}
      </p>
      <div className="mt-2 h-2 rounded-full bg-background">
        <div
          className="h-2 rounded-full bg-brand"
          style={{
            width: `${summary.targetedCount > 0 ? (summary.acknowledgedCount / summary.targetedCount) * 100 : 0}%`,
          }}
        />
      </div>
      <p className="mt-1 text-xs text-muted">{t("acknowledgements.pending", { count: summary.pendingCount })}</p>
    </div>
  );
}
