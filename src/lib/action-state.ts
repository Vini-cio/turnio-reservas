import type { ZodError } from "zod";

/** Estado que devuelven las Server Actions a `useActionState`. */
export type ActionState = { error: string | null; success: string | null };

export const INITIAL_ACTION_STATE: ActionState = { error: null, success: null };

export function actionError(error: string): ActionState {
  return { error, success: null };
}

export function actionSuccess(success: string): ActionState {
  return { error: null, success };
}

/** Primer mensaje de validación de zod (ya escrito en español en cada esquema). */
export function zodError(error: ZodError): ActionState {
  return actionError(error.issues[0]?.message ?? "Datos no válidos.");
}
