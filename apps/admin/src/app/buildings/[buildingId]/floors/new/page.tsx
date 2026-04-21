import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { getBuilding, getCurrentUser } from "@/lib/api";
import { requireAdminUser } from "@/lib/session";

import { createFloorAction } from "../../../actions";

interface NewFloorPageProps {
  params: Promise<{ buildingId: string }>;
}

export default async function NewFloorPage({ params }: NewFloorPageProps) {
  await requireAdminUser(getCurrentUser);
  const { buildingId } = await params;
  const [building, t] = await Promise.all([getBuilding(buildingId), getTranslations("Registry")]);

  if (!building) notFound();

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-line bg-panel">
        <div className="mx-auto max-w-4xl px-5 py-6 lg:px-8">
          <Link className="text-sm font-semibold text-brand hover:text-brand-strong" href={`/buildings/${building.id}`}>
            {building.name}
          </Link>
          <h1 className="mt-2 text-3xl font-semibold">{t("newFloorTitle")}</h1>
          <p className="mt-2 text-sm text-muted">{t("newFloorDesc")}</p>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-5 py-6 lg:px-8">
        <form action={createFloorAction.bind(null, building.id)} className="rounded-lg border border-line bg-panel p-5">
          <div className="grid gap-5 md:grid-cols-3">
            <label className="grid gap-2">
              <span className="text-sm font-semibold">{t("label")}</span>
              <input
                className="h-11 rounded-lg border border-line px-3 text-sm outline-none focus:border-brand"
                name="label"
                placeholder="Ground"
                required
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold">{t("levelNumber")}</span>
              <input
                className="h-11 rounded-lg border border-line px-3 text-sm outline-none focus:border-brand"
                name="levelNumber"
                required
                type="number"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold">{t("sortOrder")}</span>
              <input
                className="h-11 rounded-lg border border-line px-3 text-sm outline-none focus:border-brand"
                defaultValue={0}
                min={0}
                name="sortOrder"
                type="number"
              />
            </label>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link
              className="inline-flex h-11 items-center justify-center rounded-lg border border-line px-4 text-sm font-semibold hover:border-brand"
              href={`/buildings/${building.id}`}
            >
              {t("cancel")}
            </Link>
            <button
              className="inline-flex h-11 items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong"
              type="submit"
            >
              {t("createFloor")}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
