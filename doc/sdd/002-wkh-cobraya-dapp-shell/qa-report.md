# F4 QA Report — WKH-COBRAYA-DAPP-SHELL

> Date: 2026-05-16 · Reviewer: nexus-qa
> Branch: `feat/wkh-cobraya-dapp-shell` · HEAD `f81e222`
> Commits: 15 (W0..W11 + DD-P fix-pack + AR/CR fix-pack)

## Veredicto

**APROBADO PARA DONE**

176/176 tests pass. tsc clean. Build green. Engine diff vacío. 18/18 ACs PASS con evidencia archivo:línea. Todos los CDs verificados. Cero drift crítico. BLQ-BAJO-1 del AR resuelto y confirmado en tests.

---

## Drift Detection (CD-30)

Comando ejecutado:
```
git diff main..feat/wkh-cobraya-dapp-shell --name-only -- \
  'src/app/api/agents/**' 'src/app/api/settle/**' 'src/app/api/scan-invoice/**' \
  'src/app/api/match/**' 'src/app/api/score/**' 'src/app/api/validate/**' \
  'src/app/api/marketplace/**' 'src/infra/**' 'src/core/**' 'contracts/**' \
  src/lib/audit-trail-composer.ts src/components/InvoiceScanner.tsx \
  src/components/PipelineProgress.tsx src/components/TraceConsole.tsx
```

Resultado: **vacío** — engine intocado. CD-30: PASS.

`src/app/demo/page.tsx` está en el diff pero es Scope IN: la HU lo convierte en redirect stub a `/negociar`. No es un archivo de engine.

---

## AC Closure — 18/18 PASS

| AC | Descripción EARS (resumen) | Test archivo:línea | Impl archivo:línea | Estado |
|----|---------------------------|-------------------|-------------------|--------|
| AC-1 | Anon en `/(app)/*` → redirect `/login` 307 | `tests/unit/middleware/middleware.test.ts:38-46` | `src/middleware.ts:52-53` | PASS |
| AC-2 | Authed + `onboarding_completed=false` en `/(app)/*` → `/onboarding/step/1` | `middleware.test.ts:48-55` | `src/middleware.ts:69-83` | PASS |
| AC-3 | Authed en `/login` o `/signup` → `/dashboard` (o `/onboarding/step/1`) | `middleware.test.ts:57-63` | `src/middleware.ts:57-67` | PASS |
| AC-4 | Signup: sesión inmediata (DD-P admin.createUser email_confirm:true), redirect `/onboarding/step/1` | `tests/unit/actions/auth.test.ts:65-88` — assert `email_confirm:true` + metadata `app:cobraya` + redirect | `src/actions/auth.ts:37-61` | PASS |
| AC-5 | SignOut: invalidar sesión + `revalidatePath('/', 'layout')` + redirect `/login` | `auth.test.ts:145-152` | `src/actions/auth.ts:87-92` | PASS |
| AC-6 | Step 5 atomic: `onboarding_completed=true` persisted + redirect `/dashboard` | `tests/unit/actions/profile.test.ts:102-118` — assert payload includes `onboarding_completed:true` | `src/actions/profile.ts:82-90` | PASS |
| AC-7 | Anti-bypass: acceso a step N > firstIncompleteStep → redirect al primer incompleto | `tests/unit/app/onboarding/step.test.tsx:38-55` | `src/app/(app)/onboarding/step/[step]/page.tsx:35-36` + `src/lib/onboarding/resume.ts` | PASS |
| AC-8 | ProgressDots: 5 puntos, actual=luma-700, prev=luma-400, ARIA progressbar | `tests/unit/components/onboarding/ProgressDots.test.tsx:6-23` | `src/components/onboarding/ProgressDots.tsx:1-35` | PASS |
| AC-9 | Dashboard: greeting email.split('@')[0], 4 stat cards, perfil preview, 5 recientes | `tests/unit/app/dashboard/page.test.tsx:62-106` | `src/app/(app)/dashboard/page.tsx:54-88` | PASS |
| AC-10 | Negociar: mismo flow 4-agentes dentro del chrome, engine wiring intocable | `tests/unit/app/negociar/page.test.tsx:11-27` + engine diff vacío | `src/app/(app)/negociar/page.tsx:1-30` (port DD-I) | PASS |
| AC-11 | recordSettlement inserta fila con todos los campos especificados + `user_id` | `tests/unit/actions/settlement.test.ts:80-98` — assert payload shape completo | `src/actions/settlement.ts:31-44` | PASS |
| AC-12 | Historial: solo filas `user_id=auth.uid()`, ordenadas `settled_at DESC` | `tests/unit/app/historial/page.test.tsx:48-97` — assert `.eq('user_id', 'u1')` | `src/app/(app)/historial/page.tsx:25-31` | PASS |
| AC-13 | RLS rechaza lectura de filas de otro usuario (USING `auth.uid() = user_id`) | `historial.test.tsx:59-63` + `supabase/migrations/002_settled_invoices.sql:24-27` | `002_settled_invoices.sql:24-27` + `src/actions/settlement.ts:33` | PASS |
| AC-14 | updateProfile hace upsert en `cobraya_profiles` con `.eq('id', user.id)` + `updated_at` via trigger | `profile.test.ts:120-142` — assert upsertPayload shape + eqArgs `['id','u1']` | `src/actions/profile.ts:113-116` + `001_profiles.sql:47-59` (trigger) | PASS |
| AC-15 | BottomTabs: 4 tabs, `min-h-[48px]`, `env(safe-area-inset-bottom)`, oculto en `/(auth)/*` + splash + onboarding | `tests/unit/components/nav/BottomTabs.test.tsx:12-72` (7 casos) | `src/components/nav/BottomTabs.tsx:1-50` | PASS |
| AC-16 | Palette luma-{50..700} via CSS custom props + Tailwind extended | `tests/unit/components/ui/button.test.tsx` + `input.test.tsx` + `BottomTabs.test.tsx:27-34` | `src/app/globals.css:11-33` + `tailwind.config.ts:13-24` | PASS |
| AC-17 | manifest.json `theme_color: #651332` (burgundy luma-600) | `tests/unit/pwa/manifest.test.ts` (updated for burgundy) | `public/manifest.json:9` — `"theme_color": "#651332"` | PASS |
| AC-18 | Supabase URL/key solo desde `process.env.*` — sin hardcodes funcionales | grep `supabase.co` en src/ → solo en comentarios (admin.ts:10, auth.ts:30); ningún valor funcional hardcodeado | `src/lib/supabase/client.ts:5-8` + `server.ts:12-13` + `admin.ts:20-21` — todos `process.env.*` | PASS |

---

## CD Compliance — Verificación Independiente

| CD | Verificación | Evidencia | Estado |
|----|--------------|-----------|--------|
| CD-19 layer rule | `grep -rn "from '@/core'" src/lib/ src/components/` | Sin resultados | PASS |
| CD-20 Server Actions | `git diff src/app/api/` — sin archivos nuevos de auth/profile | Solo `src/actions/*.ts` creados | PASS |
| CD-21 RLS habilitado | `001_profiles.sql:18` + `002_settled_invoices.sql:22` | `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` en ambas migraciones | PASS |
| CD-22 ES-MX copy | UI strings revisadas: "Correo", "Crear cuenta", "Cuéntanos un poco más", "Cerrar sesión", "No se pudo guardar." | Cero strings en inglés en UI de usuario final | PASS |
| CD-23 ≥48px touch | `BottomTabs.tsx:38` `min-h-[48px]` en cada `<Link>`; `login-form` + `button.tsx` tienen `min-h-[48px]`; `BottomTabs.test.tsx:27-34` asserta la clase | PASS |
| CD-24 env only | `grep -rn "supabase.co\|supabase.io\|bdwvrwz" src/` filtrando `process.env` → solo 2 hits en comentarios de código | Ningún valor funcional hardcodeado | PASS |
| CD-25 SW NetworkOnly | `next.config.js:43-47` — patrón `/(login|signup|onboarding|dashboard|negociar|historial|perfil)` → `NetworkOnly` | PASS |
| CD-26 authed bounce auth/* | `middleware.ts:57-67` — `if (isBounceRoute && user)` | PASS |
| CD-27 anon → /login | `middleware.ts:52-53` — `if (!user && !isAuthExempt)` | PASS |
| CD-28 onboarding pending bounce | `middleware.ts:69-83` — `if (profile?.onboarding_completed !== true)` | PASS |
| CD-29 vi.mock Supabase | Todos los test files de actions + middleware usan `vi.mock('@/lib/supabase/server')` / `vi.mock('@supabase/ssr')` | Cero llamadas reales a Supabase en CI | PASS |
| CD-30 engine no-modify | Drift check: **vacío** (ejecutado en esta sesión F4) | PASS |
| CD-31 console.warn errorCode-only | `grep console.warn src/actions/ src/lib/dashboard/` → todos los warn son `{ action, errorCode }` shape; ningún `err.message` / `err.stack` expuesto | PASS |
| CD-32 app-layer user_id filter | `historial/page.tsx:30` `.eq('user_id', user.id)`; `dashboard/page.tsx:51` `.eq('user_id', user.id)`; `stats.ts:31` `.eq('user_id', userId)`; `settlement.ts:33` `user_id: user.id` en payload | PASS |
| CD-33 isValidUuidV4 reuse | `settlement.ts:20` `if (!isValidUuidV4(input.requestId))`; `settlement.test.ts:60-69` aserta rechazo de CRLF-poisoned UUID | PASS |
| CD-34 admin server-only | `grep -rn "from '@/lib/supabase/admin'" src/` → único hit: `src/actions/auth.ts:5` | PASS |

---

## Quality Gates

| Métrica | Target | Actual | Estado |
|---------|--------|--------|--------|
| Tests | ≥105 | **176/176** (45 test files) | PASS |
| TypeScript (`tsc --noEmit`) | 0 errors | **0** | PASS |
| Build (`npm run build`) | green | **green** — 7 static + 11 dynamic + ƒ middleware | PASS |
| `: any` nuevo (no test) | 0 | 0 (`as any` en stats.ts tiene eslint-disable + justification — MNR-3 conocido) | PASS |
| `as unknown as X` no-test | 0 | 0 | PASS |
| `.skip` / `test.todo` | 0 | 0 | PASS |
| `@ts-ignore` nuevo | 0 | 0 | PASS |
| TODO/FIXME nuevo | 0 | 0 | PASS |
| `console.log` en src/ | 0 | 0 (solo `console.warn` permitido) | PASS |
| `--no-verify` commits | 0 | 0 (verificado por commit messages y pre-commit hooks — hooks firmaron todos los commits) | PASS |

---

## Runtime Checks

**Nota**: Las migraciones SQL aún no se aplicaron a la DB remota (dependencia humana explícita documentada en los inputs de F4). Los runtime checks de DB se marcan NO VERIFICABLE por diseño — no bloquean este gate.

| Check | Estado |
|-------|--------|
| DB `cobraya_profiles` existe y constraints correctos | NO VERIFICABLE (migrations pendientes de aplicar por humano) |
| DB `cobraya_settled_invoices` existe y UNIQUE(request_id) | NO VERIFICABLE (migrations pendientes) |
| RLS policies activas en producción | NO VERIFICABLE (migrations pendientes) |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` en env | NO VERIFICABLE sin acceso al Vercel/Railway env del proyecto |
| `SUPABASE_SERVICE_KEY` (DD-P) en env deployment | NO VERIFICABLE — documentado en `.env.example` |
| Build smoke CI (tests + tsc + build) | PASS — ejecutados en esta sesión |

---

## Process / Docs

| Item | Estado |
|------|--------|
| auto-blindaje.md | PASS — 3 lessons documentadas (useActionState React 18, Headers proto jsdom, DD-P pre-flight check) |
| AR report persistido | PASS — `doc/sdd/002-wkh-cobraya-dapp-shell/ar-report.md` en disco |
| CR report persistido | PASS — `doc/sdd/002-wkh-cobraya-dapp-shell/cr-report.md` en disco |
| PR #6 | PASS — OPEN, `feat/wkh-cobraya-dapp-shell` → `main`, título correcto |
| Formato commits | PASS — 15/15 siguen `<type>(WKH-COBRAYA-DAPP-SHELL): <subject>` |
| BLQ-BAJO-1 del AR resuelto | PASS — `TopNav.tsx:19-24` implementa `HIDE_PREFIXES`; `TopNav.test.tsx:28-40` cubre 6 rutas hidden; 176/176 pass |

---

## Deferred a Fase DONE (no blocan este gate)

- **AR-MNR-1**: DD-O / DD-P / CD-34 no back-propagados al SDD ni Story File → nexus-docs lo apendea en `§15 Post-implementation Decision Doc updates`.
- **AR-MNR-2**: `loadDashboardStats` swallows DB errors silently (ceros sin pill de UI) → backlog.
- **AR-MNR-3 / CR-MNR-3**: `(supabase as any)` en `stats.ts:27-28` → type refactor en siguiente sprint.
- **CR-MNR-4**: case-insensitive buyer dedup en `step3-form.tsx` → backlog.
- **CR-MNR-5**: duplicación tabs config entre `BottomTabs.tsx` y `TopNav.tsx` → backlog (extraer a `tabs.config.ts`).
- **CR-MNR-6**: comentario faltante en hidden input pattern → backlog.
- **CR-MNR-7**: `<style jsx>` warning en `InvoiceScanner.tsx` — Engine, intocable, pre-existente.
- **PNG icons**: `public/icons/*.png` aún en legacy green — AC-17 cubre `theme_color` y `BrandIcon` SVG (burgundy via CSS vars); los PNGs son follow-up cosmético.
- **Live smoke E2E**: depende de que el humano aplique las migrations al proyecto Supabase. Post-merge.

---

## Recomendación

**Listo para DONE.** No hay ACs en FAIL, no hay hallazgos runtime bloqueantes (los únicos NO VERIFICABLE son por dependencia humana de migrations, explícitamente fuera del scope de este gate). El fix-pack de AR/CR está integrado y verificado.
