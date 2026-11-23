import type { Metadata } from "next";
import Link from "next/link";
import { cardStyles } from "@/components/styles";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function RegisterPage() {
  return (
    <div className={`${cardStyles} mx-auto max-w-md`}>
      <h1 className="text-2xl font-bold tracking-tight">Crear cuenta</h1>
      <p className="mt-1 text-sm text-slate-600">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-medium text-indigo-700 underline">
          Entra
        </Link>
      </p>
      <div className="mt-6">
        <RegisterForm />
      </div>
    </div>
  );
}
