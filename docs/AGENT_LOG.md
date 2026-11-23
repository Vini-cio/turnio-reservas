# AGENT_LOG — registro de rondas Orquestador → Develop → Testing

| Tarea | Ronda | Agente | Resultado | Fallos / notas |
|---|---|---|---|---|
| T1 Base (schema, reglas, clientes Supabase, proxy) | 1 | Develop | Entregado | 11 ficheros; 35 tests; señala que el grep D4 se autodetecta en DIRECTRICES |
| T1 | 1 | Orquestador | Ajuste | Grep D4 excluye docs/, .claude/, .git/ |
| T1 | 1 | Testing | **PASS** | 0 fallos. Verificó schema en Postgres 16 local (idempotencia, R1–R8, RLS, concurrencia R4/R6). Observaciones → criterios de T2: traducir 23P01/23514, duración de servicio con huecos, exports sin uso |
| T2 UI y flujos (auth, públicas, panel, mis-citas, errores, README) | 1 | Develop | Entregado | 52 tests; duración no editable impuesta en BD (TUS01); proxy fuerza 404 real en /p/<no-uuid> |
| T2 | 1 | Testing | **FAIL** | 1. [D7] Open redirect en `safeNextPath`: `/\evil.com` y `/<TAB>/evil.com` redirigen fuera. Observaciones: deleteService da éxito falso con 0 filas; R8 bloquea borrar servicios con citas pasadas; prop `disabled` muerta; comentario de plantilla en next.config |
| T2 | 1 | Orquestador | Decisión | Se reenvía el FAIL literal. Además: arreglar deleteService (éxito falso), eliminar código muerto. R8 se mantiene para el historial (no se borran servicios con citas pasadas) pero el mensaje debe explicarlo sin pedir "cancelar" |
| T2 | 2 | Develop | Entregado | Fallo 1 → `src/lib/redirect.ts` lista blanca + tests; a) deleteService exige 1 fila; b) `canDeleteService` con mensajes futuro/historial + tests; c) código muerto eliminado; d) aviso R6 no oculta errores. 59 tests |
| T2 | 2 | Testing | **PASS** | 0 fallos. Reprodujo el ataque de open redirect con servidor real: neutralizado. Revisión completa de criterios 1–11 y D1–D18 |
| Integración con Supabase real | – | Orquestador | **FAIL** (prueba E2E) | `permission denied` en todas las tablas: el proyecto Supabase nuevo no concede privilegios por defecto; el stub local de Testing sí los simulaba. Se añade D19 y se abre T3 |
| T3 GRANTs explícitos (D19) | 1 | Develop | Entregado | Sección de privilegios mínimos por tabla/rol; `is_my_client()` para que anon pueda leer profiles sin tocar bookings |
| T3 | 1 | Testing | **PASS** | 0 fallos. Verificado en Postgres sin privilegios por defecto, schema ejecutado 3 veces, matriz anon/provider/client/otro client. Observación: update de services podría ser por columnas |
