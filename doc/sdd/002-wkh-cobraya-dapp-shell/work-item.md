# Work Item — [WKH-COBRAYA-DAPP-SHELL] Cobraya Mobile DApp Shell

## Resumen

Transformar Cobraya de un demo de hackathon en una DApp mobile produccion-grade adoptando el patron probado de Luma AI: Supabase auth (LUM-100 demo mode), tabla `profiles` con campos PyME, tabla `settled_invoices` para historial cross-session, route groups `(auth)`/`(app)`, mobile chrome con BottomTabs + TopNav, wizard de onboarding de 5 pasos, dashboard con stats, y refactor del flow `/demo` al tab Negociar dentro del chrome. La palette visual migra de blanco/verde a cream/burgundy (luma-50..700). El engine (4 agentes + settle + audit trail) queda intocable.

---

## Sizing

- **SDD_MODE**: full
- **Clasificacion NexusAgil**: QUALITY (auth + DB + RLS + cross-cutting design, 13 waves, ≥15 archivos nuevos, ≥15 ACs, impacto en layout root)
- **Estimacion dev**: L (8-10h dev + 2h AR/CR/F4 = ~12h total)
- **Branch sugerido**: `feat/wkh-cobraya-dapp-shell` desde `main` (commit `70f0d7d`)

---

## Acceptance Criteria (EARS)

### Auth y sesion

**AC-1** (Event-driven — W3/W4):
WHEN un usuario anonimo accede a cualquier ruta bajo `/(app)/*`, THEN el middleware SHALL redirigir a `/login` con HTTP 307, preservando las cookies de sesion Supabase en la respuesta de redirect.

**AC-2** (Event-driven — W4):
WHEN un usuario autenticado con `profiles.onboarding_completed = false` accede a cualquier ruta bajo `/(app)/*` excepto `/onboarding`, THEN el middleware SHALL redirigir a `/onboarding/step/1` con HTTP 307.

**AC-3** (Event-driven — W3):
WHEN un usuario autenticado accede a `/(auth)/login` o `/(auth)/signup`, THEN el middleware SHALL redirigir a `/dashboard` (si `onboarding_completed = true`) o a `/onboarding/step/1` (si `false`) con HTTP 307.

**AC-4** (Event-driven — W3, LUM-100):
WHEN un usuario completa el formulario de signup con email valido y password >= 8 caracteres con al menos 1 numero, THEN el sistema SHALL crear la sesion de Supabase de forma inmediata (mailer_autoconfirm ON), establecer las cookies de auth, y redirigir a `/onboarding/step/1` sin paso de confirmacion por email.

**AC-5** (Event-driven — W3):
WHEN un usuario ejecuta signOut, THEN el sistema SHALL invalidar la sesion de Supabase, limpiar las cookies, revalidar el path `/` (layout), y redirigir a `/login`.

### Onboarding wizard

**AC-6** (Event-driven — W6):
WHEN un usuario completa el paso 5 del wizard de onboarding (mayor frustracion cobrando), THEN el sistema SHALL persistir `profiles.onboarding_completed = true` en Supabase via Server Action, y redirigir a `/dashboard`.

**AC-7** (Unwanted — W6):
IF un usuario intenta acceder a `/onboarding/step/N` donde N > primer_paso_incompleto, THEN el sistema SHALL redirigir a `/onboarding/step/{primer_paso_incompleto}` para prevenir saltar pasos.

**AC-8** (State-driven — W6):
WHILE el usuario navega entre pasos del wizard 1-5, el sistema SHALL mostrar un componente ProgressDots con N puntos donde el punto actual esta activo (luma-700) y los anteriores completados (luma-400), sin recargar la pagina.

### Dashboard

**AC-9** (State-driven — W7):
WHILE el usuario esta en `/dashboard`, el sistema SHALL mostrar: (a) greeting con nombre derivado de `user.email` antes del `@`, (b) 4 stats cards (facturas negociadas, monto total USDC, ahorros vs 30-dias, dias con Cobraya), (c) preview de campos PyME del perfil, (d) lista de las 5 facturas mas recientes de `settled_invoices` del usuario.

### Negociar (refactor demo)

**AC-10** (State-driven — W8):
WHILE el usuario esta en `/(app)/negociar`, el sistema SHALL renderizar el mismo flow de 4 agentes + auction + settle que el actual `/demo/page.tsx`, dentro del chrome (TopNav + BottomTabs), sin modificar ninguna logica de llamada a los API routes del engine.

**AC-11** (Event-driven — W8/W9):
WHEN el settle de una factura retorna `txHash` valido desde `/api/settle`, THEN el sistema SHALL llamar al Server Action `recordSettlement` que inserta una fila en `settled_invoices` con: `user_id = auth.uid()`, `uuid_cfdi`, `amount_mxn`, `net_amount_usdc`, `lender_name`, `tx_hash`, `request_id`, `settled_at = NOW()`.

### Historial

**AC-12** (State-driven — W9):
WHILE el usuario esta en `/(app)/historial`, el sistema SHALL mostrar unicamente las filas de `settled_invoices` donde `user_id = auth.uid()`, ordenadas por `settled_at DESC`. La RLS de Supabase SHALL rechazar cualquier query que intente leer filas de otro usuario.

**AC-13** (Unwanted — RLS):
IF un usuario A realiza una query directa a `settled_invoices` sin el filtro `user_id = auth.uid()`, THEN la politica RLS de Postgres SHALL denegar el acceso y retornar 0 filas (politica `FOR SELECT USING (auth.uid() = user_id)`).

### Perfil

**AC-14** (Event-driven — W10):
WHEN el usuario edita campos en `/(app)/perfil` (RFC, sector, anchor buyers, monto tipico, frustracion) y guarda, THEN el Server Action `updateProfile` SHALL hacer upsert en `profiles` usando `auth.uid()` como filtro, y el campo `updated_at` SHALL reflejar el timestamp del servidor.

### Diseño y mobile chrome

**AC-15** (Ubiquitous — W1/W2/W5):
The system SHALL renderizar BottomTabs con 4 tabs (Inicio, Negociar, Historial, Perfil) fijos en la parte inferior del viewport mobile, con `padding-bottom: env(safe-area-inset-bottom)` y touch targets de al menos 48px de altura. Los BottomTabs SHALL ocultarse en rutas `/(auth)/*`, `/` (splash) y `/(app)/onboarding/*`.

**AC-16** (Ubiquitous — W1/W2):
The system SHALL aplicar la palette luma-{50..700} via CSS custom properties en `globals.css` y las clases Tailwind extendidas en `tailwind.config.ts`, con cream (`luma-50 #FCF7F3`) como fondo base de pantallas app y burgundy (`luma-700 #5B0426`) como color primario de navegacion y headings.

**AC-17** (Ubiquitous — W0/W11):
The system SHALL servir el manifest PWA con `theme_color` actualizado a `#651332` (burgundy luma-600) e iconos regenerados en palette burgundy para reemplazar los actuales (verde Avalanche).

### Seguridad y constraints

**AC-18** (Ubiquitous — CD-24):
The system SHALL leer `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` exclusivamente desde variables de entorno. Ningun valor de URL o key SHALL estar hardcodeado en ningun archivo de `src/`.

---

## Scope IN

### Archivos nuevos a crear

```
src/middleware.ts                                        ← port de luma proxy.ts, adaptado a Next 14
src/lib/supabase/client.ts                              ← createBrowserClient (port Luma)
src/lib/supabase/server.ts                              ← createServerClient sync cookies (Next 14)
src/lib/validation/auth.ts                              ← loginSchema + signupSchema (Zod)
src/lib/validation/profile.ts                           ← profileSchema (Zod, campos PyME)
src/actions/auth.ts                                     ← signUp (LUM-100) + signIn + signOut
src/actions/profile.ts                                  ← saveOnboarding + updateProfile
src/actions/settlement.ts                               ← recordSettlement
src/app/(auth)/layout.tsx                               ← layout minimo para auth screens
src/app/(auth)/login/page.tsx                           ← auth-card cream sobre burgundy bg
src/app/(auth)/signup/page.tsx                          ← LUM-100 instant signup
src/app/(app)/layout.tsx                                ← TopNav + BottomTabs wrapper
src/app/(app)/dashboard/page.tsx                        ← greeting + 4 stats + perfil preview + recientes
src/app/(app)/onboarding/layout.tsx                     ← layout wizard (sin BottomTabs)
src/app/(app)/onboarding/step/[step]/page.tsx           ← 5 steps dinamicos
src/app/(app)/negociar/page.tsx                         ← refactor de src/app/demo/page.tsx
src/app/(app)/historial/page.tsx                        ← lista settled_invoices del user
src/app/(app)/perfil/page.tsx                           ← edit fields + signOut
src/components/nav/BottomTabs.tsx                       ← port Luma (4 tabs Cobraya)
src/components/nav/TopNav.tsx                           ← port Luma (gradient burgundy + wordmark)
src/components/ui/button.tsx                            ← CVA port Luma
src/components/ui/input.tsx                             ← port Luma
src/components/ui/label.tsx                             ← port Luma
src/components/ui/card.tsx                              ← bb-card variant para Cobraya
src/components/onboarding/ProgressDots.tsx              ← 5 dots wizard indicator
src/components/onboarding/step1-form.tsx                ← RFC
src/components/onboarding/step2-form.tsx                ← Sector
src/components/onboarding/step3-form.tsx                ← Anchor buyers
src/components/onboarding/step4-form.tsx                ← Monto tipico
src/components/onboarding/step5-form.tsx                ← Mayor frustracion cobrando
src/components/auth/login-form.tsx                      ← useActionState + loginSchema
src/components/auth/signup-form.tsx                     ← useActionState + signupSchema
supabase/migrations/001_profiles.sql                    ← tabla profiles campos PyME + RLS + trigger
supabase/migrations/002_settled_invoices.sql            ← tabla settled_invoices + RLS
```

### Archivos a modificar

```
src/app/layout.tsx          ← añadir @supabase/ssr context provider si necesario; actualizar themeColor a burgundy; mantener RegisterSW/InstallPrompt
src/app/page.tsx            ← reemplazar hero actual con Splash burgundy radial + wordmark + CTA "Comenzar"
src/app/globals.css         ← ampliar con CSS custom properties luma-* (port globals.css Luma); conservar clases .serif .mono existentes
tailwind.config.ts          ← agregar colors.luma palette; agregar tailwindcss-animate plugin; conservar ink/paper/accent/muted/line existentes
package.json                ← agregar @supabase/supabase-js, @supabase/ssr, class-variance-authority, clsx, tailwind-merge
```

### Archivos de restyling permitido (NO logica)

```
src/components/InvoiceCard.tsx           ← clases Tailwind pueden usar palette luma; NO tocar logica
src/components/LenderAuctionPanel.tsx    ← mismo
src/components/Settlement.tsx            ← mismo
src/components/AuditPanel.tsx            ← mismo
src/components/BrandIcon.tsx             ← actualizar SVG/color a burgundy palette si necesario
```

---

## Scope OUT (PROHIBIDO TOCAR)

### Engine — modificacion equivale a escalation trigger (CD-30)

```
src/app/api/agents/cobraya-cfdi-validator/invoke/route.ts
src/app/api/agents/cobraya-fraud-detector/invoke/route.ts
src/app/api/agents/cobraya-credit-scorer/invoke/route.ts
src/app/api/agents/cobraya-lender-matcher/invoke/route.ts
src/app/api/settle/route.ts
src/app/api/scan-invoice/route.ts
src/app/api/match/route.ts
src/app/api/validate/route.ts
src/app/api/score/route.ts
src/app/api/marketplace/route.ts
src/infra/eip3009-signer.ts
src/infra/facilitator-client.ts
src/infra/agent-signer.ts
src/lib/audit-trail-composer.ts
src/core/** (directorio completo)
contracts/** (directorio completo)
src/components/InvoiceScanner.tsx        ← NO tocar logica; solo restyling permitido segun Scope IN arriba
src/components/PipelineProgress.tsx      ← idem
src/components/TraceConsole.tsx          ← NO tocar
```

### Otras exclusiones

- Wallet connect / wallet UI — diferenciador "PyME sin wallet" se mantiene
- PKCE flow / email confirmation — LUM-100 mode (autoconfirm ON) es el unico modo soportado
- Dark mode toggle — no se porta desde Luma (out of scope para hackathon)
- NextAuth / Auth.js — fuera de consideracion, se usa Supabase
- API routes adicionales para auth/profile — todo via Server Actions
- i18n library (next-intl, etc.) — ES-MX es implicito en la copy, no se usa runtime i18n
- Tests de integracion contra Supabase real — solo mocks en vitest (CD-29)

---

## Decisiones Tecnicas

**DT-A — Auth: Supabase sobre NextAuth**
Supabase provee auth + DB en un solo servicio. NextAuth requeriria un DB adapter separado o JWT-only sin persistencia de perfil. Con Supabase, `profiles` y `settled_invoices` viven en el mismo proyecto, las politicas RLS son nativas de Postgres, y el flujo LUM-100 (mailer_autoconfirm) esta soportado via Management API. Decision cerrada por Fernando.

**DT-B — LUM-100 mode: autoconfirm ON en Supabase**
Para el hackathon, el usuario debe poder registrarse y usar la app en el mismo flujo sin interrupciones de email. `mailer_autoconfirm: true` en Supabase Auth config hace que `supabase.auth.signUp()` devuelva una sesion autenticada inmediatamente. El `emailRedirectTo` se mantiene como fallback en caso de que se deshabilite autoconfirm en produccion. Decision bloqueada por Fernando — no re-preguntar.

**DT-C — Server Actions sobre API routes para auth/profile**
Los API routes ya estan ocupados por el Engine. Agregar routes de auth crearia confusion de responsabilidades. Los Server Actions de Next.js 14 (marcados con `'use server'`) corren en el servidor, tienen acceso a cookies, y pueden hacer redirect directamente — mismo patron que Luma. Alineado con CD-20.

**DT-D — Palette burgundy full port (no hybrid)**
Un port hibrido donde coexistan verde/rojo (actual) y burgundy crea inconsistencia visual que erosiona la percepcion de producto terminado. La palette Luma (cream + burgundy) da presencia premium. El verde Avalanche/emerald se reserva para success states onchain (consistent con el significado semantico: "transaccion exitosa en blockchain"). Decision cerrada por Fernando.

**DT-E — Next.js 14 sync cookies() vs Luma async**
Luma usa Next.js 16 donde `cookies()` devuelve una Promise y requiere `await`. En Next.js 14, `cookies()` es sincrono. En `src/lib/supabase/server.ts`, la funcion `createClient` NO debe ser `async` y NO debe hacer `await cookies()`. El `cookieStore = cookies()` es directo. Esta diferencia es la principal fuente potencial de bugs durante el port — documentada aqui para que el Architect la enfatice en el Story File.

**DT-F — middleware.ts (no proxy.ts)**
Luma usa `src/proxy.ts` porque Next.js 16 cambio el mecanismo de middleware. Next.js 14 espera el archivo en `src/middleware.ts` (o `middleware.ts` en raiz). El archivo debe exportar una funcion `default` (o llamada `middleware`) y un objeto `config` con `matcher`. El port adapta la logica de `proxy.ts` de Luma directamente a esta convencion.

**DT-G — Supabase anon key con RLS (no service role)**
El cliente browser (`createBrowserClient`) y el cliente server (`createServerClient`) usan `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Las politicas RLS de Postgres son la linea de defensa para `profiles` y `settled_invoices` — `auth.uid() = id` para profiles, `auth.uid() = user_id` para settled_invoices. No se expone `SUPABASE_SERVICE_ROLE_KEY` al frontend ni a Server Actions de usuario final.

**DT-H — Waves W1+W2 pueden paralelizarse con W0**
El setup de Supabase (W0) es bloqueante para W3+ (auth foundation). Pero W1 (tokens CSS) y W2 (UI primitives) son independientes del backend — no requieren Supabase. Se pueden ejecutar en paralelo con W0 si hay dos developers disponibles. Documentado en Analisis de Paralelismo.

**DT-I — settled_invoices tabla separada (no campo en profiles)**
El historial de facturas es N filas por usuario. Guardar un array JSON en `profiles` romperia la normalidad y dificultaria queries (filtros por fecha, amount, etc.). Tabla separada con FK a `auth.users` permite queries eficientes, paginacion, y RLS granular.

**DT-J — recordSettlement como Server Action (no fetch a /api/settle)**
El `/api/settle` ya es el endpoint del engine. Despues de que el cliente llama a `/api/settle` y recibe el txHash, registrar ese settle en Supabase es una operacion de persistencia de UI — no de engine. Un Server Action `recordSettlement` en `src/actions/settlement.ts` mantiene la separacion de responsabilidades y tiene acceso directo al cliente Supabase server sin round-trip HTTP adicional.

**DT-K — onboarding como route group (app)/onboarding separado de (app)/*  con BottomTabs**
El wizard de onboarding no debe mostrar BottomTabs (el usuario aun no puede navegar libremente). Usando un layout separado `(app)/onboarding/layout.tsx` que NO incluye BottomTabs, se logra la exclusion sin condiciones en el componente BottomTabs. El BottomTabs en `(app)/layout.tsx` se oculta para rutas `/onboarding/*` igual que Luma lo hace para `/brand-board/*`.

---

## Constraint Directives

### Heredadas del proyecto (CDs 1-18 asumidas como vigentes — validar en F2 con SDD)

- CD-1 a CD-18: CDs originales del WKH-COBRAYA-AGENTS (Engine, onchain, auditoria, etc.)

### Nuevas para esta HU

- **CD-19**: PROHIBIDO modificar cualquier archivo del Engine listado en Scope OUT. Cualquier modificacion dispara escalation al humano antes de proceder.
- **CD-20**: OBLIGATORIO usar Server Actions (`'use server'`) para auth (signUp, signIn, signOut) y operaciones de profile (saveOnboarding, updateProfile, recordSettlement). PROHIBIDO crear API routes adicionales para estas operaciones.
- **CD-21**: OBLIGATORIO habilitar RLS en `profiles` (politica: `auth.uid() = id` para SELECT y UPDATE) y en `settled_invoices` (politica: `auth.uid() = user_id` para SELECT e INSERT). PROHIBIDO deshabilitar RLS en ninguna de estas tablas.
- **CD-22**: OBLIGATORIO que toda copy visible al usuario este en ES-MX. PROHIBIDO texto en ingles en UI de usuario final (labels, placeholders, mensajes de error, botones). Mensajes de error de Supabase en ingles deben traducirse antes de mostrarse.
- **CD-23**: OBLIGATORIO mobile-first. Touch targets minimos 48px (height o min-height). `padding-bottom: env(safe-area-inset-bottom)` en BottomTabs y layouts con nav fijo. `max-w-sm` o `max-w-md` para cards de auth en mobile; `max-w-3xl` para contenido de app.
- **CD-24**: OBLIGATORIO leer Supabase config exclusivamente desde `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`. PROHIBIDO hardcodear URLs de Supabase, proyecto IDs, o keys en ningun archivo de `src/`.
- **CD-25**: PROHIBIDO agregar rutas `/auth/*` o `/(app)/*` al SW cache como NetworkFirst o StaleWhileRevalidate. Las rutas dependientes de cookies deben ser NetworkOnly para evitar que el SW sirva respuestas stale con sesion expirada.
- **CD-26**: OBLIGATORIO: si usuario autenticado accede a `/(auth)/login` o `/(auth)/signup`, el middleware SHALL redirigir a `/dashboard` o `/onboarding/step/1`. PROHIBIDO mostrar el formulario de auth a un usuario ya logueado.
- **CD-27**: OBLIGATORIO: todas las rutas `/(app)/*` requieren sesion activa. PROHIBIDO renderizar contenido de app a usuarios anonimos; el middleware SHALL redirigir a `/login` antes de que la pagina se hidrate.
- **CD-28**: OBLIGATORIO: si `profiles.onboarding_completed = false` (o perfil no existe), el middleware SHALL redirigir a `/onboarding/step/1` para cualquier ruta `/(app)/*` excepto `/onboarding/*`.
- **CD-29**: OBLIGATORIO que los tests de Server Actions usen `vi.mock` del cliente Supabase. PROHIBIDO hacer llamadas reales a Supabase en tests (`vitest run` debe poder correr en CI sin credenciales reales).
- **CD-30**: OBLIGATORIO escalar al humano antes de modificar cualquier archivo del Engine. PROHIBIDO al Dev modificar Engine por ninguna razon — ni "solo una linea".

---

## Missing Inputs

- **[RESUELTO]** Auth mode: LUM-100 (mailer_autoconfirm) — confirmado por Fernando.
- **[RESUELTO]** Persistencia: Supabase profiles + settled_invoices — confirmado por Fernando.
- **[RESUELTO]** Wallet: Skip — diferenciador "PyME sin wallet" se mantiene — confirmado.
- **[RESUELTO]** Visual direction: burgundy full port — confirmado por Fernando.
- **[NEEDS CLARIFICATION — no bloqueante, resolver en F2]** Campos exactos de `profiles` para PyME: se asumen RFC (TEXT), sector (TEXT), anchor_buyers (TEXT[]), monto_tipico_mxn (NUMERIC), mayor_frustracion (TEXT), onboarding_completed (BOOLEAN), created_at, updated_at. El Architect validara con Fernando en F2 si hay campos adicionales o tipos distintos.
- **[NEEDS CLARIFICATION — no bloqueante, resolver en F2]** Stats del dashboard: "facturas negociadas", "monto total USDC", "dias con Cobraya" son derivables de `settled_invoices` + `profiles.created_at`. "Ahorros vs 30 dias" requiere definicion de calculo — el Architect debera aclarar formula o simplificar a "monto total ahorrado en fees".
- **[NEEDS CLARIFICATION — no bloqueante]** Supabase proyecto: si el proyecto ya existe, el Architect necesita las credenciales (.env). Si no existe, W0 incluye crearlo via Supabase dashboard.

---

## Analisis de Paralelismo

```
W0 (Supabase setup) ──────────────────────────────── bloqueante para W3, W9, W11 (recordSettlement)
W1 (Design tokens)  ─── paralelo con W0 ──────────── bloqueante para W5, W6, W7, W8
W2 (UI primitives)  ─── paralelo con W0, W1 ─────── bloqueante para W4, W5, W6, W7, W8, W10
W3 (Auth foundation)────── requiere W0 ────────────── bloqueante para W4
W4 (Route groups + middleware) ─ requiere W3, W2 ─── bloqueante para W5..W10
W5 (Mobile chrome) ─────── requiere W4, W2 ──────────── bloqueante para W6..W10
W6 (Onboarding)    ─────── requiere W5, W0 ──────────── paralelo posible con W7
W7 (Dashboard)     ─────── requiere W5, W0 ──────────── paralelo con W6
W8 (Negociar tab)  ─────── requiere W5 ──────────────── paralelo con W6, W7 (no depende de W0 para la logica; W9 para recordSettlement si)
W9 (Historial)     ─────── requiere W8, W0 ──────────── serial post-W8
W10 (Perfil)       ─────── requiere W5, W0 ──────────── paralelo con W6, W7
W11 (PWA assets)   ─────── independiente de todo ────── puede ir en cualquier momento
W12 (Smoke E2E)    ─────── requiere todos ──────────── ultimo
```

**Waves paralelizables con 2 developers:**
- Ronda A: W0 + W1 + W2 (sin dependencias)
- Ronda B: W3 + (W1 si no termino)
- Ronda C: W4 + W11 (PWA es independiente)
- Ronda D: W5 + W6 + W7 (paralelo si hay 2+ devs)
- Ronda E: W8 + W10 (paralelo)
- Ronda F: W9 → W12

---

## Risk Register

| # | Riesgo | Probabilidad | Impacto | Mitigacion |
|---|--------|-------------|---------|-----------|
| R-1 | **Supabase project creation friction** — crear proyecto nuevo, configurar mailer_autoconfirm via Management API, y obtener credenciales puede tomar 20-30 min si hay friction en dashboard o API. | Media | Alto (bloquea W3+) | Crear proyecto Supabase PRIMERO antes de iniciar cualquier wave. Documentar en W0 los pasos exactos (Management API o Settings > Auth > Email). |
| R-2 | **cookies() sync vs async — Next 14 vs Luma Next 16** — el port de `server.ts` de Luma fallara silenciosamente si el developer copia `await cookies()` de Luma sin adaptar. El error es un runtime type error, no un build error. | Alta | Alto (rompe toda la auth) | DT-E documenta la diferencia. El Story File (F2.5) debe incluir el snippet correcto de `createClient` para Next 14. Test de middleware en CI. |
| R-3 | **RLS escape en middleware** — el middleware hace `supabase.auth.getUser()` para chequear sesion. Si el cookie de sesion esta corrupto o expirado, `getUser()` devuelve `null` pero no lanza error. Sin manejo correcto, un usuario con cookie corrupta podria llegar a una ruta protegida. | Media | Alto | Patron `redirectWithCookies` de Luma (preservar cookies del `response` de Supabase SSR al hacer redirect) debe portarse exactamente. Test de cookie corruption scenario. |
| R-4 | **settled_invoices insert race condition** — si el usuario hace doble-tap en "Negociar" y el settle se llama dos veces, puede haber dos inserts en `settled_invoices` con el mismo `request_id`. | Baja | Medio | Agregar constraint `UNIQUE(request_id)` en `settled_invoices`. El Server Action `recordSettlement` debe usar `INSERT ... ON CONFLICT DO NOTHING`. |
| R-5 | **Middleware matcher demasiado agresivo** — si el matcher de `middleware.ts` intercepta rutas estaticas (`_next/static`, `icons/`, `manifest.json`), el SW y los assets PWA pueden romperse o quedar atras de un redirect de auth. | Media | Medio | Copiar el matcher regexp de Luma exactamente (excluye `api|_next/static|_next/image|favicon|manifest|sw.js|workbox-*|icons/*|splashes/*|*.png/jpg/etc`). Validar en W12 que el manifest y los iconos se sirven sin redirect. |

---

## Effort Estimate

| Fase | Responsable | Estimado |
|------|------------|---------|
| F2 SDD + ACs refinados | Architect | 1h |
| F2.5 Story File (13 waves) | Architect | 1h |
| F3 Dev W0..W12 | Dev | 8-10h |
| AR (Adversarial Review) | Adversary | 1h |
| CR (Code Review) | Adversary | 45min |
| F4 QA (18 ACs, evidencia archivo:linea) | QA | 1h |
| DONE docs | Docs | 15min |
| **Total** | | **~14h** |

---

## Notas para el Architect (F2)

1. Confirmar con Fernando los campos exactos de `profiles` para PyME (ver Missing Inputs).
2. Definir formula de "ahorros vs 30 dias" para stats card del dashboard, o simplificar.
3. Decidir si el `(app)/layout.tsx` hace un server-side `getUser()` call (para pasar `user` a TopNav via props) o si TopNav es siempre client-side con `createBrowserClient`. Impacto en TTFT.
4. El middleware necesita manejar el caso donde `profiles` no existe todavia (nuevo usuario recien registrado, trigger aun no ejecuto). Default safe: redirigir a `/onboarding/step/1`.
5. Confirmar si `supabase.auth.getUser()` en middleware usa el service role key o el anon key — usar anon key (desde `NEXT_PUBLIC_SUPABASE_ANON_KEY`) en SSR client del middleware es lo correcto para que RLS funcione.
6. El componente `BrandIcon` existente tiene un SVG con colores hardcodeados. Evaluar si se porta a CSS vars de luma o se reescribe con palette burgundy.
7. Confirmar si `tailwindcss-animate` ya esta en el proyecto o si hay que agregar solo la palette (Luma lo usa para animaciones de confetti — Cobraya probablemente no lo necesita).
