"use client";

import { useActionState } from "react";
import { FormMessage } from "@/components/form-message";
import { inputStyles, labelStyles } from "@/components/styles";
import { SubmitButton } from "@/components/submit-button";
import { INITIAL_ACTION_STATE } from "@/lib/action-state";
import { centsToPriceInput } from "@/lib/format";
import type { Service } from "@/lib/types";
import { createService, updateService } from "./actions";

export function CreateServiceForm() {
  const [state, formAction] = useActionState(createService, INITIAL_ACTION_STATE);
  return (
    <form action={formAction} className="space-y-3">
      <div className="space-y-1">
        <label htmlFor="new-service-name" className={labelStyles}>
          Nombre
        </label>
        <input
          id="new-service-name"
          name="name"
          required
          minLength={2}
          maxLength={80}
          placeholder="Corte de pelo"
          className={inputStyles}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label htmlFor="new-service-duration" className={labelStyles}>
            Duración (min)
          </label>
          <input
            id="new-service-duration"
            name="durationMin"
            type="number"
            required
            min={15}
            max={240}
            step={5}
            defaultValue={30}
            className={inputStyles}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="new-service-price" className={labelStyles}>
            Precio (€)
          </label>
          <input
            id="new-service-price"
            name="priceCents"
            inputMode="decimal"
            required
            placeholder="15,00"
            className={inputStyles}
          />
        </div>
      </div>
      <p className="text-xs text-slate-500">
        La duración no se podrá cambiar después: los huecos publicados dependen de ella.
      </p>
      <FormMessage state={state} />
      <SubmitButton label="Crear servicio" pendingLabel="Creando…" />
    </form>
  );
}

type EditableService = Pick<Service, "id" | "name" | "duration_min" | "price_cents">;

export function EditServiceForm({ service }: { service: EditableService }) {
  const [state, formAction] = useActionState(updateService, INITIAL_ACTION_STATE);
  const nameId = `service-name-${service.id}`;
  const priceId = `service-price-${service.id}`;
  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="serviceId" value={service.id} />
      <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
        <div className="space-y-1">
          <label htmlFor={nameId} className={labelStyles}>
            Nombre
          </label>
          <input
            id={nameId}
            name="name"
            required
            minLength={2}
            maxLength={80}
            defaultValue={service.name}
            className={inputStyles}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor={priceId} className={labelStyles}>
            Precio (€)
          </label>
          <input
            id={priceId}
            name="priceCents"
            inputMode="decimal"
            required
            defaultValue={centsToPriceInput(service.price_cents)}
            className={inputStyles}
          />
        </div>
      </div>
      <p className="text-xs text-slate-500">
        Duración: {service.duration_min} min (no editable; crea otro servicio si necesitas otra
        duración).
      </p>
      <FormMessage state={state} />
      <SubmitButton label="Guardar cambios" pendingLabel="Guardando…" variant="secondary" />
    </form>
  );
}
