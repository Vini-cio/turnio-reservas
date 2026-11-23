/**
 * Traduce errores de Postgres (PostgREST/RPC) y de Supabase Auth a mensajes en español.
 * Es el único sitio de la app que decide qué texto ve el usuario cuando falla la BD o Auth.
 */

type SupabaseLikeError = { code?: string | null; message?: string | null };

const GENERIC_ERROR = "Ha ocurrido un error inesperado. Inténtalo de nuevo.";
const NETWORK_ERROR = "No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.";

/** Códigos propios de schema.sql (TUA01, TUR03, TUS01…): su mensaje ya está en español. */
const CUSTOM_CODE = /^TU[A-Z0-9]{3}$/;

const POSTGRES_MESSAGES: Record<string, string> = {
  // R3: restricción de exclusión `slots_no_overlap`.
  "23P01": "Este hueco se solapa con otro que ya tienes publicado.",
  // R1 y demás checks.
  "23514":
    "Datos no válidos: el nombre debe tener entre 2 y 80 caracteres, la duración entre 15 y 240 minutos (múltiplo de 5) y el precio no puede ser negativo.",
  // R4: índice único de reservas confirmadas por hueco.
  "23505": "Este hueco ya está reservado.",
  "42501": "No tienes permiso para realizar esta acción.",
  "22P02": "Alguno de los datos enviados no tiene un formato válido.",
};

const AUTH_MESSAGES: Record<string, string> = {
  invalid_credentials: "Email o contraseña incorrectos.",
  user_already_exists: "Ya existe una cuenta con este email.",
  email_exists: "Ya existe una cuenta con este email.",
  weak_password: "La contraseña es demasiado débil: usa al menos 6 caracteres.",
  email_not_confirmed: "Tienes que confirmar tu email antes de entrar.",
  email_address_invalid: "El email no es válido.",
  signup_disabled: "El registro está desactivado temporalmente.",
  over_request_rate_limit: "Demasiados intentos. Espera unos minutos y vuelve a probar.",
  over_email_send_rate_limit: "Demasiados emails enviados. Espera unos minutos y vuelve a probar.",
  user_not_found: "No existe ninguna cuenta con este email.",
  session_not_found: "Tu sesión ha caducado. Vuelve a iniciar sesión.",
};

export function toSpanishError(error: SupabaseLikeError | null | undefined): string {
  if (!error) return GENERIC_ERROR;
  const code = error.code ?? "";
  if (CUSTOM_CODE.test(code) && error.message) return error.message;
  const known = POSTGRES_MESSAGES[code] ?? AUTH_MESSAGES[code];
  if (known) return known;
  if (/fetch failed|failed to fetch|network/i.test(error.message ?? "")) return NETWORK_ERROR;
  return GENERIC_ERROR;
}
