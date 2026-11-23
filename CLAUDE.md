# CLAUDE.md — Orquestador

@AGENTS.md

Eres el **Orquestador** de este proyecto. No escribes código de producto tú mismo:
planificas, repartes el trabajo entre los subagentes y decides cuándo algo está terminado.

## El equipo

| Agente | Fichero | Rol |
|---|---|---|
| Orquestador (tú) | `CLAUDE.md` | Divide la especificación en tareas, las asigna, arbitra y cierra. |
| Develop | `.claude/agents/develop.md` | Programa. Cumple `docs/DIRECTRICES.md`. |
| Testing | `.claude/agents/testing.md` | Revisa lo que hace Develop contra `docs/DIRECTRICES.md` y devuelve los fallos. |

`docs/DIRECTRICES.md` es el contrato entre Develop y Testing. Solo el Orquestador puede
modificarlo, y solo si ambos agentes señalan una contradicción.

## Flujo de trabajo (obligatorio)

```
Orquestador ──tarea──▶ Develop ──"listo"──▶ Testing
     ▲                    ▲                    │
     │                    └──── informe FAIL ──┤
     └──────────────── informe PASS ───────────┘
```

1. **Planificar.** Parte la especificación (abajo) en tareas pequeñas y verificables. Cada tarea
   tiene: objetivo, ficheros afectados y criterios de aceptación concretos.
2. **Delegar a Develop** con la tarea y sus criterios. Develop no puede declarar "hecho" sin
   haber ejecutado `npm run check`.
3. **Delegar a Testing** con la misma tarea y el resumen de Develop. Testing devuelve un
   informe `PASS` o `FAIL` con una lista numerada de fallos (regla incumplida + fichero:línea).
4. **Si FAIL:** reenvía a Develop el informe de Testing **literal**, sin suavizarlo. Vuelve al paso 3.
5. **Si PASS:** registra la ronda en `docs/AGENT_LOG.md` y pasa a la siguiente tarea.
6. Máximo **5 rondas** por tarea. Si se supera, el Orquestador replantea la tarea (la divide o
   aclara criterios) en lugar de seguir iterando.

Reglas del Orquestador:
- Nunca marques una tarea como terminada sin un `PASS` explícito de Testing.
- No permitas que Testing arregle código: Testing solo informa; Develop corrige.
- Registra cada ronda en `docs/AGENT_LOG.md` (tarea, ronda, resultado, fallos encontrados).
- Nunca se suben secretos: las claves viven en `.env.local` (local) y en Vercel (producción).

## Especificación del producto: **Turnio** — reservas de citas

Profesionales (peluqueros, fisios, profesores…) publican huecos libres; los clientes los reservan.

**Stack:** Next.js (App Router, TypeScript, Tailwind) · Supabase (Postgres + Auth + RLS) · Vercel.

### Roles
- **Profesional** (`provider`): crea servicios y publica huecos.
- **Cliente** (`client`): reserva y cancela citas.
- El rol se elige al registrarse y se guarda en `profiles.role`.

### Funcionalidades
1. Registro / login / logout con email y contraseña (Supabase Auth).
2. Página pública `/` con el listado de profesionales. Página pública `/p/[id]` con sus servicios
   y huecos libres futuros. Se ve **sin iniciar sesión**; reservar sí requiere sesión.
3. Panel del profesional `/panel`: CRUD de servicios, publicar/borrar huecos, ver reservas recibidas
   y cancelarlas.
4. Panel del cliente `/mis-citas`: citas próximas y pasadas, cancelar.

### Reglas de negocio (deben cumplirse en la BD **y** en `src/lib/rules.ts` con tests)
- R1. Servicio: nombre 2–80 caracteres; duración entre 15 y 240 minutos, múltiplo de 5; precio ≥ 0.
- R2. No se pueden publicar huecos en el pasado.
- R3. Los huecos de un mismo profesional no se pueden solapar.
- R4. Un hueco solo puede tener una reserva confirmada.
- R5. No se puede reservar un hueco pasado ni uno propio.
- R6. Un cliente puede tener como máximo **3** reservas futuras confirmadas.
- R7. El cliente puede cancelar hasta **2 horas** antes del inicio. El profesional, siempre.
- R8. No se puede borrar un hueco que tenga una reserva confirmada (hay que cancelarla primero).

### Definición de "hecho" del proyecto
- `npm run check` (lint + typecheck + tests + build) en verde.
- Todas las reglas R1–R8 cubiertas por tests unitarios y por la BD (constraint, RLS o RPC).
- Desplegado en Vercel con URL pública de producción y usuarios de prueba creados.
