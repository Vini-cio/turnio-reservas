"use client";

import { useActionState } from "react";
import { FormMessage } from "@/components/form-message";
import type { ButtonVariant } from "@/components/styles";
import { SubmitButton } from "@/components/submit-button";
import { INITIAL_ACTION_STATE, type ActionState } from "@/lib/action-state";

type Props = {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  fields: Record<string, string>;
  label: string;
  pendingLabel: string;
  variant?: ButtonVariant;
};

/** Formulario de un solo botón (reservar, cancelar, borrar, salir) con su error visible. */
export function ActionButton({ action, fields, label, pendingLabel, variant = "secondary" }: Props) {
  const [state, formAction] = useActionState(action, INITIAL_ACTION_STATE);
  return (
    <form action={formAction} className="flex flex-col items-start gap-2 sm:items-end">
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <SubmitButton label={label} pendingLabel={pendingLabel} variant={variant} />
      <FormMessage state={state} />
    </form>
  );
}
