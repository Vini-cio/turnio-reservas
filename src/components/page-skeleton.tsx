/** Fallback de `<Suspense>` mientras se cargan los datos de la página. */
export function PageSkeleton({ label = "Cargando…" }: { label?: string }) {
  return (
    <div className="animate-pulse space-y-3" aria-busy="true">
      <p className="sr-only">{label}</p>
      <div className="h-8 w-1/2 rounded-lg bg-slate-200" />
      <div className="h-24 rounded-2xl bg-slate-100" />
      <div className="h-24 rounded-2xl bg-slate-100" />
    </div>
  );
}
