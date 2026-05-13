import { NotificationCenter } from "@/components/notifications/notification-center";
import { getCurrentUser, getNotificationPreferences, getNotifications, getUnreadNotificationCount } from "@/lib/api";
import { canAccessAdmin } from "@/lib/session";

export async function NotificationProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();

  if (
    !user ||
    !canAccessAdmin(user, [
      "super_admin",
      "compound_admin",
      "president",
      "board_member",
      "finance_reviewer",
      "security_guard",
      "support_agent",
    ])
  ) {
    return children;
  }

  const [notifications, unreadCount, preferences] = await Promise.all([
    getNotifications({ perPage: 20 }),
    getUnreadNotificationCount(),
    getNotificationPreferences(),
  ]);

  return (
    <>
      <NotificationCenter
        initialNotifications={notifications}
        initialPreferences={preferences}
        initialUnreadCount={unreadCount}
        userId={user.id}
      />
      {children}
    </>
  );
}
