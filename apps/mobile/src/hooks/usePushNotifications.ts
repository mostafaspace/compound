import { useEffect } from 'react';
import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import { Platform } from 'react-native';
import { useRegisterDeviceMutation } from '../services/auth';
import { useDispatch, useSelector } from 'react-redux';
import { selectCurrentToken } from '../store/authSlice';
import { api } from '../services/api';
import type { AppDispatch } from '../store';
import { openNotificationsCenter } from '../navigation/rootNavigation';

function syncForegroundNotification(
  remoteMessage: FirebaseMessagingTypes.RemoteMessage,
  dispatch: AppDispatch,
) {
  if (remoteMessage.messageId || remoteMessage.notification) {
    dispatch(api.util.invalidateTags(['Notification']));
  }
}

export const usePushNotifications = (enabled = true) => {
  const [registerDevice] = useRegisterDeviceMutation();
  const authToken = useSelector(selectCurrentToken);
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    if (!enabled || !authToken) return;

    const setupPushNotifications = async () => {
      try {
        const authStatus = await messaging().requestPermission();
        const granted =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        if (granted) {
          const token = await messaging().getToken();
          if (token) {
            await registerDevice({
              token,
              platform: Platform.OS,
            }).unwrap();
          }
        }
      } catch (error) {
        console.warn('Failed to setup push notifications', error);
      }
    };

    void setupPushNotifications();

    const unsubscribeTokenRefresh = messaging().onTokenRefresh(async (token) => {
      try {
        await registerDevice({
          token,
          platform: Platform.OS,
        }).unwrap();
      } catch {
        // Ignored
      }
    });

    const unsubscribeForeground = messaging().onMessage((remoteMessage) => {
      syncForegroundNotification(remoteMessage, dispatch);
    });

    const unsubscribeOpened = messaging().onNotificationOpenedApp(() => {
      dispatch(api.util.invalidateTags(['Notification']));
      openNotificationsCenter();
    });

    void messaging().getInitialNotification().then((remoteMessage) => {
      if (remoteMessage) {
        dispatch(api.util.invalidateTags(['Notification']));
        openNotificationsCenter();
      }
    });

    return () => {
      unsubscribeTokenRefresh();
      unsubscribeForeground();
      unsubscribeOpened();
    };
  }, [authToken, dispatch, enabled, registerDevice]);
};
