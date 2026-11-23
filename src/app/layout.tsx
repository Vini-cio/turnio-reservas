import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";
import { SiteNav } from "@/components/site-nav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Turnio — reserva citas con profesionales",
    template: "%s · Turnio",
  },
  description:
    "Turnio conecta a profesionales (peluqueros, fisios, profesores…) que publican sus huecos libres con clientes que los reservan en segundos.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-slate-50 text-slate-900">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-xl font-bold tracking-tight text-indigo-700"
            >
              <span
                aria-hidden="true"
                className="grid size-8 place-items-center rounded-lg bg-indigo-600 text-base text-white"
              >
                T
              </span>
              Turnio
            </Link>
            <Suspense fallback={<div className="h-9 w-48 rounded-lg bg-slate-100" />}>
              <SiteNav />
            </Suspense>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
        <footer className="border-t border-slate-200 bg-white">
          <p className="mx-auto max-w-5xl px-4 py-6 text-sm text-slate-500">
            Turnio · Reservas de citas sencillas para profesionales y clientes.
          </p>
        </footer>
      </body>
    </html>
  );
}
