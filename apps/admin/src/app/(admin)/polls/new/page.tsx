import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getBuilding, getCompound, getCurrentUser, getCompounds, getPollTypes } from "@/lib/api";
import { hasEffectiveRole } from "@/lib/auth-access";
import { getCompoundContext, requireAdminUser } from "@/lib/session";
import { SiteNav } from "@/components/site-nav";
import { PollCreateForm } from "./poll-create-form";

export default async function NewPollPage() {
  await requireAdminUser(getCurrentUser);
  const [currentUser, compounds, activeCompoundId, pollTypes, t] = await Promise.all([
    getCurrentUser(),
    getCompounds(),
    getCompoundContext(),
    getPollTypes(),
    getTranslations("PollsVoting"),
  ]);

  const isSuperAdmin = currentUser ? hasEffectiveRole(currentUser, "super_admin") : false;
  const defaultCompoundId = activeCompoundId ?? compounds[0]?.id ?? "";
  const lockedCompound = compounds.find((c) => c.id === defaultCompoundId) ?? compounds[0] ?? null;
  const activeCompound = defaultCompoundId ? await getCompound(defaultCompoundId) : null;
  const buildings = (
    await Promise.all((activeCompound?.buildings ?? []).map((building) => getBuilding(building.id)))
  ).filter((building): building is NonNullable<typeof building> => building !== null);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteNav breadcrumb={[{ label: t("title"), href: "/polls" }, { label: t("create.title") }]} />
      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <Link className="text-sm font-semibold text-brand hover:text-brand-strong" href="/polls">
              {t("detail.backToPolls")}
            </Link>
            <h1 className="mt-2 text-3xl font-semibold">{t("create.title")}</h1>
            <p className="mt-2 text-sm text-muted">{t("create.subtitle")}</p>
          </div>

        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-6 lg:px-8">
        <PollCreateForm
          buildings={buildings}
          isSuperAdmin={isSuperAdmin}
          compounds={compounds}
          defaultCompoundId={defaultCompoundId}
          lockedCompound={lockedCompound}
          pollTypes={pollTypes}
        />
      </section>
    </main>
  );
}
