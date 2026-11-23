# DIRECTRICES — contrato que Develop debe cumplir y Testing verifica

Cada directriz tiene un identificador. Testing cita estos IDs en sus informes.

## Calidad y build
- **D1.** `npm run check` (lint + typecheck + test + build) termina sin errores ni warnings de lint.
- **D2.** TypeScript estricto: prohibido `any`, `@ts-ignore`, `@ts-expect-error` y `as unknown as`.
- **D3.** Sin `console.log`, código comentado ni ficheros/exports sin usar.

## Seguridad
- **D4.** Ningún secreto en el repositorio. Solo `NEXT_PUBLIC_SUPABASE_URL` y
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` desde `process.env`. Nunca `service_role`. `.env.example` sin valores reales.
- **D5.** RLS activado en **todas** las tablas, con políticas explícitas por operación.
  Un usuario solo puede modificar sus propios datos.
- **D6.** Las páginas privadas (`/panel`, `/mis-citas`) comprueban la sesión **en el servidor**
  y redirigen a `/login` si no hay usuario. El panel también comprueba `role = 'provider'`.
- **D7.** Toda Server Action valida su entrada con **zod** y comprueba el usuario antes de escribir.
  Nunca se confía en IDs de usuario que vengan del cliente.

## Reglas de negocio
- **D8.** Las reglas R1–R8 (ver `CLAUDE.md`) están implementadas como funciones puras en
  `src/lib/rules.ts` que reciben `now: Date` por parámetro.
- **D9.** Cada regla R1–R8 tiene al menos un test de caso válido, uno inválido y, si aplica,
  uno de límite en `src/lib/rules.test.ts`.
- **D10.** Las reglas también las impone la BD (constraint, trigger, RLS o RPC en
  `supabase/schema.sql`). Reservar y cancelar se hacen con RPC atómicas.
- **D11.** `supabase/schema.sql` es idempotente: se puede ejecutar dos veces sin error.

## Arquitectura Next.js
- **D12.** Server Components por defecto; `"use client"` solo en componentes con estado o eventos.
- **D13.** Mutaciones vía Server Actions (`"use server"`) seguidas de `revalidatePath` o `redirect`.
- **D14.** APIs de esta versión de Next (16): `proxy.ts` en lugar de `middleware.ts`;
  `params`, `searchParams` y `cookies()` se usan con `await`.

## UX
- **D15.** Interfaz en español. Fechas y precios formateados con `Intl` en `es-ES`
  (zona `Europe/Madrid`).
- **D16.** Todo formulario muestra los errores de validación y de servidor al usuario
  (nunca falla en silencio) y deshabilita el botón mientras envía.
- **D17.** Inputs con `<label>`; usable a 375 px sin scroll horizontal; estados vacíos con mensaje.
- **D18.** Las páginas públicas (`/`, `/p/[id]`, `/login`, `/registro`) funcionan sin sesión.

## Comprobaciones automáticas que Testing ejecuta

```bash
npm run lint && npm run typecheck && npm test && npm run build
grep -rnE "service_role|eyJhbGci|sb_secret_" --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=docs --exclude-dir=.claude --exclude-dir=.git . # D4: debe salir vacío
grep -rnE ":\s*any\b|as any|@ts-ignore|@ts-expect-error|as unknown as" src            # D2: vacío
grep -rn "console.log" src                                                               # D3: vacío
test ! -e src/middleware.ts                                                              # D14
grep -c "enable row level security" supabase/schema.sql                                  # D5: = nº de tablas
```
