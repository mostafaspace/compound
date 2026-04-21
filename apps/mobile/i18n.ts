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
      Announcements: {
        label: "Announcements",
        title: "Official announcements",
        subtitle: "Board decisions, maintenance notices, meetings, and security updates.",
        count: "{{count}} active",
        refresh: "Refresh",
        refreshing: "Refreshing",
        loading: "Loading official notices.",
        empty: "No active announcements for your unit right now.",
        loadError: "Announcements could not be loaded.",
        networkError: "Could not reach the announcements service.",
        acknowledge: "Acknowledge",
        acknowledging: "Acknowledging",
        acknowledged: "Acknowledged",
        acknowledgeSuccess: "Acknowledgement recorded.",
        acknowledgeError: "Acknowledgement could not be recorded.",
        requiresAck: "Acknowledgement required",
        published: "Published {{date}}",
        expires: "Expires {{date}}",
        attachments_one: "{{count}} attachment",
        attachments_other: "{{count}} attachments",
        revision: "Revision {{revision}}",
        categories: {
          general: "General",
          building: "Building notice",
          association_decision: "Association decision",
          security_alert: "Security alert",
          maintenance_notice: "Maintenance notice",
          meeting_reminder: "Meeting reminder",
        },
        priorities: {
          low: "Low",
          normal: "Normal",
          high: "High",
          critical: "Critical",
        },
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
      Announcements: {
        label: "الإعلانات",
        title: "الإعلانات الرسمية",
        subtitle: "قرارات الاتحاد وتنبيهات الصيانة والاجتماعات والأمن.",
        count: "{{count}} نشط",
        refresh: "تحديث",
        refreshing: "جار التحديث",
        loading: "جار تحميل الإعلانات الرسمية.",
        empty: "لا توجد إعلانات نشطة لوحدتك حاليا.",
        loadError: "تعذر تحميل الإعلانات.",
        networkError: "تعذر الوصول إلى خدمة الإعلانات.",
        acknowledge: "تأكيد الاطلاع",
        acknowledging: "جار التأكيد",
        acknowledged: "تم التأكيد",
        acknowledgeSuccess: "تم تسجيل تأكيد الاطلاع.",
        acknowledgeError: "تعذر تسجيل تأكيد الاطلاع.",
        requiresAck: "يتطلب تأكيد الاطلاع",
        published: "نشر في {{date}}",
        expires: "ينتهي في {{date}}",
        attachments_one: "{{count}} مرفق",
        attachments_other: "{{count}} مرفقات",
        revision: "مراجعة {{revision}}",
        categories: {
          general: "عام",
          building: "إعلان مبنى",
          association_decision: "قرار الاتحاد",
          security_alert: "تنبيه أمني",
          maintenance_notice: "إشعار صيانة",
          meeting_reminder: "تذكير اجتماع",
        },
        priorities: {
          low: "منخفضة",
          normal: "عادية",
          high: "مرتفعة",
          critical: "حرجة",
        },
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
