import { describe, expect, it } from "vitest";
import {
  canBookSlot,
  canCancelBooking,
  canDeleteSlot,
  canPublishSlot,
  checkBookingLimit,
  checkNoOverlap,
  checkSlotAvailable,
  validateService,
} from "@/lib/rules";

const NOW = new Date("2026-11-23T10:00:00Z");
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

function at(offsetMs: number): Date {
  return new Date(NOW.getTime() + offsetMs);
}

function expectError(result: ReturnType<typeof validateService>) {
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.error.length).toBeGreaterThan(0);
}

describe("R1 validateService", () => {
  const valid = { name: "Corte de pelo", durationMin: 30, priceCents: 1500 };

  it("acepta un servicio válido", () => {
    expect(validateService(valid)).toEqual({ ok: true });
  });

  it("rechaza nombre demasiado corto o largo", () => {
    expectError(validateService({ ...valid, name: "A" }));
    expectError(validateService({ ...valid, name: "x".repeat(81) }));
    expectError(validateService({ ...valid, name: "  a  " }));
  });

  it("acepta los límites de longitud del nombre (2 y 80)", () => {
    expect(validateService({ ...valid, name: "ab" }).ok).toBe(true);
    expect(validateService({ ...valid, name: "x".repeat(80) }).ok).toBe(true);
  });

  it("rechaza duraciones fuera de rango o no múltiplos de 5", () => {
    expectError(validateService({ ...valid, durationMin: 10 }));
    expectError(validateService({ ...valid, durationMin: 245 }));
    expectError(validateService({ ...valid, durationMin: 32 }));
    expectError(validateService({ ...valid, durationMin: 30.5 }));
  });

  it("acepta los límites de duración (15 y 240)", () => {
    expect(validateService({ ...valid, durationMin: 15 }).ok).toBe(true);
    expect(validateService({ ...valid, durationMin: 240 }).ok).toBe(true);
  });

  it("rechaza precio negativo y acepta precio 0", () => {
    expectError(validateService({ ...valid, priceCents: -1 }));
    expect(validateService({ ...valid, priceCents: 0 }).ok).toBe(true);
  });
});

describe("R2 canPublishSlot", () => {
  it("acepta un hueco futuro", () => {
    expect(canPublishSlot(at(HOUR), NOW)).toEqual({ ok: true });
  });

  it("rechaza un hueco pasado", () => {
    expectError(canPublishSlot(at(-HOUR), NOW));
  });

  it("rechaza un hueco que empieza exactamente ahora (límite)", () => {
    expectError(canPublishSlot(NOW, NOW));
  });
});

describe("R3 checkNoOverlap", () => {
  const existing = [{ startsAt: at(HOUR), endsAt: at(2 * HOUR) }];

  it("acepta un hueco que no se solapa", () => {
    expect(checkNoOverlap({ startsAt: at(3 * HOUR), endsAt: at(4 * HOUR) }, existing).ok).toBe(
      true,
    );
  });

  it("rechaza un hueco que se solapa", () => {
    expectError(checkNoOverlap({ startsAt: at(90 * MINUTE), endsAt: at(150 * MINUTE) }, existing));
    expectError(checkNoOverlap({ startsAt: at(0), endsAt: at(3 * HOUR) }, existing));
  });

  it("acepta huecos contiguos (límite: uno empieza cuando acaba el otro)", () => {
    expect(checkNoOverlap({ startsAt: at(2 * HOUR), endsAt: at(3 * HOUR) }, existing).ok).toBe(
      true,
    );
    expect(checkNoOverlap({ startsAt: at(0), endsAt: at(HOUR) }, existing).ok).toBe(true);
  });

  it("acepta cualquier hueco si no hay otros", () => {
    expect(checkNoOverlap({ startsAt: at(0), endsAt: at(HOUR) }, []).ok).toBe(true);
  });
});

describe("R4 checkSlotAvailable", () => {
  it("acepta un hueco sin reservas", () => {
    expect(checkSlotAvailable([])).toEqual({ ok: true });
  });

  it("rechaza un hueco con una reserva confirmada", () => {
    expectError(checkSlotAvailable([{ status: "confirmed" }]));
  });

  it("acepta un hueco con solo reservas canceladas (límite)", () => {
    expect(checkSlotAvailable([{ status: "cancelled" }, { status: "cancelled" }]).ok).toBe(true);
  });
});

describe("R5 canBookSlot", () => {
  const slot = { startsAt: at(HOUR), providerId: "pro" };

  it("acepta reservar un hueco futuro ajeno", () => {
    expect(canBookSlot(slot, "cliente", NOW)).toEqual({ ok: true });
  });

  it("rechaza reservar un hueco pasado", () => {
    expectError(canBookSlot({ ...slot, startsAt: at(-HOUR) }, "cliente", NOW));
  });

  it("rechaza reservar un hueco propio", () => {
    expectError(canBookSlot(slot, "pro", NOW));
  });

  it("rechaza un hueco que empieza exactamente ahora (límite)", () => {
    expectError(canBookSlot({ ...slot, startsAt: NOW }, "cliente", NOW));
  });
});

describe("R6 checkBookingLimit", () => {
  const future = { status: "confirmed" as const, startsAt: at(HOUR) };

  it("acepta con 2 reservas futuras confirmadas (límite inferior)", () => {
    expect(checkBookingLimit([future, future], NOW)).toEqual({ ok: true });
  });

  it("rechaza con 3 reservas futuras confirmadas (límite)", () => {
    expectError(checkBookingLimit([future, future, future], NOW));
  });

  it("no cuenta reservas pasadas ni canceladas", () => {
    const past = { status: "confirmed" as const, startsAt: at(-HOUR) };
    const startingNow = { status: "confirmed" as const, startsAt: NOW };
    const cancelled = { status: "cancelled" as const, startsAt: at(HOUR) };
    expect(checkBookingLimit([future, future, past, startingNow, cancelled], NOW).ok).toBe(true);
  });
});

describe("R7 canCancelBooking", () => {
  const booking = { startsAt: at(5 * HOUR), clientId: "cliente", providerId: "pro" };

  it("el cliente puede cancelar con más de 2 h de antelación", () => {
    expect(canCancelBooking(booking, "cliente", NOW)).toEqual({ ok: true });
  });

  it("el cliente puede cancelar exactamente 2 h antes (límite)", () => {
    expect(canCancelBooking({ ...booking, startsAt: at(2 * HOUR) }, "cliente", NOW).ok).toBe(true);
  });

  it("el cliente no puede cancelar con menos de 2 h", () => {
    expectError(canCancelBooking({ ...booking, startsAt: at(2 * HOUR - 1) }, "cliente", NOW));
  });

  it("el profesional puede cancelar siempre, incluso a última hora o en el pasado", () => {
    expect(canCancelBooking({ ...booking, startsAt: at(MINUTE) }, "pro", NOW).ok).toBe(true);
    expect(canCancelBooking({ ...booking, startsAt: at(-HOUR) }, "pro", NOW).ok).toBe(true);
  });

  it("un tercero no puede cancelar", () => {
    expectError(canCancelBooking(booking, "otro", NOW));
  });
});

describe("R8 canDeleteSlot", () => {
  it("acepta borrar un hueco sin reservas", () => {
    expect(canDeleteSlot([])).toEqual({ ok: true });
  });

  it("rechaza borrar un hueco con reserva confirmada", () => {
    expectError(canDeleteSlot([{ status: "cancelled" }, { status: "confirmed" }]));
  });

  it("acepta borrar un hueco con solo reservas canceladas (límite)", () => {
    expect(canDeleteSlot([{ status: "cancelled" }]).ok).toBe(true);
  });
});
