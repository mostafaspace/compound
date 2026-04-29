import { useEffect } from 'react';
import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';
import { useRegisterDeviceMutation } from '../services/auth';
import { useSelector } from 'react-redux';
import { selectCurrentToken } from '../store/authSlice';

export const usePushNotifications = (enabled = true) => {
  const [registerDevice] = useRegisterDeviceMutation();
  const authToken = useSelector(selectCurrentToken);

  useEffect(() => {
    // Only register the device after session restore has completed and the user is authenticated.
    if (!enabled || !authToken) return;

    const setupPushNotifications = async () => {
      try {
        const authStatus = await messaging().requestPermission();
        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        if (enabled) {
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

    // Listen to token refresh
    const unsubscribeTokenRefresh = messaging().onTokenRefresh(async (token) => {
      try {
        await registerDevice({
          token,
          platform: Platform.OS,
        }).unwrap();
      } catch (error) {
        // Ignored
      }
    });

    return () => {
      unsubscribeTokenRefresh();
    };
  }, [authToken, enabled, registerDevice]);
};
