import type { Metadata } from "next";
import { Suspense } from "react";
import { cancelBooking } from "@/app/actions/bookings";
import { ActionButton } from "@/components/action-button";
import { MissingEnv } from "@/components/missing-env";
import { PageSkeleton } from "@/components/page-skeleton";
import { cardStyles } from "@/components/styles";
import { requirePageUser } from "@/lib/auth";
import { toSpanishError } from "@/lib/errors";
import { formatDateTime, formatPrice, formatTime } from "@/lib/format";
import { canCancelBooking, canDeleteSlot, checkSlotAvailable } from "@/lib/rules";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";
import { madridDateKey } from "@/lib/time";
import { deleteService, deleteSlot } from "./actions";
import { CreateServiceForm, EditServiceForm } from "./service-forms";
import { SlotForm } from "./slot-form";

export const metadata: Metadata = { title: "Mi panel" };

export default function PanelPage() {
  return (
    <Suspense fallback={<PageSkeleton label="Cargando tu panel…" />}>
      <Panel />
    </Suspense>
  );
}

async function Panel() {
  if (!(await hasSupabaseEnv())) return <MissingEnv />;
  const user = await requirePageUser("provider", "/panel");
  const supabase = await createClient();
  const now = new Date();

  const [servicesResult, slotsResult] = await Promise.all([
    supabase
      .from("services")
      .select("id, name, duration_min, price_cents")
      .eq("provider_id", user.id)
      .order("name"),
    supabase
      .from("slots")
      .select(
        "id, starts_at, ends_at, service:services(name, price_cents), bookings(id, status, client_id, client:profiles(full_name))",
      )
      .eq("provider_id", user.id)
      .gt("ends_at", now.toISOString())
      .order("starts_at"),
  ]);
  if (servicesResult.error) return <LoadError message={toSpanishError(servicesResult.error)} />;
  if (slotsResult.error) return <LoadError message={toSpanishError(slotsResult.error)} />;

  const services = servicesResult.data;
  const slots = slotsResult.data;
  const received = slots.flatMap((slot) =>
    slot.bookings
      .filter((booking) => booking.status === "confirmed")
      .map((booking) => ({ ...booking, slot })),
  );

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Mi panel</h1>
        <p className="mt-1 text-slate-600">
          Hola, {user.full_name}. Gestiona tus servicios, huecos y reservas.
        </p>
      </header>

      <section aria-labelledby="reservas" className="space-y-3">
        <h2 id="reservas" className="text-xl font-semibold">
          Próximas reservas recibidas
        </h2>
        {received.length === 0 ? (
          <p className={`${cardStyles} text-slate-600`}>Todavía no tienes reservas próximas.</p>
        ) : (
          <ul className="space-y-2">
            {received.map((booking) => {
              const cancellable = canCancelBooking(
                {
                  startsAt: new Date(booking.slot.starts_at),
                  clientId: booking.client_id,
                  providerId: user.id,
                },
                user.id,
                now,
              ).ok;
              return (
                <li
                  key={booking.id}
                  className={`${cardStyles} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}
                >
                  <div>
                    <p className="font-medium">{formatDateTime(booking.slot.starts_at)}</p>
                    <p className="text-sm text-slate-600">
                      {booking.slot.service?.name} · {booking.client?.full_name ?? "Cliente"}
                    </p>
                  </div>
                  {cancellable && (
                    <ActionButton
                      action={cancelBooking}
                      fields={{ bookingId: booking.id }}
                      label="Cancelar reserva"
                      pendingLabel="Cancelando…"
                      variant="danger"
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section aria-labelledby="servicios" className="space-y-3">
          <h2 id="servicios" className="text-xl font-semibold">
            Servicios
          </h2>
          <div className={cardStyles}>
            <h3 className="mb-3 font-medium">Nuevo servicio</h3>
            <CreateServiceForm />
          </div>
          {services.length === 0 ? (
            <p className={`${cardStyles} text-slate-600`}>
              Aún no tienes servicios. Crea el primero para poder publicar huecos.
            </p>
          ) : (
            <ul className="space-y-3">
              {services.map((service) => (
                <li key={service.id} className={`${cardStyles} space-y-3`}>
                  <p className="text-sm text-slate-500">
                    {service.name} · {service.duration_min} min · {formatPrice(service.price_cents)}
                  </p>
                  <EditServiceForm service={service} />
                  <div className="border-t border-slate-100 pt-3">
                    <ActionButton
                      action={deleteService}
                      fields={{ serviceId: service.id }}
                      label="Borrar servicio"
                      pendingLabel="Borrando…"
                      variant="danger"
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="huecos" className="space-y-3">
          <h2 id="huecos" className="text-xl font-semibold">
            Huecos
          </h2>
          <div className={cardStyles}>
            <h3 className="mb-3 font-medium">Publicar huecos</h3>
            {services.length === 0 ? (
              <p className="text-sm text-slate-600">Primero crea un servicio.</p>
            ) : (
              <SlotForm services={services} minDate={madridDateKey(now)} />
            )}
          </div>
          {slots.length === 0 ? (
            <p className={`${cardStyles} text-slate-600`}>No tienes huecos futuros publicados.</p>
          ) : (
            <ul className="space-y-2">
              {slots.map((slot) => {
                const booked = !checkSlotAvailable(slot.bookings).ok;
                const deletable = canDeleteSlot(slot.bookings);
                const client = slot.bookings.find((b) => b.status === "confirmed")?.client;
                return (
                  <li
                    key={slot.id}
                    className={`${cardStyles} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}
                  >
                    <div>
                      <p className="font-medium">
                        {formatDateTime(slot.starts_at)} – {formatTime(slot.ends_at)}
                      </p>
                      <p className="text-sm text-slate-600">{slot.service?.name}</p>
                      <p
                        className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          booked ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {booked ? `Reservado por ${client?.full_name ?? "un cliente"}` : "Libre"}
                      </p>
                    </div>
                    {deletable.ok ? (
                      <ActionButton
                        action={deleteSlot}
                        fields={{ slotId: slot.id }}
                        label="Borrar hueco"
                        pendingLabel="Borrando…"
                        variant="danger"
                      />
                    ) : (
                      <p className="max-w-56 text-xs text-slate-500">{deletable.error}</p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function LoadError({ message }: { message: string }) {
  return (
    <p role="alert" className="text-red-700">
      No se pudo cargar tu panel: {message}
    </p>
  );
}
