import { getTranslations } from "next-intl/server";

import { getCompoundContext } from "@/lib/session";
import { getCompound, getCompounds } from "@/lib/api";
import { CompoundSwitcher } from "./compound-switcher";

interface Props {
  /** If provided, shows the switcher; omit for non-super-admin pages. */
  isSuperAdmin?: boolean;
}

/**
 * A slim banner that shows the currently active compound context.
 * For super-admins it also renders a switcher to change the context.
 * Renders nothing for compound admins so scoped users avoid cross-compound context UI.
 */
export async function CompoundContextBanner({ isSuperAdmin = false }: Props) {
  if (!isSuperAdmin) return null;

  const compoundId = await getCompoundContext();
  const t = await getTranslations("CompoundContext");

  const [compound, allCompounds] = await Promise.all([
    compoundId ? getCompound(compoundId) : Promise.resolve(null),
    isSuperAdmin ? getCompounds() : Promise.resolve([]),
  ]);

  return (
    <div className="border-b border-[#e7d7a9] bg-[#fff8e8] px-5 py-2 lg:px-8">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <p className="text-sm text-[#7a5d1a]">
          {compound ? (
            <>
              <span className="font-semibold">{t("viewing")}:</span>{" "}
              <span className="font-bold">{compound.name}</span>
            </>
          ) : (
            <span className="font-semibold">{t("allCompounds")}</span>
          )}
        </p>
        {isSuperAdmin && (
          <CompoundSwitcher
            activeCompoundId={compoundId}
            compounds={allCompounds.map((c) => ({ id: c.id, name: c.name }))}
          />
        )}
      </div>
    </div>
  );
}
