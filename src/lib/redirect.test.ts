import { describe, expect, it } from "vitest";
import { safeNextPath } from "@/lib/redirect";

describe("safeNextPath", () => {
  it("acepta las rutas internas permitidas", () => {
    expect(safeNextPath("/")).toBe("/");
    expect(safeNextPath("/panel")).toBe("/panel");
    expect(safeNextPath("/mis-citas")).toBe("/mis-citas");
    const provider = "/p/123e4567-e89b-42d3-a456-426614174000";
    expect(safeNextPath(provider)).toBe(provider);
  });

  it("rechaza redirecciones a otros dominios", () => {
    expect(safeNextPath("//evil.com")).toBeNull();
    expect(safeNextPath("/\\evil.com")).toBeNull();
    expect(safeNextPath("/%09/evil.com")).toBeNull();
    expect(safeNextPath("/\t/evil.com")).toBeNull();
    expect(safeNextPath("/\n/evil.com")).toBeNull();
    expect(safeNextPath("https://evil.com")).toBeNull();
  });

  it("rechaza rutas no permitidas o vacías", () => {
    expect(safeNextPath("/p/no-es-uuid")).toBeNull();
    expect(safeNextPath("/panel/../../evil")).toBeNull();
    expect(safeNextPath("/panel ")).toBeNull();
    expect(safeNextPath("")).toBeNull();
    expect(safeNextPath(undefined)).toBeNull();
  });
});
