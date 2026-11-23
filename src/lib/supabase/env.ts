type SupabaseEnv = { url: string; anonKey: string };

export const MISSING_ENV_MESSAGE =
  "Supabase no está configurado: faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY. Revisa .env.local (o las variables de entorno en Vercel).";

/** Lee las variables públicas de Supabase en tiempo de ejecución; `null` si faltan. */
export function readSupabaseEnv(): SupabaseEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export function requireSupabaseEnv(): SupabaseEnv {
  const env = readSupabaseEnv();
  if (!env) {
    throw new Error(MISSING_ENV_MESSAGE);
  }
  return env;
}
