# project-context.md — wasiai-lendable (Cobraya)

> Generado por nexus-analyst en F0 el 2026-05-16. Fuente de verdad del stack.

---

## Identidad del proyecto

| Campo | Valor |
|-------|-------|
| Nombre de producto | **Cobraya** |
| Tagline | SmartFactoring agéntico para PyMEs mexicanas |
| Repo GitHub | `ferrosasfp/wasiai-cobraya` (filesystem path: `wasiai-lendable`) |
| Demo live | https://wasiai-cobraya.vercel.app/demo |
| Puerto dev | 3010 (via `next dev -p 3010`) |
| Branch base | `main` (commit `70f0d7d`) |

---

## Stack tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Framework | Next.js | 14.2.5 |
| UI runtime | React + React DOM | 18.3.1 |
| Lenguaje | TypeScript | 5.5.3 |
| Estilos | Tailwind CSS | 3.4.6 |
| Blockchain client | viem | 2.21.0 |
| Schema validation | zod | 3.23.8 |
| Test runner | vitest | 1.6.1 |
| Testing Library | @testing-library/react | 16.3.2 |
| PWA | @ducanh2912/next-pwa | 10.2.9 |
| Node mínimo | 20.0.0 |

### Dependencias a agregar en WKH-COBRAYA-DAPP-SHELL

| Paquete | Propósito |
|---------|-----------|
| `@supabase/supabase-js` | Cliente Supabase |
| `@supabase/ssr` | Cookie-based auth para Next.js SSR/middleware |
| `class-variance-authority` | CVA para ui/button (port Luma) |
| `clsx` + `tailwind-merge` | cn() utility |

---

## Estructura de carpetas (actual)

```
wasiai-lendable/
  src/
    app/
      api/
        agents/
          cobraya-cfdi-validator/invoke/route.ts   ← ENGINE INTOCABLE
          cobraya-fraud-detector/invoke/route.ts   ← ENGINE INTOCABLE
          cobraya-credit-scorer/invoke/route.ts    ← ENGINE INTOCABLE
          cobraya-lender-matcher/invoke/route.ts   ← ENGINE INTOCABLE
        settle/route.ts                            ← ENGINE INTOCABLE
        scan-invoice/route.ts                      ← ENGINE INTOCABLE
        match/route.ts
        validate/route.ts
        score/route.ts
        marketplace/route.ts
      demo/page.tsx                                ← A REFACTORIZAR → (app)/negociar
      page.tsx                                     ← A REEMPLAZAR con Splash
      layout.tsx                                   ← A MODIFICAR (añadir Supabase)
      globals.css                                  ← A EXPANDIR (tokens Luma)
      ~offline/page.tsx
    components/
      InvoiceScanner.tsx                           ← ENGINE INTOCABLE (solo restyling)
      PipelineProgress.tsx                         ← ENGINE INTOCABLE (solo restyling)
      InvoiceCard.tsx
      LenderAuctionPanel.tsx
      Settlement.tsx
      AuditPanel.tsx
      TraceConsole.tsx
      BrandIcon.tsx
      InfoTooltip.tsx
      CopyButton.tsx
      InvoicePicker.tsx
      pwa/register-sw.tsx
      pwa/install-prompt.tsx
    infra/
      eip3009-signer.ts                            ← ENGINE INTOCABLE
      facilitator-client.ts                        ← ENGINE INTOCABLE
      agent-signer.ts                              ← ENGINE INTOCABLE
      a2a-client.ts
      env.ts
      llm-client.ts
    core/                                          ← ENGINE INTOCABLE (asumido)
    types/
      invoice.ts
      audit-trail.ts
    lib/
      audit-trail-composer.ts                      ← ENGINE INTOCABLE
  contracts/                                       ← ENGINE INTOCABLE
  tailwind.config.ts
  next.config.*
  package.json
  tsconfig.json
```

### Estructura objetivo (post WKH-COBRAYA-DAPP-SHELL)

```
wasiai-lendable/
  src/
    app/
      (auth)/
        login/page.tsx
        signup/page.tsx
        layout.tsx
      (app)/
        layout.tsx               ← TopNav + BottomTabs
        dashboard/page.tsx
        onboarding/
          layout.tsx
          step/[step]/page.tsx
        negociar/page.tsx        ← refactor de demo/page.tsx
        historial/page.tsx
        perfil/page.tsx
      page.tsx                   ← Splash burgundy
      layout.tsx                 ← Root layout con Supabase
    actions/
      auth.ts
      profile.ts
      settlement.ts
    lib/
      supabase/
        client.ts
        server.ts
      validation/
        auth.ts
        profile.ts
    components/
      nav/
        BottomTabs.tsx
        TopNav.tsx
      ui/
        button.tsx
        input.tsx
        label.tsx
        card.tsx
      onboarding/
        ProgressDots.tsx
        StepForm.tsx (per-step)
    middleware.ts
  supabase/
    migrations/
      001_profiles.sql
      002_settled_invoices.sql
```

---

## Design tokens (actual → target)

| Token | Actual | Target (post W1) |
|-------|--------|-----------------|
| Background | `--paper: #FAFAF8` | `luma-50: #FCF7F3` (cream) |
| Foreground | `--ink: #0A0A0A` | `luma-700: #5B0426` (headings) |
| Brand primary | `accent: #E84142` (Avalanche rojo) | `luma-600: #651332` (burgundy) |
| Accent success | — | `accent: #E84142` / emerald (onchain states) |
| Muted | `#6B7280` | `luma-400: #B7888E` |

---

## Convenciones y patrones

- **TypeScript strict** — sin `any` explícito
- **Mobile-first** — touch targets ≥48px, `pb-safe` en layouts con BottomTabs
- **i18n ES-MX** — toda copy en español (sin inglés en UI visible)
- **Server Actions** para auth y profile mutations (no API routes adicionales)
- **API routes solo para Engine** — el Engine ya tiene sus routes; no agregar más routes
- **Next.js 14 sincrónico** — `cookies()` en server.ts es síncrono (≠ Luma Next 16 `await cookies()`)
- **SVG icons inline** — sin dependencia de iconpack (mantener patrón BrandIcon existente)
- **`cn()` utility** — clsx + tailwind-merge para merge de clases
- **Zod** para validación de formularios (ya en depedencies)
- **RLS en Supabase** via app-layer (service role key no se usa en client; anon key con RLS)

---

## Variables de entorno requeridas

### Engine (ya existen)
```
COBRAYA_AGENT_SIGNER_PRIVATE_KEY
ANTHROPIC_API_KEY
FACILITATOR_URL
```

### A agregar (WKH-COBRAYA-DAPP-SHELL)
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

---

## Sistemas externos

| Sistema | Uso | Estado |
|---------|-----|--------|
| Avalanche Fuji (testnet) | Onchain commitments + EIP-3009 settle | Productivo |
| Anthropic Claude Haiku | Scoring rationale | Productivo |
| WasiAI Facilitator | Gasless USDC transfer | Productivo |
| Supabase (nuevo) | Auth + profiles + settled_invoices | A provisionear en W0 |

---

## Comandos

```bash
npm run dev        # next dev -p 3010
npm run build      # next build
npm run test       # vitest run
npm run typecheck  # tsc --noEmit
npm run lint       # next lint
npm run seed       # tsx scripts/seed-mock-data.ts
```

---

## Reglas de proceso

- **Engine INTOCABLE** (ver Scope OUT en work-items)
- **NexusAgil QUALITY** — flujo completo F0→F1→F2→F2.5→F3→AR→CR→F4→DONE
- **Sin hardcodes** — URLs, keys, endpoints siempre desde env vars
- **Middleware** es `src/middleware.ts` (Next.js 14 convención — NO `proxy.ts` como Luma)
- **Branch naming**: `feat/NNN-slug` desde `main`
