/**
 * Locale formatting utilities (CM-85)
 *
 * Provides date, currency, and phone-number formatters that respect the
 * compound's localization settings returned by GET /v1/locale.
 *
 * All functions accept a LocaleSettings object and return formatted strings.
 * They are safe to call in Server Components and in Client Components alike.
 */

import type { LocaleSettings } from "@compound/contracts";

// ─── Date formatting ──────────────────────────────────────────────────────────

/**
 * Format a date string or Date object using the compound's locale and timezone.
 *
 * @example
 *   formatDate("2026-04-25T10:00:00Z", settings)
 *   // → "25/04/2026"  (for locale=ar, timezone=Africa/Cairo, dateFormat=DD/MM/YYYY)
 */
export function formatDate(
  value: string | Date | null | undefined,
  settings: LocaleSettings,
  options?: Intl.DateTimeFormatOptions,
): string {
  if (!value) return "—";

  try {
    const date = typeof value === "string" ? new Date(value) : value;

    const defaultOptions: Intl.DateTimeFormatOptions = {
      timeZone: settings.timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    };

    const merged = { ...defaultOptions, ...options };
    const intlLocale = bcp47Locale(settings.locale);

    return new Intl.DateTimeFormat(intlLocale, merged).format(date);
  } catch {
    return String(value);
  }
}

/**
 * Format a date + time string using the compound's locale and timezone.
 */
export function formatDateTime(
  value: string | Date | null | undefined,
  settings: LocaleSettings,
): string {
  if (!value) return "—";

  return formatDate(value, settings, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format a time-only string using the compound's locale and timezone.
 */
export function formatTime(
  value: string | Date | null | undefined,
  settings: LocaleSettings,
): string {
  if (!value) return "—";

  return formatDate(value, settings, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Currency formatting ──────────────────────────────────────────────────────

/**
 * Format a numeric amount using the compound's currency and locale.
 *
 * @example
 *   formatCurrency(1500, settings)
 *   // → "١٬٥٠٠٫٠٠ ج.م"  (Arabic numerals for locale=ar)
 */
export function formatCurrency(
  amount: number | string | null | undefined,
  settings: LocaleSettings,
): string {
  if (amount === null || amount === undefined || amount === "") return "—";

  const numeric = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(numeric)) return String(amount);

  try {
    const intlLocale = bcp47Locale(settings.locale);
    return new Intl.NumberFormat(intlLocale, {
      style: "currency",
      currency: settings.currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numeric);
  } catch {
    // Fallback: symbol + number
    return `${settings.currencySymbol} ${Number(numeric).toFixed(2)}`;
  }
}

/**
 * Format a numeric amount without currency symbol (for tables / ledger entries).
 */
export function formatAmount(
  amount: number | string | null | undefined,
  settings: LocaleSettings,
): string {
  if (amount === null || amount === undefined || amount === "") return "—";

  const numeric = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(numeric)) return String(amount);

  try {
    const intlLocale = bcp47Locale(settings.locale);
    return new Intl.NumberFormat(intlLocale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numeric);
  } catch {
    return Number(numeric).toFixed(2);
  }
}

// ─── Phone formatting ─────────────────────────────────────────────────────────

/**
 * Prepend the compound's country dialling code when the phone number does not
 * already start with a '+'.
 *
 * @example
 *   formatPhone("01012345678", settings)
 *   // → "+20 01012345678"
 */
export function formatPhone(
  phone: string | null | undefined,
  settings: LocaleSettings,
): string {
  if (!phone) return "—";
  if (phone.startsWith("+")) return phone;
  return `${settings.phoneCountryCode} ${phone}`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Map the app's two-character locale codes to BCP 47 locale tags understood
 * by the Intl APIs.
 */
function bcp47Locale(locale: string): string {
  const map: Record<string, string> = {
    ar: "ar-EG",
    en: "en-US",
  };
  return map[locale] ?? locale;
}

/**
 * Return the text direction for a given locale.
 * Useful for inline style overrides on specific elements.
 */
export function localeDir(locale: string): "rtl" | "ltr" {
  const rtlLocales = new Set(["ar", "he", "fa", "ur"]);
  return rtlLocales.has(locale) ? "rtl" : "ltr";
}
