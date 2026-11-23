# Turnio — reservas de citas

Turnio conecta a **profesionales** (peluqueros, fisios, profesores…) que publican sus huecos libres
con **clientes** que los reservan en segundos.

- Cualquiera, sin sesión, ve el listado de profesionales (`/`) y la ficha de cada uno con sus
  servicios y huecos libres (`/p/[id]`).
- Un **profesional** gestiona en `/panel` sus servicios, publica huecos (uno o varios seguidos),
  ve quién ha reservado y puede cancelar reservas.
- Un **cliente** reserva huecos y en `/mis-citas` ve sus citas próximas y pasadas y las cancela
  (hasta 2 horas antes).

Las reglas de negocio R1–R8 (ver [`CLAUDE.md`](CLAUDE.md)) se comprueban dos veces: en TypeScript
(`src/lib/rules.ts`, con tests) para dar mensajes claros, y en la base de datos
(constraints, triggers, RLS y funciones RPC en `supabase/schema.sql`) para que no se puedan saltar.

## Stack

- **Next.js 16** (App Router, Server Components, Server Actions, Cache Components) + TypeScript estricto
- **Tailwind CSS 4**
- **Supabase**: Postgres + Auth (email y contraseña) + Row Level Security
- **zod** para validar toda entrada en las Server Actions · **Vitest** para los tests
- Despliegue en **Vercel**

## Cómo se ha construido: un equipo de agentes

El proyecto lo desarrolla un pequeño equipo de agentes de IA con roles separados:

| Agente | Definición | Rol |
|---|---|---|
| Orquestador | [`CLAUDE.md`](CLAUDE.md) | Divide la especificación en tareas, las asigna, arbitra y decide cuándo algo está terminado. |
| Develop | [`.claude/agents/develop.md`](.claude/agents/develop.md) | Programa cada tarea cumpliendo las directrices. |
| Testing | [`.claude/agents/testing.md`](.claude/agents/testing.md) | Revisa el trabajo de Develop y devuelve `PASS` o `FAIL` con los fallos numerados. |

El contrato entre Develop y Testing es [`docs/DIRECTRICES.md`](docs/DIRECTRICES.md): reglas con
identificador (D1–D18) sobre calidad, seguridad, reglas de negocio, arquitectura y UX.

**Bucle Develop ↔ Testing**

1. El Orquestador entrega una tarea con criterios de aceptación a **Develop**.
2. Develop la implementa y solo puede entregarla con `npm run check` en verde.
3. **Testing** la revisa contra las directrices (ejecuta los comandos y greps automáticos y lee el
   código) y emite un informe `PASS` o `FAIL` citando directriz y `fichero:línea`.
4. Si es `FAIL`, el Orquestador reenvía el informe literal a Develop y se repite (máx. 5 rondas).
5. Con `PASS`, la ronda se registra en [`docs/AGENT_LOG.md`](docs/AGENT_LOG.md) y se pasa a la siguiente tarea.

## Puesta en marcha en local

Requisitos: Node.js 20+ y una cuenta gratuita de [Supabase](https://supabase.com).

1. **Instala dependencias**

   ```bash
   npm install
   ```

2. **Crea el proyecto en Supabase** y prepara la base de datos:
   - En *SQL Editor*, pega y ejecuta el contenido de [`supabase/schema.sql`](supabase/schema.sql).
     Es idempotente: puedes volver a ejecutarlo tras cada cambio.
     Incluye los `GRANT` explícitos mínimos para `anon` y `authenticated` (los proyectos nuevos de
     Supabase no exponen las tablas creadas por SQL sin ellos), así que no hace falta conceder nada a mano.
   - En *Authentication → Sign In / Providers → Email*, **desactiva "Confirm email"** para que el
     registro inicie sesión directamente (si lo dejas activo, la app pedirá confirmar el email).

3. **Variables de entorno**: copia `.env.example` a `.env.local` y rellénalo con los datos de
   *Project Settings → API* (URL del proyecto y clave `anon`/publishable):

   ```bash
   cp .env.example .env.local
   ```

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
   ```

   Usa **solo** la clave `anon`: la seguridad la da RLS. Nunca pongas otra clave de Supabase en la app.
   Sin estas variables la app compila y arranca, pero las páginas con datos muestran un aviso.

4. **Arranca**

   ```bash
   npm run dev
   ```

   Abre <http://localhost:3000>, regístrate como *Profesional*, crea un servicio y publica huecos;
   después regístrate (en otra ventana privada) como *Cliente* y reserva.

## Despliegue en Vercel

1. Importa el repositorio en Vercel (framework: Next.js, sin cambios en los comandos).
2. En *Settings → Environment Variables* añade, para *Production* y *Preview*:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Despliega. En Supabase, en *Authentication → URL Configuration*, pon la URL de producción
   como *Site URL*.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` / `npm start` | Build de producción y servidor |
| `npm run lint` | ESLint |
| `npm run typecheck` | Genera los tipos de rutas (`next typegen`) y ejecuta `tsc --noEmit` |
| `npm test` | Tests unitarios (Vitest): reglas R1–R8, formato, zona horaria y traducción de errores |
| `npm run check` | Todo lo anterior: lint + typecheck + test + build (debe estar en verde) |

## Estructura

```
src/
  app/                 páginas (/, /login, /registro, /p/[id], /panel, /mis-citas) y Server Actions
  components/          UI compartida (cabecera, botones de acción, mensajes de formulario…)
  lib/
    rules.ts           reglas de negocio R1–R8 como funciones puras
    errors.ts          traducción de errores de Postgres/Supabase al español
    format.ts, time.ts formato es-ES y conversión de la hora de Madrid
    auth.ts            usuario de la sesión y comprobaciones de rol
    supabase/          cliente de Supabase para el servidor
  proxy.ts             refresco de la sesión de Supabase
supabase/schema.sql    tablas, RLS, triggers y funciones RPC
```
