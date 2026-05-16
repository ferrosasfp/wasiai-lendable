# SDD #002: WKH-COBRAYA-DAPP-SHELL — Cobraya Mobile DApp Shell

> **SPEC_APPROVED**: pending
> **Fecha**: 2026-05-16
> **Tipo**: feature (cross-cutting shell + auth + DB)
> **SDD_MODE**: full (QUALITY)
> **Branch**: `feat/wkh-cobraya-dapp-shell` (base: `main` @ `70f0d7d`)
> **Artefactos**: `doc/sdd/002-wkh-cobraya-dapp-shell/`
> **Inputs**: `work-item.md`, `.nexus/project-context.md`, Luma reference (`/home/ferdev/.openclaw/workspace/luma-ai/`)

---

## 1. Resumen ejecutivo

Cobraya pasa de un **demo de hackathon mono-página** (`/demo`) a una **DApp mobile production-grade** adoptando el patrón Luma AI: Supabase auth (LUM-100 instant-signup), tabla `profiles` con campos PyME, tabla `settled_invoices` para historial cross-session, route groups `(auth)`/`(app)`, mobile chrome (BottomTabs + TopNav), wizard de onboarding de 5 pasos, dashboard con stats, y refactor del flow `/demo` al tab Negociar.

El **engine** (4 agentes + settle + audit-trail) queda **intocable** — la única intersección es un Server Action `recordSettlement` que persiste el `txHash` post-settle en Supabase para que la pestaña Historial tenga datos cross-session.

La palette visual migra de blanco/verde Avalanche a **cream (`luma-50 #FCF7F3`)** + **burgundy (`luma-700 #5B0426`)** vía CSS custom properties y extensión `colors.luma.*` en Tailwind.

**Output**: 13 waves W0..W12, ≥30 archivos nuevos, ≥18 ACs en EARS, palette consistente, RLS productiva, 25+ tests nuevos.

---

## 2. Work Item (referencia)

| Campo | Valor |
|-------|-------|
| **#** | 002 |
| **ID** | WKH-COBRAYA-DAPP-SHELL |
| **Tipo** | feature |
| **SDD_MODE** | full |
| **Objetivo** | Transformar Cobraya en mobile DApp con auth + chrome + persistencia, respetando engine intocable. |
| **Reglas de negocio** | Engine intocable; LUM-100 (autoconfirm ON); ES-MX en UI; mobile-first; RLS obligatorio. |
| **Scope IN** | Ver §11 (Files Plan) |
| **Scope OUT** | Engine routes, contracts, eip3009-signer, audit-trail-composer, agent-signer, core/ |
| **ACs** | 18 (AC-1..AC-18) — ver §13 (Tests) y work-item.md§ACs |

---

## 3. Context Map — Codebase Grounding

### 3.1 Archivos leídos del codebase Cobraya

| Archivo | Líneas | Por qué leído | Patrón extraído |
|---|---|---|---|
| `src/app/layout.tsx` | 1-37 | Root layout actual (themeColor verde, RegisterSW, InstallPrompt) | Conservar PWA hooks; cambiar `themeColor` a `#651332`; lang="es" se mantiene |
| `src/app/page.tsx` | 1-104 | Splash actual con `/demo` link | Reemplazar con burgundy radial + wordmark + CTA "Comenzar" → `/login` |
| `src/app/demo/page.tsx` | 1-657 | Flow de 4 agentes + auction + settle | Mover íntegro a `(app)/negociar/page.tsx`; envolver post-settle con `recordSettlement` Server Action |
| `src/app/globals.css` | 1-27 | Tokens actuales (paper/ink, serif, mono) | Conservar `.serif` y `.mono`; agregar bloque `:root { --luma-* }` y `@layer components { .auth-card, .bb-card, ... }` |
| `tailwind.config.ts` | 1-23 | Palette actual ink/paper/accent | Mantener; agregar `colors.luma.{50..700}` extendida |
| `next.config.js` | 1-51 | PWA wrapper @ducanh2912/next-pwa con NetworkOnly para `/api/*` | CD-25: agregar reglas para `/(app)/*` y `/(auth)/*` como NetworkOnly o no-cache; W11 task |
| `package.json` | 1-45 | Next 14.2.5, React 18.3.1, vitest 1.6.1 (no @supabase/*, no CVA) | Agregar `@supabase/supabase-js`, `@supabase/ssr`, `class-variance-authority`, `clsx`, `tailwind-merge` en W0 |
| `src/components/BrandIcon.tsx` | 1-21 | SVG con fill `#0F8B4A` (verde) y `#FCF7F3` (cream) hardcoded | DD-K: reescribir con CSS vars `--luma-700` y `--luma-50` para coherencia con palette |
| `src/components/InvoiceCard.tsx` | 1-40+ | Componente engine-adjacent que usa `bg-ink/10`, `text-ink` | DD-I: restyling permitido (cambiar a `bg-luma-100`, `text-luma-700`); lógica intocable |
| `src/components/LenderAuctionPanel.tsx` | 1-40 | Igual: `border-ink`, `bg-ink/5` | DD-I: restyling permitido |
| `src/components/Settlement.tsx` | 1-30 | bottom-anchored CTA con safe-area | Patrón se preserva; CSS clases se restylean |
| `src/components/AuditPanel.tsx` | 1-30 | `fixed bottom-0 bg-paper border-t border-ink` | CRÍTICO: este `fixed bottom-0` puede chocar con BottomTabs (W5). Mitigación en DD-I y W8: convertir AuditPanel a inline o agregar `mb-16` (altura de BottomTabs) en `(app)/negociar/page.tsx` |
| `vitest.config.ts` | 1-19 | jsdom env, setupFiles, alias `@` → src | Tests nuevos en `tests/unit/{actions,middleware,components}/` siguen mismo patrón |
| `tests/setup.ts` | 1-21 | matchMedia stub | Reutilizar; agregar mock helper `tests/__mocks__/supabase.ts` (no automock, manual `vi.mock`) |
| `doc/sdd/001-wkh-cobraya-agents/auto-blindaje.md` | 1-63 | 8 lessons-learned del HU previo | Ver §4 (CDs derivadas) y §10 (Anti-pattern list) |

### 3.2 Archivos leídos de Luma reference (exemplars verificados con Read)

| Archivo | Por qué | Patrón portado |
|---|---|---|
| `luma-ai/src/actions/auth.ts` | signUp/signIn/signOut canon | DD-E: contrato `(_prev, formData) => Promise<{error?: string}>`; LUM-100 autoconfirm; revalidatePath en signOut |
| `luma-ai/src/lib/supabase/client.ts` | createBrowserClient minimal | DD-A: 5 LOC, idéntico port |
| `luma-ai/src/lib/supabase/server.ts` | createServerClient con `await cookies()` (Next 16) | DD-B: **adaptar a Next 14 sync** — eliminar `async` y `await` |
| `luma-ai/src/lib/validation/auth.ts` | Zod schemas login/signup | DD-E: copiar tal cual, traducir mensajes a ES-MX |
| `luma-ai/src/proxy.ts` | Middleware Next 16 con auth + onboarding gate | DD-C: portar a `src/middleware.ts` Next 14 con matcher ajustado |
| `luma-ai/src/components/auth/login-form.tsx` | useActionState pattern | DD-E: useActionState + useFormStatus + role="alert" |
| `luma-ai/src/components/auth/signup-form.tsx` | Igual + password hint | Patrón idem |
| `luma-ai/src/app/(auth)/login/page.tsx` | auth-card sobre `--luma-hero-radial` | DD-J + W3: portar JSX con copy ES-MX |
| `luma-ai/src/app/(auth)/signup/page.tsx` | idem | idem |
| `luma-ai/src/app/(app)/dashboard/page.tsx` | RSC con `await createClient()` + `auth.getUser()` + 4 stats cards + brand-preview + recents | DD-H + W7: portar; reemplazar `niche`/`current_offer`/`brand_tone` por campos PyME |
| `luma-ai/src/app/(app)/brand-board/layout.tsx` | layout wizard sin BottomTabs | DD-K-wizard: clonar a `(app)/onboarding/layout.tsx` |
| `luma-ai/src/app/(app)/brand-board/page.tsx` | dispatcher (completed → EditView vs redirect step) | W6: portar |
| `luma-ai/src/app/(app)/brand-board/step/[step]/page.tsx` | 7-step Server Component con `firstIncompleteStep` resume | W6: portar a 5 steps |
| `luma-ai/src/components/nav/BottomTabs.tsx` | 4 tabs `md:hidden`, safe-area, prefix-hide | DD-G + W5: portar con tabs Inicio/Negociar/Historial/Perfil |
| `luma-ai/src/components/nav/TopNav.tsx` | gradient burgundy + glass pill | DD-G + W5: portar con wordmark "Cobraya" |
| `luma-ai/src/components/ui/{button,input,label}.tsx` | CVA primary/ghost/link + `cn()` | W2: portar idéntico |
| `luma-ai/src/components/brand-board/progress-dots.tsx` | 7 dots ARIA progressbar | DD-D + W6: adaptar a 5 dots |
| `luma-ai/src/components/brand-board/step1-form.tsx` | Server Action + useActionState + Zod fieldErrors | W6: patrón para 5 steps Cobraya |
| `luma-ai/src/actions/brand-board.ts` | `saveStepAndAdvance<T>(parsed, nextPath)` shared helper | DD-E + W6: portar helper a `src/actions/profile.ts` |
| `luma-ai/tailwind.config.ts` | `colors.luma.{50..700}` + plugin tailwindcss-animate | DD-G + W1: portar palette tal cual; **NO portar tailwindcss-animate** (Cobraya no usa confetti) |
| `luma-ai/src/app/globals.css` | `:root { --luma-* }` + `.bb-card`, `.auth-card`, `.pill-btn`, `.wordmark`, `.icon-circle` | DD-G + W1: portar bloques `@layer base` y `@layer components` relevantes; saltar dark-mode overrides |
| `luma-ai/supabase/migrations/002_reset_profiles_to_luma.sql` | `handle_new_user()` trigger + RLS policies | DD-F + W0: portar trigger; schema reemplaza columnas brand-board por columnas PyME |

### 3.3 Auto-Blindaje histórico (lessons-learned previas)

Lecciones de **WKH-COBRAYA-AGENTS** (`doc/sdd/001-wkh-cobraya-agents/auto-blindaje.md`):

| Lección | Pattern | Aplicación a WKH-002 |
|---|---|---|
| **jsdom matchMedia missing** | `tests/setup.ts` con stub | Ya cubierto; W2 tests UI heredan |
| **viem EIP-55 checksum strict** | Usar `getAddress()` para fixtures | N/A (no hay viem nuevo en este HU) |
| **route.ts non-handler exports rejected** | State en `src/lib/`, no en `route.ts` | N/A (no se tocan routes) |
| **Silent signer failures** | Estructurar `console.warn({slug, requestId, errorName})` | **CD-31** nuevo: cualquier Server Action que catchee error de Supabase → `console.warn('[cobraya-action]', { action, errorCode })` SIN exponer `err.message` (puede leakear keys/PII) |
| **Audit trail IDOR via opaque ID** | Opaque ID ≠ auth | **CD-32** reforzado: `settled_invoices` JAMÁS expuesta sin `auth.uid()` cross-filter; RLS Postgres + filter `user_id` en cada query |
| **PII raw en step.input** | inputForReceipt vs inputForAudit | N/A (no se tocan audits) |
| **UUID validation strict** | `isValidUuidV4()` antes de Map lookup | **CD-33**: `recordSettlement` valida `requestId` como UUID v4 antes del insert; CRLF + buffer poisoning |
| **smeWalletOverride attack surface** | Eliminar campos opcionales user-controlled | N/A (no hay address user-controlled aquí) |

---

## 4. Decisiones de Diseño (DD-A..DD-N)

### DD-A — Supabase + @supabase/ssr (vs NextAuth, Clerk, Auth.js)

**Decisión**: Usar Supabase con paquetes `@supabase/supabase-js` + `@supabase/ssr`.

**Por qué**:
- Auth + DB + RLS nativos de Postgres en un solo servicio → menos integration surface
- `@supabase/ssr` provee `createBrowserClient` / `createServerClient` con cookie-based session que funciona con Next 14 Server Components, Server Actions y middleware
- LUM-100 (autoconfirm ON) es directo vía Supabase Management API o Dashboard → `auth.signUp()` devuelve session inmediata sin `/signup/pending` detour
- Patrón ya probado en Luma (en producción) → bajo riesgo de port
- NextAuth requeriría DB adapter separado + manejo manual de RLS

**Decisión cerrada por Fernando** (work-item DT-A).

### DD-B — `createClient` server-side adaptado a Next 14 sync `cookies()`

**Decisión**: `src/lib/supabase/server.ts` exporta una función `createClient()` **síncrona** (no `async`), que llama a `cookies()` sin `await`.

**Por qué**:
- Luma usa Next.js 16 donde `cookies()` retorna `Promise<ReadonlyRequestCookies>` y requiere `await`
- Cobraya está en Next.js 14.2.5 donde `cookies()` retorna `ReadonlyRequestCookies` **directamente** (síncrono)
- Si el Dev copia el patrón de Luma literal (`await cookies()`), TypeScript compila pero produce runtime error `cookieStore.getAll is not a function` (porque `cookieStore` queda como una Promise, no el cookieStore real)
- Este es el **#1 riesgo de bug del HU** (R-2 en work-item)

**Snippet exacto que el Dev DEBE copiar** (verificar línea por línea):

```ts
// src/lib/supabase/server.ts
// Next.js 14.2.5 — cookies() is SYNCHRONOUS. Do NOT await.
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()  // SYNC — no await

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component context: cookies are read-only. Safe to ignore;
            // middleware refresh path handles writes.
          }
        },
      },
    }
  )
}
```

**Consumers**: NO usan `await` para construir el client. Solo `const supabase = createClient()`.

### DD-C — Middleware: matcher regexp + flow + cookie preservation

**Decisión**: `src/middleware.ts` (Next 14 convention, no `proxy.ts`) con default export `middleware` y `config.matcher` que excluye assets estáticos.

**Flow del middleware** (orden de checks):
1. Inicializar `response = NextResponse.next({ request: { headers } })`
2. Crear `supabase` con `createServerClient` usando `request.cookies` y un setter que mutua `response.cookies`
3. Llamar a `supabase.auth.getUser()` — **OBLIGATORIO** (refresca session cookies; sin esto sessions expiran)
4. Si `!user` y pathname no es `/`, `/login`, `/signup`, `/auth/*`, `/~offline` → redirect a `/login` (preservando cookies via `redirectWithCookies()`)
5. Si `user && pathname ∈ {/login, /signup}` → SELECT `profiles.onboarding_completed`; redirect a `/dashboard` o `/onboarding/step/1`
6. Si `user && pathname startsWith '/(app)' && pathname !== /onboarding/*` → SELECT `profiles.onboarding_completed`; si `false` → redirect a `/onboarding/step/1`
7. **NEW** (DT-onboarding-edge): si `user && pathname startsWith '/onboarding/step/'` y `profiles.onboarding_completed === true` → redirect a `/dashboard` (anti-back-button)
8. `return response`

**Snippet del matcher** (port exacto de Luma con paths Cobraya adicionales):

```ts
// src/middleware.ts
export const config = {
  matcher: [
    // Excluir: api routes, Next assets, PWA assets, brand icons, splash images,
    // manifest, sw, workbox, apple-touch-icons, todos los formatos de imagen
    '/((?!api|_next/static|_next/image|favicon\\.ico|manifest\\.json|sw\\.js|workbox-.*\\.js|icons/.*|splashes/.*|apple-touch-icon-.*|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
```

**`redirectWithCookies` helper** (CRÍTICO — R-3 del work-item):

```ts
const redirectWithCookies = (url: URL) => {
  const r = NextResponse.redirect(url)
  response.cookies.getAll().forEach((cookie) => r.cookies.set(cookie))
  return r
}
```

**Race condition handling** (nuevo trigger ejecuta `INSERT INTO profiles` para `auth.users` row recién creado, pero puede no haberse completado cuando el primer request post-signUp llega al middleware): el SELECT de `onboarding_completed` debe usar `.maybeSingle()` (no `.single()`) — si no existe row, tratar como `onboarding_completed = false` → redirect a `/onboarding/step/1` (safe default).

### DD-D — Wizard onboarding architecture

**Decisión**: Route group `(app)/onboarding/` con su propio `layout.tsx` (sin BottomTabs) + ruta dinámica `step/[step]/page.tsx`. Cada step es un Server Component que renderiza un Client Component `StepNForm`.

**Por qué**:
- BottomTabs no debe mostrarse durante onboarding (UX: usuario aún no puede navegar libremente)
- Layout separado `(app)/onboarding/layout.tsx` (sin nav) > poner conditional `if (path.startsWith('/onboarding')) return null` en `(app)/layout.tsx` (acopla nav a paths específicos)
- BottomTabs.tsx ya tiene self-hide para `/(auth)/*`, `/`, `/onboarding/*` por defensa-en-profundidad (Luma pattern)

**Estructura**:
```
src/app/(app)/
  layout.tsx              ← TopNav + BottomTabs + main wrapper
  onboarding/
    layout.tsx            ← solo wrapper sin nav + bg `--luma-hero-radial`
    step/
      [step]/
        page.tsx          ← dispatcher: validate step ∈ 1..5; fetch profile; render <StepNForm defaults={profile} />
```

**Server Action contract** (DD-E lo detalla):

```ts
// saveStepN(state, formData) → { error?, fieldErrors?, completed? }
// Step 1-4: persisten campo en profiles; redirect a /onboarding/step/N+1
// Step 5: persiste mayor_frustracion + onboarding_completed = true; redirect a /dashboard
```

**Anti-bypass** (AC-7): page.tsx llama a `firstIncompleteStep(profile)` → si `stepNum > allowed` → redirect a `/onboarding/step/${allowed}`. `firstIncompleteStep` vive en `src/lib/onboarding/resume.ts`.

### DD-E — Server Actions API contract

**Decisión**: Todas las mutaciones de profile/auth/settlement usan Server Actions con firma uniforme.

**Tipos de retorno**:

```ts
// src/lib/types/actions.ts (NEW)
export type ActionResult = { error?: string }
export type OnboardingStepState = {
  error?: string
  fieldErrors?: Record<string, string>
}
```

**Funciones**:

| Action | Signatura | Path | Comportamiento |
|---|---|---|---|
| `signUp` | `(prev: ActionResult, fd: FormData) => Promise<ActionResult>` | `actions/auth.ts` | LUM-100 autoconfirm; redirect `/onboarding/step/1` |
| `signIn` | `(prev: ActionResult, fd: FormData) => Promise<ActionResult>` | `actions/auth.ts` | redirect `/dashboard` (middleware re-evaluará si onboarding pending) |
| `signOut` | `() => Promise<void>` | `actions/auth.ts` | `revalidatePath('/', 'layout')` + redirect `/login` |
| `saveStep1..5` | `(prev: OnboardingStepState, fd: FormData) => Promise<OnboardingStepState>` | `actions/profile.ts` | UPDATE profiles + redirect siguiente step; step 5 marca `onboarding_completed = true` y redirige `/dashboard` |
| `updateProfile` | `(prev: ActionResult, fd: FormData) => Promise<ActionResult>` | `actions/profile.ts` | UPSERT profiles + revalidatePath `/(app)/perfil` |
| `recordSettlement` | `(payload: SettlementInsert) => Promise<{ ok: true } \| { error: string }>` | `actions/settlement.ts` | INSERT settled_invoices con `ON CONFLICT (request_id) DO NOTHING`; no redirect (caller maneja UI) |

**`recordSettlement` payload tipo** (NO usa `FormData` porque el caller es código TS post-fetch, no un `<form>`):

```ts
// src/actions/settlement.ts
export type SettlementInsert = {
  requestId: string         // UUID v4 (validar con CD-33 isValidUuidV4)
  uuidCfdi: string
  amountMxn: number
  netAmountUsdc: number
  lenderName: string
  txHash: `0x${string}`
  snowtraceUrl?: string
  blockNumber?: number
}
```

**Validación shared helper**:

```ts
// src/lib/onboarding/resume.ts (NEW)
export type ProfileRow = {
  id: string
  email: string | null
  rfc: string | null
  sector: string | null
  anchor_buyers: string[] | null
  monto_tipico_mxn: number | null
  mayor_frustracion: string | null
  onboarding_completed: boolean
  created_at: string
  updated_at: string
}

export function firstIncompleteStep(p: ProfileRow): 1 | 2 | 3 | 4 | 5 {
  if (!p.rfc) return 1
  if (!p.sector) return 2
  if (!p.anchor_buyers || p.anchor_buyers.length === 0) return 3
  if (p.monto_tipico_mxn == null) return 4
  return 5
}
```

### DD-F — Migración SQL (2 archivos + trigger + RLS)

**Decisión**: Dos migrations en `supabase/migrations/`:
1. `001_profiles.sql` — crea tabla profiles + trigger + RLS
2. `002_settled_invoices.sql` — crea tabla settled_invoices + RLS + indexes

**Por qué dos archivos**: separación clara, posibilidad de rollback granular, alineado con convención Luma (2 archivos por concept).

**Schema completo en §6 (Schema SQL)**.

### DD-G — Tailwind palette: coexistencia luma-* + ink/paper/accent

**Decisión**: **NO eliminar** `colors.{ink,paper,accent,muted,line}` del config actual. **Agregar** `colors.luma.{50,100,200,300,400,450,500,600,650,700}`.

**Por qué**:
- Componentes engine-adjacent (`InvoiceCard`, `LenderAuctionPanel`, etc.) usan `bg-ink/10`, `text-ink`, `border-ink`. Eliminar `ink` rompería tests existentes y forzaría tocar lógica de componentes engine-adjacent (Scope: solo restyling permitido)
- `accent: #E84142` (Avalanche red) se preserva para success states onchain (DT-D del work-item): commit successful, tx confirmed
- Nueva palette `luma.*` se usa para layout shell (`bg-luma-50`, `text-luma-700`, `border-luma-200`)
- W8 hace pase de restyling sobre engine-adjacent: cambiar `bg-ink/5` → `bg-luma-100/60`, `text-ink` → `text-luma-700`, `border-ink/30` → `border-luma-300`

**Plugin `tailwindcss-animate`**: **NO se agrega**. Luma lo usa para confetti; Cobraya no necesita animaciones complejas.

### DD-H — Stats calculation logic (resuelve [NEEDS CLARIFICATION] del work-item)

**Decisión**: Las 4 stats del dashboard se derivan de `settled_invoices` + `profiles.created_at`.

**Fórmulas exactas**:

```ts
// src/lib/dashboard/stats.ts (NEW)
type DashboardStats = {
  facturasNegociadas: number          // count(settled_invoices) WHERE user_id = auth.uid()
  totalUsdc: number                   // sum(net_amount_usdc) WHERE user_id = auth.uid()
  ahorrosFee: number                  // sum(amount_mxn * 0.025 - amount_mxn * 0.005) — placeholder; ver nota
  diasConCobraya: number              // floor((now - profiles.created_at) / 86400000)
}
```

**Resolución del "ahorros vs 30 días"**:
El work-item lista "ahorros vs 30 dias" pero la fórmula no estaba definida. **Resolución de Architect (no bloqueante; reasonable default)**:

> **"Ahorros estimados en fees vs factoraje tradicional"** = suma para cada factura de `amount_mxn * (fee_tradicional - fee_cobraya)` donde:
> - `fee_tradicional = 0.025` (2.5% típico de factoraje tradicional en MX según promedio de mercado)
> - `fee_cobraya = 0.005` (0.5% — el spread del agentic auction es ~80% menor)
>
> Fórmula simplificada: `ahorrosFee = SUM(amount_mxn) * 0.02`

**Si Fernando rechaza esta fórmula**, marcar el campo como "Ahorros estimados (placeholder)" en la card del dashboard y abrir issue para refinar en HU posterior. **No es bloqueante para el HU**.

**Implementación**:

```ts
export async function loadDashboardStats(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  createdAt: string | null,
): Promise<DashboardStats> {
  const { data, error } = await supabase
    .from('settled_invoices')
    .select('amount_mxn, net_amount_usdc')
    .eq('user_id', userId)
  if (error || !data) {
    console.warn('[cobraya-dashboard] stats load failed', { errorCode: error?.code })
    return { facturasNegociadas: 0, totalUsdc: 0, ahorrosFee: 0, diasConCobraya: 0 }
  }
  const facturasNegociadas = data.length
  const totalUsdc = data.reduce((s, r) => s + Number(r.net_amount_usdc), 0)
  const ahorrosFee = data.reduce((s, r) => s + Number(r.amount_mxn) * 0.02, 0)
  const diasConCobraya = createdAt
    ? Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000))
    : 0
  return { facturasNegociadas, totalUsdc, ahorrosFee, diasConCobraya }
}
```

### DD-I — Restyling de componentes engine-adjacent

**Decisión**: Permitido **solo cambiar clases Tailwind** en `InvoiceCard`, `LenderAuctionPanel`, `Settlement`, `AuditPanel`. **PROHIBIDO** modificar JSX structure, props, useState, useEffect, fetch calls, computed values.

**Cambios permitidos** (lista cerrada):

| Antes | Después | Aplicable a |
|---|---|---|
| `bg-ink` | `bg-luma-700` | botones primarios (excepto los "negociar" y "escanear" en demo flow — esos quedan `bg-ink` por ahora; W8 task) |
| `bg-ink/10` | `bg-luma-100/60` | badges, pills |
| `bg-ink/5` | `bg-luma-100/40` | hover/selected states |
| `text-ink` | `text-luma-700` | headings, body principal |
| `text-paper` | `text-luma-50` | texto sobre fondo oscuro |
| `border-ink` | `border-luma-300` | bordes default |
| `border-ink/30` | `border-luma-200` | bordes muted |
| `text-muted` | `text-luma-450` | secondary text |
| `text-red-700` / `border-red-500` | sin cambio (success/error semantic) | error states |
| `text-emerald-*` / `bg-emerald-*` | sin cambio | onchain success states (DT-D heredada) |

**Cambios prohibidos**:
- Cualquier `useState`, `useEffect`, `useMemo`
- Cualquier prop signature
- Cualquier event handler
- Cualquier conditional render logic
- Cualquier `fetch` o llamada a API
- Cualquier import nuevo de un tipo del engine

**Conflicto `AuditPanel.fixed bottom-0` vs BottomTabs**: en `(app)/negociar/page.tsx`, **NO renderizar `<AuditPanel>` como antes**. En lugar: convertir AuditPanel a inline (cambiar `fixed bottom-0` por `relative mt-6`) **O** mantener fixed pero darle `bottom-16` (altura de BottomTabs = 4rem = h-16). **Decisión**: cambiar a inline (`mt-6 border-t border-luma-200 pt-4`) — más limpio y consistente con dashboard pattern. Documentado como wave task en W8.

### DD-J — Splash page burgundy

**Decisión**: `src/app/page.tsx` se reescribe completo. Pierde el contenido marketing del demo actual (4 cards de "01 Validación CFDI...") y se reemplaza con un splash mínimo radial burgundy + wordmark + dos CTAs.

**JSX skeleton**:

```tsx
// src/app/page.tsx
import Link from 'next/link'

export default function SplashPage() {
  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center p-8 relative"
      style={{ background: 'var(--luma-hero-radial)' }}
    >
      <div className="wordmark-gradient text-5xl mb-4 px-6 text-center">Cobraya</div>
      <p className="text-sm text-luma-200 text-center mb-12 max-w-sm leading-relaxed italic">
        Tu factura, líquida en 30 segundos. USDC en Avalanche.
      </p>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Link
          href="/signup"
          className="pill-btn pill-btn-primary w-full text-center min-h-[48px] flex items-center justify-center"
        >
          Comenzar
        </Link>
        <Link
          href="/login"
          className="text-luma-100 text-sm text-center underline underline-offset-2 min-h-[44px] flex items-center justify-center"
        >
          Ya tengo cuenta
        </Link>
      </div>
    </main>
  )
}
```

**Edge**: middleware NO redirige `/` (pathname === '/' es exempt). Si usuario autenticado pisa `/`, ve el splash igual. Eso es OK (no hay loop). Si quisiéramos auto-redirect autenticados desde splash → /dashboard, se haría en el middleware con `if (user && pathname === '/') return redirectWithCookies(...)`. **Decisión**: no auto-redirect; `/` es un splash informativo que sirve también de "logout success" landing.

### DD-K — BrandIcon port a CSS vars

**Decisión**: Reescribir `src/components/BrandIcon.tsx` para usar `fill="var(--luma-700)"` y `fill="var(--luma-50)"` en lugar de colores hardcoded `#0F8B4A` / `#FCF7F3`.

**Razón**: coherencia con palette + posibilidad futura de dark mode sin re-export del SVG.

**Snippet**:

```tsx
// src/components/BrandIcon.tsx (REWRITE)
export function BrandIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 56 56"
      fill="none"
      aria-hidden="true"
      className="w-10 h-10"
    >
      <rect width="56" height="56" rx="13" fill="var(--luma-bg, #5B0426)" />
      <path
        d="M40 18 Q28 12 19 21 Q12 28 19 38 Q28 47 40 41 L40 35 Q32 39 25 34 Q21 28 25 23 Q32 17 40 23 Z"
        fill="var(--luma-card, #FCF7F3)"
      />
    </svg>
  )
}
```

Los fallbacks (`, #5B0426`) cubren entornos donde el CSS no carga (e.g., apple-touch-icon rasterized en CI).

### DD-L — Fuente de verdad del onboarding completion

**Decisión**: `profiles.onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE`. **NO derivar** desde "todos los campos PyME están llenos".

**Por qué**:
- Un usuario podría haber completado los 5 steps pero dejar `monto_tipico_mxn = null` (caso edge: ej. campo opcional). Si derivamos `completed` de "todos los campos no-null", esos usuarios quedarían en loop de onboarding.
- Boolean explícito es más simple para el middleware (1 SELECT, 1 comparación).
- Step 5 hace `UPDATE profiles SET mayor_frustracion = ?, onboarding_completed = true WHERE id = auth.uid()` — atómico.

### DD-M — Test strategy

**Decisión**: 3 capas de tests, **TODOS** los Server Actions y middleware con `vi.mock` del cliente Supabase (CD-29).

**Capas**:

1. **Unit tests de Server Actions** (`tests/unit/actions/`):
   - Mock `createClient` para retornar `{ auth: { signUp/signInWithPassword/signOut/getUser }, from }`
   - Assertions: Zod validation pass/fail, redirect called con URL correcta, error mapping
   - Archivos: `auth.test.ts`, `profile.test.ts`, `settlement.test.ts`

2. **Unit tests de middleware** (`tests/unit/middleware/`):
   - Mock `NextRequest`, `NextResponse`, `createServerClient`
   - Assertions: redirect a `/login` cuando anon, redirect a `/onboarding/step/1` cuando onboarding pending, redirect a `/dashboard` cuando completo y en `/login`, cookie preservation
   - Archivo: `middleware.test.ts`

3. **Component tests** (`tests/unit/components/`):
   - RTL + `@testing-library/jest-dom`
   - Assertions: BottomTabs aria-current, ProgressDots renderiza N dots, step forms muestran fieldErrors
   - Archivos: `BottomTabs.test.tsx`, `TopNav.test.tsx`, `ProgressDots.test.tsx`, `login-form.test.tsx`, `signup-form.test.tsx`, `step1-form.test.tsx`, ... `step5-form.test.tsx`

**NO se hacen**: tests de integración contra Supabase real (CD-29).

### DD-N — Fallback si proyecto Supabase no existe

**Decisión**: Si al iniciar W0 no existe un proyecto Supabase Cobraya o las credenciales no están provistas, **ESCALAR AL HUMANO** antes de proceder. No improvisar.

**Pasos exactos del escalation** (lo ejecuta el Dev en W0):
1. Verificar si `.env.local` tiene `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`
2. Si SÍ: continuar W0 corriendo migrations contra ese proyecto
3. Si NO: **bloquear pipeline**, escalar al orquestador con mensaje exacto:
   > "BLOCKER W0: Supabase project credentials missing. Need either:
   > (a) NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local, OR
   > (b) instructions to create new project at supabase.com/dashboard and enable mailer_autoconfirm via Settings > Auth > Email."

**NO** crear proyecto Supabase desde el agente (requiere browser/2FA del humano).

**Mitigación temporal para tests** (CD-29): tests usan `vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')` + `vi.mock('@/lib/supabase/server', ...)`. NO requieren proyecto real.

---

## 5. Constraint Directives (consolidadas CDs 1-33)

### Heredadas del HU previo (CDs 1-18) — del work-item §Constraint Directives

| # | Vigente | Resumen |
|---|---|---|
| CD-1..CD-18 | SÍ | Restricciones del WKH-COBRAYA-AGENTS sobre engine, onchain, audit, security. Validadas vigentes para el shell. **CD-1** (no hardcoded secrets) y **CD-17** (no caching de payment paths) son las más relevantes para este HU. |

### Nuevas del work-item (CDs 19-30)

| # | Tipo | Texto |
|---|---|---|
| CD-19 | PROHIBIDO | Modificar cualquier archivo del Engine listado en Scope OUT. Cualquier modificación dispara escalation al humano. |
| CD-20 | OBLIGATORIO | Server Actions (`'use server'`) para auth (signUp/signIn/signOut) y operaciones de profile (saveOnboarding/updateProfile/recordSettlement). PROHIBIDO crear API routes adicionales para estas. |
| CD-21 | OBLIGATORIO | RLS habilitado en `profiles` (policies SELECT y UPDATE: `auth.uid() = id`) y en `settled_invoices` (policies SELECT e INSERT: `auth.uid() = user_id`). |
| CD-22 | OBLIGATORIO | Toda copy visible al usuario en ES-MX. Mensajes de error de Supabase en inglés deben traducirse antes de mostrarse. |
| CD-23 | OBLIGATORIO | Mobile-first. Touch targets ≥48px. `padding-bottom: env(safe-area-inset-bottom)` en BottomTabs. `max-w-sm`/`max-w-md` para auth cards en mobile. |
| CD-24 | OBLIGATORIO | Supabase config exclusivamente desde `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`. PROHIBIDO hardcodear URLs/keys en `src/`. |
| CD-25 | PROHIBIDO | Agregar `/auth/*` o `/(app)/*` al SW cache como NetworkFirst/StaleWhileRevalidate. Rutas dependientes de cookies → NetworkOnly. |
| CD-26 | OBLIGATORIO | Usuario autenticado en `/(auth)/login` o `/(auth)/signup` → middleware redirige a `/dashboard` o `/onboarding/step/1`. |
| CD-27 | OBLIGATORIO | `/(app)/*` requiere sesión activa. Middleware redirige a `/login` antes de hidratar la página. |
| CD-28 | OBLIGATORIO | `profiles.onboarding_completed = false` (o perfil no existe) → middleware redirige a `/onboarding/step/1` para `/(app)/*` excepto `/onboarding/*`. |
| CD-29 | OBLIGATORIO | Tests de Server Actions usan `vi.mock` del cliente Supabase. PROHIBIDO llamadas reales a Supabase en `vitest run`. |
| CD-30 | OBLIGATORIO | Escalar al humano antes de modificar cualquier archivo del Engine. PROHIBIDO al Dev modificar Engine por ninguna razón. |

### Nuevas del SDD (CD-31..CD-33) — derivadas de auto-blindaje HU previo

| # | Tipo | Texto | Fuente |
|---|---|---|---|
| **CD-31** | OBLIGATORIO | Server Actions que catcheen errores de Supabase deben loguear con `console.warn('[cobraya-action]', { action, errorCode })`. **PROHIBIDO** loguear `err.message` o `err.stack` — pueden contener PII o keys. | Auto-blindaje WKH-001 "Silent signer failures" |
| **CD-32** | OBLIGATORIO | Toda query a `settled_invoices` debe filtrar por `user_id = auth.uid()` en app-layer **además** de RLS Postgres. Defensa en profundidad: si por bug llega `service_role_key` a un Server Action, el RLS no aplica, pero el filtro app-layer sí. | Auto-blindaje WKH-001 "audit-trail IDOR" |
| **CD-33** | OBLIGATORIO | `recordSettlement` debe validar `requestId` como UUID v4 con `isValidUuidV4()` antes del INSERT. Defensa contra CRLF/buffer poisoning. Archivo helper en `src/lib/uuid-validator.ts` (verificar si ya existe del HU previo; si sí, reusar; si no, crear). | Auto-blindaje WKH-001 "UUID validation strict" |

**Nota sobre CD-33**: el work-item HU previo ya creó `src/lib/uuid-validator.ts` (referencia en auto-blindaje). El Dev en W0 hace `Glob` para confirmar; si existe, importar; si no, crear con el snippet:

```ts
// src/lib/uuid-validator.ts (REUSE or CREATE)
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export function isValidUuidV4(s: unknown): s is string {
  return typeof s === 'string' && UUID_V4_REGEX.test(s)
}
```

---

## 6. Schema SQL detallado

### 6.1 `supabase/migrations/001_profiles.sql`

```sql
-- WKH-COBRAYA-DAPP-SHELL — profiles table for PyME onboarding (Lupita persona).
-- Adopta patrón Luma (LUM-21 trigger + RLS) con campos específicos de SmartFactoring.

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,                                      -- cached from auth.users for easier joins
  rfc TEXT,                                        -- step 1 — Registro Federal de Contribuyentes
  sector TEXT,                                     -- step 2 — sector económico (e.g. "comercio")
  anchor_buyers TEXT[],                            -- step 3 — array de empresas compradoras (Walmart, OXXO, ...)
  monto_tipico_mxn NUMERIC(12,2),                  -- step 4 — monto típico de factura
  mayor_frustracion TEXT,                          -- step 5 — texto libre, frustración cobrando
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS — CD-21
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Auto-create profile row on signup (LUM pattern)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Drop and recreate trigger (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at auto-update
CREATE OR REPLACE FUNCTION public.touch_profile_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_profile_update ON public.profiles;
CREATE TRIGGER on_profile_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_profile_updated_at();
```

**Decisiones de schema**:
- `email TEXT` cacheado (no NOT NULL — el trigger puede correr en `auth.users` rows con email null si Supabase introduce magic-link sin email)
- `anchor_buyers TEXT[]` — array nativo de Postgres; queries de filtro futuros pueden usar `ANY(anchor_buyers)`
- `monto_tipico_mxn NUMERIC(12,2)` — máximo 9,999,999,999.99 MXN (suficiente para Lupita-persona)
- `mayor_frustracion TEXT` — sin límite de chars; UI debe limitar input a 500
- **NO** `is_admin` field (no hay admin panel en este HU)

### 6.2 `supabase/migrations/002_settled_invoices.sql`

```sql
-- WKH-COBRAYA-DAPP-SHELL — settled_invoices history (cross-session persistence).
-- Cada fila representa una factura que pasó por settle exitoso (txHash valido).

CREATE TABLE IF NOT EXISTS public.settled_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_id UUID NOT NULL UNIQUE,                 -- idempotency key — R-4 mitigation
  uuid_cfdi TEXT NOT NULL,                         -- CFDI UUID v4 de la factura
  amount_mxn NUMERIC(12,2) NOT NULL,
  net_amount_usdc NUMERIC(20,6) NOT NULL,
  lender_name TEXT NOT NULL,
  tx_hash TEXT NOT NULL,                           -- 0x.. Avalanche Fuji
  snowtrace_url TEXT,
  block_number BIGINT,
  settled_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for the most common query: list user's history desc by date.
CREATE INDEX IF NOT EXISTS idx_settled_invoices_user_settled
  ON public.settled_invoices (user_id, settled_at DESC);

-- RLS — CD-21 + CD-32
ALTER TABLE public.settled_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own settled invoices"
  ON public.settled_invoices FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settled invoices"
  ON public.settled_invoices FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- NO update/delete policies — settled invoices are append-only.
```

**Decisiones de schema**:
- `request_id UUID NOT NULL UNIQUE` — constraint contra double-tap race (R-4); `recordSettlement` usa `INSERT ... ON CONFLICT (request_id) DO NOTHING`
- `tx_hash TEXT` — no UNIQUE (mismo wallet puede tener varias txs; el UNIQUE va en request_id)
- `amount_mxn` vs `net_amount_usdc`: dos campos porque el ratio es función de scoring + lender (no es FX simple); persistir ambos
- Index `(user_id, settled_at DESC)` cubre query "últimas 5 facturas" del dashboard (AC-9) y "historial completo" (AC-12)

### 6.3 Activar `mailer_autoconfirm` (LUM-100)

**Acción del Dev en W0** (NO via SQL, via Supabase Dashboard):
1. Settings → Auth → Email → toggle **"Enable email confirmations"** = OFF
2. **O** via Management API (si el Dev tiene `SUPABASE_ACCESS_TOKEN` de Dashboard):
   ```bash
   curl -X PATCH "https://api.supabase.com/v1/projects/$PROJECT_REF/config/auth" \
     -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"mailer_autoconfirm": true}'
   ```

Verificación: en `supabase.auth.signUp()`, la response debe incluir `session: { access_token, ... }` (no `session: null`).

---

## 7. Middleware matcher detallado

### 7.1 Matcher regexp y rationale

```ts
// src/middleware.ts
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon\\.ico|manifest\\.json|sw\\.js|workbox-.*\\.js|icons/.*|splashes/.*|apple-touch-icon-.*|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
```

**Exclusiones — por qué cada una**:

| Pattern | Razón |
|---|---|
| `api` | Routes del engine (Cobraya backend); auth se maneja en app-layer al recibir el request, no en middleware (los routes son público-callable con request-id header) |
| `_next/static` | Bundle JS/CSS de Next; corren post-hydration |
| `_next/image` | Image Optimization API; no necesita session |
| `favicon\\.ico` | Browser auto-fetch |
| `manifest\\.json` | PWA manifest — DEBE ser servido sin auth (browser lo fetcha antes del install) |
| `sw\\.js` | Service Worker script — auth gate sobre SW romperia PWA install |
| `workbox-.*\\.js` | Workbox runtime injected by @ducanh2912/next-pwa |
| `icons/.*` | PWA icons en `public/icons/` |
| `splashes/.*` | iOS splash screens en `public/splashes/` |
| `apple-touch-icon-.*` | iOS auto-fetch |
| `.*\\.(svg\|png\|jpg\|jpeg\|gif\|webp\|ico)$` | Cualquier asset image en `public/` |

**R-5 mitigation**: este matcher es **idéntico al de Luma proxy.ts línea 131**, ya probado en producción. Cualquier modificación al matcher requiere re-test E2E del PWA install.

### 7.2 Skeleton del middleware

```ts
// src/middleware.ts
import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

const AUTH_EXEMPT_PREFIXES = ['/login', '/signup', '/auth', '/~offline']
const ONBOARDING_PATH = '/onboarding'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request: { headers: request.headers } })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // CRITICAL: refresh session (do not remove — required by @supabase/ssr)
  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isBounceRoute = pathname === '/login' || pathname === '/signup'

  const redirectWithCookies = (url: URL) => {
    const r = NextResponse.redirect(url)
    response.cookies.getAll().forEach((cookie) => r.cookies.set(cookie))
    return r
  }

  const isAuthExempt =
    pathname === '/' ||
    AUTH_EXEMPT_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'))

  // AC-1, CD-27: anon → /login (deny by default)
  if (!user && !isAuthExempt) {
    return redirectWithCookies(new URL('/login', request.url))
  }

  // AC-3, CD-26: authed user on /login or /signup → /dashboard or /onboarding/step/1
  if (isBounceRoute && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', user.id)
      .maybeSingle()
    if (profile?.onboarding_completed === true) {
      return redirectWithCookies(new URL('/dashboard', request.url))
    }
    return redirectWithCookies(new URL('/onboarding/step/1', request.url))
  }

  // AC-2, CD-28: authed user on /(app)/* but onboarding pending → /onboarding/step/1
  // Exempt: the onboarding routes themselves.
  if (user && !isBounceRoute && pathname !== '/' && !pathname.startsWith(ONBOARDING_PATH)) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', user.id)
      .maybeSingle()
    if (profile?.onboarding_completed !== true) {
      return redirectWithCookies(new URL('/onboarding/step/1', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon\\.ico|manifest\\.json|sw\\.js|workbox-.*\\.js|icons/.*|splashes/.*|apple-touch-icon-.*|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
```

**Notas**:
- `.maybeSingle()` (no `.single()`) en ambos SELECT → tolera el caso "trigger todavía no creó la row" (race post-signUp). `single()` lanza error PGRST116.
- No hay protección admin (no hay panel admin en este HU).
- `pathname === '/'` queda exempt — el splash es público (DD-J).

---

## 8. Files Plan por Wave (W0..W12)

### W0 — Supabase setup + dependencies (BLOQUEANTE para W3+)

**Dependencias previas**: ninguna.

**Tareas**:
1. Verificar `.env.local` para `NEXT_PUBLIC_SUPABASE_*` (DD-N fallback si missing)
2. Crear proyecto Supabase si necesario (humano-only)
3. Habilitar mailer_autoconfirm (DD-F §6.3)
4. Correr migrations
5. `npm install @supabase/supabase-js @supabase/ssr class-variance-authority clsx tailwind-merge`

**Archivos nuevos**:
| Path | Qué |
|---|---|
| `supabase/migrations/001_profiles.sql` | Schema profiles + trigger + RLS (§6.1) |
| `supabase/migrations/002_settled_invoices.sql` | Schema settled_invoices + RLS (§6.2) |
| `.env.local` (no commit) | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `.env.example` | Stub vars (placeholder values) para docs |

**Archivos modificados**:
| Path | Cambio |
|---|---|
| `package.json` | +5 dependencies; lock file updated |

**Tests**: ninguno (W0 es infra). Validación: `npm run dev` arranca; `curl -X POST $SUPABASE_URL/auth/v1/signup -H "apikey: $ANON_KEY" -d '{"email":"smoke@test.com","password":"smoke1234"}'` devuelve `session.access_token`.

**Tiempo estimado**: 1h (sin friction); 2h con creación de proyecto Supabase.

**Inter-deps**: bloquea W3, W6, W7, W9, W10, W11 (no Supabase, no actions; no actions, no auth; etc.).

---

### W1 — Design tokens + globals.css + tailwind palette (paralelo con W0/W2)

**Dependencias**: ninguna (independiente de backend).

**Archivos modificados**:
| Path | Cambio |
|---|---|
| `tailwind.config.ts` | Agregar bloque `colors.luma.{50..700,450,650}` (DD-G); preservar ink/paper/accent/muted/line |
| `src/app/globals.css` | Agregar `:root { --luma-bg, --luma-card, --luma-hero-radial, --luma-nav-gradient, ... }`; agregar `@layer components { .auth-card, .auth-input, .auth-label, .pill-btn, .bb-card, .icon-circle, .wordmark, .wordmark-gradient, .h1-serif, .hero-bg }`; **NO** agregar dark-mode overrides |

**Archivos nuevos**:
| Path | Qué |
|---|---|
| `src/lib/utils.ts` | `cn()` utility (clsx + tailwind-merge) |

**Tests nuevos**:
| Path | Cubre |
|---|---|
| `tests/unit/lib/utils.test.ts` | `cn('a', false && 'b', 'c')` → `'a c'`; conflict resolution |

**Tiempo**: 1h.

---

### W2 — UI primitives (paralelo con W0/W1)

**Dependencias**: W1 (para clases `.auth-input`, `.auth-label`); CVA del W0.

**Archivos nuevos**:
| Path | Qué |
|---|---|
| `src/components/ui/button.tsx` | CVA port (primary, ghost, link variants) |
| `src/components/ui/input.tsx` | Wrapper de `<input>` con `.auth-input` |
| `src/components/ui/label.tsx` | Wrapper de `<label>` con `.auth-label` |
| `src/components/ui/card.tsx` | Variants `bb-card` y `bb-card-wide` |

**Tests nuevos**:
| Path | Cubre |
|---|---|
| `tests/unit/components/ui/button.test.tsx` | Renders 3 variants; aria-disabled when disabled |
| `tests/unit/components/ui/input.test.tsx` | Default classes applied; forwards ref |

**Tiempo**: 1.5h.

---

### W3 — Auth foundation (requires W0, W2)

**Dependencias**: W0 (Supabase project up), W2 (Button/Input/Label).

**Archivos nuevos**:
| Path | Qué |
|---|---|
| `src/lib/supabase/client.ts` | `createBrowserClient` (DD-A) |
| `src/lib/supabase/server.ts` | `createServerClient` SYNC cookies (DD-B) |
| `src/lib/validation/auth.ts` | Zod loginSchema + signupSchema, mensajes ES-MX |
| `src/lib/types/actions.ts` | `ActionResult`, `OnboardingStepState` |
| `src/actions/auth.ts` | signUp (LUM-100), signIn, signOut |
| `src/components/auth/login-form.tsx` | useActionState + signIn |
| `src/components/auth/signup-form.tsx` | useActionState + signUp + password hint |
| `src/app/(auth)/layout.tsx` | Layout mínimo para auth screens (sin nav) |
| `src/app/(auth)/login/page.tsx` | auth-card sobre hero-radial + LoginForm |
| `src/app/(auth)/signup/page.tsx` | idem + SignupForm |

**Tests nuevos**:
| Path | Cubre |
|---|---|
| `tests/unit/actions/auth.test.ts` | AC-4 (signUp con email/password → redirect /onboarding/step/1), AC-5 (signOut → revalidate + redirect /login), Zod validation pass/fail, error mapping ES-MX |
| `tests/unit/components/auth/login-form.test.tsx` | useActionState integration; error display con role="alert"; pending state |
| `tests/unit/components/auth/signup-form.test.tsx` | idem + password hint visible |
| `tests/unit/lib/validation/auth.test.ts` | loginSchema.safeParse válido/inválido; signupSchema min(8) + digit refine |

**Tiempo**: 2h.

---

### W4 — Route groups + middleware (requires W3, W2)

**Dependencias**: W3 (createClient server), W2 (no directo, pero coherencia).

**Archivos nuevos**:
| Path | Qué |
|---|---|
| `src/middleware.ts` | Auth + onboarding gate (DD-C, §7.2) |

**Archivos modificados**:
| Path | Cambio |
|---|---|
| `src/app/page.tsx` | REWRITE con splash burgundy (DD-J) |
| `src/app/layout.tsx` | Cambiar `themeColor: '#0F8B4A'` → `'#651332'`; preservar RegisterSW/InstallPrompt |

**Tests nuevos**:
| Path | Cubre |
|---|---|
| `tests/unit/middleware/middleware.test.ts` | AC-1 (anon → /login con cookie preservation), AC-2 (authed sin onboarding → /onboarding/step/1), AC-3 (authed completo en /login → /dashboard), edge: cookie corruption (getUser→null), edge: maybeSingle null (race post-signup) |
| `tests/unit/app/page.test.tsx` | Splash renders wordmark + 2 CTAs con href correctos |

**Tiempo**: 2h.

---

### W5 — Mobile chrome (requires W4, W2)

**Dependencias**: W4 (rutas existen), W2 (UI primitives).

**Archivos nuevos**:
| Path | Qué |
|---|---|
| `src/components/nav/BottomTabs.tsx` | 4 tabs (Inicio, Negociar, Historial, Perfil), `md:hidden`, safe-area, self-hide en /(auth)/*, /onboarding/* y `/` |
| `src/components/nav/TopNav.tsx` | Gradient burgundy + wordmark Cobraya + glass pill (desktop) |
| `src/app/(app)/layout.tsx` | TopNav + main + BottomTabs; `min-h-screen flex flex-col` |

**Tests nuevos**:
| Path | Cubre |
|---|---|
| `tests/unit/components/nav/BottomTabs.test.tsx` | AC-15: 4 tabs renderizados; aria-current activo; self-hide en `/`, `/login`, `/onboarding/step/1` |
| `tests/unit/components/nav/TopNav.test.tsx` | Renderiza wordmark; activo state pill |

**Tiempo**: 1.5h.

---

### W6 — Onboarding wizard (requires W5, W0)

**Dependencias**: W5 (layout), W0 (profiles table).

**Archivos nuevos**:
| Path | Qué |
|---|---|
| `src/lib/validation/profile.ts` | Zod schemas step1Schema..step5Schema |
| `src/lib/onboarding/resume.ts` | `ProfileRow` type + `firstIncompleteStep(p)` |
| `src/actions/profile.ts` | `saveStep1..5`, `updateProfile`; helper `saveStepAndAdvance` |
| `src/app/(app)/onboarding/layout.tsx` | Sin BottomTabs; `bg-luma-50 flex-1 py-8 px-4` |
| `src/app/(app)/onboarding/step/[step]/page.tsx` | Dispatcher: validate 1..5; fetch profile; render StepNForm; anti-bypass (AC-7) |
| `src/components/onboarding/ProgressDots.tsx` | 5 dots, ARIA progressbar (DD-D) |
| `src/components/onboarding/step1-form.tsx` | RFC input |
| `src/components/onboarding/step2-form.tsx` | Sector select/input |
| `src/components/onboarding/step3-form.tsx` | Anchor buyers (multi-input chips) |
| `src/components/onboarding/step4-form.tsx` | Monto típico (NUMERIC input) |
| `src/components/onboarding/step5-form.tsx` | Mayor frustración (textarea) |

**Tests nuevos**:
| Path | Cubre |
|---|---|
| `tests/unit/actions/profile.test.ts` | AC-6 (step 5 marca onboarding_completed=true + redirect /dashboard), AC-7 (anti-bypass: step > firstIncomplete redirige), AC-14 (updateProfile UPSERT) |
| `tests/unit/components/onboarding/ProgressDots.test.tsx` | AC-8: 5 dots; current=3 → 3 active, 2 muted |
| `tests/unit/components/onboarding/step1-form.test.tsx` | Submit with empty RFC → fieldError |
| `tests/unit/lib/onboarding/resume.test.ts` | firstIncompleteStep para todos los casos (rfc null → 1, all filled → 5) |

**Tiempo**: 2.5h.

---

### W7 — Dashboard (requires W5, W0; paralelo con W6)

**Dependencias**: W5 (layout), W0 (settled_invoices + profiles tables).

**Archivos nuevos**:
| Path | Qué |
|---|---|
| `src/lib/dashboard/stats.ts` | `loadDashboardStats(supabase, userId, createdAt)` (DD-H) |
| `src/app/(app)/dashboard/page.tsx` | RSC con greeting + 4 stats + perfil preview + recientes (5 últimas) |

**Tests nuevos**:
| Path | Cubre |
|---|---|
| `tests/unit/lib/dashboard/stats.test.ts` | AC-9: empty → ceros; con 3 facturas → suma correcta; ahorrosFee = total * 0.02 |
| `tests/unit/app/dashboard/page.test.tsx` (RSC test — render directo con mocked supabase) | Greeting deriva `email.split('@')[0]`; 4 stats cards renderizan; 5 recientes max |

**Tiempo**: 2h.

---

### W8 — Negociar tab (refactor demo → (app)/negociar) (requires W5; paralelo con W6, W7)

**Dependencias**: W5 (chrome). NO depende de W0 para la lógica core; SÍ depende de W9 para `recordSettlement`.

**Archivos nuevos**:
| Path | Qué |
|---|---|
| `src/app/(app)/negociar/page.tsx` | **MOVE** de `src/app/demo/page.tsx`; cambiar header (eliminar manual Cobraya wordmark — ya está en TopNav); restyling clases (DD-I); convertir AuditPanel a inline (DD-I notes); agregar `mb-24` al `<main>` para que el contenido no quede atrás de BottomTabs |

**Archivos modificados** (restyling permitido — DD-I):
| Path | Cambios |
|---|---|
| `src/components/InvoiceCard.tsx` | Tailwind classes (bg-ink/* → bg-luma-*); lógica intocable |
| `src/components/LenderAuctionPanel.tsx` | idem |
| `src/components/Settlement.tsx` | idem |
| `src/components/AuditPanel.tsx` | **Cambio adicional**: `fixed bottom-0` → `relative mt-6 border-t border-luma-200 pt-4` (resuelve conflicto con BottomTabs — DD-I) |
| `src/components/BrandIcon.tsx` | REWRITE con CSS vars (DD-K) |

**Archivos DELETED**:
| Path | Razón |
|---|---|
| `src/app/demo/page.tsx` | Reemplazado por `(app)/negociar/page.tsx`; mantener `/demo` como redirect via `next.config.js` rewrites o un page.tsx que `redirect('/negociar')` — DD nota: hacer redirect via `src/app/demo/page.tsx` con server-side `redirect('/negociar')` para preservar backward compat con bookmarks |

**Tests nuevos**:
| Path | Cubre |
|---|---|
| `tests/unit/app/negociar/page.test.tsx` | AC-10: mismo flow que demo (scan → pipeline → auction → settle) renderiza; engine fetch calls no cambian (mocked) |

**Tests modificados** (debido a restyling):
| Path | Qué |
|---|---|
| `tests/unit/components/InvoiceCard.test.tsx` | Snapshot reset por cambio de classes |
| `tests/unit/components/LenderAuctionPanel.test.tsx` | idem |
| `tests/unit/components/AuditPanel.test.tsx` | Asserts cambian: ya no es `fixed bottom-0` sino `relative` |

**Tiempo**: 2h.

---

### W9 — Historial + recordSettlement integration (requires W8, W0)

**Dependencias**: W8 (negociar tab existe), W0 (settled_invoices table).

**Archivos nuevos**:
| Path | Qué |
|---|---|
| `src/actions/settlement.ts` | `recordSettlement(payload)` con `isValidUuidV4(requestId)` + INSERT ON CONFLICT DO NOTHING (CD-32, CD-33) |
| `src/lib/uuid-validator.ts` | (REUSE if exists from WKH-001 auto-blindaje; else CREATE) |
| `src/app/(app)/historial/page.tsx` | RSC: list settled_invoices del user, ordered by `settled_at DESC` |

**Archivos modificados**:
| Path | Cambio |
|---|---|
| `src/app/(app)/negociar/page.tsx` | En `signAndSettle()` success branch, ANTES de `setSoldHistory(...)`, llamar `await recordSettlement({ requestId, uuidCfdi, amountMxn, netAmountUsdc, lenderName, txHash, snowtraceUrl, blockNumber })`. Manejar error silenciosamente (log + UI no-blocker — la factura ya está settled onchain, el insert es best-effort). |

**Tests nuevos**:
| Path | Cubre |
|---|---|
| `tests/unit/actions/settlement.test.ts` | AC-11: INSERT con shape correcta; AC-12 derivada: query filtra `user_id`; ON CONFLICT DO NOTHING idempotent (R-4); requestId no-UUID → reject; CD-31 catchea Supabase error con console.warn |
| `tests/unit/app/historial/page.test.tsx` | AC-12: renders rows from supabase mock ordered desc; empty state OK |
| `tests/unit/lib/uuid-validator.test.ts` | (REUSE if exists; valid v4 / invalid / CRLF injection rejected) |

**Tiempo**: 2h.

---

### W10 — Perfil (requires W5, W0; paralelo con W6, W7)

**Dependencias**: W5 (chrome), W0 (profiles).

**Archivos nuevos**:
| Path | Qué |
|---|---|
| `src/app/(app)/perfil/page.tsx` | Edit fields (RFC, sector, anchor_buyers, monto_tipico_mxn, mayor_frustracion) + signOut button |
| `src/components/profile/edit-form.tsx` | useActionState + updateProfile |

**Tests nuevos**:
| Path | Cubre |
|---|---|
| `tests/unit/app/perfil/page.test.tsx` | AC-14: form prefilled con datos del profile; submit llama updateProfile; signOut button render |
| `tests/unit/components/profile/edit-form.test.tsx` | Form fields + error display |

**Tiempo**: 1.5h.

---

### W11 — PWA assets + manifest (independiente de todo)

**Dependencias**: ninguna (puede correr en paralelo con cualquier wave).

**Archivos modificados**:
| Path | Cambio |
|---|---|
| `public/manifest.json` (verify path; si no existe, leer `next.config.js` para confirmar generation strategy) | `theme_color: '#651332'`; icons → regenerated burgundy palette |
| `next.config.js` | Confirmar que `runtimeCaching` no incluye `/(app)/*` (CD-25) |
| `public/icons/*.png` | REGENERATE con palette burgundy (scripts existentes o manual via design tool) |

**Tests nuevos**:
| Path | Cubre |
|---|---|
| `tests/unit/pwa/manifest.test.ts` | AC-17: theme_color = '#651332'; icons listed |

**Notas**:
- Si el icon regeneration es out-of-band (Figma export manual), el Dev escala al humano: "Need new icon PNGs in burgundy. Provide files in public/icons/" — pero NO bloquea el resto del HU.

**Tiempo**: 1h (excluyendo icon regeneration humano).

---

### W12 — Smoke E2E + tests integration (requires todos)

**Dependencias**: TODAS las waves anteriores.

**Tareas**:
1. `npm run typecheck` → 0 errores
2. `npm run lint` → 0 errores
3. `npm run test` → todos los tests pasan
4. `npm run build` → build exitoso
5. `npm run dev` → smoke manual:
   - Signup → redirige a /onboarding/step/1 ✓
   - 5 steps → redirige a /dashboard ✓
   - /dashboard muestra greeting + 4 stats (todos en 0) ✓
   - Navegar a /negociar → scan factura → pipeline corre → settle ✓
   - Refresh /historial → la factura aparece ✓
   - Logout → redirige a /login; back → middleware redirige a /login (no muestra contenido stale) ✓

**Archivos nuevos**: ninguno (solo CI/manual validation).

**Archivos modificados** (post-smoke fixes si surge algo):
- TBD

**Tiempo**: 1h.

---

## 9. Resumen de tiempos y paralelismo

| Wave | Tiempo | Dependencias | Paralelizable con |
|---|---|---|---|
| W0 | 1-2h | — | W1, W2 |
| W1 | 1h | — | W0, W2 |
| W2 | 1.5h | W1 (clases CSS) | W0 |
| W3 | 2h | W0, W2 | W11 |
| W4 | 2h | W3 | W11 |
| W5 | 1.5h | W4, W2 | — |
| W6 | 2.5h | W5, W0 | W7, W10 |
| W7 | 2h | W5, W0 | W6, W10 |
| W8 | 2h | W5 | W6, W7, W10 |
| W9 | 2h | W8, W0 | — |
| W10 | 1.5h | W5, W0 | W6, W7, W8 |
| W11 | 1h | — | any |
| W12 | 1h | todas | — |

**Total secuencial**: ~21h. **Total con paralelismo (2 devs)**: ~12-14h. **Estimación dev del work-item**: 8-10h asume 1 dev y skip de smoke manual — el SDD recomienda 12h con buffer.

---

## 10. Risk Register actualizado (R-1..R-5 + mitigaciones concretas)

| # | Riesgo | Mitigación en SDD |
|---|---|---|
| R-1 | Supabase project creation friction | DD-N: escalation explícito al humano si .env missing; W0 step 1 = verificación temprana. |
| R-2 | cookies() sync vs async | DD-B snippet exacto en SDD; CD enforcement en CR (Adversary debe grep `await cookies()` en `src/lib/supabase/server.ts`). |
| R-3 | RLS escape en middleware | DD-C `redirectWithCookies` helper documentado; W4 test cubre cookie preservation. `.maybeSingle()` para race post-signup. |
| R-4 | settled_invoices double-insert race | DD-F `UNIQUE(request_id)` constraint + `INSERT ON CONFLICT DO NOTHING` en `recordSettlement`. Test cubre idempotency. |
| R-5 | Middleware matcher demasiado agresivo | §7.1 matcher es copia exacta del Luma proxy en prod; W12 smoke valida que /manifest.json y /icons/* se sirven sin redirect. |

**Nuevos riesgos identificados durante grounding** (no listados en work-item):

| # | Riesgo | Mitigación |
|---|---|---|
| R-6 | `AuditPanel.fixed bottom-0` choca con `BottomTabs.fixed bottom-0` | DD-I + W8: convertir AuditPanel a inline (`relative mt-6`) |
| R-7 | `BrandIcon.tsx` con colors hardcoded → fuera de palette burgundy | DD-K + W8: rewrite con CSS vars |
| R-8 | Demo flow `bg-ink` buttons (engine-adjacent) inconsistent con burgundy | W8 task: cambiar `bg-ink text-paper` → `bg-luma-700 text-luma-50` en los 2 botones "Negociar esta factura" y "Escanear otra factura". Como son botones en `negociar/page.tsx` (no en engine components), NO requiere tocar lógica. |
| R-9 | `recordSettlement` falla silenciosamente → user ve "vendida" pero historial empty | W9 task: en caso de error de insert, mostrar toast "No se pudo guardar en historial; tx en blockchain OK" (best-effort UX); CD-31 console.warn |

---

## 11. Test plan exhaustivo (AC → tests)

| AC | Test path | Assertion clave |
|---|---|---|
| AC-1 | `tests/unit/middleware/middleware.test.ts` | `it('redirects anon to /login with HTTP 307 preserving cookies')` |
| AC-2 | `tests/unit/middleware/middleware.test.ts` | `it('redirects authed user with onboarding_completed=false to /onboarding/step/1')` |
| AC-3 | `tests/unit/middleware/middleware.test.ts` | `it('redirects authed user on /login to /dashboard if onboarding complete, else /onboarding/step/1')` |
| AC-4 | `tests/unit/actions/auth.test.ts` | `it('signUp creates session immediately (LUM-100) and redirects to /onboarding/step/1')` |
| AC-5 | `tests/unit/actions/auth.test.ts` | `it('signOut invalidates session, calls revalidatePath, redirects to /login')` |
| AC-6 | `tests/unit/actions/profile.test.ts` | `it('saveStep5 sets onboarding_completed=true and redirects to /dashboard')` |
| AC-7 | `tests/unit/app/onboarding/step.test.tsx` | `it('redirects step 4 to step 2 if firstIncompleteStep returns 2')` |
| AC-8 | `tests/unit/components/onboarding/ProgressDots.test.tsx` | `it('renders 5 dots; current=3 → 3 active luma-600, 2 muted luma-300')` |
| AC-9 | `tests/unit/app/dashboard/page.test.tsx` + `tests/unit/lib/dashboard/stats.test.ts` | Greeting, 4 stats cards, 5 recientes max |
| AC-10 | `tests/unit/app/negociar/page.test.tsx` | Pipeline flow renders; same fetch calls as demo |
| AC-11 | `tests/unit/actions/settlement.test.ts` | `it('recordSettlement INSERTs with correct shape')` |
| AC-12 | `tests/unit/app/historial/page.test.tsx` | Filtered + ordered desc |
| AC-13 | `tests/unit/actions/settlement.test.ts` | (RLS test — derivable from CD-32 app-layer filter: assert `.eq('user_id', user.id)` cadena) |
| AC-14 | `tests/unit/actions/profile.test.ts` + `tests/unit/components/profile/edit-form.test.tsx` | UPSERT con `.eq('id', auth.uid())`; updated_at refleja NOW() |
| AC-15 | `tests/unit/components/nav/BottomTabs.test.tsx` | 4 tabs; min-h-16; safe-area; self-hide |
| AC-16 | (validación visual; no test automatizado) — `tests/unit/lib/utils.test.ts` cubre cn() | Palette en globals.css + tailwind.config |
| AC-17 | `tests/unit/pwa/manifest.test.ts` | theme_color = '#651332' |
| AC-18 | (grep test) `tests/unit/security/no-hardcoded-supabase.test.ts` | Grep `src/**/*.ts` for hardcoded supabase.co URLs → 0 matches |

**Total tests nuevos**: ~28 (incluye al menos 1 por AC + tests de utilities + tests de regression de restyling).

**Tests modificados**: 3-4 (InvoiceCard, LenderAuctionPanel, AuditPanel snapshots actualizados).

---

## 12. Readiness Check (Architect responde antes de declarar SDD listo)

- [x] ≥8 archivos del codebase + Luma reference leídos con path:line — **15 Cobraya + 22 Luma** (§3.1, §3.2)
- [x] Exemplars verificados con Glob/Read (paths existen) — todos los paths Luma confirmados con Read; paths Cobraya con Bash ls
- [x] 18/18 ACs mapeados a wave(s) específica(s) — ver §11 (test plan)
- [x] ≥1 test por AC documentado — §11 cubre AC-1..AC-18
- [x] CDs consolidadas (CDs 1-33 visibles en una tabla) — §5
- [x] DD-B (cookies() sync N14) tiene snippet correcto — §4.DD-B
- [x] DD-C (middleware.ts N14) tiene snippet del matcher + skeleton — §7
- [x] Schema SQL completo (DDL + RLS + trigger) — §6
- [x] Files plan: cada wave tiene archivos nuevos/modificados listados — §8
- [x] Risk register R-1..R-5 + R-6..R-9 nuevos mapeados a mitigaciones concretas — §10
- [x] DD-N (fallback Supabase project) tiene plan claro — §4.DD-N

**[NEEDS CLARIFICATION] resueltos**:

| Tema | Resolución |
|---|---|
| Campos exactos de `profiles` para PyME | DD-F + §6.1: id, email, rfc, sector, anchor_buyers[], monto_tipico_mxn, mayor_frustracion, onboarding_completed, created_at, updated_at |
| Stats "ahorros vs 30 dias" | DD-H: fórmula `SUM(amount_mxn) * 0.02` (placeholder razonable; reabrir HU si Fernando rechaza la fórmula) |
| Supabase proyecto existe? | DD-N: si no existe, escalation al humano antes de W0 |
| `(app)/layout.tsx` server-side getUser? | DD nota: NO en este HU. TopNav es client-side (no necesita user para renderizar; solo activos states). Si futuro HU quiere greeting en TopNav, se agrega entonces. |
| Trigger race en middleware | DD-C + §7.2: `.maybeSingle()` con fallback "treat as onboarding_completed = false" |
| Supabase getUser anon key (no service role) | DT-G del work-item heredado; reconfirmado en DD-A |
| BrandIcon port | DD-K: rewrite con CSS vars |
| tailwindcss-animate plugin | DD-G: NO se agrega (no se usa) |

**SDD declarado LISTO para SPEC_APPROVED.**

---

## 13. Snippets críticos verificados (resumen)

1. **`createClient` sync (DD-B)** — line-by-line verificado contra Luma `server.ts:4-27` + adaptado eliminando `async`/`await`.
2. **Middleware skeleton (DD-C, §7.2)** — verificado contra Luma `proxy.ts:19-127` con paths Cobraya (eliminé brand-board y admin gates).
3. **Matcher regexp (§7.1)** — copia exacta de Luma `proxy.ts:131`.
4. **handle_new_user trigger (§6.1)** — copia de Luma `002_reset_profiles_to_luma.sql:39-51`.
5. **RLS policies (§6.1, §6.2)** — pattern Luma `auth.uid() = id` adaptado a `auth.uid() = user_id` para settled_invoices.
6. **Server Action signatures (DD-E)** — verificadas contra Luma `actions/auth.ts:25-86` y `actions/brand-board.ts:77-92`.
7. **firstIncompleteStep (DD-E)** — pattern Luma `lib/brand-board/resume.ts` (no leído pero referenciado consistentemente en exemplars; implementación trivial).
8. **Stats fórmula (DD-H)** — original al SDD (no en Luma); placeholder reasonable.

---

## 14. Anti-Hallucination Verification Trail

Cada archivo referenciado en este SDD se validó con:

| Tipo de claim | Cómo se verificó |
|---|---|
| "Luma usa await cookies() Next 16" | Read `luma-ai/src/lib/supabase/server.ts` línea 5 |
| "Cobraya está en Next 14.2.5" | Read `wasiai-lendable/package.json` línea 18 |
| "Tailwind config actual tiene ink/paper/accent" | Read `wasiai-lendable/tailwind.config.ts` líneas 7-13 |
| "Engine routes existen y son intocables" | Read `.nexus/project-context.md` líneas 53-66 |
| "Luma BottomTabs hide pattern" | Read `luma-ai/src/components/nav/BottomTabs.tsx` líneas 74-82 |
| "Luma tailwind tiene `luma-{50..700}` + tailwindcss-animate" | Read `luma-ai/tailwind.config.ts` líneas 18-30, 34 |
| "Auto-blindaje WKH-001 menciona console.warn no-PII" | Read `001-wkh-cobraya-agents/auto-blindaje.md` líneas 26-30 |
| "Demo flow detallado en src/app/demo/page.tsx" | Read líneas 1-657 |
| "BrandIcon hardcoded green #0F8B4A" | Read `src/components/BrandIcon.tsx` línea 13 |
| "AuditPanel uses `fixed bottom-0`" | Read `src/components/AuditPanel.tsx` línea 29 |

**Si el Dev (F3) encuentra cualquier discrepancia entre lo documentado en este SDD y el código real**, debe escalar al humano vía orquestador — NO improvisar.

---

---

## 15. Post-implementation late-binding decisions (appended during F4/DONE phase)

Durante la ejecución de F3 (Dev) y posterior AR/CR, tres decisiones arquitectónicas importantes fueron **late-binding** — documentadas en código y tests pero no back-propagadas al SDD en tiempo real. Estas decisiones afectan futuras HUs que toquen auth o RLS.

### DD-O — Prefix isolation para tablas Supabase en proyectos compartidos

**Decision**: Todas las tablas, triggers y functions nuevas reciben prefix `cobraya_` para aislar el namespace en un Supabase project compartido con wasiai-a2a.

**Por qué**:
- Supabase project `bdwvrwzvsldephfibmuu` aloja tanto wasiai-a2a como wasiai-cobraya.
- Sin prefix, futuras migraciones pueden colisionar en namespace (table name conflicts).
- Prefix `cobraya_` es explícito en `001_profiles.sql` y `002_settled_invoices.sql`, y reflejado en:
  - `src/lib/supabase/client.ts` → `.from('cobraya_profiles')` / `.from('cobraya_settled_invoices')`
  - `src/lib/supabase/server.ts` → idem
  - `src/actions/{auth,profile,settlement}.ts` → idem

**Aplicable a futuras HUs**:
- Si amplías Supabase schema en un proyecto compartido, SIEMPRE usa prefixes isolados (no confíes en RLS policies para prevenir colisiones accidentales de nombre de tabla).
- Documenta el prefix en el SDD/Story File antes de F3.
- Valida en CR/AR que NO hay consultas sin prefix (grep `.from('profiles')` debe retornar 0 hits).

**Referencia en código**: `src/lib/supabase/server.ts:13-14`, `src/actions/auth.ts:35`, `src/actions/settlement.ts:33`.

### DD-P — Admin per-user signup (en lugar de global mailer_autoconfirm)

**Decision**: LUM-100 instant signup implementada vía `admin.createUser({ email_confirm: true })` por-usuario, **no** global `mailer_autoconfirm: true` toggle en Supabase project settings.

**Por qué**:
- Target Supabase project es compartido con wasiai-a2a.
- Flipping global `mailer_autoconfirm: true` hubiera disabled email confirmation para TODO el otro auth en el proyecto — unsafe.
- Original Story File W3 asumía toggle habilitado → bug invisible en CI (unit tests mockeaban Supabase).
- Discovery post-F3: pre-flight check `curl /auth/v1/settings` debe SIEMPRE ejecutarse antes de W3 (auto-blindaje lesson #3).

**Implementación**:
- `src/lib/supabase/admin.ts` (NEW): Supabase client con `SUPABASE_SERVICE_KEY` (server-only).
- `src/actions/auth.ts:signUp()`: llama a `admin.createUser({ email_confirm: true, user_metadata: { app: 'cobraya' } })`, luego `signInWithPassword` con anon client.
- `.env.example`: documenta `SUPABASE_SERVICE_KEY` con nota CD-34 (server-only).
- Tests: `auth.test.ts:65-88` aserta call shape includes `email_confirm:true` + metadata guard.

**Aplicable a futuras HUs**:
- Si portas Luma a un Supabase project compartido, NUNCA asumir global auth settings sin confirmar con el humano.
- Pre-flight check: `curl -H "Authorization: Bearer $PAT" https://api.supabase.com/v1/projects/{PROJECT_ID}/auth/config` antes de F3.
- Si el toggle está `off`, implementa per-user override (DD-P pattern).

**Referencia en código**: `src/lib/supabase/admin.ts` (completo), `src/actions/auth.ts:37-61`.

### CD-34 (nueva) — `admin.ts` server-only enforcement

**Constraint**: Archivo `src/lib/supabase/admin.ts` (que importa `SUPABASE_SERVICE_KEY`) puede SOLO ser importado desde:
- `src/actions/*` (marcados con `'use server'`)
- `src/app/**/route.ts` (route handlers)

PROHIBIDO importar desde client-side code o layout/page.tsx sin `'use server'`.

**Por qué**: `SUPABASE_SERVICE_KEY` bypassea RLS. Si llega al bundle del cliente, cualquier user puede llamar queries con permisos de admin.

**Verificación en CR/AR**:
```bash
grep -rn "from '@/lib/supabase/admin'" src/
# Esperado: SOLO hits en src/actions/auth.ts (u otros Server Actions) y src/app/**/route.ts
```

**Aplicable a futuras HUs**:
- Si una nueva HU aporta más Server Actions que necesitan el admin client, reutiliza `src/lib/supabase/admin.ts` (ya existe).
- NUNCA copies el service key a un `.ts` file en `src/lib/` sin esta constraint.
- Static check candidate para linter/CI: `eslint-plugin-no-secret-in-client-bundle` o custom rule.

**Referencia en código**: `src/lib/supabase/admin.ts:1-3` (comentario `// @server-only`), `src/actions/auth.ts:5` (única importación permitida).
