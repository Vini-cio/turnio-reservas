import { describe, expect, it } from "vitest";
import {
  centsToPriceInput,
  formatDate,
  formatDateTime,
  formatPrice,
  formatTime,
  parsePriceToCents,
} from "@/lib/format";

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

  it("convierte precios escritos en euros a céntimos", () => {
    expect(parsePriceToCents("12,50")).toBe(1250);
    expect(parsePriceToCents("12.5")).toBe(1250);
    expect(parsePriceToCents(" 0 ")).toBe(0);
    expect(parsePriceToCents("7,05")).toBe(705);
  });

  it("rechaza precios no válidos", () => {
    expect(parsePriceToCents("-1")).toBeNull();
    expect(parsePriceToCents("1,234")).toBeNull();
    expect(parsePriceToCents("abc")).toBeNull();
    expect(parsePriceToCents("")).toBeNull();
  });

  it("muestra céntimos como valor editable", () => {
    expect(centsToPriceInput(1250)).toBe("12,50");
    expect(centsToPriceInput(0)).toBe("0,00");
  });
});
