/**
 * Rutas internas a las que se puede volver tras iniciar sesión (`/login?next=…`).
 * Lista blanca estricta: cualquier otra cosa (URLs absolutas, "//dominio", "/\dominio",
 * caracteres de control o espacios) se descarta para evitar redirecciones abiertas.
 */
const ALLOWED_NEXT = /^\/(?:p\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|panel|mis-citas)?$/i;

export function safeNextPath(next: string | null | undefined): string | null {
  if (!next || !ALLOWED_NEXT.test(next)) return null;
  return next;
}
