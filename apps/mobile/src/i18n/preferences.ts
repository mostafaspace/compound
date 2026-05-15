import * as Keychain from "react-native-keychain";
import { Appearance } from "react-native";
import type { AppLanguage } from "./direction";

export type AppColorScheme = "light" | "dark";

export const mobilePreferencesService = "compound.mobile.loginPreferences";

export const applyColorSchemePreference = (colorScheme: AppColorScheme) => {
  Appearance.setColorScheme(colorScheme);
};

export const persistMobilePreferences = async (language: AppLanguage, colorScheme: AppColorScheme) => {
  applyColorSchemePreference(colorScheme);

  await Keychain.setGenericPassword(
    "preferences",
    JSON.stringify({ language, colorScheme }),
    { service: mobilePreferencesService },
  );
};
