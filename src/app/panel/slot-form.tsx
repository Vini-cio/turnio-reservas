"use client";

import { useActionState } from "react";
import { FormMessage } from "@/components/form-message";
import { inputStyles, labelStyles } from "@/components/styles";
import { SubmitButton } from "@/components/submit-button";
import { INITIAL_ACTION_STATE } from "@/lib/action-state";
import type { Service } from "@/lib/types";
import { publishSlots } from "./actions";

type Props = {
  services: Pick<Service, "id" | "name" | "duration_min">[];
  minDate: string;
};

export function SlotForm({ services, minDate }: Props) {
  const [state, formAction] = useActionState(publishSlots, INITIAL_ACTION_STATE);
  return (
    <form action={formAction} className="space-y-3">
      <div className="space-y-1">
        <label htmlFor="slot-service" className={labelStyles}>
          Servicio
        </label>
        <select id="slot-service" name="serviceId" required className={inputStyles}>
          {services.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name} ({service.duration_min} min)
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label htmlFor="slot-date" className={labelStyles}>
            Fecha
          </label>
          <input id="slot-date" name="date" type="date" required min={minDate} className={inputStyles} />
        </div>
        <div className="space-y-1">
          <label htmlFor="slot-time" className={labelStyles}>
            Hora (Madrid)
          </label>
          <input id="slot-time" name="time" type="time" required step={300} className={inputStyles} />
        </div>
      </div>
      <div className="space-y-1">
        <label htmlFor="slot-repeat" className={labelStyles}>
          Huecos consecutivos
        </label>
        <select id="slot-repeat" name="repeat" defaultValue="1" className={inputStyles}>
          {Array.from({ length: 8 }, (_, index) => index + 1).map((count) => (
            <option key={count} value={count}>
              {count === 1 ? "1 hueco" : `${count} huecos seguidos`}
            </option>
          ))}
        </select>
        <p className="text-xs text-slate-500">
          Se publican uno detrás de otro, cada uno con la duración del servicio.
        </p>
      </div>
      <FormMessage state={state} />
      <SubmitButton label="Publicar" pendingLabel="Publicando…" />
    </form>
  );
}
