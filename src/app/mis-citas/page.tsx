import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { cancelBooking } from "@/app/actions/bookings";
import { ActionButton } from "@/components/action-button";
import { MissingEnv } from "@/components/missing-env";
import { PageSkeleton } from "@/components/page-skeleton";
import { cardStyles } from "@/components/styles";
import { requirePageUser, type CurrentUser } from "@/lib/auth";
import { toSpanishError } from "@/lib/errors";
import { formatDateTime, formatPrice } from "@/lib/format";
import { canCancelBooking } from "@/lib/rules";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";
import type { BookingStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Mis citas" };

export default function MyBookingsPage({ searchParams }: PageProps<"/mis-citas">) {
  return (
    <Suspense fallback={<PageSkeleton label="Cargando tus citas…" />}>
      <MyBookings searchParams={searchParams} />
    </Suspense>
  );
}

type Appointment = {
  id: string;
  status: BookingStatus;
  startsAt: Date;
  providerId: string;
  providerName: string;
  serviceName: string;
  priceCents: number;
};

async function MyBookings({ searchParams }: Pick<PageProps<"/mis-citas">, "searchParams">) {
  if (!(await hasSupabaseEnv())) return <MissingEnv />;
  const user = await requirePageUser("client", "/mis-citas");
  const { reservada } = await searchParams;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select(
      "id, status, slot:slots(starts_at, provider_id, service:services(name, price_cents), provider:profiles(full_name))",
    )
    .eq("client_id", user.id);
  if (error) {
    return (
      <p role="alert" className="text-red-700">
        No se pudieron cargar tus citas: {toSpanishError(error)}
      </p>
    );
  }

  const now = new Date();
  const appointments: Appointment[] = data
    .flatMap((booking) =>
      booking.slot
        ? [
            {
              id: booking.id,
              status: booking.status,
              startsAt: new Date(booking.slot.starts_at),
              providerId: booking.slot.provider_id,
              providerName: booking.slot.provider?.full_name ?? "Profesional",
              serviceName: booking.slot.service?.name ?? "Servicio",
              priceCents: booking.slot.service?.price_cents ?? 0,
            },
          ]
        : [],
    )
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  const upcoming = appointments.filter((a) => a.startsAt.getTime() > now.getTime());
  const past = appointments.filter((a) => a.startsAt.getTime() <= now.getTime()).reverse();

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Mis citas</h1>
        <p className="mt-1 text-slate-600">Puedes cancelar una cita hasta 2 horas antes de que empiece.</p>
      </header>
      {reservada === "1" && (
        <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          ¡Reserva confirmada! La tienes en tus próximas citas.
        </p>
      )}

      <section aria-labelledby="proximas" className="space-y-3">
        <h2 id="proximas" className="text-xl font-semibold">
          Próximas
        </h2>
        {upcoming.length === 0 ? (
          <p className={`${cardStyles} text-slate-600`}>
            No tienes citas próximas.{" "}
            <Link href="/#profesionales" className="font-medium text-indigo-700 underline">
              Busca un profesional
            </Link>
            .
          </p>
        ) : (
          <AppointmentList appointments={upcoming} user={user} now={now} />
        )}
      </section>

      <section aria-labelledby="pasadas" className="space-y-3">
        <h2 id="pasadas" className="text-xl font-semibold">
          Pasadas
        </h2>
        {past.length === 0 ? (
          <p className={`${cardStyles} text-slate-600`}>Aún no tienes citas pasadas.</p>
        ) : (
          <AppointmentList appointments={past} user={user} now={now} />
        )}
      </section>
    </div>
  );
}

function AppointmentList({
  appointments,
  user,
  now,
}: {
  appointments: Appointment[];
  user: CurrentUser;
  now: Date;
}) {
  return (
    <ul className="space-y-2">
      {appointments.map((appointment) => {
        const confirmed = appointment.status === "confirmed";
        const cancellable =
          confirmed &&
          canCancelBooking(
            {
              startsAt: appointment.startsAt,
              clientId: user.id,
              providerId: appointment.providerId,
            },
            user.id,
            now,
          ).ok;
        return (
          <li
            key={appointment.id}
            className={`${cardStyles} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}
          >
            <div>
              <p className="font-medium">{formatDateTime(appointment.startsAt)}</p>
              <p className="text-sm text-slate-600">
                <Link href={`/p/${appointment.providerId}`} className="underline">
                  {appointment.providerName}
                </Link>{" "}
                · {appointment.serviceName} · {formatPrice(appointment.priceCents)}
              </p>
              <p
                className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                  confirmed ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"
                }`}
              >
                {confirmed ? "Confirmada" : "Cancelada"}
              </p>
            </div>
            {cancellable && (
              <ActionButton
                action={cancelBooking}
                fields={{ bookingId: appointment.id }}
                label="Cancelar cita"
                pendingLabel="Cancelando…"
                variant="danger"
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}
