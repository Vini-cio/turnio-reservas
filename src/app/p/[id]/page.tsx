import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { bookSlot } from "@/app/actions/bookings";
import { ActionButton } from "@/components/action-button";
import { MissingEnv } from "@/components/missing-env";
import { PageSkeleton } from "@/components/page-skeleton";
import { buttonStyles, cardStyles } from "@/components/styles";
import { getCurrentUser, type CurrentUser } from "@/lib/auth";
import { toSpanishError } from "@/lib/errors";
import { formatDate, formatPrice, formatTime } from "@/lib/format";
import { canBookSlot, checkBookingLimit } from "@/lib/rules";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";
import { madridDateKey } from "@/lib/time";
import type { FreeSlot } from "@/lib/types";

export const metadata: Metadata = { title: "Profesional" };

const idSchema = z.uuid();

export default function ProviderPage({ params }: PageProps<"/p/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton label="Cargando profesional…" />}>
      <ProviderDetail params={params} />
    </Suspense>
  );
}

async function ProviderDetail({ params }: Pick<PageProps<"/p/[id]">, "params">) {
  const { id } = await params;
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) notFound();
  if (!(await hasSupabaseEnv())) return <MissingEnv />;

  const supabase = await createClient();
  const { data: provider, error: providerError } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("id", parsedId.data)
    .eq("role", "provider")
    .maybeSingle();
  if (providerError) return <LoadError message={toSpanishError(providerError)} />;
  if (!provider) notFound();

  const [servicesResult, slotsResult, user] = await Promise.all([
    supabase
      .from("services")
      .select("id, name, duration_min, price_cents")
      .eq("provider_id", provider.id)
      .order("name"),
    supabase.rpc("free_slots", { p_provider_id: provider.id }),
    getCurrentUser(),
  ]);
  if (servicesResult.error) return <LoadError message={toSpanishError(servicesResult.error)} />;
  if (slotsResult.error) return <LoadError message={toSpanishError(slotsResult.error)} />;

  const services = servicesResult.data;
  const days = groupByDay(slotsResult.data);
  const limitNotice = user?.role === "client" ? await bookingLimitNotice(user) : null;

  return (
    <div className="space-y-8">
      <header>
        <Link href="/#profesionales" className="text-sm text-indigo-700 underline">
          ← Todos los profesionales
        </Link>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">{provider.full_name}</h1>
      </header>

      <section aria-labelledby="servicios" className="space-y-3">
        <h2 id="servicios" className="text-xl font-semibold">
          Servicios
        </h2>
        {services.length === 0 ? (
          <p className={`${cardStyles} text-slate-600`}>Este profesional aún no ofrece servicios.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {services.map((service) => (
              <li key={service.id} className={`${cardStyles} flex items-center justify-between gap-3`}>
                <div>
                  <p className="font-medium">{service.name}</p>
                  <p className="text-sm text-slate-600">{service.duration_min} min</p>
                </div>
                <p className="font-semibold">{formatPrice(service.price_cents)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="huecos" className="space-y-3">
        <h2 id="huecos" className="text-xl font-semibold">
          Huecos libres
        </h2>
        {limitNotice && (
          <p role="status" className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {limitNotice}
          </p>
        )}
        {days.length === 0 ? (
          <p className={`${cardStyles} text-slate-600`}>
            No hay huecos libres por ahora. Vuelve a mirar más adelante.
          </p>
        ) : (
          <div className="space-y-6">
            {days.map((day) => (
              <div key={day.key}>
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                  {formatDate(day.slots[0].starts_at)}
                </h3>
                <ul className="space-y-2">
                  {day.slots.map((slot) => (
                    <li
                      key={slot.id}
                      className={`${cardStyles} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}
                    >
                      <div>
                        <p className="font-medium">
                          {formatTime(slot.starts_at)} – {formatTime(slot.ends_at)}
                        </p>
                        <p className="text-sm text-slate-600">
                          {slot.service_name} · {slot.duration_min} min ·{" "}
                          {formatPrice(slot.price_cents)}
                        </p>
                      </div>
                      <BookControl slot={slot} providerId={provider.id} user={user} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function BookControl({
  slot,
  providerId,
  user,
}: {
  slot: FreeSlot;
  providerId: string;
  user: CurrentUser | null;
}) {
  if (!user) {
    return (
      <Link href={`/login?next=${encodeURIComponent(`/p/${providerId}`)}`} className={buttonStyles.primary}>
        Reservar
      </Link>
    );
  }

  const rule = canBookSlot({ startsAt: new Date(slot.starts_at), providerId }, user.id, new Date());
  const reason = !rule.ok
    ? rule.error
    : user.role !== "client"
      ? "Solo las cuentas de cliente pueden reservar."
      : null;

  if (reason) {
    return (
      <div className="flex flex-col items-start gap-1 sm:items-end">
        <button type="button" disabled className={buttonStyles.primary}>
          Reservar
        </button>
        <p className="text-xs text-slate-500">{reason}</p>
      </div>
    );
  }

  return (
    <ActionButton
      action={bookSlot}
      fields={{ slotId: slot.id }}
      label="Reservar"
      pendingLabel="Reservando…"
      variant="primary"
    />
  );
}

async function bookingLimitNotice(user: CurrentUser): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("status, slot:slots(starts_at)")
    .eq("client_id", user.id)
    .eq("status", "confirmed");
  // El aviso es solo informativo: si no se puede saber, no se muestra (book_slot impone R6 igualmente).
  if (error) return null;
  const bookings = data.flatMap((b) =>
    b.slot ? [{ status: b.status, startsAt: new Date(b.slot.starts_at) }] : [],
  );
  const limit = checkBookingLimit(bookings, new Date());
  return limit.ok ? null : limit.error;
}

function groupByDay(slots: FreeSlot[]): { key: string; slots: FreeSlot[] }[] {
  const days = new Map<string, FreeSlot[]>();
  for (const slot of slots) {
    const key = madridDateKey(slot.starts_at);
    days.set(key, [...(days.get(key) ?? []), slot]);
  }
  return Array.from(days, ([key, daySlots]) => ({ key, slots: daySlots }));
}

function LoadError({ message }: { message: string }) {
  return (
    <p role="alert" className="text-red-700">
      No se pudo cargar la página: {message}
    </p>
  );
}
