import { MISSING_ENV_MESSAGE } from "@/lib/supabase/env";

/** Aviso cuando la app se ejecuta sin las variables de entorno de Supabase. */
export function MissingEnv() {
  return (
    <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
      <p className="font-semibold">La app todavía no está conectada a la base de datos.</p>
      <p className="mt-1">{MISSING_ENV_MESSAGE}</p>
    </div>
  );
}
