import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { cardStyles } from "@/components/styles";
import { safeNextPath } from "@/lib/redirect";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <div className={`${cardStyles} mx-auto max-w-md`}>
      <h1 className="text-2xl font-bold tracking-tight">Entrar</h1>
      <p className="mt-1 text-sm text-slate-600">
        ¿No tienes cuenta?{" "}
        <Link href="/registro" className="font-medium text-indigo-700 underline">
          Regístrate
        </Link>
      </p>
      <div className="mt-6">
        <Suspense fallback={<LoginForm next="" />}>
          <LoginFormWithNext searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

async function LoginFormWithNext({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const { next } = await searchParams;
  return <LoginForm next={(typeof next === "string" && safeNextPath(next)) || ""} />;
}
