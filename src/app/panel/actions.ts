"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionError, actionSuccess, zodError, type ActionState } from "@/lib/action-state";
import { getActionContext } from "@/lib/auth";
import { toSpanishError } from "@/lib/errors";
import { parsePriceToCents } from "@/lib/format";
import {
  canDeleteService,
  canDeleteSlot,
  canPublishSlot,
  checkNoOverlap,
  validateService,
} from "@/lib/rules";
import { madridLocalToDate } from "@/lib/time";

const uuid = z.uuid({ error: "Identificador no válido." });
const name = z.string().trim();
const price = z
  .string()
  .transform((value) => parsePriceToCents(value))
  .refine((cents) => cents !== null, {
    error: "Escribe un precio válido en euros (p. ej. 15 o 12,50).",
  })
  .transform((cents) => cents ?? 0);

const createServiceSchema = z.object({
  name,
  durationMin: z.coerce.number({ error: "Escribe la duración en minutos." }),
  priceCents: price,
});

const updateServiceSchema = z.object({ serviceId: uuid, name, priceCents: price });
const deleteServiceSchema = z.object({ serviceId: uuid });
const deleteSlotSchema = z.object({ slotId: uuid });

const publishSlotsSchema = z.object({
  serviceId: uuid,
  date: z.string().min(1, { error: "Elige una fecha." }),
  time: z.string().min(1, { error: "Elige una hora." }),
  repeat: z.coerce
    .number()
    .int({ error: "El número de huecos debe ser un entero." })
    .min(1, { error: "Publica al menos 1 hueco." })
    .max(8, { error: "Como máximo 8 huecos seguidos." }),
});

function refreshPanel(providerId: string) {
  revalidatePath("/panel");
  revalidatePath(`/p/${providerId}`);
  revalidatePath("/");
}

export async function createService(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = createServiceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return zodError(parsed.error);
  const rule = validateService(parsed.data);
  if (!rule.ok) return actionError(rule.error);

  const ctx = await getActionContext("provider");
  if (!ctx.ok) return actionError(ctx.error);

  const { error } = await ctx.supabase.from("services").insert({
    provider_id: ctx.user.id,
    name: parsed.data.name,
    duration_min: parsed.data.durationMin,
    price_cents: parsed.data.priceCents,
  });
  if (error) return actionError(toSpanishError(error));

  refreshPanel(ctx.user.id);
  return actionSuccess("Servicio creado.");
}

export async function updateService(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = updateServiceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return zodError(parsed.error);

  const ctx = await getActionContext("provider");
  if (!ctx.ok) return actionError(ctx.error);
  const { supabase, user } = ctx;

  const { data: service, error: readError } = await supabase
    .from("services")
    .select("duration_min")
    .eq("id", parsed.data.serviceId)
    .eq("provider_id", user.id)
    .maybeSingle();
  if (readError) return actionError(toSpanishError(readError));
  if (!service) return actionError("El servicio no existe.");

  // La duración no se edita (la BD lo impide con un trigger); se valida el resto con R1.
  const rule = validateService({ ...parsed.data, durationMin: service.duration_min });
  if (!rule.ok) return actionError(rule.error);

  const { error } = await supabase
    .from("services")
    .update({ name: parsed.data.name, price_cents: parsed.data.priceCents })
    .eq("id", parsed.data.serviceId)
    .eq("provider_id", user.id);
  if (error) return actionError(toSpanishError(error));

  refreshPanel(user.id);
  return actionSuccess("Servicio actualizado.");
}

export async function deleteService(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = deleteServiceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return zodError(parsed.error);

  const ctx = await getActionContext("provider");
  if (!ctx.ok) return actionError(ctx.error);
  const { supabase, user } = ctx;

  const { data: service, error: readError } = await supabase
    .from("services")
    .select("id, slots(starts_at, bookings(status))")
    .eq("id", parsed.data.serviceId)
    .eq("provider_id", user.id)
    .maybeSingle();
  if (readError) return actionError(toSpanishError(readError));
  if (!service) return actionError("El servicio no existe.");

  // Borrar el servicio borra sus huecos: aplica R8 a todos ellos (el trigger también lo impone).
  const rule = canDeleteService(
    service.slots.map((slot) => ({ startsAt: new Date(slot.starts_at), bookings: slot.bookings })),
    new Date(),
  );
  if (!rule.ok) return actionError(rule.error);

  const { data: deleted, error } = await supabase
    .from("services")
    .delete()
    .eq("id", parsed.data.serviceId)
    .eq("provider_id", user.id)
    .select("id");
  if (error) return actionError(toSpanishError(error));
  if (deleted.length !== 1) return actionError("No se pudo borrar el servicio.");

  refreshPanel(user.id);
  return actionSuccess("Servicio borrado.");
}

export async function publishSlots(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = publishSlotsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return zodError(parsed.error);
  const { serviceId, date, time, repeat } = parsed.data;

  const firstStart = madridLocalToDate(date, time);
  if (!firstStart) return actionError("La fecha o la hora no son válidas.");
  const now = new Date();
  const publishable = canPublishSlot(firstStart, now);
  if (!publishable.ok) return actionError(publishable.error);

  const ctx = await getActionContext("provider");
  if (!ctx.ok) return actionError(ctx.error);
  const { supabase, user } = ctx;

  const { data: service, error: serviceError } = await supabase
    .from("services")
    .select("duration_min")
    .eq("id", serviceId)
    .eq("provider_id", user.id)
    .maybeSingle();
  if (serviceError) return actionError(toSpanishError(serviceError));
  if (!service) return actionError("El servicio no existe.");

  const durationMs = service.duration_min * 60 * 1000;
  const candidates = Array.from({ length: repeat }, (_, index) => {
    const startsAt = new Date(firstStart.getTime() + index * durationMs);
    return { startsAt, endsAt: new Date(startsAt.getTime() + durationMs) };
  });

  const { data: existing, error: existingError } = await supabase
    .from("slots")
    .select("starts_at, ends_at")
    .eq("provider_id", user.id)
    .gt("ends_at", now.toISOString());
  if (existingError) return actionError(toSpanishError(existingError));
  const ranges = existing.map((slot) => ({
    startsAt: new Date(slot.starts_at),
    endsAt: new Date(slot.ends_at),
  }));
  for (const candidate of candidates) {
    const overlap = checkNoOverlap(candidate, ranges);
    if (!overlap.ok) return actionError(overlap.error);
  }

  // Un único insert: o se publican todos los huecos o ninguno. La BD vuelve a aplicar R2 y R3.
  const { error } = await supabase.from("slots").insert(
    candidates.map((candidate) => ({
      provider_id: user.id,
      service_id: serviceId,
      starts_at: candidate.startsAt.toISOString(),
    })),
  );
  if (error) return actionError(toSpanishError(error));

  refreshPanel(user.id);
  return actionSuccess(repeat === 1 ? "Hueco publicado." : `${repeat} huecos publicados.`);
}

export async function deleteSlot(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = deleteSlotSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return zodError(parsed.error);

  const ctx = await getActionContext("provider");
  if (!ctx.ok) return actionError(ctx.error);
  const { supabase, user } = ctx;

  const { data: slot, error: readError } = await supabase
    .from("slots")
    .select("bookings(status)")
    .eq("id", parsed.data.slotId)
    .eq("provider_id", user.id)
    .maybeSingle();
  if (readError) return actionError(toSpanishError(readError));
  if (!slot) return actionError("El hueco no existe.");
  const rule = canDeleteSlot(slot.bookings);
  if (!rule.ok) return actionError(rule.error);

  // El trigger `slots_before_delete` vuelve a imponer R8.
  const { error } = await supabase
    .from("slots")
    .delete()
    .eq("id", parsed.data.slotId)
    .eq("provider_id", user.id);
  if (error) return actionError(toSpanishError(error));

  refreshPanel(user.id);
  return actionSuccess("Hueco borrado.");
}
