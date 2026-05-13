import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { SiteNav } from "@/components/site-nav";
import { getCompound, getCurrentUser, getSettings, getSystemStatus } from "@/lib/api";
import { hasEffectiveRole, requireAdminUser } from "@/lib/session";

import { updateSettingsAction } from "./actions";

interface SettingsPageProps {
  searchParams?: Promise<{ updated?: string }>;
}

const NAMESPACES = [
  "documents",
  "verification",
  "visitors",
  "issues",
  "announcements",
  "finance",
  "governance",
  "notifications",
  "localization",
] as const;

type Namespace = (typeof NAMESPACES)[number];

// Field metadata â€” controls which input type renders for each setting key
interface FieldMeta {
  type: "toggle" | "number" | "text" | "tags";
}

const FIELD_META: Record<string, FieldMeta> = {
  require_upload_for_onboarding: { type: "toggle" },
  allowed_extensions: { type: "tags" },
  max_file_size_mb: { type: "number" },
  auto_approve_residents: { type: "toggle" },
  checklist_items: { type: "tags" },
  max_visitors_per_unit_per_day: { type: "number" },
  require_pre_approval: { type: "toggle" },
  pass_validity_hours: { type: "number" },
  gate_notification_enabled: { type: "toggle" },
  default_categories: { type: "tags" },
  auto_escalate_after_hours: { type: "number" },
  notify_board_on_escalation: { type: "toggle" },
  require_approval: { type: "toggle" },
  accepted_payment_methods: { type: "tags" },
  late_fee_enabled: { type: "toggle" },
  late_fee_percentage: { type: "number" },
  grace_period_days: { type: "number" },
  currency: { type: "text" },
  default_eligibility: { type: "text" },
  require_doc_compliance: { type: "toggle" },
  min_vote_duration_hours: { type: "number" },
  email_enabled: { type: "toggle" },
  sms_enabled: { type: "toggle" },
  push_enabled: { type: "toggle" },
  digest_frequency: { type: "text" },
  // Localization
  locale: { type: "text" },
  timezone: { type: "text" },
  currency_symbol: { type: "text" },
  date_format: { type: "text" },
  phone_country_code: { type: "text" },
};

function renderValue(key: string, value: unknown): string {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value ?? "");
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const user = await requireAdminUser(getCurrentUser);
  const t = await getTranslations("Settings");
  const navT = await getTranslations("Navigation");
  const sp = searchParams ? await searchParams : {};
  const canManageRoles = hasEffectiveRole(user, "super_admin") || (user.permissions ?? []).includes("manage_roles");

  // Fetch all namespace data and system status in parallel
  const [nsData, systemStatus] = await Promise.all([
    Promise.all(NAMESPACES.map((ns) => getSettings(ns).then((d) => ({
      ns,
      compoundId: d?.compoundId ?? null,
      settings: d?.settings ?? {},
    })))),
    getSystemStatus(),
  ]);
  const isDegraded = systemStatus?.status !== "ok";
  const scopedCompoundId = nsData.find(({ compoundId }) => compoundId !== null)?.compoundId ?? null;
  const scopedCompound = scopedCompoundId ? await getCompound(scopedCompoundId) : null;
  const settingsMap = Object.fromEntries(nsData.map(({ ns, settings }) => [ns, settings])) as Record<
    Namespace,
    Record<string, unknown>
  >;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteNav breadcrumb={[{ label: t("title") }]} />
      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 lg:px-8">
          <div>
            <h1 className="text-3xl font-semibold">{t("title")}</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              {scopedCompound ? t("subtitleCompound", { name: scopedCompound.name }) : t("subtitleGlobal")}
            </p>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl space-y-8 px-5 py-6 lg:px-8">
        {/* Sub-page navigation */}
        <div className="flex flex-wrap gap-3">
          {canManageRoles ? (
            <>
              <Link
                href="/settings/permissions"
                className="inline-flex items-center gap-2 rounded-lg border border-line bg-panel px-4 py-2.5 text-sm font-medium text-foreground transition hover:border-brand hover:text-brand"
              >
                {navT("permissions")}
              </Link>
              <Link
                href="/settings/roles"
                className="inline-flex items-center gap-2 rounded-lg border border-line bg-panel px-4 py-2.5 text-sm font-medium text-foreground transition hover:border-brand hover:text-brand"
              >
                {navT("roles")}
              </Link>
            </>
          ) : null}
          <Link
            href="/violation-rules"
            className="inline-flex items-center gap-2 rounded-lg border border-line bg-panel px-4 py-2.5 text-sm font-medium text-foreground transition hover:border-brand hover:text-brand"
          >
            {navT("violationRules")}
          </Link>
        </div>

        <div className="rounded-lg border border-line bg-panel px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("scopeLabel")}</p>
          <p className="mt-1 text-sm font-medium text-foreground">
            {scopedCompound ? t("scopeCompound", { name: scopedCompound.name }) : t("scopeGlobal")}
          </p>
        </div>

        {sp.updated ? (
          <p className="rounded-lg bg-[#e6f3ef] px-4 py-3 text-sm font-medium text-brand">{t("updated")}</p>
        ) : null}

        {isDegraded ? (
          <div className="rounded-lg border border-[#e7d7a9] bg-[#fff8e8] px-4 py-3 text-sm text-[#7a5d1a]">
            <p className="font-semibold">{t("degraded.title")}</p>
            <p className="mt-1">{t("degraded.description")}</p>
          </div>
        ) : null}

        {NAMESPACES.map((ns) => {
          const nsSettings = settingsMap[ns] ?? {};
          const boundAction = updateSettingsAction.bind(null, ns);

          return (
            <div key={ns} className="rounded-lg border border-line bg-panel p-5">
              <h2 className="text-lg font-semibold capitalize">{t(`namespaces.${ns}`)}</h2>

              <form action={boundAction} className="mt-4 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  {Object.entries(nsSettings).map(([key, value]) => {
                    const meta = FIELD_META[key] ?? { type: "text" };
                    const labelText = t.has(`fields.${key}`) ? t(`fields.${key}` as Parameters<typeof t>[0]) : key;

                    if (meta.type === "toggle") {
                      return (
                        <label key={key} className="flex items-center justify-between gap-4 rounded-lg border border-line bg-background px-4 py-3">
                          <span className="text-sm font-medium">{labelText}</span>
                          <select
                            className="h-9 rounded-lg border border-line bg-panel px-3 text-sm"
                            defaultValue={String(value)}
                            name={key}
                          >
                            <option value="true">{t("enabled")}</option>
                            <option value="false">{t("disabled")}</option>
                          </select>
                        </label>
                      );
                    }

                    if (meta.type === "number") {
                      return (
                        <label key={key} className="text-xs font-semibold text-muted">
                          {labelText}
                          <input
                            className="mt-1 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm"
                            defaultValue={String(value ?? "")}
                            name={key}
                            type="number"
                            step="any"
                          />
                        </label>
                      );
                    }

                    if (meta.type === "tags") {
                      return (
                        <label key={key} className="text-xs font-semibold text-muted sm:col-span-2">
                          {labelText}
                          <input
                            className="mt-1 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm"
                            defaultValue={renderValue(key, value)}
                            name={key}
                            placeholder={t("arrayPlaceholder")}
                          />
                        </label>
                      );
                    }

                    // text
                    return (
                      <label key={key} className="text-xs font-semibold text-muted">
                        {labelText}
                        <input
                          className="mt-1 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm"
                          defaultValue={String(value ?? "")}
                          name={key}
                        />
                      </label>
                    );
                  })}
                </div>

                {/* Reason field */}
                <label className="text-xs font-semibold text-muted">
                  {t("reasonLabel")}
                  <input
                    className="mt-1 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm"
                    name="_reason"
                    placeholder={t("reasonPlaceholder")}
                  />
                </label>

                <button
                  className="inline-flex h-10 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong"
                  type="submit"
                >
                  {t("saveButton")}
                </button>
              </form>
            </div>
          );
        })}
      </section>
    </main>
  );
}
