import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import type { Database } from "@/lib/types";
import { readSupabaseEnv, requireSupabaseEnv } from "./env";

/** Cliente de Supabase para Server Components, Server Actions y Route Handlers. */
export async function createClient() {
  const { url, anonKey } = requireSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // En Server Components no se pueden escribir cookies; el proxy refresca la sesión.
        }
      },
    },
  });
}

/**
 * ¿Hay variables de entorno de Supabase? Espera a la petición (`connection()`) para que las
 * páginas con datos sean siempre dinámicas, aunque el build se haya hecho sin `.env.local`.
 */
export async function hasSupabaseEnv(): Promise<boolean> {
  await connection();
  return readSupabaseEnv() !== null;
}
