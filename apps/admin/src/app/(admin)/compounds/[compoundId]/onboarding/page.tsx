import { getTranslations } from "next-intl/server";

import { SiteNav } from "@/components/site-nav";
import { getCurrentUser, getCompound, getCompoundOnboardingChecklist } from "@/lib/api";
import { requireAdminUser } from "@/lib/session";

interface Props {
  params: Promise<{ compoundId: string }>;
}

function CheckIcon({ completed }: { completed: boolean }) {
  if (completed) {
    return (
      <span className="flex size-7 items-center justify-center rounded-full bg-[#e6f3ef]">
        <svg aria-hidden="true" className="size-4 text-brand" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M16.704 5.29a1 1 0 0 1 .006 1.414l-7.25 7.32a1 1 0 0 1-1.421.002L3.29 9.227a1 1 0 1 1 1.42-1.408l4.04 4.08 6.54-6.603a1 1 0 0 1 1.414-.006Z"
            clipRule="evenodd"
          />
        </svg>
      </span>
    );
  }

  return (
    <span className="flex size-7 items-center justify-center rounded-full border-2 border-line bg-background">
      <span className="size-2 rounded-full bg-line" />
    </span>
  );
}

export default async function CompoundOnboardingPage({ params }: Props) {
  const { compoundId } = await params;
  await requireAdminUser(getCurrentUser);
  const t = await getTranslations("CompoundOnboarding");
  const nav = await getTranslations("Navigation");
  const stepLabels: Record<string, string> = {
    compound_activated: t("steps.compound_activated"),
    settings_configured: t("steps.settings_configured"),
    has_buildings: t("steps.has_buildings"),
    has_units: t("steps.has_units"),
    residents_invited: t("steps.residents_invited"),
    first_resident_verified: t("steps.first_resident_verified"),
    first_finance_account: t("steps.first_finance_account"),
    first_announcement: t("steps.first_announcement"),
  };

  const [compound, checklist] = await Promise.all([
    getCompound(compoundId),
    getCompoundOnboardingChecklist(compoundId),
  ]);

  if (!compound) {
    return (
      <main className="min-h-screen bg-background text-foreground">
        <section className="mx-auto max-w-7xl px-5 py-20 text-center lg:px-8">
          <p className="text-muted">{t("notFound")}</p>
        </section>
      </main>
    );
  }

  const percent = checklist?.percentComplete ?? 0;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteNav breadcrumb={[
        { label: nav("compounds"), href: "/compounds" },
        { label: compound.name, href: `/compounds/${compoundId}` },
        { label: t("title") },
      ]} />

      <header className="border-b border-line bg-panel">
        <div className="mx-auto max-w-7xl px-5 py-6 lg:px-8">
          <h1 className="text-3xl font-semibold">{t("title")}</h1>
          <p className="mt-2 text-sm text-muted">{t("subtitle", { name: compound.name })}</p>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
        {/* Progress bar */}
        <div className="mb-8 rounded-lg border border-line bg-panel p-6">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">
              {t("progress", { completed: checklist?.completedSteps ?? 0, total: checklist?.totalSteps ?? 0 })}
            </p>
            <p className="text-2xl font-bold text-brand">{percent}%</p>
          </div>
          <div className="h-3 w-full rounded-full bg-background">
            <div
              className="h-3 rounded-full bg-brand transition-all"
              style={{ width: `${percent}%` }}
            />
          </div>
          {percent === 100 && (
            <p className="mt-3 text-sm font-semibold text-brand">{t("complete")}</p>
          )}
        </div>

        {/* Steps */}
        {checklist ? (
          <div className="space-y-3">
            {checklist.steps.map((step, index) => (
              <div
                key={step.key}
                className={`flex items-center gap-4 rounded-lg border p-4 ${
                  step.completed ? "border-line bg-panel" : "border-line bg-background"
                }`}
              >
                <CheckIcon completed={step.completed} />
                <div className="flex-1">
                  <p className={`text-sm font-semibold ${step.completed ? "text-foreground" : "text-muted"}`}>
                    {index + 1}. {stepLabels[step.key] ?? step.label}
                  </p>
                </div>
                {step.completed && (
                  <span className="rounded-lg bg-[#e6f3ef] px-2.5 py-1 text-xs font-semibold text-brand">
                    {t("done")}
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">{t("loadError")}</p>
        )}
      </section>
    </main>
  );
}
