import { I18nManager, type TextStyle, type ViewStyle } from "react-native";

export type AppLanguage = "en" | "ar";

const RTL_LANGUAGES = new Set(["ar", "fa", "he", "ur"]);

export const isRtlLanguage = (language?: string | null) => {
  const languageCode = language?.split("-")[0]?.toLowerCase();
  return languageCode ? RTL_LANGUAGES.has(languageCode) : false;
};

export const getInitialLanguage = (): AppLanguage => (I18nManager.isRTL ? "ar" : "en");

export const applyNativeDirection = (language: AppLanguage) => {
  const shouldUseRtl = isRtlLanguage(language);

  I18nManager.allowRTL(true);
  I18nManager.swapLeftAndRightInRTL(true);

  // React Native applies native direction fully on next process start; screen-level
  // directional styles handle the instant UI response after an in-app language toggle.
  if (I18nManager.isRTL !== shouldUseRtl) {
    I18nManager.forceRTL(shouldUseRtl);
  }
};

export const appDirectionStyle = (isRtl: boolean): ViewStyle => ({
  direction: isRtl ? "rtl" : "ltr",
});

export const textDirectionStyle = (isRtl: boolean): TextStyle => ({
  textAlign: isRtl ? "right" : "left",
  writingDirection: isRtl ? "rtl" : "ltr",
});

export const centerTextDirectionStyle = (isRtl: boolean): TextStyle => ({
  textAlign: "center",
  writingDirection: isRtl ? "rtl" : "ltr",
});

export const rowDirectionStyle = (isRtl: boolean): ViewStyle => ({
  flexDirection: isRtl ? "row-reverse" : "row",
});
