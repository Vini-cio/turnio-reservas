const LOCALE = "es-ES";
const TIME_ZONE = "Europe/Madrid";

const dateTimeFormatter = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIME_ZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

const dateFormatter = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIME_ZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
});

const priceFormatter = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: "EUR",
});

function toDate(value: Date | string): Date {
  return typeof value === "string" ? new Date(value) : value;
}

/** Ej.: "lunes, 23 de noviembre, 15:30". */
export function formatDateTime(value: Date | string): string {
  return dateTimeFormatter.format(toDate(value));
}

/** Ej.: "lunes, 23 de noviembre de 2026". */
export function formatDate(value: Date | string): string {
  return dateFormatter.format(toDate(value));
}

/** Ej.: "15:30". */
export function formatTime(value: Date | string): string {
  return timeFormatter.format(toDate(value));
}

/** Ej.: 1250 → "12,50 €". */
export function formatPrice(cents: number): string {
  return priceFormatter.format(cents / 100);
}

/** Ej.: "12,50" o "12.5" → 1250. `null` si no es un importe válido (≥ 0, máx. 2 decimales). */
export function parsePriceToCents(input: string): number | null {
  const match = /^(\d{1,6})(?:[.,](\d{1,2}))?$/.exec(input.trim());
  if (!match) return null;
  const euros = Number(match[1]);
  const cents = Number((match[2] ?? "0").padEnd(2, "0"));
  return euros * 100 + cents;
}

/** Ej.: 1250 → "12,50" (valor inicial de un input de precio). */
export function centsToPriceInput(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}
