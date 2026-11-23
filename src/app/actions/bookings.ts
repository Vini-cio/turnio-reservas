"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { actionError, actionSuccess, zodError, type ActionState } from "@/lib/action-state";
import { getActionContext } from "@/lib/auth";
import { toSpanishError } from "@/lib/errors";
import { canBookSlot, canCancelBooking, checkBookingLimit } from "@/lib/rules";
import { MISSING_ENV_MESSAGE, readSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

const uuid = z.uuid({ error: "Identificador no válido." });

const bookSchema = z.object({ slotId: uuid });
const cancelSchema = z.object({ bookingId: uuid });

export async function bookSlot(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = bookSchema.safeParse({ slotId: formData.get("slotId") });
  if (!parsed.success) return zodError(parsed.error);

  const ctx = await getActionContext("client");
  if (!ctx.ok) return actionError(ctx.error);
  const { supabase, user } = ctx;
  const { slotId } = parsed.data;

  const { data: slot, error: slotError } = await supabase
    .from("slots")
    .select("starts_at, provider_id")
    .eq("id", slotId)
    .maybeSingle();
  if (slotError) return actionError(toSpanishError(slotError));
  if (!slot) return actionError("El hueco no existe.");

  const now = new Date();
  const bookable = canBookSlot(
    { startsAt: new Date(slot.starts_at), providerId: slot.provider_id },
    user.id,
    now,
  );
  if (!bookable.ok) return actionError(bookable.error);

  const { data: mine, error: mineError } = await supabase
    .from("bookings")
    .select("status, slot:slots(starts_at)")
    .eq("client_id", user.id)
    .eq("status", "confirmed");
  if (mineError) return actionError(toSpanishError(mineError));
  const limit = checkBookingLimit(
    mine.flatMap((b) => (b.slot ? [{ status: b.status, startsAt: new Date(b.slot.starts_at) }] : [])),
    now,
  );
  if (!limit.ok) return actionError(limit.error);

  // La RPC vuelve a comprobar R4, R5 y R6 de forma atómica.
  const { error } = await supabase.rpc("book_slot", { p_slot_id: slotId });
  if (error) return actionError(toSpanishError(error));

  revalidatePath(`/p/${slot.provider_id}`);
  revalidatePath("/mis-citas");
  revalidatePath("/panel");
  redirect("/mis-citas?reservada=1");
}

export async function cancelBooking(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = cancelSchema.safeParse({ bookingId: formData.get("bookingId") });
  if (!parsed.success) return zodError(parsed.error);
  if (!readSupabaseEnv()) return actionError(MISSING_ENV_MESSAGE);

  // Cancelan tanto el cliente como el profesional: basta con tener sesión.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return actionError("Tu sesión ha caducado. Vuelve a iniciar sesión.");

  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("client_id, status, slot:slots(starts_at, provider_id)")
    .eq("id", parsed.data.bookingId)
    .maybeSingle();
  if (bookingError) return actionError(toSpanishError(bookingError));
  if (!booking?.slot) return actionError("La reserva no existe.");
  if (booking.status === "cancelled") return actionError("La reserva ya está cancelada.");

  const allowed = canCancelBooking(
    {
      startsAt: new Date(booking.slot.starts_at),
      clientId: booking.client_id,
      providerId: booking.slot.provider_id,
    },
    user.id,
    new Date(),
  );
  if (!allowed.ok) return actionError(allowed.error);

  // La RPC vuelve a comprobar R7 de forma atómica.
  const { error } = await supabase.rpc("cancel_booking", { p_booking_id: parsed.data.bookingId });
  if (error) return actionError(toSpanishError(error));

  revalidatePath("/mis-citas");
  revalidatePath("/panel");
  revalidatePath(`/p/${booking.slot.provider_id}`);
  return actionSuccess("Reserva cancelada.");
}
