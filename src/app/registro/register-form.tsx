"use client";

import { useActionState } from "react";
import { signUp } from "@/app/actions/auth";
import { FormMessage } from "@/components/form-message";
import { inputStyles, labelStyles } from "@/components/styles";
import { SubmitButton } from "@/components/submit-button";
import { INITIAL_ACTION_STATE } from "@/lib/action-state";

const roles = [
  { value: "client", label: "Cliente", help: "Quiero reservar citas." },
  { value: "provider", label: "Profesional", help: "Quiero publicar mis huecos." },
];

export function RegisterForm() {
  const [state, formAction] = useActionState(signUp, INITIAL_ACTION_STATE);
  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="fullName" className={labelStyles}>
          Nombre
        </label>
        <input
          id="fullName"
          name="fullName"
          autoComplete="name"
          required
          minLength={2}
          maxLength={100}
          className={inputStyles}
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="email" className={labelStyles}>
          Email
        </label>
        <input id="email" name="email" type="email" autoComplete="email" required className={inputStyles} />
      </div>
      <div className="space-y-1">
        <label htmlFor="password" className={labelStyles}>
          Contraseña <span className="font-normal text-slate-500">(mínimo 6 caracteres)</span>
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          className={inputStyles}
        />
      </div>
      <fieldset className="space-y-2">
        <legend className={labelStyles}>Me registro como</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {roles.map((role) => (
            <label
              key={role.value}
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-300 p-3 has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-50"
            >
              <input
                type="radio"
                name="role"
                value={role.value}
                defaultChecked={role.value === "client"}
                className="mt-1 accent-indigo-600"
              />
              <span>
                <span className="block text-sm font-medium">{role.label}</span>
                <span className="block text-xs text-slate-600">{role.help}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <FormMessage state={state} />
      <SubmitButton label="Crear cuenta" pendingLabel="Creando cuenta…" />
    </form>
  );
}
