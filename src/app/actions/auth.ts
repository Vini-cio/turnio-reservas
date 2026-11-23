"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { actionError, actionSuccess, zodError, type ActionState } from "@/lib/action-state";
import { toSpanishError } from "@/lib/errors";
import { safeNextPath } from "@/lib/redirect";
import { createClient } from "@/lib/supabase/server";
import { MISSING_ENV_MESSAGE, readSupabaseEnv } from "@/lib/supabase/env";

const email = z.email({ error: "Escribe un email válido." });

const loginSchema = z.object({
  email,
  password: z.string().min(1, { error: "Escribe tu contraseña." }),
  next: z.string().optional(),
});

const signUpSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, { error: "El nombre debe tener al menos 2 caracteres." })
    .max(100, { error: "El nombre no puede superar los 100 caracteres." }),
  email,
  password: z.string().min(6, { error: "La contraseña debe tener al menos 6 caracteres." }),
  role: z.enum(["client", "provider"], { error: "Elige si eres cliente o profesional." }),
});

function field(formData: FormData, name: string): string | undefined {
  const value = formData.get(name);
  return typeof value === "string" ? value : undefined;
}

export async function signIn(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: field(formData, "email"),
    password: field(formData, "password"),
    next: field(formData, "next"),
  });
  if (!parsed.success) return zodError(parsed.error);
  if (!readSupabaseEnv()) return actionError(MISSING_ENV_MESSAGE);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) return actionError(toSpanishError(error));

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();

  revalidatePath("/", "layout");
  redirect(safeNextPath(parsed.data.next) ?? (profile?.role === "provider" ? "/panel" : "/"));
}

export async function signUp(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = signUpSchema.safeParse({
    fullName: field(formData, "fullName"),
    email: field(formData, "email"),
    password: field(formData, "password"),
    role: field(formData, "role"),
  });
  if (!parsed.success) return zodError(parsed.error);
  if (!readSupabaseEnv()) return actionError(MISSING_ENV_MESSAGE);

  const { fullName, role } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { full_name: fullName, role } },
  });
  if (error) return actionError(toSpanishError(error));
  // Con confirmación de email activa, Supabase no da error si el email ya existe: devuelve 0 identidades.
  if (data.user?.identities?.length === 0) {
    return actionError(toSpanishError({ code: "user_already_exists" }));
  }
  if (!data.session) {
    return actionSuccess("Cuenta creada. Revisa tu email para confirmarla y después inicia sesión.");
  }

  revalidatePath("/", "layout");
  redirect(role === "provider" ? "/panel" : "/");
}

export async function signOut(): Promise<ActionState> {
  if (!readSupabaseEnv()) return actionError(MISSING_ENV_MESSAGE);
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) return actionError(toSpanishError(error));
  revalidatePath("/", "layout");
  redirect("/");
}
