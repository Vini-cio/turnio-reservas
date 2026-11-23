import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";
import { MISSING_ENV_MESSAGE } from "@/lib/supabase/env";
import type { Profile, Role } from "@/lib/types";

export type CurrentUser = Pick<Profile, "id" | "full_name" | "role">;
type ServerClient = Awaited<ReturnType<typeof createClient>>;

/** Usuario de la sesión (verificado contra Supabase Auth) con su perfil; `null` si no hay. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  if (!(await hasSupabaseEnv())) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", user.id)
    .maybeSingle();
  return data;
});

function homeFor(role: Role): string {
  return role === "provider" ? "/panel" : "/mis-citas";
}

/** Para páginas privadas: exige sesión y rol; si no, redirige. */
export async function requirePageUser(role: Role, path: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(path)}`);
  if (user.role !== role) redirect(homeFor(user.role));
  return user;
}

type ActionContext =
  | { ok: true; supabase: ServerClient; user: CurrentUser }
  | { ok: false; error: string };

/** Para Server Actions: cliente de servidor + usuario de la sesión, con el rol exigido. */
export async function getActionContext(role: Role): Promise<ActionContext> {
  if (!(await hasSupabaseEnv())) return { ok: false, error: MISSING_ENV_MESSAGE };
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Tu sesión ha caducado. Vuelve a iniciar sesión." };
  if (user.role !== role) {
    return {
      ok: false,
      error:
        role === "provider"
          ? "Solo los profesionales pueden hacer esto."
          : "Solo los clientes pueden hacer esto.",
    };
  }
  return { ok: true, supabase: await createClient(), user };
}
