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
