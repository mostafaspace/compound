import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import * as Keychain from "react-native-keychain";
import { setToken, setRestoring, setUser } from '../store/authSlice';
import { setColorSchemePreference, setLanguagePreference } from '../store/systemSlice';
import { authApi } from '../services/auth';
import { RootState, AppDispatch } from '../store';
import { applyNativeDirection, getInitialLanguage } from '../i18n/direction';
import { applyColorSchemePreference, mobilePreferencesService } from '../i18n/preferences';

const authTokenService = "compound.mobile.authToken";

export const useRestoreSession = () => {
  const dispatch = useDispatch<AppDispatch>();
  const isRestoring = useSelector((state: RootState) => state.auth.isRestoring);
  
  useEffect(() => {
    async function restore() {
      try {
        // 1. Restore Language & Theme from Keychain. Arabic is the product default
        // for first launch; saved user preference always wins afterwards.
        let restoredLanguage = getInitialLanguage();
        let restoredColorScheme: "light" | "dark" = "dark";
        const prefCredentials = await Keychain.getGenericPassword({ service: mobilePreferencesService });
        if (prefCredentials) {
          try {
            const prefs = JSON.parse(prefCredentials.password);
            if (prefs.language) {
              restoredLanguage = prefs.language;
            }
            if (prefs.colorScheme) {
              restoredColorScheme = prefs.colorScheme;
            }
          } catch (e) {
            console.warn("[RestoreSession] Failed to parse preferences", e);
          }
        }
        applyNativeDirection(restoredLanguage);
        applyColorSchemePreference(restoredColorScheme);
        dispatch(setLanguagePreference(restoredLanguage));
        dispatch(setColorSchemePreference(restoredColorScheme));

        // 2. Restore Auth Session
        const credentials = await Keychain.getGenericPassword({ service: authTokenService });

        if (!credentials) {
          dispatch(setRestoring(false));
          return;
        }

        dispatch(setToken(credentials.password));
        
        try {
          const user = await dispatch(authApi.endpoints.getMe.initiate()).unwrap();
          dispatch(setUser(user));
        } catch (err) {
          console.warn("Failed to fetch user on restore, resetting token", err);
          dispatch(setToken(null));
          await Keychain.resetGenericPassword({ service: authTokenService });
        }
        
        dispatch(setRestoring(false));
      } catch (err) {
        console.error("Failed to restore session", err);
        dispatch(setRestoring(false));
      }
    }

    void restore();
  }, [dispatch]);

  return { isRestoring };
};
