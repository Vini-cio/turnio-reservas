import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { readSupabaseEnv } from "@/lib/supabase/env";

const PROVIDER_PATH = /^\/p\/([^/]+)\/?$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Refresca la sesión de Supabase en cada petición. Sin variables de entorno, deja pasar.
 * Un `/p/<id>` con id que no es un uuid se reescribe a una ruta inexistente para responder 404
 * antes de que empiece el streaming (dentro de `<Suspense>` el estado ya sería 200).
 */
export async function proxy(request: NextRequest) {
  const providerId = PROVIDER_PATH.exec(request.nextUrl.pathname)?.[1];
  if (providerId !== undefined && !UUID.test(providerId)) {
    return NextResponse.rewrite(new URL("/404", request.url));
  }

  let response = NextResponse.next({ request });
  const env = readSupabaseEnv();
  if (!env) return response;

  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  await supabase.auth.getClaims();
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
