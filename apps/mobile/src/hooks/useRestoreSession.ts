import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import * as Keychain from "react-native-keychain";
import { setToken, setRestoring, setUser } from '../store/authSlice';
import { setLanguagePreference } from '../store/systemSlice';
import { authApi } from '../services/auth';
import { RootState, AppDispatch } from '../store';

const authTokenService = "compound.mobile.authToken";

export const useRestoreSession = () => {
  const dispatch = useDispatch<AppDispatch>();
  const isRestoring = useSelector((state: RootState) => state.auth.isRestoring);
  
  useEffect(() => {
    async function restore() {
      try {
        // 1. Restore Language & Theme from Keychain
        const prefCredentials = await Keychain.getGenericPassword({ service: "compound.mobile.loginPreferences" });
        if (prefCredentials) {
          try {
            const prefs = JSON.parse(prefCredentials.password);
            if (prefs.language) {
              dispatch(setLanguagePreference(prefs.language));
            }
          } catch (e) {
            console.warn("[RestoreSession] Failed to parse preferences", e);
          }
        }

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
