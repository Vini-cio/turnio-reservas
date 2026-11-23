import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime, formatPrice, formatTime } from "@/lib/format";

const normalize = (text: string) => text.replace(/\s/g, " ");

describe("format (es-ES, Europe/Madrid)", () => {
  it("formatea precios en euros", () => {
    expect(normalize(formatPrice(1250))).toBe("12,50 €");
    expect(normalize(formatPrice(0))).toBe("0,00 €");
  });

  it("formatea la hora en la zona de Madrid (invierno UTC+1, verano UTC+2)", () => {
    expect(formatTime("2026-11-23T14:30:00Z")).toBe("15:30");
    expect(formatTime(new Date("2026-07-01T14:30:00Z"))).toBe("16:30");
  });

  it("formatea la fecha en español", () => {
    expect(formatDate("2026-11-23T10:00:00Z")).toBe("lunes, 23 de noviembre de 2026");
  });

  it("usa el día de Madrid cerca de medianoche", () => {
    expect(normalize(formatDateTime("2026-11-23T23:30:00Z"))).toContain("24 de noviembre");
    expect(normalize(formatDateTime("2026-11-23T23:30:00Z"))).toContain("00:30");
  });
});
