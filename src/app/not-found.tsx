import Link from "next/link";
import { cardStyles } from "@/components/styles";

export default function NotFound() {
  return (
    <div className={`${cardStyles} mx-auto max-w-md text-center`}>
      <h1 className="text-2xl font-bold tracking-tight">Página no encontrada</h1>
      <p className="mt-2 text-slate-600">
        Lo que buscas no existe o ya no está disponible.
      </p>
      <Link href="/" className="mt-4 inline-block font-medium text-indigo-700 underline">
        Volver al inicio
      </Link>
    </div>
  );
}
