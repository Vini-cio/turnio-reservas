import Link from "next/link";
import { Suspense } from "react";
import { MissingEnv } from "@/components/missing-env";
import { PageSkeleton } from "@/components/page-skeleton";
import { cardStyles } from "@/components/styles";
import { toSpanishError } from "@/lib/errors";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";

export default function HomePage() {
  return (
    <div className="space-y-12">
      <section className="rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 px-6 py-12 text-white sm:px-10">
        <h1 className="max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
          Reserva tu próxima cita en segundos
        </h1>
        <p className="mt-4 max-w-2xl text-indigo-100">
          Los profesionales publican sus huecos libres y tú eliges el que mejor te viene. Sin
          llamadas ni esperas: elige profesional, escoge hora y listo.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="#profesionales"
            className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"
          >
            Ver profesionales
          </Link>
          <Link
            href="/registro"
            className="rounded-lg border border-white/40 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
          >
            Soy profesional
          </Link>
        </div>
      </section>

      <section id="profesionales" aria-labelledby="profesionales-titulo" className="scroll-mt-6">
        <h2 id="profesionales-titulo" className="text-2xl font-bold tracking-tight">
          Profesionales
        </h2>
        <div className="mt-4">
          <Suspense fallback={<PageSkeleton label="Cargando profesionales…" />}>
            <ProviderList />
          </Suspense>
        </div>
      </section>
    </div>
  );
}

async function ProviderList() {
  if (!(await hasSupabaseEnv())) return <MissingEnv />;

  const supabase = await createClient();
  const { data: providers, error } = await supabase
    .from("profiles")
    .select("id, full_name, services(count)")
    .eq("role", "provider")
    .order("full_name");

  if (error) {
    return (
      <p role="alert" className="text-red-700">
        No se pudo cargar el listado: {toSpanishError(error)}
      </p>
    );
  }
  if (providers.length === 0) {
    return (
      <p className={`${cardStyles} text-slate-600`}>
        Todavía no hay profesionales. ¿Eres uno?{" "}
        <Link href="/registro" className="font-medium text-indigo-700 underline">
          Regístrate y publica tus huecos
        </Link>
        .
      </p>
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {providers.map((provider) => {
        const serviceCount = provider.services[0]?.count ?? 0;
        return (
          <li key={provider.id}>
            <Link
              href={`/p/${provider.id}`}
              className={`${cardStyles} block h-full transition hover:border-indigo-300 hover:shadow-md focus-visible:outline-2 focus-visible:outline-indigo-600`}
            >
              <p className="text-lg font-semibold">{provider.full_name}</p>
              <p className="mt-1 text-sm text-slate-600">
                {serviceCount === 1 ? "1 servicio" : `${serviceCount} servicios`}
              </p>
              <p className="mt-4 text-sm font-medium text-indigo-700">Ver huecos libres →</p>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
