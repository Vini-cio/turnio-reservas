/**
 * Reglas de negocio R1–R8 como funciones puras (sin I/O). La BD las vuelve a imponer
 * en supabase/schema.sql. Las que dependen del tiempo reciben `now` por parámetro.
 */

export type RuleResult = { ok: true } | { ok: false; error: string };

const OK: RuleResult = { ok: true };

function fail(error: string): RuleResult {
  return { ok: false, error };
}

const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 80;
const MIN_DURATION_MIN = 15;
const MAX_DURATION_MIN = 240;
const DURATION_STEP_MIN = 5;
const MAX_FUTURE_BOOKINGS = 3;
const CLIENT_CANCEL_NOTICE_MS = 2 * 60 * 60 * 1000;

type ServiceInput = { name: string; durationMin: number; priceCents: number };

/** R1. Nombre 2–80 caracteres; duración 15–240 min, múltiplo de 5; precio ≥ 0. */
export function validateService({ name, durationMin, priceCents }: ServiceInput): RuleResult {
  const length = name.trim().length;
  if (length < MIN_NAME_LENGTH || length > MAX_NAME_LENGTH) {
    return fail(`El nombre debe tener entre ${MIN_NAME_LENGTH} y ${MAX_NAME_LENGTH} caracteres.`);
  }
  if (
    !Number.isInteger(durationMin) ||
    durationMin < MIN_DURATION_MIN ||
    durationMin > MAX_DURATION_MIN ||
    durationMin % DURATION_STEP_MIN !== 0
  ) {
    return fail(
      `La duración debe estar entre ${MIN_DURATION_MIN} y ${MAX_DURATION_MIN} minutos y ser múltiplo de ${DURATION_STEP_MIN}.`,
    );
  }
  if (!Number.isInteger(priceCents) || priceCents < 0) {
    return fail("El precio no puede ser negativo.");
  }
  return OK;
}

/** R2. Un hueco solo se puede publicar si empieza después de `now`. */
export function canPublishSlot(startsAt: Date, now: Date): RuleResult {
  if (startsAt.getTime() <= now.getTime()) {
    return fail("No se pueden publicar huecos en el pasado.");
  }
  return OK;
}

type TimeRange = { startsAt: Date; endsAt: Date };

/** R3. El nuevo hueco no puede solaparse con los existentes (intervalos [inicio, fin)). */
export function checkNoOverlap(candidate: TimeRange, existing: TimeRange[]): RuleResult {
  const overlaps = existing.some(
    (slot) =>
      candidate.startsAt.getTime() < slot.endsAt.getTime() &&
      slot.startsAt.getTime() < candidate.endsAt.getTime(),
  );
  if (overlaps) {
    return fail("Este hueco se solapa con otro que ya tienes publicado.");
  }
  return OK;
}

type BookingState = { status: "confirmed" | "cancelled" };

/** R4. Un hueco solo puede tener una reserva confirmada. */
export function checkSlotAvailable(slotBookings: BookingState[]): RuleResult {
  if (slotBookings.some((booking) => booking.status === "confirmed")) {
    return fail("Este hueco ya está reservado.");
  }
  return OK;
}

type BookableSlot = { startsAt: Date; providerId: string };

/** R5. No se puede reservar un hueco pasado ni uno propio. */
export function canBookSlot(slot: BookableSlot, userId: string, now: Date): RuleResult {
  if (slot.startsAt.getTime() <= now.getTime()) {
    return fail("No se puede reservar un hueco que ya ha pasado.");
  }
  if (slot.providerId === userId) {
    return fail("No puedes reservar un hueco propio.");
  }
  return OK;
}

type ClientBooking = BookingState & { startsAt: Date };

/** R6. Un cliente puede tener como máximo 3 reservas futuras confirmadas. */
export function checkBookingLimit(clientBookings: ClientBooking[], now: Date): RuleResult {
  const futureConfirmed = clientBookings.filter(
    (booking) => booking.status === "confirmed" && booking.startsAt.getTime() > now.getTime(),
  ).length;
  if (futureConfirmed >= MAX_FUTURE_BOOKINGS) {
    return fail(
      `Ya tienes ${MAX_FUTURE_BOOKINGS} reservas futuras confirmadas. Cancela una para poder reservar otra.`,
    );
  }
  return OK;
}

type CancellableBooking = { startsAt: Date; clientId: string; providerId: string };

/** R7. El cliente puede cancelar hasta 2 h antes del inicio; el profesional, siempre. */
export function canCancelBooking(
  booking: CancellableBooking,
  userId: string,
  now: Date,
): RuleResult {
  if (userId === booking.providerId) return OK;
  if (userId !== booking.clientId) {
    return fail("No puedes cancelar esta reserva.");
  }
  if (now.getTime() > booking.startsAt.getTime() - CLIENT_CANCEL_NOTICE_MS) {
    return fail("Solo puedes cancelar hasta 2 horas antes del inicio de la cita.");
  }
  return OK;
}

/** R8. No se puede borrar un hueco con una reserva confirmada. */
export function canDeleteSlot(slotBookings: BookingState[]): RuleResult {
  if (slotBookings.some((booking) => booking.status === "confirmed")) {
    return fail(
      "No se puede borrar un hueco con una reserva confirmada. Cancela primero la reserva.",
    );
  }
  return OK;
}
