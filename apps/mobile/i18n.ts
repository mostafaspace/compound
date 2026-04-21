import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { I18nManager } from "react-native";

const resources = {
  en: {
    translation: {
      Navigation: {
        dashboard: "Dashboard",
        compounds: "Compounds",
        buildings: "Buildings",
        units: "Units",
        visitors: "Visitors",
        signOut: "Sign Out",
      },
      Theme: {
        light: "Light Mode",
        dark: "Dark Mode",
        system: "System Auto",
      },
    },
  },
  ar: {
    translation: {
      Navigation: {
        dashboard: "لوحة القيادة",
        compounds: "المجمعات السكنية",
        buildings: "المباني",
        units: "الوحدات",
        visitors: "الزوار",
        signOut: "تسجيل الخروج",
      },
      Theme: {
        light: "الوضع الفاتح",
        dark: "الوضع الداكن",
        system: "تلقائي",
      },
    },
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: I18nManager.isRTL ? "ar" : "en",
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
