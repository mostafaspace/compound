"use client";

import type {
  NotificationCategory,
  NotificationPreference,
  UpdateNotificationPreferenceInput,
  UserNotification,
} from "@compound/contracts";
import { notificationCategoryValues } from "@compound/contracts";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState, useTransition } from "react";

import {
  archiveAllNotificationsAction,
  archiveNotificationAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
  refreshNotificationsAction,
  updateNotificationPreferencesAction,
} from "@/app/notifications/actions";
import { subscribeToUserNotifications } from "@/lib/realtime-notifications";

interface NotificationCenterProps {
  initialNotifications: UserNotification[];
  initialPreferences: NotificationPreference | null;
  initialUnreadCount: number;
  userId: number;
}

const categoryIcons: Record<NotificationCategory, string> = {
  announcements: "M4 5.75A2.75 2.75 0 0 1 6.75 3h6.5A2.75 2.75 0 0 1 16 5.75v4.5A2.75 2.75 0 0 1 13.25 13H9l-4 3v-3.25A2.75 2.75 0 0 1 2 10.25v-4.5Z",
  documents: "M6 2.5h5.25L15 6.25V17a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 5 17V4a1.5 1.5 0 0 1 1.5-1.5Z",
  finance: "M10 2.5a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15Zm.75 3.5v.8a2.4 2.4 0 0 1 1.65.75l-.8.9a1.65 1.65 0 0 0-1.18-.48c-.55 0-.93.25-.93.68 0 .46.42.63 1.28.9 1.05.33 2.1.78 2.1 2.05 0 1.1-.75 1.9-2.12 2.12V14.5h-1.3v-.8a2.95 2.95 0 0 1-2.08-.92l.82-.9c.48.43 1 .67 1.68.67.62 0 1.02-.28 1.02-.74 0-.5-.46-.7-1.35-.97-1.05-.32-2-.75-2-1.98 0-1.07.78-1.82 1.93-2.03V6h1.3Z",
  issues: "M10 2.75 18 16.5H2L10 2.75Zm0 4.75a.75.75 0 0 0-.75.75v3.25a.75.75 0 0 0 1.5 0V8.25A.75.75 0 0 0 10 7.5Zm0 6.25a.9.9 0 1 0 0 1.8.9.9 0 0 0 0-1.8Z",
  polls: "M4 4.5A1.5 1.5 0 0 1 5.5 3h9A1.5 1.5 0 0 1 16 4.5v11a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 4 15.5v-11Zm2.25 2.25a.75.75 0 0 0 0 1.5h7.5a.75.75 0 0 0 0-1.5h-7.5Zm0 3a.75.75 0 0 0 0 1.5H10a.75.75 0 0 0 0-1.5H6.25Zm0 3a.75.75 0 0 0 0 1.5h4.5a.75.75 0 0 0 0-1.5h-4.5Z",
  system: "M10 2.5 16.5 6v8L10 17.5 3.5 14V6L10 2.5Zm0 4a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z",
  visitors: "M7.5 9a2.75 2.75 0 1 1 0-5.5A2.75 2.75 0 0 1 7.5 9Zm5.75 7.5H2.75a4.75 4.75 0 0 1 9.5 0Zm.25-7.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Zm.8 7.25a6.2 6.2 0 0 0-1.2-3.65 3.75 3.75 0 0 1 5.65 3.65H14.3Z",
};

function BellIcon() {
  return (
    <svg aria-hidden="true" className="size-5" viewBox="0 0 20 20" fill="currentColor">
      <path d="M10 2a5 5 0 0 0-5 5v2.85l-1.2 2.4A1.2 1.2 0 0 0 4.87 14h10.26a1.2 1.2 0 0 0 1.07-1.75L15 9.85V7a5 5 0 0 0-5-5Zm-2.2 13.25a2.25 2.25 0 0 0 4.4 0H7.8Z" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg aria-hidden="true" className="size-4" viewBox="0 0 20 20" fill="currentColor">
      <path d="M15.9 6.15A6.75 6.75 0 1 0 16.75 10h-1.5a5.25 5.25 0 1 1-.54-2.33L12.5 7.5V9h5V4h-1.5l-.1 2.15Z" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg aria-hidden="true" className="size-4" viewBox="0 0 20 20" fill="currentColor">
      <path d="M8.7 2.5h2.6l.45 2a5.8 5.8 0 0 1 1.1.63l1.95-.62 1.3 2.25-1.5 1.38c.04.3.07.6.07.93s-.03.63-.08.94l1.51 1.38-1.3 2.25-1.95-.62a5.8 5.8 0 0 1-1.1.63l-.45 2H8.7l-.45-2a5.8 5.8 0 0 1-1.1-.63l-1.95.62-1.3-2.25L5.4 10c-.04-.3-.07-.61-.07-.94s.03-.63.08-.93L3.9 6.75 5.2 4.5l1.95.62a5.8 5.8 0 0 1 1.1-.63l.45-2ZM10 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
    </svg>
  );
}

function IconPath({ category }: { category: NotificationCategory }) {
  return (
    <svg aria-hidden="true" className="size-4" viewBox="0 0 20 20" fill="currentColor">
      <path d={categoryIcons[category]} />
    </svg>
  );
}

function formatTime(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function localizedNotificationText(notification: UserNotification, key: "title" | "body", locale: string): string {
  const metadataKey = locale.startsWith("ar") ? `${key}Ar` : `${key}En`;
  const localizedValue = notification.metadata[metadataKey];

  if (typeof localizedValue === "string" && localizedValue.trim()) {
    return localizedValue;
  }

  return notification[key];
}

export function NotificationCenter({
  initialNotifications,
  initialPreferences,
  initialUnreadCount,
  userId,
}: NotificationCenterProps) {
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations("Notifications");
  const [isOpen, setIsOpen] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [preferences, setPreferences] = useState(initialPreferences);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [category, setCategory] = useState<NotificationCategory | "all">("all");
  const [readFilter, setReadFilter] = useState<"all" | "unread">("all");
  const [connectionState, setConnectionState] = useState<"live" | "polling">("polling");
  const [isPending, startTransition] = useTransition();
  const isPublicPage = pathname === "/login" || pathname.startsWith("/resident-invitations/");

  const visibleNotifications = useMemo(() => {
    return notifications.filter((notification) => {
      const categoryMatch = category === "all" || notification.category === category;
      const readMatch = readFilter === "all" || !notification.readAt;

      return categoryMatch && readMatch;
    });
  }, [category, notifications, readFilter]);

  useEffect(() => {
    if (isPublicPage) {
      return;
    }

    const refresh = () => {
      startTransition(async () => {
        const nextState = await refreshNotificationsAction({ category, read: readFilter });
        setNotifications(nextState.notifications);
        setUnreadCount(nextState.unreadCount);
      });
    };

    const interval = window.setInterval(refresh, 30_000);

    return () => window.clearInterval(interval);
  }, [category, isPublicPage, readFilter]);

  useEffect(() => {
    if (isPublicPage) {
      setConnectionState("polling");
      return;
    }

    const subscription = subscribeToUserNotifications(
      userId,
      (notification) => {
        setConnectionState("live");
        setNotifications((current) => [notification, ...current.filter((item) => item.id !== notification.id)].slice(0, 20));
        setUnreadCount((current) => current + 1);
      },
      () => setConnectionState("polling"),
    );

    return () => subscription?.disconnect();
  }, [isPublicPage, userId]);

  if (isPublicPage) {
    return null;
  }

  function refreshNow() {
    startTransition(async () => {
      const nextState = await refreshNotificationsAction({ category, read: readFilter });
      setNotifications(nextState.notifications);
      setUnreadCount(nextState.unreadCount);
    });
  }

  function markRead(notificationId: string) {
    startTransition(async () => {
      const nextState = await markNotificationReadAction(notificationId);
      setNotifications(nextState.notifications);
      setUnreadCount(nextState.unreadCount);
    });
  }

  function archive(notificationId: string) {
    startTransition(async () => {
      const nextState = await archiveNotificationAction(notificationId);
      setNotifications(nextState.notifications);
      setUnreadCount(nextState.unreadCount);
    });
  }

  function markAllRead() {
    startTransition(async () => {
      const nextState = await markAllNotificationsReadAction();
      setNotifications(nextState.notifications);
      setUnreadCount(nextState.unreadCount);
    });
  }

  function archiveAll() {
    startTransition(async () => {
      const nextState = await archiveAllNotificationsAction();
      setNotifications(nextState.notifications);
      setUnreadCount(nextState.unreadCount);
    });
  }

  function updatePreferences(input: UpdateNotificationPreferenceInput) {
    startTransition(async () => {
      const nextPreferences = await updateNotificationPreferencesAction(input);
      setPreferences(nextPreferences);
    });
  }

  return (
    <div className="fixed start-4 top-4 z-50 md:start-6">
      <button
        aria-label={t("ariaLabel", { count: unreadCount })}
        className="relative inline-flex size-11 items-center justify-center rounded-lg border border-line bg-panel text-foreground shadow-sm transition hover:border-brand focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2"
        onClick={() => setIsOpen((value) => !value)}
        type="button"
      >
        <BellIcon />
        {unreadCount > 0 ? (
          <span className="absolute -end-2 -top-2 min-w-6 rounded-full bg-danger px-1.5 py-0.5 text-center text-xs font-semibold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <section className="mt-3 w-[min(calc(100vw-2rem),28rem)] overflow-hidden rounded-lg border border-line bg-panel shadow-xl">
          <div className="flex items-start justify-between gap-4 border-b border-line p-4">
            <div>
              <h2 className="text-base font-semibold">{t("title")}</h2>
              <p className="mt-1 text-xs text-muted">
                {connectionState === "live" ? t("liveConnected") : t("polling")}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                aria-label={t("refresh")}
                className="inline-flex size-9 items-center justify-center rounded-lg border border-line text-sm font-semibold transition hover:border-brand disabled:opacity-50"
                disabled={isPending}
                onClick={refreshNow}
                type="button"
              >
                <RefreshIcon />
              </button>
              <button
                aria-label={t("preferences")}
                className="inline-flex size-9 items-center justify-center rounded-lg border border-line text-sm font-semibold transition hover:border-brand"
                onClick={() => setShowPreferences((value) => !value)}
                type="button"
              >
                <SettingsIcon />
              </button>
            </div>
          </div>

          {showPreferences ? (
            <div className="border-b border-line p-4">
              <NotificationPreferences preferences={preferences} onUpdate={updatePreferences} />
            </div>
          ) : null}

          <div className="border-b border-line p-3">
            <div className="flex gap-2 overflow-x-auto pb-1">
              <FilterButton active={category === "all"} label={t("filters.all")} onClick={() => setCategory("all")} />
              {notificationCategoryValues.map((item) => (
                <FilterButton
                  active={category === item}
                  key={item}
                  label={t(`categories.${item}`)}
                  onClick={() => setCategory(item)}
                />
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="flex gap-2">
                <FilterButton active={readFilter === "all"} label={t("filters.all")} onClick={() => setReadFilter("all")} />
                <FilterButton active={readFilter === "unread"} label={t("filters.unread")} onClick={() => setReadFilter("unread")} />
              </div>
              <div className="flex gap-2">
                <button className="text-xs font-semibold text-brand disabled:opacity-50" disabled={isPending} onClick={markAllRead} type="button">
                  {t("markAllRead")}
                </button>
                <button className="text-xs font-semibold text-danger disabled:opacity-50" disabled={isPending} onClick={archiveAll} type="button">
                  {t("archiveAll")}
                </button>
              </div>
            </div>
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {visibleNotifications.length > 0 ? (
              <ul className="divide-y divide-line">
                {visibleNotifications.map((notification) => (
                  <li className="p-4" key={notification.id}>
                    <div className="flex gap-3">
                      <span className="mt-1 inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-background text-brand">
                        <IconPath category={notification.category} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-foreground">{localizedNotificationText(notification, "title", locale)}</p>
                            <p className="mt-1 text-sm leading-5 text-muted">{localizedNotificationText(notification, "body", locale)}</p>
                          </div>
                          {!notification.readAt ? <span className="mt-1 size-2 shrink-0 rounded-full bg-brand" /> : null}
                        </div>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                          <span className="text-xs text-muted">{formatTime(notification.createdAt, locale)}</span>
                          <div className="flex gap-3">
                            {!notification.readAt ? (
                              <button className="text-xs font-semibold text-brand" onClick={() => markRead(notification.id)} type="button">
                                {t("read")}
                              </button>
                            ) : null}
                            <button className="text-xs font-semibold text-danger" onClick={() => archive(notification.id)} type="button">
                              {t("archive")}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-6 text-center text-sm text-muted">{t("empty")}</div>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function FilterButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      className={`h-9 shrink-0 rounded-lg border px-3 text-xs font-semibold transition ${
        active ? "border-brand bg-[#e6f3ef] text-brand" : "border-line bg-panel text-muted hover:border-brand hover:text-foreground"
      }`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function NotificationPreferences({
  onUpdate,
  preferences,
}: {
  onUpdate: (input: UpdateNotificationPreferenceInput) => void;
  preferences: NotificationPreference | null;
}) {
  const t = useTranslations("Notifications");
  const mutedCategories = preferences?.mutedCategories ?? [];

  function toggleMuted(category: NotificationCategory) {
    const nextMuted = mutedCategories.includes(category)
      ? mutedCategories.filter((item) => item !== category)
      : [...mutedCategories, category];

    onUpdate({ mutedCategories: nextMuted });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Toggle label={t("preferencesForm.inApp")} checked={preferences?.inAppEnabled ?? true} onChange={(checked) => onUpdate({ inAppEnabled: checked })} />
        <Toggle label={t("preferencesForm.email")} checked={preferences?.emailEnabled ?? true} onChange={(checked) => onUpdate({ emailEnabled: checked })} />
        <Toggle label={t("preferencesForm.push")} checked={preferences?.pushEnabled ?? false} onChange={(checked) => onUpdate({ pushEnabled: checked })} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-xs font-semibold text-muted">
          {t("preferencesForm.quietStart")}
          <input
            className="mt-1 h-10 w-full rounded-lg border border-line px-3 text-sm text-foreground"
            defaultValue={preferences?.quietHoursStart ?? ""}
            onBlur={(event) => onUpdate({ quietHoursStart: event.currentTarget.value || null })}
            type="time"
          />
        </label>
        <label className="text-xs font-semibold text-muted">
          {t("preferencesForm.quietEnd")}
          <input
            className="mt-1 h-10 w-full rounded-lg border border-line px-3 text-sm text-foreground"
            defaultValue={preferences?.quietHoursEnd ?? ""}
            onBlur={(event) => onUpdate({ quietHoursEnd: event.currentTarget.value || null })}
            type="time"
          />
        </label>
        <label className="text-xs font-semibold text-muted">
          {t("preferencesForm.timezone")}
          <input
            className="mt-1 h-10 w-full rounded-lg border border-line px-3 text-sm text-foreground"
            defaultValue={preferences?.quietHoursTimezone ?? ""}
            onBlur={(event) => onUpdate({ quietHoursTimezone: event.currentTarget.value || null })}
            placeholder={t("preferencesForm.timezonePlaceholder")}
            type="text"
          />
        </label>
      </div>

      <div>
        <p className="text-xs font-semibold text-muted">{t("preferencesForm.mutedCategories")}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {notificationCategoryValues.map((category) => (
            <button
              className={`h-9 rounded-lg border px-3 text-xs font-semibold transition ${
                mutedCategories.includes(category)
                  ? "border-danger bg-[#fdecea] text-danger"
                  : "border-line bg-panel text-muted hover:border-brand hover:text-foreground"
              }`}
              key={category}
              onClick={() => toggleMuted(category)}
              type="button"
            >
              {t(`categories.${category}`)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Toggle({ checked, label, onChange }: { checked: boolean; label: string; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex h-11 items-center justify-between gap-3 rounded-lg border border-line px-3 text-sm font-semibold">
      <span>{label}</span>
      <input checked={checked} onChange={(event) => onChange(event.currentTarget.checked)} type="checkbox" />
    </label>
  );
}
