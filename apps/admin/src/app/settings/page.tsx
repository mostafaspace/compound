import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { LogoutButton } from "@/components/logout-button";
import { getCurrentUser, getSettings, getSystemStatus } from "@/lib/api";
import { requireAdminUser } from "@/lib/session";

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
] as const;

type Namespace = (typeof NAMESPACES)[number];

// Field metadata — controls which input type renders for each setting key
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
};

function renderValue(key: string, value: unknown): string {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value ?? "");
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  await requireAdminUser(getCurrentUser);
  const t = await getTranslations("Settings");
  const nav = await getTranslations("Navigation");
  const sp = searchParams ? await searchParams : {};

  // Fetch all namespace data and system status in parallel
  const [nsData, systemStatus] = await Promise.all([
    Promise.all(NAMESPACES.map((ns) => getSettings(ns).then((d) => ({ ns, settings: d?.settings ?? {} })))),
    getSystemStatus(),
  ]);
  const isDegraded = systemStatus?.status !== "ok";
  const settingsMap = Object.fromEntries(nsData.map(({ ns, settings }) => [ns, settings])) as Record<
    Namespace,
    Record<string, unknown>
  >;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <Link className="text-sm font-semibold text-brand hover:text-brand-strong" href="/">
              ← {nav("dashboard")}
            </Link>
            <h1 className="mt-2 text-3xl font-semibold">{t("title")}</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted">{t("subtitle")}</p>
          </div>
          <LogoutButton />
        </div>
      </header>

      <section className="mx-auto max-w-7xl space-y-8 px-5 py-6 lg:px-8">
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
                            <option value="true">Enabled</option>
                            <option value="false">Disabled</option>
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
                            placeholder="comma-separated values"
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
