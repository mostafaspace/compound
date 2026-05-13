import { I18nManager, type TextStyle, type ViewStyle } from "react-native";
import i18n from "../../i18n";

import { useSelector } from "react-redux";
import { selectLanguagePreference } from "../store/systemSlice";

export type AppLanguage = "en" | "ar";

const RTL_LANGUAGES = new Set(["ar", "fa", "he", "ur"]);

export const isRtlLanguage = (language?: string | null) => {
  const languageCode = language?.split("-")[0]?.toLowerCase();
  return languageCode ? RTL_LANGUAGES.has(languageCode) : false;
};

export const useIsRtl = () => {
  const language = useSelector(selectLanguagePreference);
  return isRtlLanguage(language);
};

export const getInitialLanguage = (): AppLanguage => "ar";

export const applyNativeDirection = (language: AppLanguage) => {
  const shouldUseRtl = isRtlLanguage(language);
  void i18n.changeLanguage(language);

  I18nManager.allowRTL(true);
  I18nManager.swapLeftAndRightInRTL(true);

  // React Native applies native direction fully on next process start; screen-level
  // directional styles handle the instant UI response after an in-app language toggle.
  if (I18nManager.isRTL !== shouldUseRtl) {
    I18nManager.forceRTL(shouldUseRtl);
  }
};

export const appDirectionStyle = (isRtl: boolean): ViewStyle => {
  if (isRtl) {
    return I18nManager.isRTL ? {} : { direction: 'rtl' };
  } else {
    return I18nManager.isRTL ? { direction: 'ltr' } : {};
  }
};

export const textDirectionStyle = (isRtl: boolean): TextStyle => ({
  // In a 'direction: rtl' context, 'left' maps to 'start' (which is right physically).
  // Explicitly setting 'left' or 'right' overrides logical alignment on some RN versions.
  // We use logical 'auto' or 'left' (which maps to start) to let the engine handle it.
  textAlign: "auto",
  writingDirection: isRtl ? "rtl" : "ltr",
});

export const centerTextDirectionStyle = (isRtl: boolean): TextStyle => ({
  textAlign: "center",
  writingDirection: isRtl ? "rtl" : "ltr",
});

export const rowDirectionStyle = (isRtl: boolean): ViewStyle => ({
  // Do NOT use row-reverse here. The `direction: 'rtl'` wrapper in App.tsx
  // automatically handles `flexDirection: 'row'` to render right-to-left.
  // Using row-reverse here flips it BACK to left-to-right!
  flexDirection: "row",
});

/**
 * Transforms a style object to be RTL-aware by using logical properties
 * in 2026 React Native.
 */
export const logicalStyle = (isRtl: boolean, style: ViewStyle): ViewStyle => {
  if (!isRtl) return style;
  
  const newStyle: any = { ...style };
  
  // If explicitly row, make it row-reverse
  if (style.flexDirection === 'row') {
    newStyle.flexDirection = 'row-reverse';
  }
  
  // In 2026, most properties are best handled by setting direction: 'rtl'
  // and using marginStart/End instead of Left/Right.
  return newStyle;
};
