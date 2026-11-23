"use client";

import { useActionState } from "react";
import { signIn } from "@/app/actions/auth";
import { FormMessage } from "@/components/form-message";
import { inputStyles, labelStyles } from "@/components/styles";
import { SubmitButton } from "@/components/submit-button";
import { INITIAL_ACTION_STATE } from "@/lib/action-state";

export function LoginForm({ next }: { next: string }) {
  const [state, formAction] = useActionState(signIn, INITIAL_ACTION_STATE);
  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <div className="space-y-1">
        <label htmlFor="email" className={labelStyles}>
          Email
        </label>
        <input id="email" name="email" type="email" autoComplete="email" required className={inputStyles} />
      </div>
      <div className="space-y-1">
        <label htmlFor="password" className={labelStyles}>
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={inputStyles}
        />
      </div>
      <FormMessage state={state} />
      <SubmitButton label="Entrar" pendingLabel="Entrando…" />
    </form>
  );
}
