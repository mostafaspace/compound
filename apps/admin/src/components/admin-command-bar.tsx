import type { AuthenticatedUser } from "@compound/contracts";
import { getNotificationPreferences, getNotifications, getUnreadNotificationCount } from "@/lib/api";
import { NotificationCenter } from "./notifications/notification-center";
import { LogoutButton } from "./logout-button";

export async function AdminCommandBar({ user }: { user: AuthenticatedUser }) {
  const [notifications, unreadCount, preferences] = await Promise.all([
    getNotifications({ perPage: 20 }),
    getUnreadNotificationCount(),
    getNotificationPreferences(),
  ]);

  return (
    <div className="sticky top-0 z-30 border-b border-line bg-panel/95 backdrop-blur">
      <div className="mx-auto flex max-w-full items-center gap-3 px-5 py-3">
        {/* Search form — GET to /vehicles for vehicle/resident lookup */}
        <form action="/vehicles" className="hidden min-w-0 flex-1 md:block">
          <input
            name="q"
            className="h-10 w-full rounded-xl border border-line bg-background px-4 text-sm text-foreground placeholder:text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            placeholder="Search vehicle plate, sticker, resident, apartment…"
            autoComplete="off"
          />
        </form>
        <a
          href="/vehicles"
          className="inline-flex h-10 items-center rounded-xl border border-line px-3 text-sm font-semibold text-foreground hover:border-brand md:hidden"
        >
          Search
        </a>

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
