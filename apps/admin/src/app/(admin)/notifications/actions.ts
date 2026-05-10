"use server";

import type { NotificationCategory, UpdateNotificationPreferenceInput, UserNotification } from "@compound/contracts";
import { revalidatePath } from "next/cache";

import {
  archiveAllNotifications,
  archiveNotification,
  getNotificationPreferences,
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
  updateNotificationPreferences,
} from "@/lib/api";

export interface NotificationCenterState {
  notifications: UserNotification[];
  unreadCount: number;
}

export async function refreshNotificationsAction(input: {
  category?: NotificationCategory | "all";
  read?: "all" | "read" | "unread";
} = {}): Promise<NotificationCenterState> {
  const [notifications, unreadCount] = await Promise.all([
    getNotifications({ category: input.category, read: input.read, perPage: 20 }),
    getUnreadNotificationCount(),
  ]);

  return { notifications, unreadCount };
}

export async function markNotificationReadAction(notificationId: string): Promise<NotificationCenterState> {
  await markNotificationRead(notificationId);
  revalidatePath("/");

  return refreshNotificationsAction();
}

export async function archiveNotificationAction(notificationId: string): Promise<NotificationCenterState> {
  await archiveNotification(notificationId);
  revalidatePath("/");

  return refreshNotificationsAction();
}

export async function markAllNotificationsReadAction(): Promise<NotificationCenterState> {
  await markAllNotificationsRead();
  revalidatePath("/");

  return refreshNotificationsAction();
}

export async function archiveAllNotificationsAction(): Promise<NotificationCenterState> {
  await archiveAllNotifications();
  revalidatePath("/");

  return refreshNotificationsAction();
}

export async function updateNotificationPreferencesAction(input: UpdateNotificationPreferenceInput) {
  await updateNotificationPreferences(input);
  revalidatePath("/");

  return getNotificationPreferences();
}
