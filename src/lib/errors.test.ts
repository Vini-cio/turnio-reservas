import { describe, expect, it } from "vitest";
import { toSpanishError } from "@/lib/errors";

describe("toSpanishError", () => {
  it("usa el mensaje de la RPC para los códigos propios TUxnn", () => {
    expect(toSpanishError({ code: "TUR06", message: "Ya tienes 3 reservas futuras." })).toBe(
      "Ya tienes 3 reservas futuras.",
    );
    expect(toSpanishError({ code: "TUS01", message: "La duración no se puede cambiar." })).toBe(
      "La duración no se puede cambiar.",
    );
  });

  it("traduce la violación de exclusión (23P01) al mensaje de R3", () => {
    expect(toSpanishError({ code: "23P01", message: "conflicting key value" })).toMatch(/solapa/);
  });

  it("traduce la violación de check (23514) al mensaje de R1", () => {
    expect(toSpanishError({ code: "23514", message: "violates check constraint" })).toMatch(
      /entre 2 y 80 caracteres/,
    );
  });

  it("traduce la violación de unicidad (23505) a hueco ya reservado (R4)", () => {
    expect(toSpanishError({ code: "23505", message: "duplicate key" })).toBe(
      "Este hueco ya está reservado.",
    );
  });

  it("traduce errores de Supabase Auth", () => {
    expect(toSpanishError({ code: "invalid_credentials", message: "Invalid login credentials" })).toBe(
      "Email o contraseña incorrectos.",
    );
    expect(toSpanishError({ code: "user_already_exists", message: "User already registered" })).toBe(
      "Ya existe una cuenta con este email.",
    );
  });

  it("devuelve un mensaje genérico en español para lo desconocido", () => {
    const generic = "Ha ocurrido un error inesperado. Inténtalo de nuevo.";
    expect(toSpanishError({ code: "XX000", message: "internal error" })).toBe(generic);
    expect(toSpanishError({ message: "boom" })).toBe(generic);
    expect(toSpanishError(null)).toBe(generic);
  });

  it("distingue los fallos de red", () => {
    expect(toSpanishError({ code: "", message: "TypeError: fetch failed" })).toMatch(
      /No se pudo conectar/,
    );
  });

  it("no expone mensajes en inglés de códigos TU sin mensaje", () => {
    expect(toSpanishError({ code: "TUR03", message: "" })).toBe(
      "Ha ocurrido un error inesperado. Inténtalo de nuevo.",
    );
  });
});
