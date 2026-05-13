import type { AuthenticatedUser } from "@compound/contracts";
import { getNotificationPreferences, getNotifications, getUnreadNotificationCount } from "@/lib/api";
import { getTranslations } from "next-intl/server";
import { NotificationCenter } from "./notifications/notification-center";
import { LogoutButton } from "./logout-button";
import { AdminGlobalSearch } from "./admin-global-search";
import { getAdminSections } from "@/lib/admin-navigation";

export async function AdminCommandBar({ user }: { user: AuthenticatedUser }) {
  const [notifications, unreadCount, preferences, t, tNav] = await Promise.all([
    getNotifications({ perPage: 20 }),
    getUnreadNotificationCount(),
    getNotificationPreferences(),
    getTranslations("CommandBar"),
    getTranslations("Navigation"),
  ]);
  const searchItems = getAdminSections({ roles: user.roles ?? [], permissions: user.permissions ?? [] }).map((section) => ({
    href: section.href,
    label: tNav(section.labelKey),
    group: tNav(`groups.${section.group}`),
    keywords: section.keywords,
  }));

  return (
    <div className="sticky top-0 z-30 border-b border-line bg-panel/95 backdrop-blur">
      <div className="mx-auto flex max-w-full items-center gap-3 px-5 py-3">
        <AdminGlobalSearch
          items={searchItems}
          placeholder={t("searchPlaceholder")}
          fallbackLabel={t("fallbackVehicleSearch")}
          noResultsLabel={t("noResults")}
        />

        <NotificationCenter
          initialNotifications={notifications}
          initialPreferences={preferences}
          initialUnreadCount={unreadCount}
          userId={user.id}
        />

        <div className="h-6 w-px bg-line mx-1" />
        
        <LogoutButton />
      </div>
    </div>
  );
}
