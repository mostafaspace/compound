import { logoutAction } from "@/app/logout/actions";
import { useTranslations } from "next-intl";

import { ThemeToggle } from "./theme-toggle";
import { LanguageToggle } from "./language-toggle";

export function LogoutButton() {
  const t = useTranslations("Navigation");

  return (
    <div className="flex items-center gap-3">
      <LanguageToggle />
      <ThemeToggle />
      <form action={logoutAction}>
        <button
          className="inline-flex h-11 items-center rounded-lg border border-line bg-panel px-4 text-sm font-semibold text-foreground transition hover:border-brand"
          type="submit"
        >
          {t("signOut")}
        </button>
      </form>
    </div>
  );
}
