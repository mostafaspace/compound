"use client";

import Echo from "laravel-echo";
import Pusher from "pusher-js";

import { config } from "@/lib/config";
import type { UserNotification } from "@compound/contracts";

declare global {
  interface Window {
    Pusher: typeof Pusher;
  }
}

export interface NotificationRealtimeSubscription {
  disconnect: () => void;
}

export function subscribeToUserNotifications(
  userId: number,
  onNotification: (notification: UserNotification) => void,
  onConnectionIssue: () => void,
): NotificationRealtimeSubscription | null {
  if (typeof window === "undefined") {
    return null;
  }

  window.Pusher = Pusher;

  const echo = new Echo({
    Pusher,
    authEndpoint: "/api/broadcasting-auth",
    broadcaster: "reverb",
    enabledTransports: ["ws", "wss"],
    forceTLS: config.reverb.scheme === "https",
    key: config.reverb.key,
    wsHost: config.reverb.host,
    wsPort: config.reverb.port,
    wssPort: config.reverb.port,
  });

  echo.connector.pusher.connection.bind("error", onConnectionIssue);
  echo.connector.pusher.connection.bind("unavailable", onConnectionIssue);
  echo.connector.pusher.connection.bind("failed", onConnectionIssue);

  echo.private(`user-${userId}`).listen(".notification.created", (payload: UserNotification) => {
    onNotification(payload);
  });

  return {
    disconnect: () => {
      echo.leave(`user-${userId}`);
      echo.disconnect();
    },
  };
}
