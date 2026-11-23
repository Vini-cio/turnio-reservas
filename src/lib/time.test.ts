import { describe, expect, it } from "vitest";
import { madridDateKey, madridLocalToDate } from "@/lib/time";

describe("madridLocalToDate", () => {
  it("convierte la hora de invierno (UTC+1)", () => {
    expect(madridLocalToDate("2026-11-23", "15:30")?.toISOString()).toBe(
      "2026-11-23T14:30:00.000Z",
    );
  });

  it("convierte la hora de verano (UTC+2)", () => {
    expect(madridLocalToDate("2026-07-01", "09:00")?.toISOString()).toBe(
      "2026-07-01T07:00:00.000Z",
    );
  });

  it("respeta los días de cambio de hora", () => {
    // 29 mar 2026: a las 02:00 se pasa a las 03:00 (UTC+2).
    expect(madridLocalToDate("2026-03-29", "10:00")?.toISOString()).toBe(
      "2026-03-29T08:00:00.000Z",
    );
    // 25 oct 2026: a las 03:00 se vuelve a las 02:00 (UTC+1).
    expect(madridLocalToDate("2026-10-25", "10:00")?.toISOString()).toBe(
      "2026-10-25T09:00:00.000Z",
    );
  });

  it("maneja medianoche", () => {
    expect(madridLocalToDate("2026-11-24", "00:00")?.toISOString()).toBe(
      "2026-11-23T23:00:00.000Z",
    );
  });

  it("rechaza formatos o fechas inexistentes", () => {
    expect(madridLocalToDate("2026-02-30", "10:00")).toBeNull();
    expect(madridLocalToDate("23/11/2026", "10:00")).toBeNull();
    expect(madridLocalToDate("2026-11-23", "24:00")).toBeNull();
    expect(madridLocalToDate("2026-11-23", "")).toBeNull();
  });
});

describe("madridDateKey", () => {
  it("usa el día de Madrid, no el de UTC", () => {
    expect(madridDateKey("2026-11-23T23:30:00Z")).toBe("2026-11-24");
    expect(madridDateKey(new Date("2026-11-23T10:00:00Z"))).toBe("2026-11-23");
  });
});
