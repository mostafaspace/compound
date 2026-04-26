import { i18n } from 'i18next';

export function formatStatus(value: string): string {
  return value.replaceAll("_", " ");
}

export function formatDate(value: string | null, language: string = 'en'): string {
  if (!value) {
    return language.startsWith("ar") ? "غير محدد" : "Not set";
  }

  return new Intl.DateTimeFormat(language, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatDateForLocale(value: string | null, locale: string, emptyLabel: string): string {
  if (!value) {
    return emptyLabel;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
