const ARABIC_INDIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const EASTERN_ARABIC_INDIC_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

export function normalizeDigits(value: string): string {
  return value.replace(/[٠-٩۰-۹]/g, (digit) => {
    const arabicIndex = ARABIC_INDIC_DIGITS.indexOf(digit);
    if (arabicIndex >= 0) return String(arabicIndex);

    const easternIndex = EASTERN_ARABIC_INDIC_DIGITS.indexOf(digit);
    return easternIndex >= 0 ? String(easternIndex) : digit;
  });
}

export function digitsOnly(value: string, maxLength?: number): string {
  const digits = normalizeDigits(value).replace(/\D/g, "");
  return typeof maxLength === "number" ? digits.slice(0, maxLength) : digits;
}

export function arabicLettersOnly(value: string, maxLength?: number): string {
  const letters = Array.from(value).filter((char) => /^[\u0621-\u064A]$/u.test(char)).join("");
  return typeof maxLength === "number" ? Array.from(letters).slice(0, maxLength).join("") : letters;
}
