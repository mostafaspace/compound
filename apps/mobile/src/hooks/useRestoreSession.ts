import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import * as Keychain from "react-native-keychain";
import { setToken, setRestoring } from '../store/authSlice';
import { RootState } from '../store';

const authTokenService = "compound.mobile.authToken";

export const useRestoreSession = () => {
  const dispatch = useDispatch();
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
