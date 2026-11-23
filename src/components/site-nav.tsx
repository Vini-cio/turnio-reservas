import Link from "next/link";
import { signOut } from "@/app/actions/auth";
import { ActionButton } from "@/components/action-button";
import { buttonStyles } from "@/components/styles";
import { getCurrentUser } from "@/lib/auth";

const linkStyles =
  "rounded-md px-2 py-1 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-indigo-600";

/** Enlaces de la cabecera según la sesión. Lee cookies: va dentro de `<Suspense>`. */
export async function SiteNav() {
  const user = await getCurrentUser();

  return (
    <nav aria-label="Principal" className="flex flex-wrap items-center gap-x-2 gap-y-2">
      <Link href="/#profesionales" className={linkStyles}>
        Profesionales
      </Link>
      {user?.role === "provider" && (
        <Link href="/panel" className={linkStyles}>
          Mi panel
        </Link>
      )}
      {user?.role === "client" && (
        <Link href="/mis-citas" className={linkStyles}>
          Mis citas
        </Link>
      )}
      {user ? (
        <div className="flex items-center gap-2">
          <span className="max-w-40 truncate text-sm text-slate-500" title={user.full_name}>
            {user.full_name}
          </span>
          <ActionButton action={signOut} fields={{}} label="Salir" pendingLabel="Saliendo…" />
        </div>
      ) : (
        <>
          <Link href="/login" className={linkStyles}>
            Entrar
          </Link>
          <Link href="/registro" className={buttonStyles.primary}>
            Registrarse
          </Link>
        </>
      )}
    </nav>
  );
}
