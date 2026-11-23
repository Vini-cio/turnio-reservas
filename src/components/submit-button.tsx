"use client";

import { useFormStatus } from "react-dom";
import { buttonStyles, type ButtonVariant } from "@/components/styles";

type Props = {
  label: string;
  pendingLabel: string;
  variant?: ButtonVariant;
};

/** Botón de envío que se deshabilita mientras el formulario se está enviando. */
export function SubmitButton({ label, pendingLabel, variant = "primary" }: Props) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={buttonStyles[variant]}
      disabled={pending}
      aria-disabled={pending}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
