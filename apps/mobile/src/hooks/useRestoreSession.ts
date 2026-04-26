import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import * as Keychain from "react-native-keychain";
import { setToken, setRestoring, setUser } from '../store/authSlice';
import { authApi } from '../services/auth';
import { RootState, AppDispatch } from '../store';

const authTokenService = "compound.mobile.authToken";

export const useRestoreSession = () => {
  const dispatch = useDispatch<AppDispatch>();
  const isRestoring = useSelector((state: RootState) => state.auth.isRestoring);
  
  useEffect(() => {
    async function restore() {
      try {
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
