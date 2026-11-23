/** Conversión entre la hora local de Madrid (lo que escribe el usuario) y instantes UTC. */

const TIME_ZONE = "Europe/Madrid";

const partsFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

type MadridParts = { year: number; month: number; day: number; hour: number; minute: number; second: number };

function madridParts(at: Date): MadridParts {
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(partsFormatter.formatToParts(at).find((part) => part.type === type)?.value);
  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: value("hour"),
    minute: value("minute"),
    second: value("second"),
  };
}

/** Diferencia (ms) entre la hora de Madrid y UTC en el instante dado (+1 h o +2 h). */
function madridOffsetMs(at: Date): number {
  const p = madridParts(at);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(at.getTime() / 1000) * 1000;
}

/**
 * Convierte fecha ("AAAA-MM-DD") y hora ("HH:MM") de Madrid en un instante UTC.
 * Devuelve `null` si el formato no es válido o la fecha no existe.
 */
export function madridLocalToDate(date: string, time: string): Date | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const timeMatch = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  if (!dateMatch || !timeMatch) return null;

  const [year, month, day] = dateMatch.slice(1).map(Number);
  const [hour, minute] = timeMatch.slice(1).map(Number);
  const naive = Date.UTC(year, month - 1, day, hour, minute);
  const check = new Date(naive);
  if (check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return null;

  const firstGuess = naive - madridOffsetMs(new Date(naive));
  return new Date(naive - madridOffsetMs(new Date(firstGuess)));
}

/** Día de Madrid de un instante, como "AAAA-MM-DD" (para agrupar y para `<input type="date">`). */
export function madridDateKey(value: Date | string): string {
  const p = madridParts(typeof value === "string" ? new Date(value) : value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}
