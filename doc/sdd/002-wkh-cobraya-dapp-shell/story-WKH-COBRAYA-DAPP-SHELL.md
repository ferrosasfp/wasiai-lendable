# Story File — WKH-COBRAYA-DAPP-SHELL

> **Single source of truth for Dev in F3.** Do not read the SDD or work-item during F3 — everything is here.
>
> **Fecha**: 2026-05-16 · **Architect**: nexus-architect · **Phase**: F2.5
> **SDD source**: `doc/sdd/002-wkh-cobraya-dapp-shell/sdd.md` · **Work item**: `work-item.md`

---

## §1 — Quick reference card

| Item | Value |
|---|---|
| **Repo** | `/home/ferdev/.openclaw/workspace/wasiai-lendable` |
| **Branch base** | `main` @ `70f0d7d` |
| **Branch nueva** | `feat/wkh-cobraya-dapp-shell` |
| **Existing tests must stay green** | **77/77** (vitest 1.6.1) |
| **New tests expected** | **~28** (1+ per AC; full list §11) |
| **Commits expected** | **13** (1 per wave) |
| **Stack** | Next 14.2.5, React 18.3.1, TypeScript 5.5.3 strict |
| **New deps** | `@supabase/supabase-js`, `@supabase/ssr`, `class-variance-authority`, `clsx`, `tailwind-merge` |
| **Auth pattern** | Server Actions (`'use server'`) — NO new API routes |
| **No `--no-verify`** | All commits must pass pre-commit hooks |
| **No `any`** | TypeScript strict enforced |
| **Engine intocable** | See §6 (full list — modifying any of these triggers escalation) |
| **PR title** | `feat(WKH-COBRAYA-DAPP-SHELL): mobile dapp shell + supabase auth + onboarding` |
| **Luma reference repo** | `/home/ferdev/.openclaw/workspace/luma-ai/` (READ-ONLY — do not modify) |

**Gate before W12 declare DONE**: §14 Pre-merge checklist.

---

## §2 — Decisions ya tomadas (DD-A..DD-N)

These decisions are CLOSED. Do not re-litigate. Implement exactly as specified.

### DD-A — Supabase + @supabase/ssr (vs NextAuth)
Use `@supabase/supabase-js` + `@supabase/ssr`. Auth+DB+RLS in one service. NextAuth requires separate DB adapter. **Closed by Fernando.**

### DD-B — `createClient` SYNC for Next 14 cookies()
Luma uses Next.js 16 with `await cookies()`. Cobraya is **Next.js 14.2.5** where `cookies()` is **synchronous**. If you copy Luma's `await cookies()`, TypeScript compiles but you get runtime error `cookieStore.getAll is not a function`. **This is the #1 bug risk (R-2).**

**EXACT snippet for `src/lib/supabase/server.ts` (copy line by line)**:

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

Consumers call `const supabase = createClient()` — **no `await`**.

### DD-C — Middleware: `src/middleware.ts` (NOT `proxy.ts`)
Luma uses `src/proxy.ts` (Next 16 convention). Cobraya is Next 14 → use `src/middleware.ts`. Default export name is `middleware`, plus `export const config = { matcher: [...] }`.

**Matcher (port exacto de Luma proxy.ts:131)**:

```ts
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon\\.ico|manifest\\.json|sw\\.js|workbox-.*\\.js|icons/.*|splashes/.*|apple-touch-icon-.*|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
```

Full middleware skeleton in §9.

### DD-D — Wizard onboarding route group + step-by-step Server Actions
Onboarding lives at `src/app/(app)/onboarding/` with its **own `layout.tsx` WITHOUT BottomTabs** (because user can't yet navigate freely). Dynamic route `step/[step]/page.tsx`. Anti-bypass via `firstIncompleteStep(profile)`: if requested step > allowed → redirect to allowed.

### DD-E — Server Actions API contract
All mutations use Server Actions (`'use server'`) with uniform signatures. Full type contracts in §7.

### DD-F — 2 SQL migrations
`supabase/migrations/001_profiles.sql` + `supabase/migrations/002_settled_invoices.sql`. Full DDL+RLS+trigger in §8.

### DD-G — Tailwind palette coexists
**DO NOT remove** `colors.{ink,paper,accent,muted,line}` from current config. **ADD** `colors.luma.{50,100,200,300,400,450,500,600,650,700}`. Engine-adjacent components use `ink` classes — removing them breaks tests and forces touching logic (Scope: only restyling allowed). `tailwindcss-animate` plugin → **NOT added** (Cobraya doesn't need confetti).

### DD-H — Stats fórmulas exactas
4 dashboard stats derived from `settled_invoices` + `profiles.created_at`:
- `facturasNegociadas = count(settled_invoices) WHERE user_id`
- `totalUsdc = sum(net_amount_usdc)`
- `ahorrosFee = sum(amount_mxn) * 0.02` *(placeholder — 2.5% trad fee minus 0.5% Cobraya)*
- `diasConCobraya = floor((now - profiles.created_at) / 86400000)`

Full impl `src/lib/dashboard/stats.ts` — see W7 snippet.

### DD-I — Restyling permitido en componentes engine-adjacent
**Permitted**: ONLY Tailwind class changes per the mapping table (§5 wave W8 snippets). **Prohibited**: any `useState`, `useEffect`, props, handlers, conditional render, `fetch`, engine type imports.

**AuditPanel exception**: change `fixed bottom-0` → `relative mt-6 border-t border-luma-200 pt-4` (resolves conflict with BottomTabs `fixed bottom-0`).

### DD-J — Splash burgundy en `src/app/page.tsx`
REWRITE complete. Replace marketing hero with radial burgundy + wordmark "Cobraya" + 2 CTAs ("Comenzar" → `/signup`, "Ya tengo cuenta" → `/login`). Full JSX in W4 snippets.

### DD-K — BrandIcon rewrite con CSS vars
`fill="var(--luma-700, #5B0426)"` and `fill="var(--luma-50, #FCF7F3)"` replacing hardcoded `#0F8B4A` / `#FCF7F3`. Fallback hex covers icon rasterization context. Full snippet in W8.

### DD-L — `profiles.onboarding_completed` is source of truth
Boolean column, default FALSE. Step 5 atomically sets `mayor_frustracion + onboarding_completed = true`. **Do NOT derive** completed from "all PyME fields non-null".

### DD-M — Test strategy: 3 layers + `vi.mock` for Supabase
1. Server Action unit tests (mock `createClient`)
2. Middleware unit tests (mock `NextRequest`, `createServerClient`)
3. Component tests (RTL + jest-dom)

**NEVER** call real Supabase in `vitest run` (CD-29).

### DD-N — Fallback if Supabase project missing
If `.env.local` has no `NEXT_PUBLIC_SUPABASE_*` after verification in W0 → **ESCALATE to human BEFORE proceeding**. Do not improvise. Exact escalation message:

> "BLOCKER W0: Supabase project credentials missing. Need either:
> (a) NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local, OR
> (b) instructions to create new project at supabase.com/dashboard and enable mailer_autoconfirm via Settings > Auth > Email."

---

## §3 — Constraint Directives (CD-1..CD-33)

Scan this block before each wave commit. Violating any CD = BLOQUEANTE in AR.

| # | Type | Summary |
|---|---|---|
| CD-1..CD-18 | INHERITED | From WKH-COBRAYA-AGENTS (engine, onchain, audit). CD-1 (no hardcoded secrets) and CD-17 (no caching of payment paths) most relevant here. |
| CD-19 | PROHIBIDO | Modify any Engine file in §6. Modification → escalate to human. |
| CD-20 | OBLIGATORIO | Server Actions for auth/profile/settlement. NO new API routes. |
| CD-21 | OBLIGATORIO | RLS on `profiles` (`auth.uid() = id` for SELECT/UPDATE) and `settled_invoices` (`auth.uid() = user_id` for SELECT/INSERT). |
| CD-22 | OBLIGATORIO | ES-MX in all user-visible copy. Translate Supabase error messages before display. |
| CD-23 | OBLIGATORIO | Mobile-first. Touch targets ≥48px. `env(safe-area-inset-bottom)` in BottomTabs. `max-w-sm`/`max-w-md` for auth cards. |
| CD-24 | OBLIGATORIO | Supabase config ONLY from `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. NO hardcoded URLs/keys in `src/`. |
| CD-25 | PROHIBIDO | Adding `/auth/*` or `/(app)/*` to SW cache as NetworkFirst/StaleWhileRevalidate. Cookie-dependent routes → NetworkOnly. |
| CD-26 | OBLIGATORIO | Authed user on `/login` or `/signup` → middleware redirects to `/dashboard` or `/onboarding/step/1`. |
| CD-27 | OBLIGATORIO | `/(app)/*` requires session. Middleware redirects anon to `/login` BEFORE hydration. |
| CD-28 | OBLIGATORIO | `onboarding_completed = false` (or no profile) → redirect to `/onboarding/step/1` for `/(app)/*` except `/onboarding/*`. |
| CD-29 | OBLIGATORIO | Tests use `vi.mock` of Supabase client. NO real Supabase calls in `vitest run`. |
| CD-30 | OBLIGATORIO | Escalate to human BEFORE modifying any Engine file. No "just one line". |
| CD-31 | OBLIGATORIO | Server Actions catching Supabase errors log via `console.warn('[cobraya-action]', { action, errorCode })`. **NEVER** log `err.message` or `err.stack` (PII/key leak risk). |
| CD-32 | OBLIGATORIO | Queries to `settled_invoices` filter by `user_id = auth.uid()` in app-layer + RLS. Defense in depth. |
| CD-33 | OBLIGATORIO | `recordSettlement` validates `requestId` as UUID v4 via `isValidUuidV4()` before INSERT. `src/lib/uuid-validator.ts` already exists (verified) — reuse. |

---

## §4 — Anti-Hallucination Check (PRE-F3 mandatory)

Execute these checks BEFORE creating the branch. Each must pass.

- [ ] `git log -1 --oneline` shows `70f0d7d` (or branch `main` HEAD = `70f0d7d`)
- [ ] `git status` shows clean working tree
- [ ] `cat package.json | grep '"next":'` shows `"next": "14.2.5"`
- [ ] `cat package.json | grep '"react":'` shows `"react": "18.3.1"`
- [ ] `cat package.json | grep '"typescript":'` shows `"typescript": "5.5.3"`
- [ ] `npm test` → **77/77 passed**
- [ ] `npx tsc --noEmit` → 0 errors
- [ ] `doc/sdd/002-wkh-cobraya-dapp-shell/sdd.md` exists (SPEC_APPROVED)
- [ ] `ls /home/ferdev/.openclaw/workspace/luma-ai/src/lib/supabase/server.ts` (read-only reference)
- [ ] `ls src/lib/uuid-validator.ts` → file EXISTS (reuse from WKH-001 — verified)
- [ ] `ls supabase/` → directory does NOT exist (will be created in W0)
- [ ] `ls src/middleware.ts` → file does NOT exist (will be created in W4)
- [ ] **Create branch**: `git checkout -b feat/wkh-cobraya-dapp-shell` BEFORE any edit

If any of the above fails → STOP and escalate.

---

## §5 — Waves W0..W12 with step-by-step instructions

Each wave: goal → files NEW → files MODIFIED → files DELETED → critical snippets → tests → smoke check → commit message → ACs covered.

### W0 — Supabase setup + dependencies

**Goal**: have Supabase project credentials in `.env.local`, both migrations applied, 5 new npm deps installed. Bloqueante para W3+.

**Step 1 — verify env**:
```bash
test -f .env.local && grep -q NEXT_PUBLIC_SUPABASE_URL .env.local && echo "OK env" || echo "MISSING — ESCALATE (DD-N)"
```
If MISSING → ESCALATE with the DD-N message in §2 above. Do not proceed.

**Step 2 — install deps**:
```bash
npm install @supabase/supabase-js @supabase/ssr class-variance-authority clsx tailwind-merge
```

**Step 3 — create `.env.example`** (commit this; never commit `.env.local`):

```
# Supabase (LUM-100 mailer_autoconfirm ON)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**Step 4 — create migration files**. Full SQL in §8.

**Step 5 — apply migrations**:
- Option A (preferred): `supabase db push` if Supabase CLI is available
- Option B: paste each `.sql` file content into Supabase Dashboard → SQL Editor → Run

**Step 6 — enable mailer_autoconfirm**:
- Supabase Dashboard → Settings → Auth → Email → toggle "Enable email confirmations" = **OFF**
- Smoke verify via curl (§12)

**Files NEW**:
- `supabase/migrations/001_profiles.sql` (full SQL §8.1)
- `supabase/migrations/002_settled_invoices.sql` (full SQL §8.2)
- `.env.example` (stub above)

**Files MODIFIED**:
- `package.json` + `package-lock.json` (npm install side-effect)

**Tests**: none (W0 is infra).

**Smoke check post-wave**:
```bash
npx tsc --noEmit && echo "OK tsc" && ls supabase/migrations/ | wc -l
# Expected: 0 errors + 2 migration files
```

**Commit message**:
```
chore(WKH-COBRAYA-DAPP-SHELL): W0 — supabase migrations + ssr deps

- supabase/migrations/001_profiles.sql (RLS + handle_new_user trigger)
- supabase/migrations/002_settled_invoices.sql (RLS + idempotency unique)
- deps: @supabase/supabase-js, @supabase/ssr, cva, clsx, tailwind-merge
- mailer_autoconfirm ON via dashboard (LUM-100)
```

**ACs covered**: foundation for AC-1..AC-18 (no direct AC pass).

---

### W1 — Design tokens + globals.css + tailwind palette

**Goal**: cream+burgundy palette via CSS custom properties and `colors.luma.*` Tailwind extension. Parallel-safe with W0/W2.

**Files NEW**:
- `src/lib/utils.ts` — `cn()` helper (clsx + tailwind-merge)

**Files MODIFIED**:
- `tailwind.config.ts` — extend `colors.luma.{50,100,200,300,400,450,500,600,650,700}`. **PRESERVE** existing `ink/paper/accent/muted/line`.
- `src/app/globals.css` — add `:root { --luma-* }` block + `@layer components { .auth-card, .bb-card, .pill-btn, .pill-btn-primary, .icon-circle, .wordmark, .wordmark-gradient, .h1-serif, .hero-bg }`. **PRESERVE** existing `.serif` and `.mono` classes.

**Critical snippet — `src/lib/utils.ts`**:
```ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

**Critical snippet — tailwind.config.ts extension**:
```ts
// inside theme.extend.colors:
luma: {
  50:  '#FCF7F3',
  100: '#F5E9DD',
  200: '#E8D2BB',
  300: '#D6B498',
  400: '#B8896F',
  450: '#9C6F58',
  500: '#7E523F',
  600: '#651332',
  650: '#5F0F2D',
  700: '#5B0426',
},
```

**Critical snippet — CSS custom properties block** (add at top of `globals.css`, do not remove existing tokens):
```css
:root {
  --luma-bg: #5B0426;
  --luma-card: #FCF7F3;
  --luma-700: #5B0426;
  --luma-600: #651332;
  --luma-50: #FCF7F3;
  --luma-100: #F5E9DD;
  --luma-200: #E8D2BB;
  --luma-300: #D6B498;
  --luma-450: #9C6F58;
  --luma-hero-radial: radial-gradient(ellipse at 50% 30%, #7B1A3F 0%, #5B0426 60%, #3D0119 100%);
  --luma-nav-gradient: linear-gradient(135deg, #5B0426 0%, #651332 100%);
}
```

Port the `.auth-card`, `.pill-btn`, `.pill-btn-primary`, `.bb-card`, `.icon-circle`, `.wordmark`, `.wordmark-gradient` classes from `luma-ai/src/app/globals.css` (read it once and copy the @layer components blocks that reference `--luma-*`). Skip any dark-mode `@media (prefers-color-scheme: dark)` overrides.

**Tests NEW**:
- `tests/unit/lib/utils.test.ts` — `cn('a', false && 'b', 'c')` = `'a c'`; conflict resolution `cn('px-2', 'px-4')` = `'px-4'`.

**Smoke check**:
```bash
npm test -- tests/unit/lib/utils.test.ts && npx tsc --noEmit
```

**Commit message**:
```
feat(WKH-COBRAYA-DAPP-SHELL): W1 — luma palette + design tokens

- tailwind.config.ts: colors.luma.{50..700} (preserve ink/paper)
- globals.css: --luma-* CSS vars + .auth-card/.bb-card/.pill-btn classes
- src/lib/utils.ts: cn() (clsx + tailwind-merge)
- tests/unit/lib/utils.test.ts
```

**ACs covered**: AC-16 partial (palette tokens in place).

---

### W2 — UI primitives

**Goal**: 4 CVA-based primitives. Depends on W1 classes.

**Files NEW**:
- `src/components/ui/button.tsx` — CVA with `primary` (`pill-btn pill-btn-primary`), `ghost`, `link` variants.
- `src/components/ui/input.tsx` — `<input>` wrapper applying `auth-input` class + forwardRef.
- `src/components/ui/label.tsx` — `<label>` wrapper applying `auth-label` class.
- `src/components/ui/card.tsx` — `bb-card` and `bb-card-wide` variants.

**Critical snippet — button.tsx skeleton (port from `luma-ai/src/components/ui/button.tsx`)**:
```tsx
'use client'
import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center min-h-[48px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        primary: 'pill-btn pill-btn-primary',
        ghost: 'pill-btn text-luma-700 hover:bg-luma-100',
        link: 'text-luma-600 underline underline-offset-2',
      },
    },
    defaultVariants: { variant: 'primary' },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant }), className)} {...props} />
  )
)
Button.displayName = 'Button'
```

**Tests NEW**:
- `tests/unit/components/ui/button.test.tsx` — renders 3 variants, `aria-disabled` when `disabled`.
- `tests/unit/components/ui/input.test.tsx` — default classes + forwards ref.

**Smoke check**:
```bash
npm test -- tests/unit/components/ui && npx tsc --noEmit
```

**Commit message**:
```
feat(WKH-COBRAYA-DAPP-SHELL): W2 — UI primitives (button/input/label/card)

- src/components/ui/{button,input,label,card}.tsx with CVA
- Touch target min-h-[48px] enforced (CD-23)
- 2 unit tests
```

**ACs covered**: AC-23 (touch target foundation).

---

### W3 — Auth foundation

**Goal**: Supabase clients, validation schemas, Server Actions for auth, auth screens. **Bloqueante para W4.**

**Files NEW**:
- `src/lib/supabase/client.ts` — `createBrowserClient` (5 LOC).
- `src/lib/supabase/server.ts` — `createClient` SYNC (full snippet §2 DD-B).
- `src/lib/validation/auth.ts` — Zod `loginSchema` + `signupSchema` (ES-MX messages).
- `src/lib/types/actions.ts` — `ActionResult`, `OnboardingStepState` types.
- `src/actions/auth.ts` — `signUp` (LUM-100), `signIn`, `signOut`.
- `src/components/auth/login-form.tsx` — `useActionState` + `useFormStatus`.
- `src/components/auth/signup-form.tsx` — `useActionState` + password hint.
- `src/app/(auth)/layout.tsx` — minimal layout (no nav).
- `src/app/(auth)/login/page.tsx` — auth-card sobre `--luma-hero-radial` + `<LoginForm />`.
- `src/app/(auth)/signup/page.tsx` — idem + `<SignupForm />`.

**Critical snippet — `src/lib/supabase/client.ts`**:
```ts
'use client'
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**Critical snippet — `src/lib/supabase/server.ts`**: USE THE SYNC SNIPPET in §2 DD-B above. Verbatim. **No `async` keyword. No `await cookies()`.**

**Critical snippet — `src/lib/validation/auth.ts`**:
```ts
import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Correo inválido'),
  password: z.string().min(1, 'Ingresa tu contraseña'),
})

export const signupSchema = z.object({
  email: z.string().email('Correo inválido'),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .refine((p) => /\d/.test(p), 'La contraseña debe incluir al menos un número'),
})
```

**Critical snippet — `src/lib/types/actions.ts`**:
```ts
export type ActionResult = { error?: string }
export type OnboardingStepState = {
  error?: string
  fieldErrors?: Record<string, string>
}
```

**Critical snippet — `src/actions/auth.ts` (LUM-100 pattern)**:
```ts
'use server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { loginSchema, signupSchema } from '@/lib/validation/auth'
import type { ActionResult } from '@/lib/types/actions'

function mapError(code?: string): string {
  if (code === 'invalid_credentials') return 'Correo o contraseña incorrectos.'
  if (code === 'user_already_exists') return 'Este correo ya está registrado.'
  return 'No se pudo procesar tu solicitud.'
}

export async function signUp(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = signupSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
  }
  const supabase = createClient()
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
  })
  if (error) {
    console.warn('[cobraya-action]', { action: 'signUp', errorCode: error.code })
    return { error: mapError(error.code) }
  }
  redirect('/onboarding/step/1')
}

export async function signIn(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
  const supabase = createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })
  if (error) {
    console.warn('[cobraya-action]', { action: 'signIn', errorCode: error.code })
    return { error: mapError(error.code) }
  }
  redirect('/dashboard')
}

export async function signOut(): Promise<void> {
  const supabase = createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
```

**Critical snippet — `login-form.tsx` (Client Component using `useActionState`)**:
```tsx
'use client'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { signIn } from '@/actions/auth'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      className="pill-btn pill-btn-primary w-full min-h-[48px]"
      disabled={pending}
      aria-disabled={pending}
    >
      {pending ? 'Entrando…' : 'Iniciar sesión'}
    </button>
  )
}

export function LoginForm() {
  const [state, formAction] = useActionState<{ error?: string }, FormData>(signIn, {})
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="auth-label">
        Correo
        <input name="email" type="email" required className="auth-input" />
      </label>
      <label className="auth-label">
        Contraseña
        <input name="password" type="password" required className="auth-input" />
      </label>
      {state.error && <p role="alert" className="text-red-700 text-sm">{state.error}</p>}
      <SubmitButton />
    </form>
  )
}
```

**Tests NEW**:
- `tests/unit/actions/auth.test.ts` — covers AC-4, AC-5, Zod validation, error mapping (mock Supabase client via `vi.mock`).
- `tests/unit/components/auth/login-form.test.tsx` — RTL render, error display with `role="alert"`, pending state.
- `tests/unit/components/auth/signup-form.test.tsx` — idem + password hint.
- `tests/unit/lib/validation/auth.test.ts` — Zod schemas valid/invalid.

**Smoke check**:
```bash
npm test -- tests/unit/actions/auth tests/unit/components/auth tests/unit/lib/validation/auth && npx tsc --noEmit
```

**Commit message**:
```
feat(WKH-COBRAYA-DAPP-SHELL): W3 — supabase auth foundation + LUM-100 signup

- src/lib/supabase/{client,server}.ts (server: SYNC cookies for Next 14)
- src/lib/validation/auth.ts (Zod, ES-MX messages)
- src/actions/auth.ts (signUp/signIn/signOut)
- src/components/auth/{login,signup}-form.tsx (useActionState)
- src/app/(auth)/{layout,login,signup}/page.tsx
- 4 unit test files
- CD-31 console.warn on errorCode only
```

**ACs covered**: AC-4 (signUp instant session), AC-5 (signOut flow).

---

### W4 — Route groups + middleware

**Goal**: full `src/middleware.ts` with auth + onboarding gate. Rewrite splash. Update root layout themeColor.

**Files NEW**:
- `src/middleware.ts` — full skeleton (§9).

**Files MODIFIED**:
- `src/app/page.tsx` — REWRITE with burgundy splash (full JSX below).
- `src/app/layout.tsx` — change `themeColor: '#0F8B4A'` → `'#651332'`. **PRESERVE** RegisterSW/InstallPrompt blocks. Keep `lang="es"`.

**Critical snippet — `src/app/page.tsx` (full REWRITE)**:
```tsx
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

**Critical snippet — full `src/middleware.ts`**: USE THE FULL SKELETON IN §9 BELOW. Verbatim. Pay attention to `.maybeSingle()` (not `.single()`) and `redirectWithCookies()` helper.

**Tests NEW**:
- `tests/unit/middleware/middleware.test.ts` — covers AC-1 (anon → /login + cookie preservation), AC-2 (authed pending → /onboarding/step/1), AC-3 (authed complete on /login → /dashboard), edge: cookie corruption (getUser→null), edge: maybeSingle null (race post-signup).
- `tests/unit/app/page.test.tsx` — splash renders wordmark + 2 CTAs with correct hrefs.

**Smoke check**:
```bash
npm test -- tests/unit/middleware tests/unit/app/page && npx tsc --noEmit
# Manual: npm run dev → curl -I http://localhost:3000/dashboard → expect 307 Location: /login
```

**Commit message**:
```
feat(WKH-COBRAYA-DAPP-SHELL): W4 — middleware auth/onboarding gate + splash

- src/middleware.ts (Next 14: src/, not proxy.ts; sync cookies)
  - AC-1 anon → /login
  - AC-2 authed pending → /onboarding/step/1
  - AC-3 authed complete on /login → /dashboard
  - .maybeSingle() tolerates trigger race (R-3)
- src/app/page.tsx REWRITE: burgundy splash (DD-J)
- src/app/layout.tsx: themeColor #0F8B4A → #651332
- 2 unit test files (middleware + splash)
```

**ACs covered**: AC-1, AC-2, AC-3.

---

### W5 — Mobile chrome (TopNav + BottomTabs)

**Goal**: chrome wrapper. BottomTabs hidden on auth/splash/onboarding.

**Files NEW**:
- `src/components/nav/BottomTabs.tsx` — 4 tabs (Inicio, Negociar, Historial, Perfil), `md:hidden`, safe-area, self-hide on `/`, `/login`, `/signup`, `/onboarding/*`, `/~offline`.
- `src/components/nav/TopNav.tsx` — gradient burgundy + wordmark "Cobraya" + glass pill (desktop only).
- `src/app/(app)/layout.tsx` — `<TopNav />` + `<main className="flex-1">` + `<BottomTabs />`; `min-h-screen flex flex-col`.

**Critical snippet — `BottomTabs.tsx` self-hide pattern (port from `luma-ai/src/components/nav/BottomTabs.tsx`)**:
```tsx
'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const HIDE_PREFIXES = ['/login', '/signup', '/auth', '/onboarding', '/~offline']

const tabs = [
  { href: '/dashboard', label: 'Inicio' },
  { href: '/negociar', label: 'Negociar' },
  { href: '/historial', label: 'Historial' },
  { href: '/perfil', label: 'Perfil' },
]

export function BottomTabs() {
  const pathname = usePathname()
  if (pathname === '/' || HIDE_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return null
  }
  return (
    <nav
      aria-label="Navegación principal"
      className="md:hidden fixed bottom-0 left-0 right-0 bg-luma-50 border-t border-luma-200 z-40"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="flex justify-around items-center">
        {tabs.map((t) => {
          const active = pathname === t.href || pathname.startsWith(t.href + '/')
          return (
            <li key={t.href} className="flex-1">
              <Link
                href={t.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex flex-col items-center justify-center min-h-[48px] py-2 text-xs',
                  active ? 'text-luma-700 font-medium' : 'text-luma-450'
                )}
              >
                {t.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
```

**Critical snippet — `(app)/layout.tsx`**:
```tsx
import { TopNav } from '@/components/nav/TopNav'
import { BottomTabs } from '@/components/nav/BottomTabs'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-luma-50">
      <TopNav />
      <main className="flex-1 pb-20 md:pb-0">{children}</main>
      <BottomTabs />
    </div>
  )
}
```

`pb-20` provides clearance for BottomTabs (h-16 + safe-area).

**Tests NEW**:
- `tests/unit/components/nav/BottomTabs.test.tsx` — AC-15: 4 tabs, `aria-current` activo, self-hide en `/`, `/login`, `/onboarding/step/1`, min-h ≥48.
- `tests/unit/components/nav/TopNav.test.tsx` — wordmark renderiza; activo state pill.

**Smoke check**:
```bash
npm test -- tests/unit/components/nav && npx tsc --noEmit
```

**Commit message**:
```
feat(WKH-COBRAYA-DAPP-SHELL): W5 — mobile chrome (TopNav + BottomTabs)

- src/components/nav/{TopNav,BottomTabs}.tsx (port Luma pattern)
- src/app/(app)/layout.tsx (TopNav + BottomTabs wrapper)
- Self-hide en /, /login, /signup, /onboarding/*, /~offline (AC-15)
- env(safe-area-inset-bottom) (CD-23)
- 2 unit test files
```

**ACs covered**: AC-15.

---

### W6 — Onboarding wizard (5 steps)

**Goal**: wizard with own layout (no BottomTabs), 5 Server-Component step pages + 5 Client form components, anti-bypass logic.

**Files NEW**:
- `src/lib/validation/profile.ts` — Zod `step1Schema..step5Schema`.
- `src/lib/onboarding/resume.ts` — `ProfileRow` type + `firstIncompleteStep`.
- `src/actions/profile.ts` — `saveStep1..5`, `updateProfile`, shared helper `saveStepAndAdvance`.
- `src/app/(app)/onboarding/layout.tsx` — `bg` con `--luma-hero-radial`, no nav.
- `src/app/(app)/onboarding/step/[step]/page.tsx` — dispatcher + anti-bypass.
- `src/components/onboarding/ProgressDots.tsx` — 5 dots ARIA progressbar.
- `src/components/onboarding/step1-form.tsx` — RFC.
- `src/components/onboarding/step2-form.tsx` — Sector.
- `src/components/onboarding/step3-form.tsx` — Anchor buyers (chips).
- `src/components/onboarding/step4-form.tsx` — Monto típico (number input).
- `src/components/onboarding/step5-form.tsx` — Mayor frustración (textarea).

**Critical snippet — `src/lib/onboarding/resume.ts`**:
```ts
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

**Critical snippet — `src/lib/validation/profile.ts`**:
```ts
import { z } from 'zod'

export const step1Schema = z.object({
  rfc: z.string().min(12, 'El RFC debe tener entre 12 y 13 caracteres').max(13, 'El RFC debe tener entre 12 y 13 caracteres'),
})

export const step2Schema = z.object({
  sector: z.string().min(2, 'Indica tu sector').max(100),
})

export const step3Schema = z.object({
  anchor_buyers: z.array(z.string().min(1)).min(1, 'Agrega al menos un comprador'),
})

export const step4Schema = z.object({
  monto_tipico_mxn: z.coerce.number().positive('El monto debe ser mayor a 0').max(9_999_999_999_99),
})

export const step5Schema = z.object({
  mayor_frustracion: z.string().min(5, 'Cuéntanos un poco más').max(500, 'Máximo 500 caracteres'),
})

export const profileUpdateSchema = step1Schema
  .merge(step2Schema)
  .merge(step3Schema)
  .merge(step4Schema)
  .merge(step5Schema)
  .partial()
```

**Critical snippet — `src/actions/profile.ts` (shared helper + step5 atomic completion)**:
```ts
'use server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import {
  step1Schema, step2Schema, step3Schema, step4Schema, step5Schema, profileUpdateSchema,
} from '@/lib/validation/profile'
import type { OnboardingStepState, ActionResult } from '@/lib/types/actions'

async function saveStepAndAdvance<T extends z.ZodTypeAny>(
  schema: T,
  formData: FormData,
  nextPath: string,
  extraUpdate: Record<string, unknown> = {},
): Promise<OnboardingStepState> {
  const raw = Object.fromEntries(formData.entries())
  // anchor_buyers comes as JSON-stringified array
  if (typeof raw.anchor_buyers === 'string') {
    try { raw.anchor_buyers = JSON.parse(raw.anchor_buyers) } catch { /* leave as-is, schema will reject */ }
  }
  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {}
    for (const i of parsed.error.issues) fieldErrors[i.path.join('.') || '_'] = i.message
    return { fieldErrors }
  }
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sesión no válida.' }
  const { error } = await supabase
    .from('profiles')
    .update({ ...parsed.data, ...extraUpdate })
    .eq('id', user.id)
  if (error) {
    console.warn('[cobraya-action]', { action: 'saveStep', errorCode: error.code })
    return { error: 'No se pudo guardar.' }
  }
  redirect(nextPath)
}

export async function saveStep1(_p: OnboardingStepState, fd: FormData) {
  return saveStepAndAdvance(step1Schema, fd, '/onboarding/step/2')
}
export async function saveStep2(_p: OnboardingStepState, fd: FormData) {
  return saveStepAndAdvance(step2Schema, fd, '/onboarding/step/3')
}
export async function saveStep3(_p: OnboardingStepState, fd: FormData) {
  return saveStepAndAdvance(step3Schema, fd, '/onboarding/step/4')
}
export async function saveStep4(_p: OnboardingStepState, fd: FormData) {
  return saveStepAndAdvance(step4Schema, fd, '/onboarding/step/5')
}
export async function saveStep5(_p: OnboardingStepState, fd: FormData) {
  return saveStepAndAdvance(step5Schema, fd, '/dashboard', { onboarding_completed: true })
}

export async function updateProfile(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const raw = Object.fromEntries(fd.entries())
  if (typeof raw.anchor_buyers === 'string') {
    try { raw.anchor_buyers = JSON.parse(raw.anchor_buyers) } catch {}
  }
  const parsed = profileUpdateSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sesión no válida.' }
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: user.id, ...parsed.data })
    .eq('id', user.id)
  if (error) {
    console.warn('[cobraya-action]', { action: 'updateProfile', errorCode: error.code })
    return { error: 'No se pudo actualizar.' }
  }
  revalidatePath('/(app)/perfil', 'page')
  return {}
}
```

**Critical snippet — `step/[step]/page.tsx` (dispatcher with anti-bypass)**:
```tsx
import { redirect } from 'next/navigation'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { firstIncompleteStep, type ProfileRow } from '@/lib/onboarding/resume'
import { ProgressDots } from '@/components/onboarding/ProgressDots'
import { Step1Form } from '@/components/onboarding/step1-form'
import { Step2Form } from '@/components/onboarding/step2-form'
import { Step3Form } from '@/components/onboarding/step3-form'
import { Step4Form } from '@/components/onboarding/step4-form'
import { Step5Form } from '@/components/onboarding/step5-form'

export default async function OnboardingStepPage({ params }: { params: { step: string } }) {
  const stepNum = Number(params.step)
  if (![1, 2, 3, 4, 5].includes(stepNum)) notFound()
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle<ProfileRow>()
  if (!profile) redirect('/onboarding/step/1')
  if (profile.onboarding_completed) redirect('/dashboard')
  const allowed = firstIncompleteStep(profile)
  if (stepNum > allowed) redirect(`/onboarding/step/${allowed}`)
  return (
    <div className="max-w-md mx-auto">
      <ProgressDots current={stepNum} total={5} />
      {stepNum === 1 && <Step1Form defaults={profile} />}
      {stepNum === 2 && <Step2Form defaults={profile} />}
      {stepNum === 3 && <Step3Form defaults={profile} />}
      {stepNum === 4 && <Step4Form defaults={profile} />}
      {stepNum === 5 && <Step5Form defaults={profile} />}
    </div>
  )
}
```

**Critical snippet — `ProgressDots.tsx`**:
```tsx
import { cn } from '@/lib/utils'

export function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div
      role="progressbar"
      aria-valuenow={current}
      aria-valuemin={1}
      aria-valuemax={total}
      aria-label={`Paso ${current} de ${total}`}
      className="flex gap-2 justify-center mb-6"
    >
      {Array.from({ length: total }, (_, i) => i + 1).map((n) => (
        <span
          key={n}
          className={cn(
            'h-2 w-2 rounded-full',
            n === current ? 'bg-luma-700' : n < current ? 'bg-luma-400' : 'bg-luma-200'
          )}
        />
      ))}
    </div>
  )
}
```

**Tests NEW**:
- `tests/unit/actions/profile.test.ts` — AC-6 (saveStep5 sets `onboarding_completed=true`, redirects `/dashboard`), AC-14 (updateProfile UPSERT with `.eq('id', user.id)`).
- `tests/unit/app/onboarding/step.test.tsx` — AC-7 (step 4 > firstIncomplete=2 → redirect to step 2).
- `tests/unit/components/onboarding/ProgressDots.test.tsx` — AC-8 (5 dots, current=3 → 3 active, 2 muted).
- `tests/unit/components/onboarding/step1-form.test.tsx` — empty RFC → fieldError.
- `tests/unit/lib/onboarding/resume.test.ts` — all branches.

**Smoke check**:
```bash
npm test -- tests/unit/actions/profile tests/unit/components/onboarding tests/unit/lib/onboarding && npx tsc --noEmit
```

**Commit message**:
```
feat(WKH-COBRAYA-DAPP-SHELL): W6 — onboarding wizard (5 steps)

- src/lib/validation/profile.ts (Zod step1..5 schemas)
- src/lib/onboarding/resume.ts (firstIncompleteStep)
- src/actions/profile.ts (saveStep1..5 + updateProfile, atomic completion in step5)
- src/app/(app)/onboarding/{layout,step/[step]/page}.tsx (anti-bypass AC-7)
- src/components/onboarding/{ProgressDots,step1-form..step5-form}.tsx
- 5 unit test files
```

**ACs covered**: AC-6, AC-7, AC-8, AC-14 (partial — UPSERT).

---

### W7 — Dashboard

**Goal**: greeting + 4 stats cards + profile preview + 5 most recent settled invoices.

**Files NEW**:
- `src/lib/dashboard/stats.ts` — `loadDashboardStats(supabase, userId, createdAt)`.
- `src/app/(app)/dashboard/page.tsx` — Server Component with stats + recents.

**Critical snippet — `src/lib/dashboard/stats.ts`**:
```ts
import type { createClient } from '@/lib/supabase/server'

export type DashboardStats = {
  facturasNegociadas: number
  totalUsdc: number
  ahorrosFee: number
  diasConCobraya: number
}

export async function loadDashboardStats(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  createdAt: string | null,
): Promise<DashboardStats> {
  const { data, error } = await supabase
    .from('settled_invoices')
    .select('amount_mxn, net_amount_usdc')
    .eq('user_id', userId)  // CD-32: app-layer filter + RLS
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

**Critical snippet — `dashboard/page.tsx` skeleton**:
```tsx
import { createClient } from '@/lib/supabase/server'
import { loadDashboardStats } from '@/lib/dashboard/stats'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).maybeSingle()
  const stats = await loadDashboardStats(supabase, user.id, profile?.created_at ?? null)
  const { data: recientes } = await supabase
    .from('settled_invoices')
    .select('id, uuid_cfdi, amount_mxn, net_amount_usdc, lender_name, settled_at')
    .eq('user_id', user.id)  // CD-32
    .order('settled_at', { ascending: false })
    .limit(5)
  const nombre = user.email?.split('@')[0] ?? 'tú'
  return (
    <section className="max-w-3xl mx-auto p-4 space-y-6">
      <h1 className="h1-serif text-luma-700">Hola, {nombre}</h1>
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Facturas negociadas" value={stats.facturasNegociadas} />
        <StatCard label="Total USDC" value={`$${stats.totalUsdc.toFixed(2)}`} />
        <StatCard label="Ahorros estimados (MXN)" value={`$${stats.ahorrosFee.toFixed(0)}`} />
        <StatCard label="Días con Cobraya" value={stats.diasConCobraya} />
      </div>
      <PerfilPreview profile={profile} />
      <RecentesList items={recientes ?? []} />
    </section>
  )
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bb-card p-4">
      <p className="text-xs text-luma-450">{label}</p>
      <p className="text-2xl font-medium text-luma-700">{value}</p>
    </div>
  )
}
// PerfilPreview + RecentesList: inline simple components rendering data
```

`StatCard`, `PerfilPreview`, and `RecentesList` are inline helpers (do NOT split into separate files — keeps wave scope tight).

**Tests NEW**:
- `tests/unit/lib/dashboard/stats.test.ts` — AC-9: empty → zeros; 3 invoices → correct sums; `ahorrosFee = sum(amount_mxn) * 0.02`.
- `tests/unit/app/dashboard/page.test.tsx` — greeting derives from `email.split('@')[0]`; 4 stat cards render; max 5 recientes.

**Smoke check**:
```bash
npm test -- tests/unit/lib/dashboard tests/unit/app/dashboard && npx tsc --noEmit
```

**Commit message**:
```
feat(WKH-COBRAYA-DAPP-SHELL): W7 — dashboard with stats + recents

- src/lib/dashboard/stats.ts (DD-H formulas)
- src/app/(app)/dashboard/page.tsx (RSC: greeting + 4 stats + profile preview + 5 recents)
- CD-32 app-layer .eq('user_id', user.id) on settled_invoices
- 2 unit test files
```

**ACs covered**: AC-9.

---

### W8 — Negociar tab (refactor demo) + restyling engine-adjacent

**Goal**: move `/demo` content to `/(app)/negociar`, restyle engine-adjacent components, fix AuditPanel conflict with BottomTabs, rewrite BrandIcon.

**Files NEW**:
- `src/app/(app)/negociar/page.tsx` — COPY content from `src/app/demo/page.tsx`, then: remove manual Cobraya wordmark header (TopNav has it), restyle classes (mapping below), add `mb-24` to outer `<main>` for BottomTabs clearance.

**Files MODIFIED (restyling only — DD-I — NO logic changes)**:
- `src/components/InvoiceCard.tsx` — apply class mapping below.
- `src/components/LenderAuctionPanel.tsx` — idem.
- `src/components/Settlement.tsx` — idem.
- `src/components/AuditPanel.tsx` — **plus**: change `fixed bottom-0` → `relative mt-6 border-t border-luma-200 pt-4` (DD-I exception). The 2 demo buttons "Negociar esta factura" / "Escanear otra factura" → `bg-luma-700 text-luma-50` (was `bg-ink text-paper`).
- `src/components/BrandIcon.tsx` — REWRITE with CSS vars (snippet below).

**Files DELETED** *(replaced with redirect)*:
- `src/app/demo/page.tsx` — REWRITE as redirect stub (preserves bookmarks):

```tsx
// src/app/demo/page.tsx (REWRITE — redirect to /negociar for backward compat)
import { redirect } from 'next/navigation'
export default function DemoRedirect() {
  redirect('/negociar')
}
```

**Class mapping table (DD-I — apply mechanically)**:

| Before | After | Where |
|---|---|---|
| `bg-ink` | `bg-luma-700` | primary buttons (negociar/escanear actions in demo) |
| `bg-ink/10` | `bg-luma-100/60` | badges, pills |
| `bg-ink/5` | `bg-luma-100/40` | hover/selected |
| `text-ink` | `text-luma-700` | headings, body |
| `text-paper` | `text-luma-50` | text on dark |
| `border-ink` | `border-luma-300` | default borders |
| `border-ink/30` | `border-luma-200` | muted borders |
| `text-muted` | `text-luma-450` | secondary |
| `text-red-700` / `border-red-500` | NO CHANGE | error states (semantic) |
| `text-emerald-*` / `bg-emerald-*` | NO CHANGE | onchain success (semantic) |

**Critical snippet — `BrandIcon.tsx` (full REWRITE — DD-K)**:
```tsx
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

**FORBIDDEN in this wave (DD-I)**: any `useState`, `useEffect`, prop signature change, event handler change, conditional render change, `fetch`/engine type imports. If you find yourself needing one of these → STOP and escalate (CD-30).

**Tests NEW**:
- `tests/unit/app/negociar/page.test.tsx` — AC-10: same flow as demo (scan → pipeline → auction → settle) renders; engine fetch calls unchanged (mocked).

**Tests MODIFIED (snapshots/class assertions only)**:
- `tests/unit/components/InvoiceCard.test.tsx` if existed (check; if not, just verify no regression).
- `tests/unit/components/LenderAuctionPanel.test.tsx` same.
- `tests/unit/components/AuditPanel.test.tsx` — assert `relative` (not `fixed bottom-0`) in className.

Verify existing test files first:
```bash
ls tests/unit/components/ 2>/dev/null
```
If snapshot tests don't exist, skip the "modified" bullet.

**Smoke check**:
```bash
npm test -- tests/unit/app/negociar && npm test && npx tsc --noEmit
# Expect: all 77 prior tests still green + new test
```

**Commit message**:
```
feat(WKH-COBRAYA-DAPP-SHELL): W8 — negociar tab + restyling engine-adjacent

- src/app/(app)/negociar/page.tsx (port of /demo content, inside chrome)
- src/app/demo/page.tsx → redirect('/negociar') stub
- Restyling (DD-I, no logic): InvoiceCard, LenderAuctionPanel, Settlement
- AuditPanel: fixed bottom-0 → relative (resolves clash with BottomTabs, R-6)
- BrandIcon: CSS vars rewrite (DD-K)
- 1 unit test (negociar page renders flow)
```

**ACs covered**: AC-10.

---

### W9 — Historial + recordSettlement integration

**Goal**: persist settle txs in `settled_invoices` via Server Action after `/api/settle` returns; render `/historial` from DB.

**Files NEW**:
- `src/actions/settlement.ts` — `recordSettlement(payload)`.
- `src/app/(app)/historial/page.tsx` — Server Component listing `settled_invoices` desc.

**Files MODIFIED**:
- `src/app/(app)/negociar/page.tsx` — in `signAndSettle()` success branch (when `/api/settle` returns `txHash`), BEFORE `setSoldHistory(...)`, call `await recordSettlement({...})`. Best-effort: log on failure, do NOT block UI (tx is already onchain).

**Verify uuid-validator**:
```bash
ls src/lib/uuid-validator.ts  # VERIFIED EXISTS — reuse, don't recreate
```

**Critical snippet — `src/actions/settlement.ts`**:
```ts
'use server'
import { createClient } from '@/lib/supabase/server'
import { isValidUuidV4 } from '@/lib/uuid-validator'

export type SettlementInsert = {
  requestId: string
  uuidCfdi: string
  amountMxn: number
  netAmountUsdc: number
  lenderName: string
  txHash: `0x${string}`
  snowtraceUrl?: string
  blockNumber?: number
}

export async function recordSettlement(
  input: SettlementInsert,
): Promise<{ ok: true } | { ok: false; error: string }> {
  // CD-33: UUID v4 validation (CRLF / buffer poisoning defense)
  if (!isValidUuidV4(input.requestId)) {
    return { ok: false, error: 'requestId inválido' }
  }
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Sesión no válida' }
  // R-4 idempotency: ON CONFLICT (request_id) DO NOTHING
  const { error } = await supabase.from('settled_invoices').upsert(
    {
      user_id: user.id,           // CD-32 (also enforced by RLS)
      request_id: input.requestId,
      uuid_cfdi: input.uuidCfdi,
      amount_mxn: input.amountMxn,
      net_amount_usdc: input.netAmountUsdc,
      lender_name: input.lenderName,
      tx_hash: input.txHash,
      snowtrace_url: input.snowtraceUrl ?? null,
      block_number: input.blockNumber ?? null,
    },
    { onConflict: 'request_id', ignoreDuplicates: true },
  )
  if (error) {
    console.warn('[cobraya-action]', { action: 'recordSettlement', errorCode: error.code })
    return { ok: false, error: 'No se pudo guardar en historial' }
  }
  return { ok: true }
}
```

**Critical snippet — `historial/page.tsx`**:
```tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function HistorialPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: rows } = await supabase
    .from('settled_invoices')
    .select('id, uuid_cfdi, amount_mxn, net_amount_usdc, lender_name, tx_hash, snowtrace_url, settled_at')
    .eq('user_id', user.id)  // CD-32 + RLS
    .order('settled_at', { ascending: false })
  return (
    <section className="max-w-3xl mx-auto p-4">
      <h1 className="h1-serif text-luma-700 mb-4">Historial</h1>
      {(!rows || rows.length === 0) ? (
        <p className="text-luma-450">Aún no has negociado ninguna factura.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="bb-card p-4">
              <div className="flex justify-between items-baseline">
                <span className="text-luma-700 font-medium">{r.lender_name}</span>
                <span className="text-sm text-luma-450">
                  {new Date(r.settled_at).toLocaleDateString('es-MX')}
                </span>
              </div>
              <p className="text-sm text-luma-450 mt-1">
                ${Number(r.amount_mxn).toFixed(2)} MXN → ${Number(r.net_amount_usdc).toFixed(2)} USDC
              </p>
              {r.snowtrace_url && (
                <a href={r.snowtrace_url} target="_blank" rel="noreferrer"
                   className="text-xs text-luma-600 underline">Ver en Snowtrace</a>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
```

**Modification to `negociar/page.tsx`** (best-effort, NO blocking):
```tsx
// After /api/settle returns txHash successfully, BEFORE setSoldHistory:
import { recordSettlement } from '@/actions/settlement'
// ...
const persistResult = await recordSettlement({
  requestId: settleRequestId,
  uuidCfdi,
  amountMxn,
  netAmountUsdc,
  lenderName,
  txHash,
  snowtraceUrl,
  blockNumber,
})
if (!persistResult.ok) {
  // best-effort: log only; tx is already onchain
  console.warn('[cobraya-ui] recordSettlement failed; tx onchain OK', persistResult.error)
}
```

**Tests NEW**:
- `tests/unit/actions/settlement.test.ts` — AC-11 (INSERT shape correct); idempotent ON CONFLICT (R-4); invalid UUID rejected; `console.warn` on Supabase error (CD-31); app-layer `user_id` filter present (CD-32, AC-13 derivable).
- `tests/unit/app/historial/page.test.tsx` — AC-12: filtered + ordered desc; empty state OK.
- `tests/unit/lib/uuid-validator.test.ts` — verify existence; if missing, add. Confirm valid v4 / invalid / CRLF rejected.

**Smoke check**:
```bash
npm test -- tests/unit/actions/settlement tests/unit/app/historial && npx tsc --noEmit
```

**Commit message**:
```
feat(WKH-COBRAYA-DAPP-SHELL): W9 — historial + recordSettlement Server Action

- src/actions/settlement.ts (CD-33 uuid v4, R-4 onConflict idempotent)
- src/app/(app)/historial/page.tsx (CD-32 app-layer user_id + RLS)
- src/app/(app)/negociar/page.tsx: call recordSettlement post-/api/settle (best-effort)
- 2 unit test files + uuid-validator regression test
```

**ACs covered**: AC-11, AC-12, AC-13 (derivable from CD-32 filter test).

---

### W10 — Perfil

**Goal**: edit PyME fields + signOut button. Parallel-safe with W6/W7.

**Files NEW**:
- `src/app/(app)/perfil/page.tsx` — RSC with profile data + `<EditForm defaults={profile} />` + signOut form.
- `src/components/profile/edit-form.tsx` — Client Component, `useActionState` + `updateProfile`.

**Critical snippet — `perfil/page.tsx`**:
```tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { signOut } from '@/actions/auth'
import { EditForm } from '@/components/profile/edit-form'

export default async function PerfilPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).maybeSingle()
  return (
    <section className="max-w-md mx-auto p-4 space-y-6">
      <h1 className="h1-serif text-luma-700">Perfil</h1>
      <EditForm defaults={profile} />
      <form action={signOut}>
        <button type="submit" className="pill-btn w-full min-h-[48px] text-luma-700">
          Cerrar sesión
        </button>
      </form>
    </section>
  )
}
```

**Critical snippet — `edit-form.tsx`** (use same `useActionState` pattern as login-form):
```tsx
'use client'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { updateProfile } from '@/actions/profile'

export function EditForm({ defaults }: { defaults: any }) {
  const [state, formAction] = useActionState<{ error?: string }, FormData>(updateProfile, {})
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label className="auth-label">RFC
        <input name="rfc" defaultValue={defaults?.rfc ?? ''} className="auth-input" />
      </label>
      <label className="auth-label">Sector
        <input name="sector" defaultValue={defaults?.sector ?? ''} className="auth-input" />
      </label>
      <label className="auth-label">Compradores ancla (separados por coma)
        <input
          name="anchor_buyers_csv"
          defaultValue={(defaults?.anchor_buyers ?? []).join(', ')}
          className="auth-input"
          onChange={(e) => {
            const csv = e.currentTarget.value
            const hidden = e.currentTarget.form?.elements.namedItem('anchor_buyers') as HTMLInputElement | null
            if (hidden) hidden.value = JSON.stringify(csv.split(',').map(s => s.trim()).filter(Boolean))
          }}
        />
        <input type="hidden" name="anchor_buyers" defaultValue={JSON.stringify(defaults?.anchor_buyers ?? [])} />
      </label>
      <label className="auth-label">Monto típico (MXN)
        <input type="number" name="monto_tipico_mxn" defaultValue={defaults?.monto_tipico_mxn ?? ''} className="auth-input" />
      </label>
      <label className="auth-label">Mayor frustración cobrando
        <textarea name="mayor_frustracion" defaultValue={defaults?.mayor_frustracion ?? ''} className="auth-input" maxLength={500} />
      </label>
      {state.error && <p role="alert" className="text-red-700 text-sm">{state.error}</p>}
      <Submit />
    </form>
  )
}

function Submit() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending} aria-disabled={pending}
      className="pill-btn pill-btn-primary min-h-[48px]">
      {pending ? 'Guardando…' : 'Guardar'}
    </button>
  )
}
```

**Tests NEW**:
- `tests/unit/app/perfil/page.test.tsx` — AC-14: form prefilled; submit calls `updateProfile`; signOut button renders.
- `tests/unit/components/profile/edit-form.test.tsx` — fields, error display.

**Smoke check**:
```bash
npm test -- tests/unit/app/perfil tests/unit/components/profile && npx tsc --noEmit
```

**Commit message**:
```
feat(WKH-COBRAYA-DAPP-SHELL): W10 — perfil + signOut

- src/app/(app)/perfil/page.tsx
- src/components/profile/edit-form.tsx (useActionState + updateProfile)
- 2 unit test files
```

**ACs covered**: AC-14.

---

### W11 — PWA assets + manifest

**Goal**: theme_color burgundy, icons regenerated, no `/(app)/*` caching.

**Files MODIFIED**:
- `public/manifest.json` (or `src/app/manifest.ts` if generated) — `theme_color: '#651332'`. If icons list inline, update colors.
- `next.config.js` — verify `runtimeCaching` does NOT include `/(app)/*` or `/auth/*` as cacheable. If `/api/*` is `NetworkOnly`, OK. Add explicit NetworkOnly entries for `/(app)` and `/(auth)` if missing.
- `public/icons/*.png` — REGENERATE burgundy palette (script if available; else escalate).

**Icon regeneration**: if there is no scripted way to regen icons, the Dev escalates with:
> "W11 icon regen: provide burgundy PNGs at public/icons/{72,96,128,144,152,192,384,512}.png OR a regeneration script. Not blocking other waves."

W11 can still pass with `theme_color` updated and the build green; icons can land as a follow-up commit if needed.

**Tests NEW**:
- `tests/unit/pwa/manifest.test.ts` — AC-17: read `manifest.json` (or `manifest.ts` output) → `theme_color === '#651332'`; icons list non-empty.

**Smoke check**:
```bash
npm test -- tests/unit/pwa && npm run build  # build green is the strong signal
```

**Commit message**:
```
chore(WKH-COBRAYA-DAPP-SHELL): W11 — PWA manifest burgundy theme + cache hardening

- public/manifest.json: theme_color #651332
- next.config.js: ensure /(app)/* and /(auth)/* not cached (CD-25)
- public/icons/*.png regenerated (or follow-up if blocked on assets)
- 1 unit test (manifest theme_color)
```

**ACs covered**: AC-17.

---

### W12 — Smoke E2E + final validations

**Goal**: full pipeline green. Manual smoke on dev server. PR draft created.

**Tasks** (in order):

1. **TS strict**: `npx tsc --noEmit` → 0 errors.
2. **Lint**: `npm run lint` → 0 errors (verify lint script exists; if not, skip).
3. **Tests**: `npm test` → all green. Expect **77 prior + ~28 new = ~105 total**.
4. **Build**: `npm run build` → succeeds.
5. **Hardcoded secrets sanity** (CD-24, AC-18):
   ```bash
   grep -r "supabase.co" src/ --include="*.ts" --include="*.tsx" | grep -v "process.env"
   # Expected: 0 lines (no hardcoded supabase URLs)
   ```
6. **Manual smoke on dev server** (`npm run dev`):
   - `/` → splash shows wordmark + 2 CTAs (DD-J).
   - Click "Comenzar" → `/signup` form.
   - Submit valid signup (email + 8+ char password with digit) → redirect `/onboarding/step/1` (AC-4).
   - Complete 5 steps with valid data → redirect `/dashboard` (AC-6).
   - Refresh `/dashboard` → greeting `Hola, {email-prefix}`, 4 stat cards (zeros), profile preview, no recientes.
   - Click "Negociar" tab → scan invoice flow → pipeline runs → auction → settle (real flow against engine; needs the existing dev backend up).
   - After settle success → refresh `/historial` → tx appears (AC-12).
   - Click "Perfil" → fields prefilled → edit → save → success (AC-14).
   - Click "Cerrar sesión" → redirect `/login` (AC-5).
   - Hit browser back → middleware redirects to `/login` (no stale content; AC-1, CD-25/CD-27).
   - Open `/manifest.json` directly → served, no redirect (R-5 mitigation).
   - Open `/icons/192.png` directly → served, no redirect.
7. **Create PR draft** with `gh pr create --draft`. PR title and body in §14.

**Files NEW/MODIFIED**: none (validation-only wave). If smoke surfaces a bug, fix it in a focused commit `fix(WKH-COBRAYA-DAPP-SHELL): W12 smoke — <bug summary>`.

**Commit message** (only if any post-smoke fix):
```
fix(WKH-COBRAYA-DAPP-SHELL): W12 smoke — <bug summary>
```
Otherwise, no W12 commit needed (validation only).

**ACs covered**: AC-18 (no hardcoded secrets); all others integration-validated.

---

## §6 — Engine INTOCABLE

> ⛔ **DO NOT MODIFY. Touching any of these triggers escalation (CD-19, CD-30).**

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
src/core/**          (entire directory)
contracts/**         (entire directory)
src/components/InvoiceScanner.tsx
src/components/PipelineProgress.tsx
src/components/TraceConsole.tsx
```

**Engine-adjacent (restyling-only — DD-I)**: `InvoiceCard.tsx`, `LenderAuctionPanel.tsx`, `Settlement.tsx`, `AuditPanel.tsx`, `BrandIcon.tsx`. Only Tailwind class changes per mapping table in W8. No `useState`/`useEffect`/props/handlers/`fetch`.

---

## §7 — Server Actions API contracts

All in TypeScript strict. No `any`.

```ts
// src/lib/types/actions.ts
export type ActionResult = { error?: string }
export type OnboardingStepState = { error?: string; fieldErrors?: Record<string, string> }

// src/actions/auth.ts
export async function signUp(_prev: ActionResult, formData: FormData): Promise<ActionResult>
export async function signIn(_prev: ActionResult, formData: FormData): Promise<ActionResult>
export async function signOut(): Promise<void>

// src/actions/profile.ts
export async function saveStep1(prev: OnboardingStepState, fd: FormData): Promise<OnboardingStepState>
export async function saveStep2(prev: OnboardingStepState, fd: FormData): Promise<OnboardingStepState>
export async function saveStep3(prev: OnboardingStepState, fd: FormData): Promise<OnboardingStepState>
export async function saveStep4(prev: OnboardingStepState, fd: FormData): Promise<OnboardingStepState>
export async function saveStep5(prev: OnboardingStepState, fd: FormData): Promise<OnboardingStepState>
export async function updateProfile(prev: ActionResult, fd: FormData): Promise<ActionResult>

// src/actions/settlement.ts
export type SettlementInsert = {
  requestId: string
  uuidCfdi: string
  amountMxn: number
  netAmountUsdc: number
  lenderName: string
  txHash: `0x${string}`
  snowtraceUrl?: string
  blockNumber?: number
}
export async function recordSettlement(
  input: SettlementInsert,
): Promise<{ ok: true } | { ok: false; error: string }>
```

**Notes**:
- `signUp` / `signIn` / step actions throw via `redirect()` on success → the `void`/non-return after redirect is intentional. Only the error path returns a plain object.
- `signOut` is a `<form action={signOut}>` style action — no `_prev`/`formData` parameters.
- `recordSettlement` is called from TypeScript code (post-fetch in `negociar/page.tsx`) → takes a typed payload, NOT `FormData`.

---

## §8 — Supabase schema (copy-paste-ready SQL)

### §8.1 — `supabase/migrations/001_profiles.sql`

```sql
-- WKH-COBRAYA-DAPP-SHELL — profiles table for PyME onboarding.

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  rfc TEXT,
  sector TEXT,
  anchor_buyers TEXT[],
  monto_tipico_mxn NUMERIC(12,2),
  mayor_frustracion TEXT,
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

-- Auto-create profile row on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

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

### §8.2 — `supabase/migrations/002_settled_invoices.sql`

```sql
-- WKH-COBRAYA-DAPP-SHELL — settled_invoices (append-only history).

CREATE TABLE IF NOT EXISTS public.settled_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_id UUID NOT NULL UNIQUE,
  uuid_cfdi TEXT NOT NULL,
  amount_mxn NUMERIC(12,2) NOT NULL,
  net_amount_usdc NUMERIC(20,6) NOT NULL,
  lender_name TEXT NOT NULL,
  tx_hash TEXT NOT NULL,
  snowtrace_url TEXT,
  block_number BIGINT,
  settled_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
-- No UPDATE / DELETE policies: settled invoices are append-only.
```

### §8.3 — Enable mailer_autoconfirm (LUM-100)

Supabase Dashboard → Settings → Auth → Email → toggle **"Enable email confirmations" = OFF**.

Verify with:
```bash
curl -X POST "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/signup" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"smoke@test.com","password":"smoke1234"}'
# Expected: response includes session.access_token (not null)
```

---

## §9 — Full middleware (copy-paste-ready)

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
            response.cookies.set(name, value, options),
          )
        },
      },
    },
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

  // AC-1, CD-27: anon → /login
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

**Critical rules**:
- `.maybeSingle()`, NOT `.single()` (tolerates trigger race post-signUp → treat as `onboarding_completed = false` → redirect to step 1).
- `redirectWithCookies` MUST be used in every redirect path (R-3: prevents auth cookie loss).
- Splash `/` is exempt: an authenticated user who lands on `/` sees the splash — no auto-redirect (DD-J).

---

## §10 — UX/Visual contracts

### Mobile breakpoints
- `md:hidden` → BottomTabs visible only on mobile (`<768px`).
- TopNav: same wordmark on both; desktop has glass pill nav, mobile has just wordmark.
- Auth screens (`(auth)/login`, `(auth)/signup`): `max-w-sm mx-auto` for the card.
- App screens (`/(app)/*`): `max-w-3xl mx-auto p-4` standard container.

### Touch targets
- Buttons & tab links: `min-h-[48px]` (CD-23).
- Secondary "ya tengo cuenta" link in splash: `min-h-[44px]` (less tappable, smaller surface OK).

### Tailwind class conventions
- Card surfaces: `bb-card` (port from Luma globals.css).
- Primary actions: `pill-btn pill-btn-primary`.
- Headings (serif display): `h1-serif text-luma-700`.
- Body text: `text-luma-700` (primary), `text-luma-450` (secondary).
- Backgrounds: `bg-luma-50` (app screens), `style={{ background: 'var(--luma-hero-radial)' }}` (auth + splash).
- Borders: `border-luma-200` (muted) / `border-luma-300` (default).

### ASCII wireframes (high-level)

```
SPLASH (/)
+----------------------------+
| (radial burgundy bg)       |
|                            |
|        [Cobraya]           |  ← wordmark-gradient text-5xl
|  Tu factura, líquida ...   |  ← text-luma-200 italic
|                            |
|  +-------- Comenzar ----+  |  ← pill-btn-primary min-h-48
|  +-- Ya tengo cuenta ---+  |  ← underline text-luma-100
+----------------------------+
```

```
DASHBOARD (/dashboard)
+----------------------------+
| TopNav (gradient burgundy) |
+----------------------------+
| Hola, {nombre}             |  ← h1-serif
| +------+ +------+          |
| |Stats1| |Stats2|          |  ← bb-card grid-cols-2
| +------+ +------+          |
| +------+ +------+          |
| |Stats3| |Stats4|          |
| +------+ +------+          |
| Perfil preview ...         |
| Recientes (5 cards) ...    |
+----------------------------+
| [Inicio][Neg][Hist][Perfil]|  ← BottomTabs (mobile only)
+----------------------------+
```

```
ONBOARDING STEP N (/onboarding/step/N)
+----------------------------+
| (no TopNav, no BottomTabs) |  ← onboarding/layout.tsx scope
| (hero-radial bg)           |
|                            |
|     . . O . .              |  ← ProgressDots, current=3
|                            |
|   Paso N: {pregunta}       |
|   [input field]            |
|                            |
|   [    Siguiente    ]      |  ← min-h-48
+----------------------------+
```

---

## §11 — Test patterns

### Standard `vi.mock` for Supabase server client

Add this at the top of every Server Action test file:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => { throw new Error(`REDIRECT:${url}`) }),
}))
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { signIn, signUp, signOut } from '@/actions/auth'

function buildSupabaseStub(overrides: Partial<any> = {}) {
  return {
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
      signUp: vi.fn().mockResolvedValue({ data: { session: { access_token: 't' } }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1', email: 'a@b.com' } } }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockResolvedValue({ error: null }),
      insert: vi.fn().mockResolvedValue({ error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  ;(createClient as any).mockReturnValue(buildSupabaseStub())
})
```

### Test redirect assertion pattern

```ts
it('signUp redirects to /onboarding/step/1', async () => {
  await expect(signUp({}, new FormData())).rejects.toThrow('REDIRECT:/onboarding/step/1')
  expect(redirect).toHaveBeenCalledWith('/onboarding/step/1')
})
```

(`redirect()` throws a `NEXT_REDIRECT` error in Next runtime; we mock it to throw a deterministic string for easy assertion.)

### Middleware test pattern

```ts
// tests/unit/middleware/middleware.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(),
}))

import { createServerClient } from '@supabase/ssr'
import { middleware } from '@/middleware'

function buildSupabase(user: any, profile: any = { onboarding_completed: false }) {
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: profile, error: null }),
    })),
  }
}

function buildRequest(url: string) {
  return new NextRequest(new URL(url, 'http://localhost:3000'))
}

beforeEach(() => vi.clearAllMocks())

it('AC-1: anon → /login', async () => {
  ;(createServerClient as any).mockReturnValue(buildSupabase(null))
  const res = await middleware(buildRequest('/dashboard'))
  expect(res.status).toBe(307)
  expect(res.headers.get('location')).toContain('/login')
})
```

### Component test pattern (RTL)

```ts
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ProgressDots } from '@/components/onboarding/ProgressDots'

it('AC-8: 5 dots, current=3 → ARIA progressbar', () => {
  render(<ProgressDots current={3} total={5} />)
  const bar = screen.getByRole('progressbar')
  expect(bar).toHaveAttribute('aria-valuenow', '3')
  expect(bar.children).toHaveLength(5)
})
```

### Coverage expectations
- Server Actions: 100% of public exports.
- Middleware: every branch (anon, authed pending, authed complete, bounce, cookie corruption).
- Components: render + key interactions (no snapshot-only tests).

---

## §12 — Smoke E2E (W12) — exact commands

```bash
# 0. clean state
git status                              # expect clean

# 1. static checks
npx tsc --noEmit                        # expect 0 errors
npm run lint 2>/dev/null || true        # if lint exists; allow no-script

# 2. tests
npm test                                # expect ~105 passed (77 prior + ~28 new)

# 3. hardcoded supabase URL check (AC-18)
grep -r "supabase.co" src/ --include="*.ts" --include="*.tsx" | grep -v "process.env" | grep -v "// "
# expect: empty output

# 4. build
npm run build                           # expect success

# 5. dev server smoke
npm run dev &
sleep 5
curl -sI http://localhost:3000/dashboard | head -3
# expect: HTTP/1.1 307 Temporary Redirect, Location: /login (or /onboarding/step/1)
curl -sI http://localhost:3000/manifest.json | head -3
# expect: HTTP/1.1 200 (no redirect — matcher excludes manifest)
curl -sI http://localhost:3000/icons/192.png 2>/dev/null | head -3 || true
# expect: 200 if icon exists (W11)
kill %1 2>/dev/null

# 6. manual UI smoke (browser) — see W12 checklist
```

**Optional Vercel deploy** (only if user explicitly asks; do not auto-deploy):
```bash
vercel --prod
# After deploy, repeat steps 5+6 against the deployed URL.
```

---

## §13 — Risk mitigations (R-1..R-9) en lenguaje Dev

| # | Síntoma | Mitigación concreta |
|---|---|---|
| **R-1** | W0 stops because `.env.local` has no `NEXT_PUBLIC_SUPABASE_URL`. | Escalate (DD-N message). Do NOT improvise creds. |
| **R-2** | Runtime error `cookieStore.getAll is not a function` on any Server Component. | Open `src/lib/supabase/server.ts`. Confirm `createClient` is **NOT** `async`. Confirm `cookies()` is called WITHOUT `await`. If you copy-pasted from Luma, fix this line. |
| **R-3** | User signs in successfully but next request → middleware redirects to /login (session cookie lost). | Verify every redirect in `src/middleware.ts` uses `redirectWithCookies(url)` helper, NOT raw `NextResponse.redirect`. |
| **R-4** | Double-tap on "Negociar" causes 2 rows in `settled_invoices` for same tx. | `recordSettlement` uses `.upsert(..., { onConflict: 'request_id', ignoreDuplicates: true })`. Postgres `UNIQUE(request_id)` constraint backs it up. |
| **R-5** | Direct GET `/manifest.json` returns 307 → PWA install breaks. | Matcher regexp in `src/middleware.ts` must include `manifest\\.json` and `sw\\.js` exclusions. Smoke step 5 verifies. |
| **R-6** | `AuditPanel` overlaps `BottomTabs` on `/negociar`. | DD-I + W8 change: `AuditPanel` classes `fixed bottom-0` → `relative mt-6 border-t border-luma-200 pt-4`. |
| **R-7** | `BrandIcon` shows wrong color (still green Avalanche) in burgundy palette. | DD-K rewrite in W8 uses `var(--luma-700, #5B0426)` and `var(--luma-50, #FCF7F3)`. Fallback hex covers rasterization. |
| **R-8** | "Negociar esta factura" / "Escanear otra" buttons are still `bg-ink` (jarring on burgundy chrome). | W8 task: change those 2 button classes to `bg-luma-700 text-luma-50` (mechanical class swap — not logic). |
| **R-9** | User sees "Factura vendida ✓" but `/historial` is empty. | W9: on `recordSettlement` failure, `console.warn` + non-blocking UX. The tx is already onchain — UI shows success; history sync is best-effort. Optionally show a toast "No se pudo guardar en historial; tx en blockchain OK" (CD-31 compliant — `errorCode` only). |

---

## §14 — Pre-merge checklist (before declaring F3 DONE)

Check every box. Each unchecked box = BLOQUEANTE in Adversary Review.

### Code & tests
- [ ] 13/13 waves implemented in 13 commits (or fewer if waves are squashed — at minimum, distinct commits per logical group).
- [ ] **77 prior tests still green** (run `npm test` and confirm no prior test broken).
- [ ] **~28 new tests added and green** (matches §11 expectations).
- [ ] `npm run build` → success, no errors.
- [ ] `npx tsc --noEmit` → 0 errors.
- [ ] No `any` introduced (search: `grep -rn ": any" src/ --include="*.ts" --include="*.tsx"` → 0 lines in new files).
- [ ] No `console.log` (use `console.warn` per CD-31 only).
- [ ] No new `TODO` / `FIXME` / `XXX` in code.
- [ ] No commits with `--no-verify`.

### Constraints
- [ ] `grep -r "supabase.co" src/ --include="*.ts" --include="*.tsx" | grep -v "process.env"` → empty (CD-24, AC-18).
- [ ] Engine files in §6 unchanged (`git diff main...HEAD -- 'src/app/api/**' 'src/core/**' 'src/infra/**' 'contracts/**' 'src/lib/audit-trail-composer.ts' 'src/components/InvoiceScanner.tsx' 'src/components/PipelineProgress.tsx' 'src/components/TraceConsole.tsx'` → empty diff).
- [ ] RLS enabled on both `profiles` and `settled_invoices` (CD-21) — verified in migrations.
- [ ] All Server Actions catch Supabase errors with `console.warn('[cobraya-action]', { action, errorCode })` only — no `err.message` (CD-31).
- [ ] All `settled_invoices` queries include `.eq('user_id', user.id)` (CD-32).
- [ ] `recordSettlement` validates `requestId` via `isValidUuidV4()` (CD-33).
- [ ] `src/middleware.ts` uses `.maybeSingle()`, not `.single()`.
- [ ] `src/middleware.ts` uses `redirectWithCookies(url)` in every redirect.
- [ ] `src/lib/supabase/server.ts` `createClient` is **NOT** `async`; `cookies()` is called **WITHOUT** `await` (R-2 / DD-B).

### UX
- [ ] BottomTabs hidden on `/`, `/login`, `/signup`, `/onboarding/*`, `/~offline`.
- [ ] BottomTabs touch targets `min-h-[48px]`.
- [ ] BottomTabs has `padding-bottom: env(safe-area-inset-bottom)`.
- [ ] All user-visible copy in ES-MX (CD-22).
- [ ] `themeColor` in root layout is `#651332`.
- [ ] `manifest.json` `theme_color = '#651332'` (AC-17).

### Manual smoke (W12)
- [ ] Splash → signup → onboarding step 1 (AC-4).
- [ ] 5 steps complete → dashboard (AC-6).
- [ ] Negociar → settle → historial shows tx (AC-11, AC-12).
- [ ] Perfil edit + save (AC-14).
- [ ] Sign out → /login (AC-5).
- [ ] `/manifest.json` served without redirect (R-5).

### Git hygiene
- [ ] Branch: `feat/wkh-cobraya-dapp-shell` from `main@70f0d7d`.
- [ ] Every commit message starts with `<type>(WKH-COBRAYA-DAPP-SHELL):` (no exceptions).
- [ ] **PR draft created** with title `feat(WKH-COBRAYA-DAPP-SHELL): mobile dapp shell + supabase auth + onboarding`.

### PR body template
```markdown
## Summary
- Mobile DApp shell: Supabase auth (LUM-100), profiles + settled_invoices tables with RLS, route groups (auth)/(app), BottomTabs + TopNav, 5-step onboarding wizard, dashboard with stats, Negociar tab (refactor of /demo), Historial, Perfil.
- Palette migration cream + burgundy via `luma-*` Tailwind extension + CSS vars. Engine untouched.

## Test plan
- [ ] `npm test` — 77 prior + ~28 new tests green
- [ ] `npx tsc --noEmit` — 0 errors
- [ ] `npm run build` — success
- [ ] Manual smoke per §14 of story file
```

When **every box** above is checked, declare F3 DONE and hand off to Adversary (AR phase). Do NOT modify the SDD or work-item during F3 — if you find a discrepancy, escalate via the orchestrator.

---

---

## §15 — Late-binding decisions post-F3 (documented during DONE phase)

Durante AR/CR/F4, tres decisiones arquitectónicas importantes fueron finalizadas y testeadas pero no aparecen explícitamente en las secciones §2 (DDs). Están documentadas en código y auto-blindaje, pero futuras HUs deben conocerlas.

### DD-O — Prefix isolation `cobraya_` para tablas en proyectos compartidos

**Decision**: Supabase project compartido → todas las tablas/triggers/functions reciben prefix `cobraya_`.

**Snippet para referencia (código DONE, para futuras HUs)**:

```ts
// src/lib/supabase/server.ts
const { data: profiles } = await supabase
  .from('cobraya_profiles')  // <- siempre con prefix
  .select('*')
  .eq('id', user.id)
  .maybeSingle()

// src/actions/settlement.ts
const { error } = await supabase
  .from('cobraya_settled_invoices')  // <- siempre con prefix
  .insert([{
    user_id: user.id,
    uuid_cfdi: input.uuidCfdi,
    // ...
  }])
```

**Para futuras HUs que amplíen Supabase schema**:
- SIEMPRE usa prefixes isolados si el proyecto es compartido.
- Documenta el prefix en SDD §4 (Decisiones) antes de F3.
- Valida en CR que NO hay `.from('profiles')` sin prefix (grep `.from\(['"]profiles['"]` → 0 hits).

### DD-P — Admin per-user signup (no global `mailer_autoconfirm` toggle)

**Decision**: LUM-100 instant signup via `admin.createUser({ email_confirm: true })` por-usuario, no toggle global.

**Root cause**: Supabase project compartido. Global toggle hubiera broken auth en wasiai-a2a.

**Snippet para referencia (DONE)**:

```ts
// src/lib/supabase/admin.ts (NEW — server-only)
import { createClient } from '@supabase/supabase-js'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,  // <- server-only, never exported
)

// src/actions/auth.ts
export async function signUp(_prev: ActionResult, fd: FormData) {
  // ...
  const { data: user, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,  // <- per-user instant confirmation
    user_metadata: { app: 'cobraya' },
  })
  // ...
  const { data: session } = await supabase.auth.signInWithPassword({ email, password })
  // ...
}
```

**Para futuras HUs con auth**:
- Pre-flight check: `curl -H "Authorization: Bearer $PAT" https://api.supabase.com/v1/projects/{PROJECT_ID}/auth/config` antes de W3.
- Si `mailer_autoconfirm` está `false` en Supabase settings, implementa per-user override (DD-P pattern).
- **ALWAYS** ejecuta el pre-flight check even if el prompt es long (auto-blindaje lesson #3).

### CD-34 (nueva) — `admin.ts` server-only enforcement

**Constraint**: `src/lib/supabase/admin.ts` (que importa `SUPABASE_SERVICE_KEY`) ONLY importable desde:
- `src/actions/*` (Server Actions con `'use server'`)
- `src/app/**/route.ts` (Route handlers)

**Verificación (para CR/AR)**:
```bash
grep -rn "from '@/lib/supabase/admin'" src/
# Expected: ONLY hits in src/actions/* or src/app/**/route.ts (0 hits in components/)
```

**Para futuras HUs**:
- Si una HU nueva aporta más Server Actions que usan admin client, reutiliza `src/lib/supabase/admin.ts`.
- NUNCA copies `SUPABASE_SERVICE_KEY` a un `.ts` file sin esta constraint.
- Candidate para linter: `eslint-plugin-no-secret-in-client-bundle` or custom rule.

---

> **End of Story File.** This document is the contract between Architect (F2.5) and Dev (F3). Implement exactly as specified; do not improvise. §15 documenta decisiones late-binding para futuras HUs.
