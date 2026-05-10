import { useEffect } from 'react';
import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import { Alert, Platform } from 'react-native';
import { useRegisterDeviceMutation } from '../services/auth';
import { useSelector } from 'react-redux';
import { selectCurrentToken } from '../store/authSlice';

function showForegroundNotification(remoteMessage: FirebaseMessagingTypes.RemoteMessage) {
  const title = remoteMessage.notification?.title;
  const body = remoteMessage.notification?.body;
  if (title || body) {
    Alert.alert(title ?? '', body ?? '');
  }
}

export const usePushNotifications = (enabled = true) => {
  const [registerDevice] = useRegisterDeviceMutation();
  const authToken = useSelector(selectCurrentToken);

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

    const unsubscribeForeground = messaging().onMessage(showForegroundNotification);

    return () => {
      unsubscribeTokenRefresh();
      unsubscribeForeground();
    };
  }, [authToken, enabled, registerDevice]);
};
