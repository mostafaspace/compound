import * as Keychain from "react-native-keychain";
import type { AppLanguage } from "./direction";

export type AppColorScheme = "light" | "dark";

export const mobilePreferencesService = "compound.mobile.loginPreferences";

export const persistMobilePreferences = async (language: AppLanguage, colorScheme: AppColorScheme) => {
  await Keychain.setGenericPassword(
    "preferences",
    JSON.stringify({ language, colorScheme }),
    { service: mobilePreferencesService },
  );
};
