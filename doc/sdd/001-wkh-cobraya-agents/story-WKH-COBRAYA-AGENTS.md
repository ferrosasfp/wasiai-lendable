# Story File — WKH-COBRAYA-AGENTS · Cobraya factoring marketplace

> ⚠️ **ESTE ARCHIVO ES EL ÚNICO INPUT DEL DEV EN F3.**
> NO leas `work-item.md` ni `sdd.md` desde el dev. **TODO** lo necesario está acá.
>
> Pipeline: **QUALITY** · Branch: `feat/wkh-cobraya-agents` · Estimated effort: **18–20h** distribuidas en 11 waves (W0..W7) + W8 manual video sprint (fuera de F3).
>
> Repo: `/home/ferdev/.openclaw/workspace/wasiai-lendable`
> Status: SPEC_APPROVED (2026-05-15) → F3 ready.

---

## 0. Contexto compacto (qué construir y por qué)

Cobraya es un **marketplace de factoraje agéntico para PyMEs mexicanas**. Lupita, dueña de "Tortillería La Esperanza", sube un CFDI de $48,500 MXN a Walmart México. **Cuatro agentes IA componibles** procesan la factura en <60s:

| # | Agente | Precio | Función |
|---|--------|--------|---------|
| 1 | `cobraya-cfdi-validator` | $0.001 | Valida shape + anchor buyer + duplicates in-memory |
| 2 | `cobraya-fraud-detector` | $0.005 | Previene doble-cesión via commitment **onchain** en Avalanche Fuji |
| 3 | `cobraya-credit-scorer` | $0.050 | Score determinista + rationale Claude Haiku (fallback local) |
| 4 | `cobraya-lender-matcher` | $0.010 | Auction de 4 lenders rankeados |
| | **Total/run** | **$0.066 USDC** | Debit via wasiai-a2a (WKH-59 per-step pricing). |

Al final Lupita firma EIP-3009 → wasiai-facilitator submitea tx en Avalanche Fuji → recibe USDC. Cada step firma un **EIP-712 receipt** que conforma un audit trail JSON descargable y verificable offline (`scripts/verify-audit-trail.js`).

UI **mobile-first PWA installable** (iOS/Android). Patrón base: `wasiai-agentshop` (Kite Hackathon, open source). PWA scaffold: `luma-ai`. Foundry: `wasiai-v2/contracts`.

---

## 1. Pre-flight (antes de empezar W0 — 10min)

### 1.1 Branch & repo state

```bash
cd /home/ferdev/.openclaw/workspace/wasiai-lendable
git branch --show-current
# Esperado: feat/wkh-cobraya-agents  (ya creada desde main, commit 71f3a65)

git status
# Esperado: clean (sin cambios pendientes)
```

Si la branch no existe o estás en otra → **STOP**, avisar al humano. NO crear branch nueva.

### 1.2 `.env.local` — qué debe estar y qué falta

`.env.local` ya tiene (verified W0 pre-flight SDD §4):

- ✅ `OWNER_PRIVATE_KEY` · `OWNER_ADDRESS=0x94DCDb...`
- ✅ `TREASURY_PRIVATE_KEY` · `TREASURY_ADDRESS=0x1d024B...`
- ✅ `OPERATOR_PRIVATE_KEY`
- ✅ `DEPLOYER_PRIVATE_KEY` (alias TREASURY)
- ✅ `FRAUD_DETECTOR_AGENT_WALLET` (alias TREASURY V1)
- ✅ `FRAUD_DETECTOR_PRIVATE_KEY` (alias TREASURY V1)
- ✅ `A2A_KEY` · `WASIAI_A2A_URL=https://wasiai-a2a-production.up.railway.app`
- ✅ `WASIAI_FACILITATOR_URL=https://wasiai-facilitator-production.up.railway.app`
- ✅ `AVALANCHE_RPC_URL` · `CHAIN_ID=43113` · `USDC_ADDRESS=0x5425890298aed601595a70AB815c96711a31Bc65`
- ⚠️ `COBRAYA_COMMITMENTS_ADDRESS=POPULATE_AFTER_DEPLOY_W2.5d` → se completa post-deploy W2.5d
- ⚠️ `ANTHROPIC_API_KEY=COPY_FROM_WASIAI_A2A_DOTENV_AT_18:00` → completar al iniciar W0 (copy del `.env` de wasiai-a2a)
- ⚠️ `SNOWTRACE_API_KEY=GET_FREE_KEY_FROM_SNOWTRACE_BEFORE_18:00` → obtener gratis en https://snowtrace.io/myapikey antes de W2.5a

**Faltan completamente** (se generan/agregan a lo largo de las waves):

- `VALIDATOR_HOT_KEY` `FRAUD_HOT_KEY` `SCORER_HOT_KEY` `MATCHER_HOT_KEY` → generadas en **W5.5** con `viem generatePrivateKey()`
- `ONCHAIN_AMOUNT_CAP_USDC=0.05` → setear en **W5** (cap server-side honored por /api/settle)

### 1.3 Balance wallets (testnet AVAX)

```bash
# OWNER ≥ 0.3 AVAX (recibe el settlement)
curl -s -X POST $AVALANCHE_RPC_URL \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","method":"eth_getBalance","params":["0x94DCDb...","latest"],"id":1}'

# TREASURY ≥ 1.5 AVAX (paga gas de deploy + 3 commits) y ≥ 15 USDC (settle x3)
curl -s -X POST $AVALANCHE_RPC_URL \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","method":"eth_getBalance","params":["0x1d024B...","latest"],"id":1}'
```

Si una wallet no tiene fondos → topear desde el faucet AVAX antes de continuar. **Sin esto W2.5d falla y rompe AC-10.**

### 1.4 Endpoints alive

```bash
curl -fsSL https://wasiai-a2a-production.up.railway.app/health
curl -fsSL https://wasiai-facilitator-production.up.railway.app/health
```

Ambos deben retornar `200 OK`. Si alguno falla → no es bloqueante para waves W0–W6 (NEXT_PUBLIC_DEMO_MODE=true funciona), pero sí para W7 smoke E2E.

### 1.5 Baseline build/typecheck

```bash
npm install
npm run typecheck   # debe estar VERDE antes de empezar (CD-2)
npm run build       # debe estar VERDE
```

Si rompe → **STOP**, fix antes de comenzar W0.

---

## 2. Constraint Directives (INVIOLABLES — 24 totales)

> ⚠️ Violación de cualquier CD marcada **BLOQUEANTE** abajo es rejection automática del AR.

### Del work-item (CD-1..CD-18)

- **CD-1** [BLOQUEANTE]: TypeScript strict — **sin `any` explícito**. Usar `unknown` + narrowing.
- **CD-2** [BLOQUEANTE]: Cada wave deja `npm run build` + `npm run typecheck` **verde** antes de commit.
- **CD-3** [BLOQUEANTE]: `NEXT_PUBLIC_DEMO_MODE=true` **DEBE siempre funcionar** — el flow completo sin red ni wallets es paracaídas no negociable.
- **CD-4** [BLOQUEANTE]: **PROHIBIDO modificar** `wasiai-a2a`, `wasiai-facilitator`, `wasiai-v2`. Solo consumir.
- **CD-5** [BLOQUEANTE]: `ONCHAIN_AMOUNT_CAP_USDC` (0.05) DEBE ser honrado server-side en `/api/settle` (no solo UI).
- **CD-6** [BLOQUEANTE]: **NO commits con `--no-verify`**. Si hook falla → fix root cause y nuevo commit.
- **CD-7**: Cada commit firmado con `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>`.
- **CD-8**: Si te empantanás >90min en un ítem → **fallback a mock** + ship resto. Scope flexibility controlada.
- **CD-9** [BLOQUEANTE]: **PROHIBIDO leak** de `owner_ref`, private keys, A2A_KEY hash en logs/UI/respuestas API.
- **CD-10**: Mock data **determinístico** — `src/lib/mock-data.ts` con 3 CFDIs fijos. **NO `Math.random()`** en `src/core/*`.
- **CD-11** [BLOQUEANTE]: `commitInvoice` gas **< 80K**. Verified via `forge test --gas-report`. Target interno 60K.
- **CD-12** [BLOQUEANTE]: EIP-712 domain audit = `{name:"Cobraya", version:"1", chainId:43113}`. **PROHIBIDO** `chainId:0`.
- **CD-13** [BLOQUEANTE]: `scripts/verify-audit-trail.js` standalone — **solo `viem` o `ethers`**, sin importar nada de Cobraya.
- **CD-14**: `forge script Deploy.s.sol --verify` automated. Fallback `--verifier sourcify` si Snowtrace key falla.
- **CD-15**: Custom errors Solidity con **params útiles** — ej. `AlreadyCommitted(hash, ts, committer)`.
- **CD-16**: Lighthouse PWA **score > 90**. Verificar pre-W7.
- **CD-17** [BLOQUEANTE]: SW **NUNCA** cachea `/api/*` ni `wasiai-a2a` ni `wasiai-facilitator` (NetworkOnly). Cachear payment calls = fraude financiero.
- **CD-18** [BLOQUEANTE]: NO desktop-only layouts. Viewport **≥360px** sin scroll horizontal.

### Del SDD (CD-19..CD-24)

- **CD-19** [BLOQUEANTE]: **PROHIBIDO** importar `core/*` desde `infra/*`. Layer rule strict: `app → application → infra → core`.
- **CD-20** [BLOQUEANTE]: **PROHIBIDO** `Math.random()` o `Date.now()` dentro de `src/core/*` (rompe determinismo). Permitido solo en `src/infra/*` y `src/app/*`.
- **CD-21** [BLOQUEANTE]: **PROHIBIDO** `console.log(process.env.*)` o cualquier dump de env vars sensibles. Refuerzo de CD-9.
- **CD-22** [BLOQUEANTE]: Header `x-a2a-key` **solo outbound desde server-side**. Nunca en client-side fetch (browser).
- **CD-23**: Mask parcial `rfcEmisor` en respuestas JSON externas (`rfcEmisorMasked: "TLE850***"`). El `commitmentHash` raw sí va (es público on-chain).
- **CD-24**: Tests unitarios **NO** importan `process.env.*` direct — usar `vi.stubEnv()` para evitar bleed entre tests.

---

## 3. Stack & layers (regla dependencia)

```
src/
├── app/           Next.js 14 App Router (routes + pages)
├── application/   Use cases (orquestación, sin I/O directo)
├── infra/         Adapters: a2a-client, facilitator-client, eip3009-signer, llm-client, agent-signer, env
├── core/          Pure domain — scoring.ts, matching.ts, settlement.ts, invoice.ts (NO I/O, NO Math.random)
├── types/         DTOs — invoice.ts, trace.ts, audit-trail.ts
└── lib/           mock-data.ts, abis/

contracts/         Foundry (Solidity 0.8.24 + OpenZeppelin Ownable2Step)
public/            manifest.json, icons/, splashes/
scripts/           generate-pwa-assets.mjs, verify-audit-trail.js (standalone Node)
```

**Layer rule (CD-19)**: `app → application → infra → core`. `core` NO importa nada. `infra` NO importa de `core`. Si necesitás compartir un type → poné en `src/types/`.

### Versiones fijas (de `package.json` actual)

- Next.js 14.2.5, React 18.3.x, TypeScript 5.x
- viem 2.21.0
- zod 3.23.8
- Node ≥18

### A instalar durante las waves

- W0.5a: `@ducanh2912/next-pwa@^10.2.9`
- W1: `vitest @vitest/ui @testing-library/react @testing-library/jest-dom jsdom` (`--save-dev`)
- W2.5a: Foundry (`forge init` + `forge install OpenZeppelin/openzeppelin-contracts`)

**NUNCA instalar el SDK `@anthropic-ai/sdk`** — `llm-client.ts` usa `fetch` directo (DT-E).

---

## 4. Wave W0 — Bootstrap & env (15min)

**Objetivo**: Confirmar pre-flight + completar `.env.local` con `ANTHROPIC_API_KEY` + `SNOWTRACE_API_KEY`. NO toca código.

### Archivos

| Path | Acción | Detalle |
|---|---|---|
| `.env.local` | **MODIFY** | Reemplazar `COPY_FROM_*` placeholders con valores reales (ver §1.2). |

### Validación

```bash
git branch --show-current     # → feat/wkh-cobraya-agents
grep -c "COPY_FROM\|set-me\|POPULATE_AFTER" .env.local
# Debe ser 1 (solo COBRAYA_COMMITMENTS_ADDRESS=POPULATE_AFTER_DEPLOY_W2.5d, el resto completos)

npm run typecheck && npm run build
# Ambos VERDE — CD-2
```

### ACs cubiertos

Pre-requisito para todos. No marca ningún AC específico como PASS.

### Commit

```
chore(WKH-COBRAYA): WAVE W0 — bootstrap env vars + pre-flight checks

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

---

## 5. Wave W0.5 — PWA scaffold mobile-first (45min)

**Objetivo**: instalar `@ducanh2912/next-pwa`, wrap `next.config.js`, manifest + icons + offline page + RegisterSW/InstallPrompt.

### Sub-wave W0.5a — Plugin + config (10min)

```bash
npm install @ducanh2912/next-pwa@^10.2.9
```

**MODIFY** `next.config.js` → reemplazo completo:

```js
// next.config.js — reemplazo completo W0.5a
const withPWAInit = require('@ducanh2912/next-pwa').default;

const withPWA = withPWAInit({
  dest: 'public',
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === 'development',
  extendDefaultRuntimeCaching: false,
  fallbacks: { document: '/~offline' },
  workboxOptions: {
    disableDevLogs: true,
    cleanupOutdatedCaches: true,
    runtimeCaching: [
      // CD-17: payment paths MUST never cache (= financial fraud)
      {
        urlPattern: /^https:\/\/wasiai-a2a-production\.up\.railway\.app\//,
        handler: 'NetworkOnly',
        options: { cacheName: 'wasiai-a2a-networkonly' },
      },
      {
        urlPattern: /^https:\/\/wasiai-facilitator-production\.up\.railway\.app\//,
        handler: 'NetworkOnly',
        options: { cacheName: 'wasiai-facilitator-networkonly' },
      },
      {
        urlPattern: /\/api\//,
        handler: 'NetworkOnly',
        options: { cacheName: 'cobraya-api-networkonly' },
      },
      // Brand assets — long-lived cache
      {
        urlPattern: /\/(icons|splashes)\//,
        handler: 'CacheFirst',
        options: {
          cacheName: 'cobraya-brand-assets',
          expiration: { maxEntries: 32, maxAgeSeconds: 60 * 60 * 24 * 30 },
        },
      },
      // Document navigations — NetworkFirst + ~offline fallback
      {
        urlPattern: ({ request, sameOrigin }) => sameOrigin && request.destination === 'document',
        handler: 'NetworkFirst',
        options: { cacheName: 'documents', networkTimeoutSeconds: 3 },
      },
    ],
  },
});

module.exports = withPWA({ reactStrictMode: true, poweredByHeader: false });
```

**Exemplar de referencia**: `/home/ferdev/.openclaw/workspace/luma-ai/next.config.mjs:1-91`.

### Sub-wave W0.5b — Assets PWA (10min)

**NEW** `public/manifest.json`:

```json
{
  "name": "Cobraya",
  "short_name": "Cobraya",
  "description": "Factoraje agéntico para PyMEs mexicanas — USDC en segundos",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#0a0a0a",
  "theme_color": "#0F8B4A",
  "lang": "es",
  "categories": ["finance", "productivity"],
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "/icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

**NEW** `scripts/generate-pwa-assets.mjs` → **copy** de `/home/ferdev/.openclaw/workspace/luma-ai/scripts/generate-pwa-assets.mjs` (7KB). Apuntar source logo a `public/icons/logo-source.png` (placeholder Cobraya — simple PNG con letra "C" sobre fondo `#0F8B4A` si no hay logo final).

**Generar** los PNGs en `public/icons/` + `public/splashes/`:

```bash
node scripts/generate-pwa-assets.mjs
# Outputs esperados:
#   public/icons/icon-192.png
#   public/icons/icon-512.png
#   public/icons/icon-maskable-512.png
#   public/icons/apple-touch-icon-120.png
#   public/icons/apple-touch-icon-152.png
#   public/icons/apple-touch-icon-180.png
#   public/splashes/splash-iphone-{2x,3x,plus}.png
```

**Fallback si Sharp no está instalado**: el script de luma-ai usa Sharp. Si falla → `npm install --save-dev sharp` y reintentar.

### Sub-wave W0.5c — Offline page + PWA components (10min)

**NEW** `src/app/~offline/page.tsx`:

```tsx
export default function OfflinePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-paper">
      <h1 className="serif text-3xl mb-3">Sin conexión</h1>
      <p className="text-sm text-muted mb-6">
        El demo determinístico sigue funcionando.
      </p>
      <button
        onClick={() => location.reload()}
        className="bg-ink text-paper px-6 py-3 mono text-xs uppercase tracking-widest"
      >
        Reintentar
      </button>
    </main>
  );
}
```

**NEW** `src/components/pwa/register-sw.tsx` → **copy** de `/home/ferdev/.openclaw/workspace/luma-ai/src/components/pwa/register-sw.tsx` sin cambios.

**NEW** `src/components/pwa/install-prompt.tsx` → **copy** de `/home/ferdev/.openclaw/workspace/luma-ai/src/components/pwa/install-prompt.tsx`. Adaptar texto a español:
- Prompt: "Instalá Cobraya en tu teléfono"
- CTA: "Instalar"

### Sub-wave W0.5d — Layout metadata (10min)

**MODIFY** `src/app/layout.tsx` → reemplazar con:

```tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { RegisterSW } from "@/components/pwa/register-sw";
import { InstallPrompt } from "@/components/pwa/install-prompt";

export const metadata: Metadata = {
  title: "Cobraya · Factoraje agéntico para PyMEs",
  description: "Tu factura, líquida en 30 segundos. USDC en Avalanche.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Cobraya" },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192" },
      { url: "/icons/icon-512.png", sizes: "512x512" },
    ],
    apple: [{ url: "/icons/apple-touch-icon-180.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0F8B4A",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        {children}
        <RegisterSW />
        <InstallPrompt />
      </body>
    </html>
  );
}
```

### Sub-wave W0.5e — Smoke (5min)

```bash
npm run build && npm start
# Chrome DevTools → Application tab:
#   ✓ Manifest válido (no warnings)
#   ✓ Service Worker registered
#   ✓ Icons all loaded
# DevTools → Lighthouse → PWA category → score > 90 (CD-16)
# DevTools → Network → Offline mode → reload /demo → renders ~offline/page.tsx (AC-18)
```

### Tests W0.5

| Test | Archivo | Criterio |
|---|---|---|
| T-PWA-1 | `tests/unit/pwa/manifest.test.ts` | `JSON.parse(fs.readFileSync('public/manifest.json'))` válido + tiene 3 icons + `theme_color === "#0F8B4A"` |
| T-PWA-2 | `tests/unit/pwa/offline-page.test.tsx` | render `<OfflinePage/>` → contiene texto "Sin conexión" |
| T-PWA-3 | `tests/unit/pwa/install-prompt.test.tsx` | render `<InstallPrompt/>` sin `beforeinstallprompt` event → no crash |

### Validación

```bash
npm run typecheck && npm run build
# Verde
```

### ACs cubiertos
- **AC-16** (PWA installable) — manifest válido + SW registered + Lighthouse > 90
- **AC-18** (offline fallback) — `~offline/page.tsx` sirve sin red

### Commit
```
feat(WKH-COBRAYA): WAVE W0.5 — PWA scaffold mobile-first (manifest + SW + offline)

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

---

## 6. Wave W1 — Mock data + types + core domain (30min)

**Objetivo**: replace mock data con 3 CFDIs + 4 buyers + 4 lenders, extender types, replace scoring/matching con formulas deterministas + auction logic, instalar vitest.

### Archivos

| Path | Acción |
|---|---|
| `src/lib/mock-data.ts` | **REPLACE** completo |
| `src/types/invoice.ts` | **EXTEND** (nuevos campos + auction types) |
| `src/core/scoring.ts` | **REPLACE** completo |
| `src/core/matching.ts` | **REPLACE** completo |
| `src/infra/env.ts` | **MODIFY** (borrar Oracle vars, agregar nuevas) |
| `src/infra/mock-adapter.ts` | **MODIFY** (agregar mockFraudCheck + mockAuction) |
| `src/app/api/marketplace/route.ts` | **NEW** |
| `vitest.config.ts` | **NEW** |
| `package.json` | **MODIFY** (scripts test + deps) |
| `tests/unit/core/scoring.test.ts` | **NEW** |
| `tests/unit/core/matching.test.ts` | **NEW** |
| `tests/unit/api/marketplace.test.ts` | **NEW** |

### 6.1 `src/lib/mock-data.ts` — REPLACE completo

Snippet clave (mostrando contracts; el archivo completo va con los 3 CFDIs + 4 buyers + 4 lenders):

```typescript
// src/lib/mock-data.ts
import type { Invoice } from "@/types/invoice";

export interface BuyerTier1 {
  name: string;             // "Walmart México"
  rfc: string;              // "WAL9709244WS"
  sector: string;           // "food retail"
  sectorAdjustment: number; // delta para scoring
}

export interface Lender {
  id: string;
  name: string;             // "Bankaool Pool A"
  bandAllowlist: Array<"A" | "B" | "C" | "D">;
  sectorAllowlist: "all" | string[];
  minAmountMXN: number;
  maxAmountMXN: number;
  aprPct: number;
  advanceRatePct: number;
  speedMinutes: number;
}

export const BUYERS_TIER_1: BuyerTier1[] = [
  { name: "Walmart México",  rfc: "WAL9709244WS", sector: "food retail",  sectorAdjustment:  5 },
  { name: "Bimbo",           rfc: "BIM450316L92", sector: "apparel",      sectorAdjustment:  3 },
  { name: "Cemex",           rfc: "CEM880101HNB", sector: "construction", sectorAdjustment: -8 },
  { name: "OXXO",            rfc: "OXX901016JA1", sector: "retail",       sectorAdjustment:  0 },
];

export const LENDERS_CATALOG: Lender[] = [
  { id: "lender-bankaool-a",     name: "Bankaool Pool A",   bandAllowlist: ["A","B"],     sectorAllowlist: "all",                          minAmountMXN: 10000, maxAmountMXN: 500000, aprPct: 14.0, advanceRatePct: 92, speedMinutes: 45 },
  { id: "lender-arkangeles-i",   name: "Arkangeles Fund I", bandAllowlist: ["A","B","C"], sectorAllowlist: ["food retail","apparel","retail","services"], minAmountMXN:  5000, maxAmountMXN: 300000, aprPct: 13.0, advanceRatePct: 90, speedMinutes: 30 },
  { id: "lender-bbva-bridge",    name: "BBVA SME Bridge",   bandAllowlist: ["A"],         sectorAllowlist: "all",                          minAmountMXN: 50000, maxAmountMXN: 2000000, aprPct: 12.5, advanceRatePct: 95, speedMinutes: 60 },
  { id: "lender-konfio",         name: "Konfío Express",    bandAllowlist: ["B","C","D"], sectorAllowlist: "all",                          minAmountMXN:  1000, maxAmountMXN: 200000, aprPct: 22.0, advanceRatePct: 85, speedMinutes: 15 },
];

export const MOCK_INVOICES: Invoice[] = [
  {
    id: "inv-tortilleria-la-esperanza",
    uuid: "11111111-1111-1111-1111-111111111111",
    uuidSat: "11111111-1111-1111-1111-111111111111",
    issuer: { name: "Tortillería La Esperanza", rfc: "TLE850120ABC" },
    receiver: { name: "Walmart México", rfc: "WAL9709244WS" },
    amount: 48500, currency: "MXN",
    issueDate: "2026-05-01", dueDate: "2026-06-30",
    anchorBuyer: "Walmart México", paymentTermsDays: 60, sector: "food retail",
    status: "issued",
  },
  {
    id: "inv-confecciones-nayeli",
    uuid: "22222222-2222-2222-2222-222222222222",
    uuidSat: "22222222-2222-2222-2222-222222222222",
    issuer: { name: "Confecciones Nayeli", rfc: "CNA920315XYZ" },
    receiver: { name: "Bimbo", rfc: "BIM450316L92" },
    amount: 28200, currency: "MXN",
    issueDate: "2026-05-05", dueDate: "2026-06-04",
    anchorBuyer: "Bimbo", paymentTermsDays: 30, sector: "apparel",
    status: "issued",
  },
  {
    id: "inv-construcciones-hermanos-ruiz",
    uuid: "33333333-3333-3333-3333-333333333333",
    uuidSat: "33333333-3333-3333-3333-333333333333",
    issuer: { name: "Construcciones Hermanos Ruiz", rfc: "CHR880210QWE" },
    receiver: { name: "Cemex", rfc: "CEM880101HNB" },
    amount: 156800, currency: "MXN",
    issueDate: "2026-04-15", dueDate: "2026-07-14",
    anchorBuyer: "Cemex", paymentTermsDays: 90, sector: "construction",
    status: "issued",
  },
];
```

### 6.2 `src/types/invoice.ts` — EXTEND

Agregar al final del archivo existente (no romper exports anteriores; mantener `oraclePromptId?` opcional con comentario DEPRECATED):

```typescript
// src/types/invoice.ts — EXTEND
export interface Invoice {
  id: string;
  uuid: string;
  uuidSat?: string;
  issuer: { name: string; rfc: string };
  receiver: { name: string; rfc: string };
  amount: number;
  currency: "MXN" | "USD";
  issueDate: string;            // ISO yyyy-mm-dd
  dueDate: string;
  status: "issued" | "factored" | "paid" | "expired";
  // NEW W1
  anchorBuyer: string;
  paymentTermsDays: number;
  sector: "food retail" | "apparel" | "construction" | "services" | "retail";
}

export interface ScoreResult {
  score: number;
  band: "A" | "B" | "C" | "D";
  advanceRatePct: number;        // 80 | 88 | 92 | 95
  aprPct: number;                // 12 | 14.5 | 18 | 25
  rationale: string;
  rationaleProvenance: "anthropic-claude-haiku-4-5" | "local-fallback";
  /** @deprecated use rationaleProvenance — kept for backwards compat */
  oraclePromptId?: string;
}

export interface AuctionLender {
  lenderId: string;
  lenderName: string;
  aprPct: number;
  advanceRatePct: number;
  estimatedSettleMinutes: number;
  netAmountUSDC: number;
  rank: number;
  qualifies: boolean;
  rejectionReason?: string;
}

export interface AuctionResult {
  auction: AuctionLender[];
  recommendedLender: string | null;
  recommendationReason: string;
}
```

### 6.3 `src/core/scoring.ts` — REPLACE completo

```typescript
// src/core/scoring.ts — REPLACE
import { BUYERS_TIER_1 } from "@/lib/mock-data";

export type Band = "A" | "B" | "C" | "D";

export interface ScoreInput {
  amountMXN: number;
  anchorBuyer: string;
  paymentTermsDays: number;
  sector: string;
}

export interface BandParams { advanceRatePct: number; aprPct: number; }

function baseScoreFor(anchorBuyer: string): number {
  return BUYERS_TIER_1.some((b) => b.name === anchorBuyer) ? 70 : 30;
}

function amountAdjust(amountMXN: number): number {
  if (amountMXN < 50_000) return 5;
  if (amountMXN <= 200_000) return 0;
  return -5;
}

function termsAdjust(daysToPayment: number): number {
  if (daysToPayment <= 30) return 10;
  if (daysToPayment <= 60) return 0;
  return -8;
}

const SECTOR_ADJUST: Record<string, number> = {
  "food retail":  5,
  "apparel":      3,
  "retail":       0,
  "services":    -3,
  "construction":-8,
};

function sectorAdjust(sector: string): number {
  return SECTOR_ADJUST[sector] ?? 0;
}

export function computeBand(score: number): Band {
  if (score >= 80) return "A";
  if (score >= 60) return "B";
  if (score >= 40) return "C";
  return "D";
}

const BAND_PARAMS: Record<Band, BandParams> = {
  A: { advanceRatePct: 95, aprPct: 12 },
  B: { advanceRatePct: 92, aprPct: 14.5 },
  C: { advanceRatePct: 88, aprPct: 18 },
  D: { advanceRatePct: 80, aprPct: 25 },
};

export function bandParams(band: Band): BandParams {
  return BAND_PARAMS[band];
}

export function computeScore(input: ScoreInput): {
  score: number; band: Band; advanceRatePct: number; aprPct: number;
} {
  const score =
    baseScoreFor(input.anchorBuyer) +
    amountAdjust(input.amountMXN) +
    termsAdjust(input.paymentTermsDays) +
    sectorAdjust(input.sector);
  const band = computeBand(score);
  const params = bandParams(band);
  return { score, band, ...params };
}
```

> ⚠️ **CD-20**: No usés `Math.random()` ni `Date.now()` en este archivo. Si necesitás timestamps, recibilos como parámetro desde la capa caller.

### 6.4 `src/core/matching.ts` — REPLACE completo

```typescript
// src/core/matching.ts — REPLACE
import { LENDERS_CATALOG, type Lender } from "@/lib/mock-data";
import type { AuctionLender, AuctionResult } from "@/types/invoice";
import { mxnToUSDC, computeSettlement } from "@/core/settlement";
import type { Band } from "@/core/scoring";

interface MatchingInput {
  band: Band;
  amountMXN: number;
  anchorBuyer: string;
  sector: string;
}

interface Scored {
  lender: Lender;
  qualifies: boolean;
  rejectionReason?: string;
  combinedScore: number;
}

function qualify(lender: Lender, input: MatchingInput): { qualifies: boolean; rejectionReason?: string } {
  const inBand = lender.bandAllowlist.includes(input.band);
  const inSector = lender.sectorAllowlist === "all" || lender.sectorAllowlist.includes(input.sector);
  const inAmount = input.amountMXN >= lender.minAmountMXN && input.amountMXN <= lender.maxAmountMXN;
  if (!inBand)  return { qualifies: false, rejectionReason: `only bands ${lender.bandAllowlist.join(",")}` };
  if (!inSector) return { qualifies: false, rejectionReason: "sector not in allowlist" };
  if (!inAmount) return { qualifies: false, rejectionReason: "amount out of range" };
  return { qualifies: true };
}

function combinedScoreFor(lender: Lender): number {
  const aprScore     = 30 - lender.aprPct;                                  // lower apr → higher score
  const advanceScore = lender.advanceRatePct;
  const speedBonus   = Math.max(0, 60 - lender.speedMinutes) / 60;
  return aprScore * 0.6 + advanceScore * 0.4 + speedBonus;
}

export function runAuction(input: MatchingInput): AuctionResult {
  const scored: Scored[] = LENDERS_CATALOG.map((lender) => {
    const q = qualify(lender, input);
    return {
      lender,
      qualifies: q.qualifies,
      rejectionReason: q.rejectionReason,
      combinedScore: q.qualifies ? combinedScoreFor(lender) : -Infinity,
    };
  });

  scored.sort((a, b) => b.combinedScore - a.combinedScore);

  const auction: AuctionLender[] = scored.map((s, idx) => {
    const settlement = computeSettlement(input.amountMXN, s.lender.advanceRatePct, s.lender.aprPct);
    return {
      lenderId: s.lender.id,
      lenderName: s.lender.name,
      aprPct: s.lender.aprPct,
      advanceRatePct: s.lender.advanceRatePct,
      estimatedSettleMinutes: s.lender.speedMinutes,
      netAmountUSDC: settlement.netUSDC,
      rank: idx + 1,
      qualifies: s.qualifies,
      rejectionReason: s.rejectionReason,
    };
  });

  const winner = auction.find((a) => a.qualifies) ?? null;
  return {
    auction,
    recommendedLender: winner ? winner.lenderId : null,
    recommendationReason: winner
      ? `Best combined APR-advance for band ${input.band} ${input.sector}`
      : `No lender qualifies for band ${input.band} sector ${input.sector}`,
  };
}
```

> ⚠️ Si `src/core/settlement.ts` actual no exporta `computeSettlement(amount, advance, apr)` con el shape `{ netUSDC: number }` → adaptá (o extendé el helper). El archivo actual ya tiene `mxnToUSDC` y `usdcToOnchainAmount` — agregá el wrapper `computeSettlement` que devuelva `{ netUSDC, feeUSDC, advanceUSDC }`.

### 6.5 `src/infra/env.ts` — MODIFY

- **Borrar** `ORACLE_ENDPOINT`, `ORACLE_API_KEY`.
- **Agregar** (todas opcionales con default seguro):
  ```typescript
  export const TREASURY_PRIVATE_KEY = process.env.TREASURY_PRIVATE_KEY ?? "";
  export const OWNER_ADDRESS = process.env.OWNER_ADDRESS ?? "";
  export const FRAUD_DETECTOR_PRIVATE_KEY = process.env.FRAUD_DETECTOR_PRIVATE_KEY ?? "";
  export const COBRAYA_COMMITMENTS_ADDRESS = process.env.COBRAYA_COMMITMENTS_ADDRESS ?? "";
  export const ONCHAIN_AMOUNT_CAP_USDC = parseFloat(process.env.ONCHAIN_AMOUNT_CAP_USDC ?? "0.05");
  export const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? "";
  export const AVALANCHE_RPC_URL = process.env.AVALANCHE_RPC_URL ?? "https://api.avax-test.network/ext/bc/C/rpc";
  // Hot keys agregadas en W5.5 — getter functions, no top-level (para evitar throw en build)
  export function getValidatorHotKey(): string { return process.env.VALIDATOR_HOT_KEY ?? ""; }
  export function getFraudHotKey(): string     { return process.env.FRAUD_HOT_KEY ?? ""; }
  export function getScorerHotKey(): string    { return process.env.SCORER_HOT_KEY ?? ""; }
  export function getMatcherHotKey(): string   { return process.env.MATCHER_HOT_KEY ?? ""; }
  ```
- **NO bloquear** si una env var falta — log warning y permitir demo mode fallback (CD-3 paracaídas).

### 6.6 `src/infra/mock-adapter.ts` — MODIFY

Agregar al archivo existente:

```typescript
// src/infra/mock-adapter.ts — adicionar mockFraudCheck + mockAuction
import { keccak256, encodePacked } from "viem";
import { MOCK_INVOICES } from "@/lib/mock-data";
import { computeScore } from "@/core/scoring";
import { runAuction } from "@/core/matching";

export function mockFraudCheck(input: { uuidCfdi: string; rfcEmisor: string; amountMXN: number }) {
  const hash = keccak256(
    encodePacked(["string", "string", "uint256"], [input.uuidCfdi, input.rfcEmisor, BigInt(input.amountMXN)]),
  );
  return {
    isUnique: true,
    commitmentHash: hash,
    commitTxHash: "0xMOCK_FRAUD_TX_HASH_DEMO_MODE",
    snowtraceUrl: `https://testnet.snowtrace.io/tx/0xMOCK_FRAUD_TX_HASH_DEMO_MODE`,
    blockNumber: 99999999,
    timestamp: 1715800000,
  };
}

export function mockAuction(input: { amountMXN: number; anchorBuyer: string; paymentTermsDays: number; sector: string }) {
  const { band } = computeScore(input);
  return runAuction({ band, amountMXN: input.amountMXN, anchorBuyer: input.anchorBuyer, sector: input.sector });
}
```

### 6.7 `src/app/api/marketplace/route.ts` — NEW

**Exemplar de referencia**: `/home/ferdev/.openclaw/workspace/wasiai-agentshop/src/app/api/marketplace/route.ts:1-157`. Copy + adapt:

- Sustituí `AGENTSHOP_SLUGS` por:
  ```typescript
  const COBRAYA_SLUGS = [
    "cobraya-cfdi-validator",
    "cobraya-fraud-detector",
    "cobraya-credit-scorer",
    "cobraya-lender-matcher",
  ];
  ```
- Capability query string: `?capabilities=invoice-factoring&limit=10`
- Static fallback con 4 entries, `payment.chain="avalanche-fuji"`, `payment.asset="USDC"`, prices `0.001 / 0.005 / 0.05 / 0.01`.
- Return shape: `{ agents, totalEstimatedFee: 0.066, source, trace }` (igual que agentshop).
- Header outbound `x-a2a-key: process.env.A2A_KEY` (CD-22: solo server-side).

### 6.8 vitest config

**NEW** `vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: [],
    coverage: { reporter: ["text", "html"] },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
});
```

**MODIFY** `package.json`:
- En `scripts` agregar:
  ```json
  "test": "vitest run",
  "test:watch": "vitest"
  ```
- En `devDependencies` (via `npm install --save-dev`):
  ```bash
  npm install --save-dev vitest@^1 @vitest/ui@^1 @testing-library/react@^16 @testing-library/jest-dom@^6 jsdom@^25
  ```

### 6.9 Tests W1

| Test | Archivo | Detalle |
|---|---|---|
| T-SCORING-1 | `tests/unit/core/scoring.test.ts` | Tortillería (Walmart, $48,500, 60d, food retail) → `score === 70 + 5 + 0 + 5 === 80`, `band === "A"`. ⚠️ Si el cálculo cambia tras ajustes finos, recalculá los valores esperados — el test debe coincidir exacto con la implementación. |
| T-SCORING-2 | id | Confecciones (Bimbo, $28,200, 30d, apparel) → `score === 70 + 5 + 10 + 3 === 88`, `band === "A"` |
| T-SCORING-3 | id | Construcciones (Cemex, $156,800, 90d, construction) → `score === 70 + 0 + (-8) + (-8) === 54`, `band === "C"` |
| T-SCORING-4 | id | unknown buyer "AcmeCorp" → base 30 + … → score < 40 → `band === "D"` |
| T-SCORING-DETERMINISM | id | 2 invocaciones misma input → mismo `score` y `band` |
| T-MATCHING-1 | `tests/unit/core/matching.test.ts` | band B food retail $48.5K → al menos 3 lenders, rank 1 con `qualifies:true`, BBVA `qualifies:false` con `rejectionReason` matcheando band |
| T-MATCHING-2 | id | band A apparel $28.2K → rank 1 qualifies, BBVA disqualified (amount < 50K) |
| T-MATCHING-3 | id | band C construction → solo Konfío `qualifies:true`, `recommendedLender === "lender-konfio"`, Arkangeles `qualifies:false` con `rejectionReason: "sector not in allowlist"` |
| T-MATCHING-DETERMINISM | id | 2 invocaciones misma input → mismo `auction[].rank` ordering |
| T-MARKETPLACE-1 | `tests/unit/api/marketplace.test.ts` | mock `global.fetch` → `GET /api/marketplace` retorna 4 cobraya-* slugs |
| T-MARKETPLACE-2 | id | fetch error → static fallback con 4 entries + `source: "static-fallback"` |

> ⚠️ Si los scores reales difieren de los esperados acá, el dev DEBE actualizar los expected en los tests para que reflejen la fórmula implementada. La fórmula del SDD es source of truth — los números acá son derivados.

### Validación W1

```bash
npm test
# Todos los tests PASS

npm run typecheck && npm run build
# Verde
```

### ACs cubiertos
- **AC-3** (determinismo scoring) — T-SCORING-DETERMINISM
- **AC-9** (marketplace 4 agentes) — T-MARKETPLACE-1

### Commit
```
feat(WKH-COBRAYA): WAVE W1 — mock data + types + scoring/matching + marketplace + vitest

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

---

## 7. Wave W2 — cobraya-cfdi-validator agent ($0.001, 30min)

**Objetivo**: endpoint local que valida shape CFDI + tier anchor buyer + duplicate check in-memory.

### Archivos

| Path | Acción |
|---|---|
| `src/app/api/agents/cobraya-cfdi-validator/invoke/route.ts` | **NEW** |
| `src/application/validate-invoice.ts` | **MODIFY** (usar route local) |
| `tests/unit/api/cfdi-validator.test.ts` | **NEW** |

### 7.1 `src/app/api/agents/cobraya-cfdi-validator/invoke/route.ts`

**Exemplar de referencia**: `/home/ferdev/.openclaw/workspace/wasiai-agentshop/src/app/api/agents/agentshop-kyc-validator/invoke/route.ts:1-47`.

```typescript
// src/app/api/agents/cobraya-cfdi-validator/invoke/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { BUYERS_TIER_1 } from "@/lib/mock-data";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// In-memory duplicate-check Set (DT-B: scoped al proceso, demo-only)
const SEEN_UUIDS = new Set<string>();

const InputSchema = z.object({
  uuidCfdi: z.string(),
  rfcEmisor: z.string().min(1),
  amountMXN: z.number().positive(),
  anchorBuyer: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = InputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", details: parsed.error.flatten() }, { status: 400 });
  }
  const { uuidCfdi, rfcEmisor, amountMXN, anchorBuyer } = parsed.data;

  const uuidValid = UUID_REGEX.test(uuidCfdi);
  const buyer = BUYERS_TIER_1.find((b) => b.name === anchorBuyer);
  const anchorBuyerTier: 1 | "unknown" = buyer ? 1 : "unknown";
  const isDuplicate = SEEN_UUIDS.has(uuidCfdi);
  if (!isDuplicate) SEEN_UUIDS.add(uuidCfdi);
  const duplicateCheck: "clean" | "duplicate" = isDuplicate ? "duplicate" : "clean";

  const isCompliant = uuidValid && amountMXN > 0 && anchorBuyerTier === 1 && duplicateCheck === "clean";
  const sector = buyer?.sector ?? "any";
  const policyId = `cobraya-tier-${anchorBuyerTier === 1 ? "1" : "unknown"}-${sector}-2026`;

  // Note: receipt signing wired in W5.5 — return null por ahora
  return NextResponse.json({
    isCompliant,
    anchorBuyerTier,
    policyId,
    duplicateCheck,
    rfcEmisorMasked: rfcEmisor.length >= 6 ? `${rfcEmisor.slice(0, 4)}***` : "***",  // CD-23
    signedAt: new Date().toISOString(),
    receipt: null,
  });
}
```

> ⚠️ **CD-9 / CD-21**: NO loguees el body completo. Si necesitás debugging, log solo `{uuidCfdi: body.uuidCfdi}` y nunca env vars.

### 7.2 `src/application/validate-invoice.ts` — MODIFY

Mantener la signature actual pero internamente:
- si `isDemoMode()` → return mock determinista
- sino → POST `/api/agents/cobraya-cfdi-validator/invoke` y propagar resultado

(El detalle exacto depende del scaffold actual de `validate-invoice.ts` — preservar firma de función pública.)

### 7.3 Tests W2

| Test | Detalle |
|---|---|
| T-CFDI-1 | happy path Walmart UUID válido amount=48500 → `{isCompliant:true, anchorBuyerTier:1, duplicateCheck:"clean"}` |
| T-CFDI-2 | unknown buyer "AcmeCorp" → `{isCompliant:false, anchorBuyerTier:"unknown"}` |
| T-CFDI-3 | invalid UUID format → response 400 con `error:"invalid_input"` |
| T-CFDI-4 | `amountMXN: 0` → 400 |
| T-CFDI-5 | segundo POST con misma UUID → `{duplicateCheck:"duplicate", isCompliant:false}` |
| T-CFDI-MASK | response NO contiene `rfcEmisor` completo, solo `rfcEmisorMasked` |

> ⚠️ **CD-24**: usá `vi.stubEnv()` para env vars. El SEEN_UUIDS state se resetea entre tests con `vi.resetModules()` + dynamic import del route, sino tests son order-dependent.

### Validación

```bash
npm test
npm run typecheck && npm run build
```

### ACs cubiertos
- **AC-1 step 1** (validator se invoca)
- Base de **AC-13** (receipt placeholder)

### Commit
```
feat(WKH-COBRAYA): WAVE W2 — cobraya-cfdi-validator agent endpoint + tests

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

---

## 8. Wave W2.5 — cobraya-fraud-detector + Foundry deploy (2h)

**Objetivo**: Solidity smart contract + Foundry tests + deploy en Avalanche Fuji + agent endpoint que llama el contrato vía viem.

### Sub-wave W2.5a — Foundry init (20min)

```bash
cd /home/ferdev/.openclaw/workspace/wasiai-lendable
mkdir -p contracts
cd contracts
forge init --no-commit --no-git --force
forge install OpenZeppelin/openzeppelin-contracts --no-commit
```

**NEW** `contracts/foundry.toml`:

**Exemplar de referencia**: `/home/ferdev/.openclaw/workspace/wasiai-v2/contracts/foundry.toml:1-21`. Adaptar:

```toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
solc_version = "0.8.24"
optimizer = true
optimizer_runs = 200
remappings = ["@openzeppelin/=lib/openzeppelin-contracts/"]

[rpc_endpoints]
fuji = "${AVALANCHE_RPC_URL}"
avalanche = "https://api.avax.network/ext/bc/C/rpc"

[etherscan]
fuji = { key = "${SNOWTRACE_API_KEY}", url = "https://api-testnet.snowtrace.io/api" }
```

```bash
forge build  # vacío todavía, debe pasar
```

### Sub-wave W2.5b — Contract (30min)

**NEW** `contracts/src/CobrayaInvoiceCommitments.sol`. Source of truth: `doc/CONTRACT-DESIGN.md §3`. Esqueleto mínimo (referencia — copiar el spec completo del CONTRACT-DESIGN):

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable2Step.sol";

contract CobrayaInvoiceCommitments is Ownable2Step {
    enum CommitmentStatus { None, Active, Released }

    struct Commitment {
        address committer;
        uint64  committedAt;
        CommitmentStatus status;
        bytes32 metadataPointer;
    }

    mapping(bytes32 => Commitment) public commitments;
    mapping(address => bool) public authorizedCommitters;

    error ZeroAddress();
    error ZeroHash();
    error NotAuthorized(address caller);
    error AlreadyCommitted(bytes32 hash, uint64 originalTimestamp, address originalCommitter);
    error NotCommitted(bytes32 hash);
    error InvalidStatus(bytes32 hash, CommitmentStatus current);
    error NotCommitter(address caller, address actualCommitter);

    event InvoiceCommitted(bytes32 indexed hash, address indexed committer, uint64 timestamp);
    event InvoiceReleased(bytes32 indexed hash, address indexed releaser, uint64 timestamp);
    event CommitterAuthorized(address indexed committer, bool authorized);

    modifier onlyAuthorized() {
        if (!authorizedCommitters[msg.sender] && msg.sender != owner()) revert NotAuthorized(msg.sender);
        _;
    }

    constructor(address initialCommitter) Ownable(msg.sender) {
        if (initialCommitter == address(0)) revert ZeroAddress();
        authorizedCommitters[initialCommitter] = true;
        emit CommitterAuthorized(initialCommitter, true);
    }

    function setAuthorizedCommitter(address committer, bool authorized) external onlyOwner {
        if (committer == address(0)) revert ZeroAddress();
        authorizedCommitters[committer] = authorized;
        emit CommitterAuthorized(committer, authorized);
    }

    function commitInvoice(bytes32 hash, bytes32 metadataPointer) external onlyAuthorized {
        if (hash == bytes32(0)) revert ZeroHash();
        Commitment storage c = commitments[hash];
        if (c.status == CommitmentStatus.Active) {
            revert AlreadyCommitted(hash, c.committedAt, c.committer);
        }
        c.committer = msg.sender;
        c.committedAt = uint64(block.timestamp);
        c.status = CommitmentStatus.Active;
        c.metadataPointer = metadataPointer;
        emit InvoiceCommitted(hash, msg.sender, c.committedAt);
    }

    function releaseInvoice(bytes32 hash) external {
        Commitment storage c = commitments[hash];
        if (c.status == CommitmentStatus.None) revert NotCommitted(hash);
        if (c.status != CommitmentStatus.Active) revert InvalidStatus(hash, c.status);
        if (msg.sender != c.committer && msg.sender != owner()) revert NotCommitter(msg.sender, c.committer);
        c.status = CommitmentStatus.Released;
        emit InvoiceReleased(hash, msg.sender, uint64(block.timestamp));
    }

    function isCommitted(bytes32 hash) external view returns (bool active, uint64 ts, address committer) {
        Commitment storage c = commitments[hash];
        return (c.status == CommitmentStatus.Active, c.committedAt, c.committer);
    }

    function getCommitment(bytes32 hash) external view returns (Commitment memory) {
        return commitments[hash];
    }
}
```

> ⚠️ **NO incluir ReentrancyGuard**. Storage-only, no token transfers. Documentar comment al tope: `// V1: no ReentrancyGuard needed — only storage writes, no external calls/transfers`.

### Sub-wave W2.5c — Foundry tests (30min)

**NEW** `contracts/test/CobrayaInvoiceCommitments.t.sol`. Source of truth: `doc/CONTRACT-DESIGN.md §6`. Mínimo **11 tests**:

| # | Test | Verifica |
|---|---|---|
| 1 | `test_Constructor_AutoAuthorizesInitial` | `authorizedCommitters[initial]==true` post-deploy |
| 2 | `test_Constructor_RevertsZeroAddress` | `vm.expectRevert(ZeroAddress.selector)` con `address(0)` |
| 3 | `test_CommitInvoice_HappyPath` | hash random → status Active, committer=msg.sender, event emitido |
| 4 | `test_CommitInvoice_RevertsAlreadyCommitted` | mismo hash 2 veces → revert con `AlreadyCommitted(hash, ts, committer)` |
| 5 | `test_CommitInvoice_RevertsNotAuthorized` | caller no autorizado → `NotAuthorized(caller)` |
| 6 | `test_CommitInvoice_RevertsZeroHash` | `bytes32(0)` → `ZeroHash` |
| 7 | `test_CommitInvoice_OwnerCanCommit` | owner siempre autorizado (no necesita setAuthorizedCommitter) |
| 8 | `test_ReleaseInvoice_HappyPath` | commit + release → status Released, event |
| 9 | `test_ReleaseInvoice_RevertsNotCommitted` | hash nunca committed → `NotCommitted` |
| 10 | `test_ReleaseInvoice_RevertsNotCommitter` | release con address que no es committer ni owner → `NotCommitter` |
| 11 | `test_SetAuthorizedCommitter_OnlyOwner` | non-owner llama → revert OZ Ownable |
| 12 | `test_GasBudget_CommitInvoice` | gas snapshot: `assertLt(gasUsed, 80_000)` — **CD-11** |

```bash
cd contracts
forge test -vv
# All tests PASS

forge coverage --report summary
# lines/branches/funcs: 100% — CD-13 (forge coverage)

forge test --gas-report
# Verificar commitInvoice gas < 80K — CD-11 hard limit; target interno 60K
```

### Sub-wave W2.5d — Deploy (20min)

**NEW** `contracts/script/Deploy.s.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/CobrayaInvoiceCommitments.sol";

contract DeployCommitments is Script {
    function run() external returns (address) {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address initialCommitter = vm.envAddress("FRAUD_DETECTOR_AGENT_WALLET");

        vm.startBroadcast(deployerKey);
        CobrayaInvoiceCommitments c = new CobrayaInvoiceCommitments(initialCommitter);
        vm.stopBroadcast();

        console.log("CobrayaInvoiceCommitments deployed at:", address(c));
        return address(c);
    }
}
```

Deploy:

```bash
cd contracts
set -a; source ../.env.local; set +a

forge script script/Deploy.s.sol:DeployCommitments \
  --rpc-url fuji \
  --broadcast \
  --verify \
  --etherscan-api-key $SNOWTRACE_API_KEY \
  -vvv
```

- Capturá el **address deployed** y guardalo en `.env.local`:
  ```
  COBRAYA_COMMITMENTS_ADDRESS=0x<addressDeployed>
  ```
- Capturá el **deploy tx hash** y guardalo en `doc/PRODUCTION-EVIDENCE.md §3`.

**Fallback CD-14**: si `--verify` con Snowtrace API key falla:
```bash
forge verify-contract <DEPLOYED_ADDRESS> \
  src/CobrayaInvoiceCommitments.sol:CobrayaInvoiceCommitments \
  --chain-id 43113 --verifier sourcify
```
Si Sourcify también falla → manual upload via `https://testnet.snowtrace.io/verifyContract` (último recurso; documentar excepción en PRODUCTION-EVIDENCE).

### Sub-wave W2.5e — Agent endpoint (20min)

**NEW** `src/lib/abis/cobraya-invoice-commitments.ts`:

```typescript
// Auto-generado desde contracts/out/CobrayaInvoiceCommitments.sol/CobrayaInvoiceCommitments.json
export const COMMITMENTS_ABI = [
  // commitInvoice(bytes32,bytes32)
  { type: "function", name: "commitInvoice", stateMutability: "nonpayable",
    inputs: [{ name: "hash", type: "bytes32" }, { name: "metadataPointer", type: "bytes32" }],
    outputs: [] },
  // isCommitted(bytes32) → (bool active, uint64 ts, address committer)
  { type: "function", name: "isCommitted", stateMutability: "view",
    inputs: [{ name: "hash", type: "bytes32" }],
    outputs: [
      { name: "active", type: "bool" },
      { name: "ts", type: "uint64" },
      { name: "committer", type: "address" },
    ],
  },
  // Events + errors omitidos en el ABI runtime; agregar solo si se decodean en JS.
] as const;
```

**NEW** `src/app/api/agents/cobraya-fraud-detector/invoke/route.ts`:

```typescript
// src/app/api/agents/cobraya-fraud-detector/invoke/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createPublicClient, createWalletClient, http, keccak256, encodePacked } from "viem";
import { avalancheFuji } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { COMMITMENTS_ABI } from "@/lib/abis/cobraya-invoice-commitments";
import { mockFraudCheck } from "@/infra/mock-adapter";

const InputSchema = z.object({
  uuidCfdi: z.string().min(1),
  rfcEmisor: z.string().min(1),
  amountMXN: z.number().positive(),
});

function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}

export async function POST(req: NextRequest) {
  const parsed = InputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", details: parsed.error.flatten() }, { status: 400 });
  }
  const { uuidCfdi, rfcEmisor, amountMXN } = parsed.data;

  const commitmentHash = keccak256(
    encodePacked(["string", "string", "uint256"], [uuidCfdi, rfcEmisor, BigInt(amountMXN)]),
  );

  if (isDemoMode()) {
    return NextResponse.json({ ...mockFraudCheck({ uuidCfdi, rfcEmisor, amountMXN }), receipt: null });
  }

  try {
    const publicClient = createPublicClient({ chain: avalancheFuji, transport: http(process.env.AVALANCHE_RPC_URL) });

    const [active, ts, committer] = (await publicClient.readContract({
      address: process.env.COBRAYA_COMMITMENTS_ADDRESS as `0x${string}`,
      abi: COMMITMENTS_ABI,
      functionName: "isCommitted",
      args: [commitmentHash],
    })) as [boolean, bigint, `0x${string}`];

    if (active) {
      return NextResponse.json({
        isUnique: false,
        commitmentHash,
        originalCommitTimestamp: Number(ts),
        originalCommitter: committer,
        rejectReason: "INVOICE_ALREADY_COMMITTED",
        receipt: null,
      });
    }

    const account = privateKeyToAccount(process.env.FRAUD_DETECTOR_PRIVATE_KEY as `0x${string}`);
    const walletClient = createWalletClient({ account, chain: avalancheFuji, transport: http(process.env.AVALANCHE_RPC_URL) });

    const txHash = await walletClient.writeContract({
      address: process.env.COBRAYA_COMMITMENTS_ADDRESS as `0x${string}`,
      abi: COMMITMENTS_ABI,
      functionName: "commitInvoice",
      args: [commitmentHash, "0x0000000000000000000000000000000000000000000000000000000000000000"],
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash, confirmations: 1 });

    return NextResponse.json({
      isUnique: true,
      commitmentHash,
      commitTxHash: txHash,
      snowtraceUrl: `https://testnet.snowtrace.io/tx/${txHash}`,
      blockNumber: Number(receipt.blockNumber),
      timestamp: Math.floor(Date.now() / 1000),
      receipt: null,
    });
  } catch (err) {
    return NextResponse.json({
      isUnique: false,
      commitmentHash,
      rejectReason: "NETWORK_ERROR",
      error: err instanceof Error ? err.message : "unknown",
      receipt: null,
    }, { status: 502 });
  }
}
```

> ⚠️ **CD-9 / CD-21**: NO loguees `process.env.FRAUD_DETECTOR_PRIVATE_KEY` ni el `commitmentHash` con el body completo en logs estructurados. El response sí incluye `commitmentHash` (es público).

### Sub-wave W2.5f — Smoke + evidence (15min)

```bash
# Cara mock (demo mode):
NEXT_PUBLIC_DEMO_MODE=true npm run dev
# POST manual a /api/agents/cobraya-fraud-detector/invoke con curl o Postman → response isUnique:true con mock tx hash

# Cara real (con .env.local completo):
unset NEXT_PUBLIC_DEMO_MODE
npm run dev
# POST con uuidCfdi único → response con tx hash real Snowtrace
# Segundo POST con MISMA uuidCfdi → response isUnique:false (AlreadyCommitted)
```

Capturar 1 commit tx hash en `doc/PRODUCTION-EVIDENCE.md §3`.

### Tests W2.5 (vitest, mocked viem)

| Test | Detalle |
|---|---|
| T-FRAUD-1 | mock `readContract` → `[false, 0n, "0x0..."]`; mock `writeContract` → `0xabc`; mock `waitForTransactionReceipt` → `{blockNumber:99n}`. Response = `{isUnique:true, commitTxHash:"0xabc"}` |
| T-FRAUD-2 | mock `readContract` → `[true, 12345n, "0xABC"]`. Response = `{isUnique:false}` y **NO** se llama `writeContract` |
| T-FRAUD-3 | body inválido (zero hash equivalent: missing uuidCfdi) → 400 |
| T-FRAUD-4 | mock `readContract` throws → response 502 con `rejectReason:"NETWORK_ERROR"` (no crash) |
| T-FRAUD-DEMO | `NEXT_PUBLIC_DEMO_MODE=true` → returns mockFraudCheck output sin tocar viem |

### Validación

```bash
npm test           # vitest agent tests PASS
cd contracts && forge test -vv && forge coverage --report summary
# Solidity: 11+ tests PASS, coverage 100%
cd ..
npm run typecheck && npm run build
```

### ACs cubiertos
- **AC-1 step 2**
- **AC-12** (fraud detection bloquea doble-cesión)
- Inicio **AC-10** (1 tx hash documentado)

### CDs cubiertos
- **CD-11** (gas < 80K), **CD-13** (coverage 100%), **CD-14** (forge verify automated), **CD-15** (custom errors con params)

### Commit
```
feat(WKH-COBRAYA): WAVE W2.5 — Solidity commitments contract + Foundry + fraud-detector agent

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

---

## 9. Wave W3 — cobraya-credit-scorer + Claude (90min)

**Objetivo**: agent endpoint que computa score determinista + rationale via Claude Haiku (fallback local si key missing/timeout).

### Archivos

| Path | Acción |
|---|---|
| `src/infra/llm-client.ts` | **NEW** |
| `src/app/api/agents/cobraya-credit-scorer/invoke/route.ts` | **NEW** |
| `src/application/score-invoice.ts` | **MODIFY** |
| `src/infra/oracle-client.ts` | **DELETE** (si existe en scaffold) |
| `tests/unit/infra/llm-client.test.ts` | **NEW** |
| `tests/unit/api/credit-scorer.test.ts` | **NEW** |

### 9.1 `src/infra/llm-client.ts` — NEW (DT-E: fetch directo, no SDK)

```typescript
// src/infra/llm-client.ts
const FALLBACK_TEMPLATES: Record<"A" | "B" | "C" | "D", string> = {
  A: "Factura emitida a anchor buyer tier-1 con plazo corto y sector de bajo riesgo. Banda A indica perfil crediticio sólido y riesgo de default mínimo.",
  B: "Anchor buyer tier-1 con plazo medio y sector estable. Banda B refleja buen perfil con consideraciones de plazo de pago.",
  C: "Anchor buyer aceptable pero con plazos largos o sector de mayor riesgo. Banda C amerita spread adicional.",
  D: "Perfil con varios factores de riesgo. Banda D requiere análisis caso por caso.",
};

export interface RationaleInput {
  band: "A" | "B" | "C" | "D";
  score: number;
  amountMXN: number;
  anchorBuyer: string;
  paymentTermsDays: number;
  sector: string;
}

export interface RationaleResult {
  rationale: string;
  provenance: "anthropic-claude-haiku-4-5" | "local-fallback";
}

export async function generateRationale(input: RationaleInput): Promise<RationaleResult> {
  const key = process.env.ANTHROPIC_API_KEY ?? "";
  if (!key || key.startsWith("COPY_FROM_") || key.startsWith("set-me")) {
    return { rationale: FALLBACK_TEMPLATES[input.band], provenance: "local-fallback" };
  }

  try {
    const prompt = `You are a credit analyst at a Mexican factoring fintech. Given:
- Amount: ${input.amountMXN.toLocaleString("es-MX")} MXN
- Anchor buyer: ${input.anchorBuyer}
- Payment terms: ${input.paymentTermsDays} days
- Sector: ${input.sector}
- Deterministic credit band: ${input.band} (score ${input.score})

Write ONE concise paragraph in Spanish (≤80 words) explaining why this invoice qualifies for band ${input.band}. Focus on anchor buyer strength, term, and sector dynamics. Plain text, no markdown, no list.`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 200,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) throw new Error(`anthropic-status-${res.status}`);
    const data = await res.json() as { content?: Array<{ text?: string }> };
    const text = data?.content?.[0]?.text ?? FALLBACK_TEMPLATES[input.band];
    return { rationale: text, provenance: "anthropic-claude-haiku-4-5" };
  } catch {
    return { rationale: FALLBACK_TEMPLATES[input.band], provenance: "local-fallback" };
  }
}
```

> ⚠️ **NO instalar `@anthropic-ai/sdk`** (DT-E). Si te tentás → STOP. El fetch directo es deliberado para evitar deps innecesarias en hackathon.

### 9.2 `src/app/api/agents/cobraya-credit-scorer/invoke/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { computeScore } from "@/core/scoring";
import { generateRationale } from "@/infra/llm-client";

const InputSchema = z.object({
  amountMXN: z.number().positive(),
  anchorBuyer: z.string().min(1),
  paymentTermsDays: z.number().int().positive(),
  sector: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const parsed = InputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", details: parsed.error.flatten() }, { status: 400 });
  }
  const input = parsed.data;
  const scored = computeScore(input);
  const { rationale, provenance } = await generateRationale({ ...input, band: scored.band, score: scored.score });

  return NextResponse.json({
    score: scored.score,
    band: scored.band,
    advanceRatePct: scored.advanceRatePct,
    aprPct: scored.aprPct,
    rationale,
    rationaleProvenance: provenance,
    receipt: null,
  });
}
```

### 9.3 Delete oracle-client

```bash
rm -f src/infra/oracle-client.ts
```

Si existe import en algún archivo → buscar y eliminar:
```bash
grep -rn "oracle-client" src/ tests/ 2>&1 | grep -v node_modules
```

### Tests W3

| Test | Detalle |
|---|---|
| T-SCORER-1 | 2 invocations misma input (Walmart, $48,500, 60d, food retail) → mismo `score` y mismo `band` — AC-3 |
| T-SCORER-2 | band A input → `{band:"A", advanceRatePct:95, aprPct:12}` |
| T-SCORER-3 | band B input → `{band:"B", advanceRatePct:92, aprPct:14.5}` |
| T-SCORER-4 | band C input → `{band:"C", advanceRatePct:88, aprPct:18}` |
| T-LLM-1 | `vi.stubEnv("ANTHROPIC_API_KEY","")` → `rationale === FALLBACK_TEMPLATES[band]`, `provenance === "local-fallback"` — AC-4 |
| T-LLM-2 | `vi.stubEnv("ANTHROPIC_API_KEY","sk-test")` + `vi.spyOn(global,"fetch")` → 200 con `{content:[{text:"OK"}]}` → `provenance === "anthropic-claude-haiku-4-5"` |
| T-LLM-3 | fetch mock returns 500 → fallback con `provenance === "local-fallback"` (no throw) |
| T-LLM-4 | fetch mock con `AbortError` → fallback |

### Validación

```bash
npm test
npm run typecheck && npm run build
```

### ACs cubiertos
- **AC-1 step 3**, **AC-3** (determinismo), **AC-4** (Claude opcional con fallback)

### Commit
```
feat(WKH-COBRAYA): WAVE W3 — cobraya-credit-scorer agent + Claude rationale + fallback

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

---

## 10. Wave W4 — cobraya-lender-matcher con auction (60min)

**Objetivo**: agent endpoint que retorna `AuctionResult` con N lenders rankeados.

### Archivos

| Path | Acción |
|---|---|
| `src/app/api/agents/cobraya-lender-matcher/invoke/route.ts` | **NEW** |
| `src/application/match-lender.ts` | **MODIFY** |
| `tests/unit/api/lender-matcher.test.ts` | **NEW** |

### 10.1 Route

```typescript
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { runAuction } from "@/core/matching";

const BandSchema = z.enum(["A", "B", "C", "D"]);
const InputSchema = z.object({
  band: BandSchema,
  amountMXN: z.number().positive(),
  anchorBuyer: z.string().min(1),
  sector: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const parsed = InputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", details: parsed.error.flatten() }, { status: 400 });
  }
  const result = runAuction(parsed.data);
  return NextResponse.json({ ...result, receipt: null });
}
```

### Tests W4

| Test | Detalle |
|---|---|
| T-MATCHER-1 | input `{band:"B", amountMXN:48500, anchorBuyer:"Walmart México", sector:"food retail"}` → `auction.length >= 4`, rank 1 con `qualifies:true`, BBVA con `qualifies:false` (band) |
| T-MATCHER-2 | input `{band:"A", amountMXN:28200, anchorBuyer:"Bimbo", sector:"apparel"}` → BBVA `qualifies:false, rejectionReason:"amount out of range"` |
| T-MATCHER-3 | input `{band:"C", amountMXN:156800, anchorBuyer:"Cemex", sector:"construction"}` → solo Konfío `qualifies:true`, `recommendedLender === "lender-konfio"` |
| T-AUCTION-SHAPE | response tiene shape exacta — `auction: AuctionLender[]`, `recommendedLender: string \| null`, `recommendationReason: string`. Cada item con todos los campos required. Ranks monotonic 1..N |
| T-AUCTION-DETERMINISM | 2 invocations same input → idéntico ordering — AC-3 |

### Validación
```bash
npm test
npm run typecheck && npm run build
```

### ACs cubiertos
- **AC-1 step 4**, **AC-15** (auction shape N≥3)

### Commit
```
feat(WKH-COBRAYA): WAVE W4 — cobraya-lender-matcher agent + auction logic

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

---

## 11. Wave W5 — EIP-3009 + /api/settle (60min)

**Objetivo**: server-side EIP-3009 signing + /api/settle con cap enforcement + delegación al facilitator.

### Archivos

| Path | Acción |
|---|---|
| `src/infra/eip3009-signer.ts` | **NEW** |
| `src/app/api/settle/route.ts` | **REPLACE** |
| `src/application/settle-factoring.ts` | **MODIFY** |
| `tests/unit/infra/eip3009-signer.test.ts` | **NEW** |
| `tests/unit/api/settle.test.ts` | **NEW** |

### 11.1 USDC EIP-712 domain pre-flight (DT-P)

Antes de programar el signer, verificar el `name()` y `version()` del USDC contract en Fuji:

```bash
# eth_call → name()
curl -s -X POST $AVALANCHE_RPC_URL \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","method":"eth_call","params":[{"to":"0x5425890298aed601595a70AB815c96711a31Bc65","data":"0x06fdde03"},"latest"],"id":1}'
# eth_call → version() (función opcional; 0x54fd4d50)
curl -s -X POST $AVALANCHE_RPC_URL \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","method":"eth_call","params":[{"to":"0x5425890298aed601595a70AB815c96711a31Bc65","data":"0x54fd4d50"},"latest"],"id":1}'
```

Si `version()` no existe (revert) → asumir `"2"` y testear con un signing manual contra el contract antes de marcar W5 como done. Si el USDC mock de Fuji **no soporta EIP-3009** (`transferWithAuthorization` no existe) → toggle `NEXT_PUBLIC_DEMO_MODE=true` permanente para video pitch + log "EIP-3009 unsupported in Fuji mock, mainnet ready" en respuesta — CD-3 paracaídas.

### 11.2 `src/infra/eip3009-signer.ts`

**Exemplar de referencia**: `/home/ferdev/.openclaw/workspace/wasiai-agentshop/src/infra/eip3009-signer.ts:1-114`.

```typescript
// src/infra/eip3009-signer.ts
import { createWalletClient, http, getAddress, parseUnits, hexToBytes, bytesToHex, padHex } from "viem";
import { avalancheFuji } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { randomBytes } from "node:crypto";

const USDC_DOMAIN_NAME = process.env.USDC_DOMAIN_NAME ?? "USD Coin";
const USDC_DOMAIN_VERSION = process.env.USDC_DOMAIN_VERSION ?? "2";

export interface SignedAuthorization {
  from: `0x${string}`;
  to: `0x${string}`;
  value: bigint;
  validAfter: bigint;
  validBefore: bigint;
  nonce: `0x${string}`;
  signature: `0x${string}`;
}

const TYPES = {
  TransferWithAuthorization: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "validAfter", type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "nonce", type: "bytes32" },
  ],
} as const;

export async function signTransferAuthorization(args: {
  to: `0x${string}`;
  valueOnchain: bigint;
  timeoutSeconds?: number;
}): Promise<SignedAuthorization> {
  const pk = process.env.TREASURY_PRIVATE_KEY;
  if (!pk) throw new Error("TREASURY_PRIVATE_KEY not configured");
  const account = privateKeyToAccount(pk as `0x${string}`);
  const verifyingContract = getAddress(process.env.USDC_ADDRESS as `0x${string}`);
  const chainId = 43113;

  const now = Math.floor(Date.now() / 1000);
  const validAfter = BigInt(0);
  const validBefore = BigInt(now + (args.timeoutSeconds ?? 300));
  const nonce = bytesToHex(randomBytes(32));

  const message = {
    from: account.address,
    to: args.to,
    value: args.valueOnchain,
    validAfter,
    validBefore,
    nonce,
  };

  const client = createWalletClient({ account, chain: avalancheFuji, transport: http() });
  const signature = await client.signTypedData({
    account,
    domain: { name: USDC_DOMAIN_NAME, version: USDC_DOMAIN_VERSION, chainId, verifyingContract },
    types: TYPES,
    primaryType: "TransferWithAuthorization",
    message,
  });

  return { ...message, signature };
}
```

### 11.3 `src/app/api/settle/route.ts` — REPLACE

```typescript
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseUnits } from "viem";
import { signTransferAuthorization } from "@/infra/eip3009-signer";
import { settleOnFacilitator } from "@/infra/facilitator-client";
import { ONCHAIN_AMOUNT_CAP_USDC } from "@/infra/env";

const MatchSchema = z.object({
  lenderId: z.string(),
  lenderName: z.string(),
  netAmountUSDC: z.number().nonnegative(),
});

const InputSchema = z.object({
  match: MatchSchema,
  smeWalletOverride: z.string().optional(),
});

function isDemoMode(): boolean { return process.env.NEXT_PUBLIC_DEMO_MODE === "true"; }

export async function POST(req: NextRequest) {
  const parsed = InputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", details: parsed.error.flatten() }, { status: 400 });
  }
  const { match, smeWalletOverride } = parsed.data;
  const amountUSDC = match.netAmountUSDC;

  // CD-5 + AC-7: server-side cap enforcement
  if (amountUSDC > ONCHAIN_AMOUNT_CAP_USDC) {
    return NextResponse.json({
      error: "cap_exceeded",
      testnetCapUSDC: ONCHAIN_AMOUNT_CAP_USDC,
      requestedUSDC: amountUSDC,
      message: `testnet cap — mainnet would settle full $${amountUSDC}`,
    }, { status: 422 });
  }

  if (isDemoMode()) {
    return NextResponse.json({
      receipt: {
        txHash: "0xMOCK_SETTLE_TX_HASH",
        snowtraceUrl: "https://testnet.snowtrace.io/tx/0xMOCK_SETTLE_TX_HASH",
        deliveredAmountUSDC: amountUSDC,
      },
      traces: [],
    });
  }

  try {
    const to = (smeWalletOverride ?? process.env.OWNER_ADDRESS) as `0x${string}`;
    const valueOnchain = parseUnits(amountUSDC.toString(), 6);
    const auth = await signTransferAuthorization({ to, valueOnchain });
    const settlement = await settleOnFacilitator({ authorization: auth, lenderId: match.lenderId });
    return NextResponse.json({ receipt: settlement, traces: [] });
  } catch (err) {
    // CD-9 / CD-21: NO leak de err.stack ni key
    return NextResponse.json({
      error: "settle_failed",
      message: err instanceof Error ? err.message : "unknown",
    }, { status: 502 });
  }
}
```

> ⚠️ **CD-9**: el `error.message` NO debe contener la private key. Si capturás errores de viem que loguean keys → custom sanitization wrapper.

### Tests W5

| Test | Detalle |
|---|---|
| T-EIP3009-1 | `signTransferAuthorization` con `to=0xAAA…`, `valueOnchain=10n` → response domain incluye `chainId:43113, verifyingContract:USDC_ADDRESS` |
| T-EIP3009-2 | 2 firmas consecutivas → nonces distintos (`randomBytes(32)`) |
| T-EIP3009-3 | `validBefore === now + 300` por default |
| T-SETTLE-1 | happy path: amount=$0.04, mock `signTransferAuthorization` + mock `settleOnFacilitator` → 200 con `receipt.txHash` |
| T-SETTLE-2 | amount=$0.06 > cap $0.05 → 422 `error:"cap_exceeded"` — AC-7 |
| T-SETTLE-3 | facilitator mock throws → 502 con `error:"settle_failed"` (no crash) |
| T-SETTLE-4 | TREASURY_PRIVATE_KEY missing → 502 con error msg que NO contiene la key — CD-9 |

### Validación

```bash
echo "ONCHAIN_AMOUNT_CAP_USDC=0.05" >> .env.local  # si no estaba ya
npm test
npm run typecheck && npm run build
```

### ACs cubiertos
- **AC-5** (EIP-3009 server-side), **AC-6** (tx hash + Snowtrace), **AC-7** (cap rejection)

### CDs cubiertos
- **CD-5** (cap honored), **CD-9** (no key leak)

### Commit
```
feat(WKH-COBRAYA): WAVE W5 — EIP-3009 signer + /api/settle + cap enforcement

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

---

## 12. Wave W5.5 — Audit trail + signed receipts (45min)

**Objetivo**: cada agent firma EIP-712 receipt → audit trail JSON descargable + verificable offline.

### 12.1 Hot keys (one-time)

```bash
node -e "const {generatePrivateKey} = require('viem/accounts'); console.log(generatePrivateKey())"
# Run 4 veces, copiar cada output a .env.local:
# VALIDATOR_HOT_KEY=0x...
# FRAUD_HOT_KEY=0x...
# SCORER_HOT_KEY=0x...
# MATCHER_HOT_KEY=0x...
```

### Archivos

| Path | Acción |
|---|---|
| `src/types/audit-trail.ts` | **NEW** |
| `src/infra/agent-signer.ts` | **NEW** |
| `src/app/api/audit-trail/[requestId]/route.ts` | **NEW** |
| `src/components/AuditPanel.tsx` | **NEW** (UI bottom sheet) |
| `scripts/verify-audit-trail.js` | **NEW** (standalone Node) |
| `src/app/api/agents/cobraya-cfdi-validator/invoke/route.ts` | **MODIFY** (wire signReceipt + push trail) |
| `src/app/api/agents/cobraya-fraud-detector/invoke/route.ts` | **MODIFY** (idem) |
| `src/app/api/agents/cobraya-credit-scorer/invoke/route.ts` | **MODIFY** (idem) |
| `src/app/api/agents/cobraya-lender-matcher/invoke/route.ts` | **MODIFY** (idem) |
| `src/app/api/settle/route.ts` | **MODIFY** (push settlement step) |
| `tests/unit/infra/agent-signer.test.ts` | **NEW** |
| `tests/unit/api/audit-trail-download.test.ts` | **NEW** |

### 12.2 `src/types/audit-trail.ts`

Source of truth completo: `doc/AUDIT-TRAIL-SCHEMA.md §2`. Esqueleto:

```typescript
// src/types/audit-trail.ts
export interface AuditReceipt {
  domain: { name: "Cobraya"; version: "1"; chainId: 43113 };
  primaryType: "Receipt";
  message: {
    agentSlug: string;
    stepIndex: string;     // bigint serialized
    inputHash: `0x${string}`;
    outputHash: `0x${string}`;
    startedAt: string;     // bigint serialized
    priceUsdc: string;     // bigint serialized (micro-USDC)
  };
  signature: `0x${string}`;
}

export interface AuditStep {
  stepIndex: number;
  agentSlug: string;
  agentName: string;
  priceUsdc: number;
  agentSigner: `0x${string}`;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  success: boolean;
  error?: string;
  latencyMs: number;
  receipt: AuditReceipt;
  onchain: { txHash: `0x${string}`; blockNumber: number; snowtraceUrl: string } | null;
}

export interface AuditSettlement {
  authorization: {
    domain: { name: string; version: string; chainId: 43113; verifyingContract: `0x${string}` };
    primaryType: "TransferWithAuthorization";
    message: Record<string, string>;
  };
  signature: `0x${string}`;
  txHash: `0x${string}`;
  blockNumber: number;
  snowtraceUrl: string;
  deliveredAmountUSDC: number;
  facilitatorUrl: string;
}

export interface AuditTrail {
  schemaVersion: "1.0.0";
  requestId: string;
  startedAt: string;       // ISO-8601
  completedAt: string;
  totalLatencyMs: number;
  invoice: {
    uuid: string;
    rfcEmisorMasked: string;     // CD-23
    amountMXN: number;
    anchorBuyer: string;
    paymentTermsDays: number;
    sector: string;
  };
  steps: AuditStep[];
  settlement: AuditSettlement | null;
  totalCostUSDC: number;
  trailHashSHA256: `0x${string}`;
}
```

### 12.3 `src/infra/agent-signer.ts`

```typescript
import { createWalletClient, http, keccak256, stringToBytes } from "viem";
import { avalancheFuji } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { getValidatorHotKey, getFraudHotKey, getScorerHotKey, getMatcherHotKey } from "@/infra/env";
import type { AuditReceipt } from "@/types/audit-trail";

// CD-12: domain strict
const DOMAIN = { name: "Cobraya", version: "1", chainId: 43113 } as const;

const TYPES = {
  Receipt: [
    { name: "agentSlug", type: "string" },
    { name: "stepIndex", type: "uint256" },
    { name: "inputHash", type: "bytes32" },
    { name: "outputHash", type: "bytes32" },
    { name: "startedAt", type: "uint256" },
    { name: "priceUsdc", type: "uint256" },
  ],
} as const;

function getHotKeyFor(agentSlug: string): `0x${string}` {
  const map: Record<string, string> = {
    "cobraya-cfdi-validator": getValidatorHotKey(),
    "cobraya-fraud-detector": getFraudHotKey(),
    "cobraya-credit-scorer":  getScorerHotKey(),
    "cobraya-lender-matcher": getMatcherHotKey(),
  };
  const key = map[agentSlug];
  if (!key) throw new Error(`No hot key configured for ${agentSlug}`);
  return key as `0x${string}`;
}

export async function signReceipt(args: {
  agentSlug: string;
  stepIndex: number;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  startedAt: number;
  priceUsdc: number;
}): Promise<AuditReceipt> {
  const account = privateKeyToAccount(getHotKeyFor(args.agentSlug));
  const client = createWalletClient({ account, chain: avalancheFuji, transport: http() });

  const inputHash = keccak256(stringToBytes(JSON.stringify(args.input)));
  const outputHash = keccak256(stringToBytes(JSON.stringify(args.output)));

  const message = {
    agentSlug: args.agentSlug,
    stepIndex: BigInt(args.stepIndex),
    inputHash,
    outputHash,
    startedAt: BigInt(args.startedAt),
    priceUsdc: BigInt(Math.round(args.priceUsdc * 1_000_000)),
  };

  const signature = await client.signTypedData({
    account, domain: DOMAIN, types: TYPES, primaryType: "Receipt", message,
  });

  return {
    domain: DOMAIN,
    primaryType: "Receipt",
    message: {
      agentSlug: message.agentSlug,
      stepIndex: message.stepIndex.toString(),
      inputHash,
      outputHash,
      startedAt: message.startedAt.toString(),
      priceUsdc: message.priceUsdc.toString(),
    },
    signature,
  };
}
```

### 12.4 Audit buffer (DT-M) + wire en cada agent endpoint

En `src/infra/agent-signer.ts` (o nuevo `src/infra/audit-buffer.ts`):

```typescript
import type { AuditTrail, AuditStep, AuditSettlement } from "@/types/audit-trail";

declare global {
  // eslint-disable-next-line no-var
  var __cobrayaAuditBuffer: Map<string, AuditTrail> | undefined;
}

function buffer(): Map<string, AuditTrail> {
  if (!globalThis.__cobrayaAuditBuffer) globalThis.__cobrayaAuditBuffer = new Map();
  return globalThis.__cobrayaAuditBuffer;
}

export function getOrInitTrail(requestId: string, invoiceMeta: AuditTrail["invoice"]): AuditTrail {
  const buf = buffer();
  if (!buf.has(requestId)) {
    buf.set(requestId, {
      schemaVersion: "1.0.0",
      requestId,
      startedAt: new Date().toISOString(),
      completedAt: "",
      totalLatencyMs: 0,
      invoice: invoiceMeta,
      steps: [],
      settlement: null,
      totalCostUSDC: 0,
      trailHashSHA256: "0x" + "0".repeat(64) as `0x${string}`,
    });
  }
  return buf.get(requestId)!;
}

export function pushStep(requestId: string, step: AuditStep): void {
  const trail = buffer().get(requestId);
  if (!trail) return;
  trail.steps.push(step);
  trail.totalCostUSDC += step.priceUsdc;
}

export function pushSettlement(requestId: string, settlement: AuditSettlement): void {
  const trail = buffer().get(requestId);
  if (!trail) return;
  trail.settlement = settlement;
  trail.completedAt = new Date().toISOString();
  trail.totalLatencyMs = Date.now() - new Date(trail.startedAt).getTime();
}

export function getTrail(requestId: string): AuditTrail | undefined {
  return buffer().get(requestId);
}
```

En cada agent endpoint (W2, W2.5e, W3, W4) y `/api/settle`:

- Leer header `x-cobraya-request-id` (fallback `crypto.randomUUID()` server-side).
- Antes de `return`: `const receipt = await signReceipt({...})`, build `AuditStep`, `pushStep(requestId, step)`.
- `/api/settle`: además de step, `pushSettlement(requestId, ...)`.

### 12.5 `src/app/api/audit-trail/[requestId]/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { getTrail } from "@/infra/agent-signer";  // o audit-buffer.ts

export async function GET(_req: NextRequest, ctx: { params: { requestId: string } }) {
  const trail = getTrail(ctx.params.requestId);
  if (!trail) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Compute sha256 sin trailHashSHA256 field
  const serializable = { ...trail, trailHashSHA256: "" };
  const hash = "0x" + createHash("sha256").update(JSON.stringify(serializable)).digest("hex") as `0x${string}`;
  const stamped = { ...trail, trailHashSHA256: hash };

  return new NextResponse(JSON.stringify(stamped, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="cobraya-audit-${trail.requestId}.json"`,
    },
  });
}
```

### 12.6 `scripts/verify-audit-trail.js` — STANDALONE (CD-13)

```javascript
#!/usr/bin/env node
// Usage: node scripts/verify-audit-trail.js <audit.json>
// CD-13: standalone — solo viem (o ethers), NADA de Cobraya.
const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");
const { recoverTypedDataAddress } = require("viem");

async function main() {
  const file = process.argv[2];
  if (!file) { console.error("Usage: node scripts/verify-audit-trail.js <audit.json>"); process.exit(1); }
  const trail = JSON.parse(fs.readFileSync(path.resolve(file), "utf8"));

  let failures = 0;

  // 1) Recompute sha256 (excluding trailHashSHA256)
  const { trailHashSHA256: hashFromFile, ...rest } = trail;
  const recomputed = "0x" + createHash("sha256").update(JSON.stringify({ ...rest, trailHashSHA256: "" })).digest("hex");
  if (recomputed !== hashFromFile) { console.error("FAIL trailHashSHA256 mismatch"); failures++; }

  // 2) Recover EIP-712 signer per step
  for (const step of trail.steps) {
    try {
      const r = step.receipt;
      const message = {
        agentSlug: r.message.agentSlug,
        stepIndex: BigInt(r.message.stepIndex),
        inputHash: r.message.inputHash,
        outputHash: r.message.outputHash,
        startedAt: BigInt(r.message.startedAt),
        priceUsdc: BigInt(r.message.priceUsdc),
      };
      const recovered = await recoverTypedDataAddress({
        domain: r.domain,
        types: { Receipt: [
          { name: "agentSlug", type: "string" },
          { name: "stepIndex", type: "uint256" },
          { name: "inputHash", type: "bytes32" },
          { name: "outputHash", type: "bytes32" },
          { name: "startedAt", type: "uint256" },
          { name: "priceUsdc", type: "uint256" },
        ]},
        primaryType: "Receipt",
        message,
        signature: r.signature,
      });
      if (recovered.toLowerCase() !== step.agentSigner.toLowerCase()) {
        console.error(`FAIL step ${step.stepIndex} ${step.agentSlug}: signer mismatch ${recovered} vs ${step.agentSigner}`);
        failures++;
      }
    } catch (err) {
      console.error(`FAIL step ${step.stepIndex}: ${err.message}`);
      failures++;
    }
  }

  if (failures === 0) console.log("ALL CHECKS PASSED");
  else { console.error(`${failures} CHECKS FAILED`); process.exit(2); }
}

main().catch((e) => { console.error(e); process.exit(3); });
```

### Tests W5.5

| Test | Detalle |
|---|---|
| T-AUDIT-1 | `agent-signer.signReceipt(...)` → `recoverTypedDataAddress` (viem) retorna la address de `privateKeyToAccount(VALIDATOR_HOT_KEY)` |
| T-AUDIT-2 | `signReceipt` output `receipt.domain.chainId === 43113` — CD-12 |
| T-AUDIT-3 | GET `/api/audit-trail/<id>` con trail populado → response 200, header `Content-Disposition: attachment` |
| T-AUDIT-4 | GET con id inexistente → 404 |
| E2E manual (W7) | `node scripts/verify-audit-trail.js downloaded.json` → "ALL CHECKS PASSED" |

### 12.7 `src/components/AuditPanel.tsx`

Mobile bottom sheet collapsible. Stub mínimo (versión final en W6):

```tsx
"use client";
import { useState } from "react";

export interface AuditStepDisplay { stepIndex: number; agentSlug: string; success: boolean; latencyMs: number; }

export function AuditPanel({ steps, requestId }: { steps: AuditStepDisplay[]; requestId: string | null }) {
  const [open, setOpen] = useState(false);
  return (
    <details open={open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)} className="fixed bottom-0 left-0 right-0 bg-paper border-t border-ink z-30">
      <summary className="px-4 py-3 mono text-xs uppercase tracking-widest cursor-pointer">
        Audit trail · {steps.length} step{steps.length === 1 ? "" : "s"}
      </summary>
      <ul className="px-4 py-3 max-h-[60vh] overflow-y-auto">
        {steps.map((s) => (
          <li key={s.stepIndex} className="py-2 border-b border-ink/10 text-sm">
            <span className="mono">{s.agentSlug}</span> · {s.success ? "OK" : "FAIL"} · {s.latencyMs}ms
          </li>
        ))}
      </ul>
      {requestId && (
        <a href={`/api/audit-trail/${requestId}`} download className="block px-4 py-3 bg-ink text-paper text-center mono text-xs uppercase tracking-widest">
          Descargar audit trail JSON
        </a>
      )}
    </details>
  );
}
```

### Validación
```bash
npm test
npm run typecheck && npm run build
```

### ACs cubiertos
- **AC-13** (audit trail + offline verify)

### CDs cubiertos
- **CD-12** (EIP-712 domain strict), **CD-13** (standalone verify)

### Commit
```
feat(WKH-COBRAYA): WAVE W5.5 — audit trail + EIP-712 receipts + offline verify

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

---

## 13. Wave W6 — Mobile-first UI translation (120min)

**Objetivo**: traducir todos los components al mobile-first + auction panel + audit panel + 4-phase demo orchestration.

### Archivos

| Path | Acción |
|---|---|
| `src/components/BrandIcon.tsx` | **NEW** |
| `src/types/trace.ts` | **NEW** (copy de agentshop) |
| `src/components/TraceConsole.tsx` | **NEW** |
| `src/components/InvoicePicker.tsx` | **NEW** |
| `src/components/LenderAuctionPanel.tsx` | **NEW** |
| `src/components/CopyButton.tsx` | **NEW** (copy de agentshop) |
| `src/components/InfoTooltip.tsx` | **NEW** (copy de agentshop) |
| `src/components/PipelineProgress.tsx` | **REPLACE** (4 steps vertical) |
| `src/components/Settlement.tsx` | **REPLACE** (mobile-first) |
| `src/components/AuditPanel.tsx` | **MODIFY** (versión final integrada) |
| `src/components/UploadInvoice.tsx` | **DELETE** |
| `src/app/page.tsx` | **REPLACE** (mobile-first landing) |
| `src/app/demo/page.tsx` | **REPLACE** (4-phase orchestration) |
| `tests/unit/components/InvoicePicker.test.tsx` | **NEW** |
| `tests/unit/components/LenderAuctionPanel.test.tsx` | **NEW** |
| `tests/unit/components/AuditPanel.test.tsx` | **NEW** |

### 13.1 Componentes copy directo de agentshop

| Componente | Source | Adaptación |
|---|---|---|
| `BrandIcon.tsx` | `/home/ferdev/.openclaw/workspace/wasiai-agentshop/src/components/BrandIcon.tsx:1-30` | Cambiar fill a `#0F8B4A`, glyph a inicial "C" |
| `CopyButton.tsx` | `/home/ferdev/.openclaw/workspace/wasiai-agentshop/src/components/CopyButton.tsx` | Sin cambios |
| `InfoTooltip.tsx` | `/home/ferdev/.openclaw/workspace/wasiai-agentshop/src/components/InfoTooltip.tsx` | Sin cambios |
| `TraceConsole.tsx` | `/home/ferdev/.openclaw/workspace/wasiai-agentshop/src/components/TraceConsole.tsx` | Cambiar sections: `00 marketplace`, `02 agents × 4`, `03 sign`, `04 settle`. Mobile: bottom-sheet `<details>`. |
| `types/trace.ts` | `/home/ferdev/.openclaw/workspace/wasiai-agentshop/src/types/trace.ts` | Sin cambios |

### 13.2 `InvoicePicker.tsx`

**Exemplar de referencia**: `/home/ferdev/.openclaw/workspace/wasiai-agentshop/src/components/RemittancePicker.tsx`. Adaptación clave: **vertical stack mobile-first** (NO `md:grid-cols-3`, solo `grid-cols-1 gap-3`).

```tsx
"use client";
import type { Invoice } from "@/types/invoice";
import { MOCK_INVOICES } from "@/lib/mock-data";

export function InvoicePicker({ selected, onSelect }: { selected: Invoice | null; onSelect: (inv: Invoice) => void }) {
  return (
    <div className="grid grid-cols-1 gap-3">
      {MOCK_INVOICES.map((inv) => {
        const isActive = selected?.id === inv.id;
        return (
          <button
            key={inv.id}
            type="button"
            onClick={() => onSelect(inv)}
            className={`text-left p-4 border ${isActive ? "border-ink bg-ink/5" : "border-ink/30"} min-h-[44px]`}
            aria-pressed={isActive}
          >
            <div className="font-semibold">{inv.issuer.name}</div>
            <div className="text-xs text-muted">→ {inv.anchorBuyer}</div>
            <div className="mono text-sm mt-2">${inv.amount.toLocaleString("es-MX")} MXN · {inv.paymentTermsDays}d</div>
          </button>
        );
      })}
    </div>
  );
}
```

### 13.3 `LenderAuctionPanel.tsx` (componente clave del demo)

```tsx
"use client";
import type { AuctionResult, AuctionLender } from "@/types/invoice";

export function LenderAuctionPanel({ auction, onSelect, selectedId }: {
  auction: AuctionResult;
  onSelect: (l: AuctionLender) => void;
  selectedId: string | null;
}) {
  return (
    <div className="grid grid-cols-1 gap-3">
      {auction.auction.map((l) => {
        const isSelected = selectedId === l.lenderId;
        const isWinner = l.rank === 1 && l.qualifies;
        const disabled = !l.qualifies;
        return (
          <button
            key={l.lenderId}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(l)}
            className={`text-left p-4 border min-h-[48px] ${disabled ? "opacity-40" : ""} ${isSelected ? "border-ink bg-ink/5" : "border-ink/30"} ${isWinner ? "border-2 border-ink" : ""}`}
            aria-pressed={isSelected}
            title={l.rejectionReason}
          >
            <div className="flex items-baseline justify-between">
              <span className="font-semibold">
                {isWinner && <span aria-hidden>★ </span>}
                {l.lenderName}
              </span>
              <span className="mono text-xs">#{l.rank}</span>
            </div>
            <div className="mt-1 mono text-sm">
              {l.aprPct}% APR · {l.advanceRatePct}% · ~{l.estimatedSettleMinutes}min
            </div>
            <div className="mt-1 text-sm">USDC {l.netAmountUSDC.toFixed(4)}</div>
            {disabled && l.rejectionReason && (
              <div className="text-xs text-muted mt-1">{l.rejectionReason}</div>
            )}
          </button>
        );
      })}
    </div>
  );
}
```

### 13.4 `PipelineProgress.tsx` — REPLACE (4 steps vertical)

**Exemplar de referencia**: `/home/ferdev/.openclaw/workspace/wasiai-agentshop/src/components/PipelineProgress.tsx:1-60+`. Reescribir como vertical stepper con 4 steps (no 3, no horizontal):

- Step 1: `cobraya-cfdi-validator` · "Validando CFDI + anchor buyer"
- Step 2: `cobraya-fraud-detector` · "Anti-doble-cesión onchain (Fuji)"
- Step 3: `cobraya-credit-scorer` · "Scoring + rationale"
- Step 4: `cobraya-lender-matcher` · "Auction de lenders"

Estado per step: `WAITING | RUNNING | DONE | REJECTED`.

> ⚠️ **NO menciones "Oracle GenAI"** en ningún label/hint (anti-drift). El scorer label es "Scoring + Claude Haiku" o solo "Scoring".

### 13.5 `src/app/demo/page.tsx` — REPLACE (orchestration 4 phases)

```tsx
"use client";
import { useState } from "react";
import type { Invoice, ScoreResult, AuctionResult, AuctionLender } from "@/types/invoice";
import { BrandIcon } from "@/components/BrandIcon";
import { InvoicePicker } from "@/components/InvoicePicker";
import { PipelineProgress } from "@/components/PipelineProgress";
import { LenderAuctionPanel } from "@/components/LenderAuctionPanel";
import { Settlement } from "@/components/Settlement";
import { AuditPanel } from "@/components/AuditPanel";
import { TraceConsole } from "@/components/TraceConsole";

export default function DemoPage() {
  const [requestId, setRequestId] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [validator, setValidator] = useState<unknown>(null);
  const [fraud, setFraud] = useState<unknown>(null);
  const [score, setScore] = useState<ScoreResult | null>(null);
  const [auction, setAuction] = useState<AuctionResult | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<AuctionLender | null>(null);
  const [settlement, setSettlement] = useState<unknown>(null);
  const [isRunning, setIsRunning] = useState(false);

  async function runPipeline(inv: Invoice) {
    if (isRunning) return;  // CD anti double-trigger
    setIsRunning(true);
    const id = crypto.randomUUID();
    setRequestId(id);

    const headers: HeadersInit = { "Content-Type": "application/json", "x-cobraya-request-id": id };

    try {
      // Step 1 serial — validator
      const vRes = await fetch("/api/agents/cobraya-cfdi-validator/invoke", {
        method: "POST", headers,
        body: JSON.stringify({ uuidCfdi: inv.uuid, rfcEmisor: inv.issuer.rfc, amountMXN: inv.amount, anchorBuyer: inv.anchorBuyer }),
      });
      setValidator(await vRes.json());

      // Steps 2+3 parallel (DT-J)
      const [fRes, sRes] = await Promise.all([
        fetch("/api/agents/cobraya-fraud-detector/invoke", {
          method: "POST", headers,
          body: JSON.stringify({ uuidCfdi: inv.uuid, rfcEmisor: inv.issuer.rfc, amountMXN: inv.amount }),
        }),
        fetch("/api/agents/cobraya-credit-scorer/invoke", {
          method: "POST", headers,
          body: JSON.stringify({ amountMXN: inv.amount, anchorBuyer: inv.anchorBuyer, paymentTermsDays: inv.paymentTermsDays, sector: inv.sector }),
        }),
      ]);
      const fJson = await fRes.json();
      const sJson = await sRes.json() as ScoreResult;
      setFraud(fJson);
      setScore(sJson);

      // Step 4 serial — matcher
      const mRes = await fetch("/api/agents/cobraya-lender-matcher/invoke", {
        method: "POST", headers,
        body: JSON.stringify({ band: sJson.band, amountMXN: inv.amount, anchorBuyer: inv.anchorBuyer, sector: inv.sector }),
      });
      setAuction(await mRes.json() as AuctionResult);
    } finally {
      setIsRunning(false);
    }
  }

  async function signAndSettle() {
    if (!selectedMatch || !requestId) return;
    const res = await fetch("/api/settle", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-cobraya-request-id": requestId },
      body: JSON.stringify({ match: { lenderId: selectedMatch.lenderId, lenderName: selectedMatch.lenderName, netAmountUSDC: selectedMatch.netAmountUSDC } }),
    });
    setSettlement(await res.json());
  }

  return (
    <main className="min-h-screen pb-32 px-4 pt-6">
      <header className="flex items-center gap-3 mb-6">
        <BrandIcon /> <h1 className="serif text-2xl">Cobraya</h1>
      </header>

      {!invoice && (
        <section>
          <h2 className="serif text-lg mb-3">Elegí una factura</h2>
          <InvoicePicker selected={invoice} onSelect={(inv) => { setInvoice(inv); void runPipeline(inv); }} />
        </section>
      )}

      {invoice && (
        <>
          <PipelineProgress validator={validator} fraud={fraud} score={score} auction={auction} />
          {auction && (
            <section className="mt-6">
              <h2 className="serif text-lg mb-3">Subasta de lenders</h2>
              <LenderAuctionPanel auction={auction} onSelect={setSelectedMatch} selectedId={selectedMatch?.lenderId ?? null} />
            </section>
          )}
          {selectedMatch && (
            <Settlement match={selectedMatch} settlement={settlement} onSign={signAndSettle} />
          )}
        </>
      )}

      <AuditPanel steps={[]/* derivar de validator/fraud/score/auction */} requestId={requestId} />
      <TraceConsole traces={[]} />
    </main>
  );
}
```

> ⚠️ El `AuditPanel` necesita un mapping `validator/fraud/score/auction → AuditStepDisplay[]`. Implementalo inline o en un `useMemo`. Cada `step` tiene `stepIndex`, `agentSlug`, `success`, `latencyMs`.

### 13.6 `Settlement.tsx` — REPLACE

Mobile-first full-screen sheet. CTA primaria bottom-anchored con `safe-area-inset-bottom`. Botón "Descargar audit trail JSON" secundario. CopyButton para tx hash.

### 13.7 `page.tsx` — REPLACE landing

Mobile-first hero, narrativa Lupita / Walmart, sin "Oracle GenAI". CTA grande "Probar el demo" → `/demo`.

### 13.8 Delete

```bash
rm -f src/components/UploadInvoice.tsx
grep -rn "UploadInvoice" src/ 2>&1 | grep -v node_modules
# si queda algún import → eliminar.
```

### Tests W6

| Test | Detalle |
|---|---|
| T-UI-PICKER-1 | render `<InvoicePicker selected={null} onSelect={vi.fn()} />` → 3 buttons |
| T-UI-AUCTION-1 | render con `auction[]` que tiene 3 qualifying lenders → 3 cards visibles (4to disabled) |
| T-UI-AUCTION-2 | rank 1 + qualifies:true → contiene `★` |
| T-UI-AUCTION-3 | qualifies:false → button `disabled` y opacity reduced (`.opacity-40` class) |
| T-UI-AUDIT-1 | render `<AuditPanel steps={[{stepIndex:1,...}]} requestId="abc">` → contiene "1 step" + download anchor con `href="/api/audit-trail/abc"` |

### Visual manual

DevTools mobile 393x852 (iPhone 14 Pro):
- `/` y `/demo` sin scroll horizontal
- Touch targets ≥44px (auction cards, sign button, audit download) — CD-18 / AC-17
- Animaciones <200ms

### Validación

```bash
npm test
npm run typecheck && npm run build
# Lighthouse PWA on /demo → score > 90 (CD-16)
```

### ACs cubiertos
- **AC-1** (orquestación), **AC-13** (audit UI), **AC-15** (auction visual), **AC-17** (responsive mobile)

### CDs cubiertos
- **CD-18** (no desktop-only)

### Commit
```
feat(WKH-COBRAYA): WAVE W6 — mobile-first UI (4 agents + auction + audit + settlement)

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

---

## 14. Wave W7 — Register 4 agents en v2 + smoke E2E (60min)

**Objetivo**: SQL INSERT en wasiai-v2 marketplace + deploy Vercel prod + 3 runs reales + PRODUCTION-EVIDENCE.md actualizado.

### 14.1 SQL INSERT en wasiai-v2 Supabase

```sql
-- ⚠️ CD-4: NO modificás repo wasiai-v2 — solo INSERT en su DB Supabase
INSERT INTO agents (slug, name, description, capabilities, price_usdc, payment_chain, payment_asset, endpoint_url, owner_ref, status)
VALUES
  ('cobraya-cfdi-validator', 'Cobraya CFDI Validator',
   'Validates CFDI shape + anchor buyer tier + duplicates',
   ARRAY['invoice-factoring','cfdi-validate'], 0.001,
   'avalanche-fuji', 'USDC',
   'https://wasiai-lendable.vercel.app/api/agents/cobraya-cfdi-validator/invoke',
   'cobraya-hackathon', 'active'),
  ('cobraya-fraud-detector', 'Cobraya Fraud Detector',
   'Prevents double-invoice via onchain commitment in Avalanche Fuji',
   ARRAY['invoice-factoring','fraud-detection'], 0.005,
   'avalanche-fuji', 'USDC',
   'https://wasiai-lendable.vercel.app/api/agents/cobraya-fraud-detector/invoke',
   'cobraya-hackathon', 'active'),
  ('cobraya-credit-scorer', 'Cobraya Credit Scorer',
   'Deterministic score + Claude Haiku rationale (fallback local)',
   ARRAY['invoice-factoring','credit-score'], 0.05,
   'avalanche-fuji', 'USDC',
   'https://wasiai-lendable.vercel.app/api/agents/cobraya-credit-scorer/invoke',
   'cobraya-hackathon', 'active'),
  ('cobraya-lender-matcher', 'Cobraya Lender Matcher',
   'Returns auction of 4 lenders ranked by combined APR+advance+speed',
   ARRAY['invoice-factoring','lender-matching'], 0.01,
   'avalanche-fuji', 'USDC',
   'https://wasiai-lendable.vercel.app/api/agents/cobraya-lender-matcher/invoke',
   'cobraya-hackathon', 'active');
```

### 14.2 Vercel deploy

- Configurar **todas** las env vars de §1.2 + §3 en Vercel prod (NO `NEXT_PUBLIC_DEMO_MODE` en prod, o `=false`).
- Especialmente: `TREASURY_PRIVATE_KEY`, `FRAUD_DETECTOR_PRIVATE_KEY`, `COBRAYA_COMMITMENTS_ADDRESS` (post-W2.5d), `ANTHROPIC_API_KEY`, `VALIDATOR/FRAUD/SCORER/MATCHER_HOT_KEY`.
- Deploy: `vercel --prod` o push a main si está conectado.

### 14.3 Smoke E2E — 3 runs

Con `NEXT_PUBLIC_DEMO_MODE=false`:

1. **Run 1**: Tortillería La Esperanza → capturar fraud commit tx hash A + settle tx hash A + audit JSON 1.
2. **Run 2**: Confecciones Nayeli → tx hash B + audit JSON 2.
3. **Run 3**: Construcciones Hermanos Ruiz → tx hash C + audit JSON 3.

En cada run, validar:

- ✅ `GET /api/marketplace` retorna 4 cobraya-* agents (curl con `-H "x-a2a-key: $A2A_KEY"`)
- ✅ `POST /compose` × 4 desde wasiai-a2a debita el priceUsdc correcto del A2A_KEY (verificar en wasiai-a2a admin)
- ✅ Total debit/run = **$0.066 USDC** (admin panel wasiai-a2a)
- ✅ fraud-detector commit tx visible en https://testnet.snowtrace.io/tx/<hash>
- ✅ `/settle` produce tx hash real en Snowtrace
- ✅ Audit trail descargable → `node scripts/verify-audit-trail.js downloaded.json` → "ALL CHECKS PASSED"

### 14.4 `doc/PRODUCTION-EVIDENCE.md` — UPDATE

Agregar/actualizar §3 con:

- Contract deploy tx hash (W2.5d) + Snowtrace verify URL + COBRAYA_COMMITMENTS_ADDRESS
- 3 commit tx hashes (1 per run) + Snowtrace URLs
- 3 settle tx hashes (1 per run) + Snowtrace URLs
- Path a los 3 audit trail JSON files (committed al repo en `doc/evidence/` o como gist público)

### Validación

```bash
# Real curl (no demo)
curl -s "https://wasiai-lendable.vercel.app/api/marketplace" -H "x-a2a-key: $A2A_KEY" | jq '.agents | length'
# → 4

# Smoke por compose contra wasiai-a2a
# (UI del demo en mobile real es la mejor verificación)
```

### ACs cubiertos
- **AC-2** ($0.066 debit), **AC-9** (4 cobraya-* en marketplace), **AC-10** (3+ tx hashes documentados), **AC-13** (audit verify offline)

### Commit
```
feat(WKH-COBRAYA): WAVE W7 — register 4 agents en v2 + smoke E2E + PRODUCTION-EVIDENCE

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

---

## 15. Validación final (post-W7)

```bash
# 1. Tests vitest
npm test
# → ≥35 tests PASS

# 2. Tests Foundry
cd contracts && forge test -vv
# → ≥11 tests PASS

forge coverage --report summary
# → 100% lines/branches/funcs (CD-13)

forge test --gas-report
# → commitInvoice gas < 80K (CD-11)

cd ..

# 3. Type + build
npm run typecheck && npm run build
# → ambos VERDE

# 4. Lighthouse PWA
# Chrome DevTools → /demo → Lighthouse → PWA category
# → score > 90 (CD-16)

# 5. Mobile viewport check
# DevTools 393x852 (iPhone 14 Pro)
# → sin horizontal scroll, touch targets ≥44px (AC-17, CD-18)

# 6. Audit trail offline verify
node scripts/verify-audit-trail.js <downloaded-audit.json>
# → "ALL CHECKS PASSED" (CD-13, AC-13)

# 7. Demo mode paracaídas (CD-3 final check)
NEXT_PUBLIC_DEMO_MODE=true npm start
# → flow completo sin red ni wallets — sin errors
```

**Checklist QA**:
- [ ] 3 tx hashes Snowtrace documentados en PRODUCTION-EVIDENCE.md
- [ ] A2A_KEY budget reflejó $0.198 (3 runs × $0.066) en wasiai-a2a admin
- [ ] 0 TODOs nuevos · 0 `console.log` nuevos · 0 `any` explícito nuevos
- [ ] `git log --oneline | head -10` muestra 8 commits Co-Authored-By Claude (W0..W7)

---

## 16. Anti-Hallucination Checklist (estricto)

### ❌ PROHIBIDO

- ❌ **NO** modifiques `/home/ferdev/.openclaw/workspace/wasiai-a2a`
- ❌ **NO** modifiques `/home/ferdev/.openclaw/workspace/wasiai-facilitator`
- ❌ **NO** modifiques `/home/ferdev/.openclaw/workspace/wasiai-v2` (solo SQL INSERT remoto)
- ❌ **NO** uses Oracle GenAI (dropeado pre-hack) — todas las referencias a `oracle-client.ts`, `ORACLE_*` env vars, `oraclePromptId` deben removerse o quedar deprecated
- ❌ **NO** uses camera capture (los CFDIs son MOCK_INVOICES preloaded)
- ❌ **NO** implementes push notifications
- ❌ **NO** uses Web Share API, Background Sync, Geolocation (scope guard PWA)
- ❌ **NO** despliegues en mainnet (solo Avalanche Fuji)
- ❌ **NO** parsees CFDIs reales del SAT (todo mocked)
- ❌ **NO** implementes refunds onchain (V2 backlog)
- ❌ **NO** uses `/orchestrate` con `$1` placeholder (DT-A: usar `/compose` step-by-step)
- ❌ **NO** instales `@anthropic-ai/sdk` (DT-E: usar `fetch` directo a `api.anthropic.com`)
- ❌ **NO** commitees con `--no-verify` (CD-6)
- ❌ **NO** uses `any` explícito (CD-1) — usá `unknown` + narrowing si necesitás flexibilidad
- ❌ **NO** uses `Math.random()` ni `Date.now()` dentro de `src/core/*` (CD-20)
- ❌ **NO** logguees `process.env.*` keys ni `body` completos con secrets (CD-9 / CD-21)
- ❌ **NO** importes `src/core/*` desde `src/infra/*` (CD-19 layer rule)
- ❌ **NO** uses `ReentrancyGuard` en `CobrayaInvoiceCommitments.sol` (storage-only — documentado)
- ❌ **NO** escribas tests fuera de los listados en cada wave
- ❌ **NO** modifiques `work-item.md` ni `sdd.md` ni este story-file
- ❌ **NO** inventes paths exemplar — todos los referenciados existen y están listados en §19
- ❌ **NO** cambies precios de los 4 agents — `$0.001 / $0.005 / $0.05 / $0.01` son inviolables
- ❌ **NO** cambies la branch — `feat/wkh-cobraya-agents` única
- ❌ **NO** preguntes al humano entre waves — el pipeline F2.5 → F3 corre sin gates intermedios

### ✅ OBLIGATORIO

- ✅ Sí leé `doc/CONTRACT-DESIGN.md` antes de W2.5 (spec exacta Solidity)
- ✅ Sí leé `doc/AUDIT-TRAIL-SCHEMA.md` antes de W5.5
- ✅ Sí leé `BACKLOG.md §6` (mock data exact specs) antes de W1
- ✅ Sí corré `npm test` + `npm run build` antes de cada commit (CD-2)
- ✅ Sí mantené `NEXT_PUBLIC_DEMO_MODE=true` funcionando en cada wave (CD-3 paracaídas)
- ✅ Sí firmá cada commit con `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>` (CD-7)
- ✅ Sí escalá al humano vía F2.5 done report si encontrás contradicción entre este story file y el estado real del código (preferí pausar antes que inventar)

---

## 17. Commit strategy (1 commit por wave)

Mensajes pre-formateados (copy/paste literal):

| Wave | Commit message |
|---|---|
| W0 | `chore(WKH-COBRAYA): WAVE W0 — bootstrap env vars + pre-flight checks` |
| W0.5 | `feat(WKH-COBRAYA): WAVE W0.5 — PWA scaffold mobile-first (manifest + SW + offline)` |
| W1 | `feat(WKH-COBRAYA): WAVE W1 — mock data + types + scoring/matching + marketplace + vitest` |
| W2 | `feat(WKH-COBRAYA): WAVE W2 — cobraya-cfdi-validator agent endpoint + tests` |
| W2.5 | `feat(WKH-COBRAYA): WAVE W2.5 — Solidity commitments contract + Foundry + fraud-detector agent` |
| W3 | `feat(WKH-COBRAYA): WAVE W3 — cobraya-credit-scorer agent + Claude rationale + fallback` |
| W4 | `feat(WKH-COBRAYA): WAVE W4 — cobraya-lender-matcher agent + auction logic` |
| W5 | `feat(WKH-COBRAYA): WAVE W5 — EIP-3009 signer + /api/settle + cap enforcement` |
| W5.5 | `feat(WKH-COBRAYA): WAVE W5.5 — audit trail + EIP-712 receipts + offline verify` |
| W6 | `feat(WKH-COBRAYA): WAVE W6 — mobile-first UI (4 agents + auction + audit + settlement)` |
| W7 | `feat(WKH-COBRAYA): WAVE W7 — register 4 agents en v2 + smoke E2E + PRODUCTION-EVIDENCE` |

Cada commit firmado con:
```
Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

Sintaxis HEREDOC obligatoria:
```bash
git commit -m "$(cat <<'EOF'
feat(WKH-COBRAYA): WAVE Wn — título exacto

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

**NUNCA `--no-verify`** (CD-6). Si pre-commit hook falla → fix root cause y nuevo commit (no `--amend`).

---

## 18. Mapping AC → Wave/Test (quick reference)

| AC | Wave | Test/Validación |
|---|---|---|
| AC-1 | W6 | demo-page orchestration: 4 invocaciones en orden (validator → fraud‖scorer → matcher) |
| AC-2 | W7 | PRODUCTION-EVIDENCE.md §debit: total debit/run = $0.066 USDC |
| AC-3 | W1, W3 | T-SCORING-DETERMINISM, T-SCORER-1 |
| AC-4 | W3 | T-LLM-1, T-LLM-2, T-LLM-3 |
| AC-5 | W5 | T-EIP3009-1 |
| AC-6 | W5+W7 | T-SETTLE-1 + PRODUCTION-EVIDENCE.md tx hashes |
| AC-7 | W5 | T-SETTLE-2 (cap 422) |
| AC-8 | W0.5+W6 | Manual `NEXT_PUBLIC_DEMO_MODE=true` full flow |
| AC-9 | W1+W7 | T-MARKETPLACE-1 + smoke curl |
| AC-10 | W2.5+W7 | PRODUCTION-EVIDENCE.md §3 (≥3 tx hashes Snowtrace) |
| AC-12 | W2.5 | Foundry tests test_CommitInvoice_RevertsAlreadyCommitted + T-FRAUD-2 |
| AC-13 | W5.5+W7 | `node scripts/verify-audit-trail.js downloaded.json` → "ALL CHECKS PASSED" |
| AC-14 | W8 | (manual — fuera de F3) |
| AC-15 | W4+W6 | T-MATCHER-1..3 + T-UI-AUCTION-1..3 |
| AC-16 | W0.5+W7 | Lighthouse PWA score > 90 |
| AC-17 | W6 | DevTools mobile 393x852 — sin horizontal scroll |
| AC-18 | W0.5 | DevTools offline mode → `~offline/page.tsx` |

---

## 19. Exemplars verificados (paths confirmados)

| Patrón | Path absoluto (verificado existe) | Wave |
|---|---|---|
| EIP-3009 server-side signer | `/home/ferdev/.openclaw/workspace/wasiai-agentshop/src/infra/eip3009-signer.ts` (3.1K, 114 líneas) | W5 |
| Settle route shape | `/home/ferdev/.openclaw/workspace/wasiai-agentshop/src/app/api/settle/route.ts` (4.9K) | W5 |
| Marketplace listing route | `/home/ferdev/.openclaw/workspace/wasiai-agentshop/src/app/api/marketplace/route.ts` (4.0K) | W1 |
| Agent invoke route shape | `/home/ferdev/.openclaw/workspace/wasiai-agentshop/src/app/api/agents/agentshop-kyc-validator/invoke/route.ts` | W2, W2.5, W3, W4 |
| TraceConsole | `/home/ferdev/.openclaw/workspace/wasiai-agentshop/src/components/TraceConsole.tsx` (9.8K) | W6 |
| PipelineProgress | `/home/ferdev/.openclaw/workspace/wasiai-agentshop/src/components/PipelineProgress.tsx` (6.1K) | W6 |
| RemittancePicker (referencia InvoicePicker) | `/home/ferdev/.openclaw/workspace/wasiai-agentshop/src/components/RemittancePicker.tsx` (2.2K) | W6 |
| BrandIcon | `/home/ferdev/.openclaw/workspace/wasiai-agentshop/src/components/BrandIcon.tsx` (1.3K) | W6 |
| CopyButton | `/home/ferdev/.openclaw/workspace/wasiai-agentshop/src/components/CopyButton.tsx` (2.0K) | W6 |
| InfoTooltip | `/home/ferdev/.openclaw/workspace/wasiai-agentshop/src/components/InfoTooltip.tsx` (1.2K) | W6 |
| Settlement | `/home/ferdev/.openclaw/workspace/wasiai-agentshop/src/components/Settlement.tsx` (7.4K) | W6 |
| trace types | `/home/ferdev/.openclaw/workspace/wasiai-agentshop/src/types/trace.ts` (563B) | W6 |
| Foundry config | `/home/ferdev/.openclaw/workspace/wasiai-v2/contracts/foundry.toml` (548B) | W2.5a |
| Solidity Ownable2Step pattern | `/home/ferdev/.openclaw/workspace/wasiai-v2/contracts/src/WasiAIMarketplace.sol` (46.6K) | W2.5b |
| Solidity contract spec exacto | `/home/ferdev/.openclaw/workspace/wasiai-lendable/doc/CONTRACT-DESIGN.md §3` | W2.5b |
| Foundry test spec exacto | `/home/ferdev/.openclaw/workspace/wasiai-lendable/doc/CONTRACT-DESIGN.md §6` | W2.5c |
| Deploy script spec | `/home/ferdev/.openclaw/workspace/wasiai-lendable/doc/CONTRACT-DESIGN.md §7` | W2.5d |
| Agent endpoint pseudocode | `/home/ferdev/.openclaw/workspace/wasiai-lendable/doc/CONTRACT-DESIGN.md §9` | W2.5e |
| `withPWA` config completo | `/home/ferdev/.openclaw/workspace/luma-ai/next.config.mjs` (3.6K, 91 líneas) | W0.5a |
| PWA assets generator | `/home/ferdev/.openclaw/workspace/luma-ai/scripts/generate-pwa-assets.mjs` (7.0K) | W0.5b |
| RegisterSW component | `/home/ferdev/.openclaw/workspace/luma-ai/src/components/pwa/register-sw.tsx` (1.6K) | W0.5c |
| InstallPrompt component | `/home/ferdev/.openclaw/workspace/luma-ai/src/components/pwa/install-prompt.tsx` (5.6K) | W0.5c |
| Audit trail TS types exactos | `/home/ferdev/.openclaw/workspace/wasiai-lendable/doc/AUDIT-TRAIL-SCHEMA.md §2` | W5.5 |
| Audit verify script ejemplo | `/home/ferdev/.openclaw/workspace/wasiai-lendable/doc/AUDIT-TRAIL-SCHEMA.md §6` | W5.5 |
| Mock data spec | `/home/ferdev/.openclaw/workspace/wasiai-lendable/BACKLOG.md §6` | W1 |
| Scoring formula | `/home/ferdev/.openclaw/workspace/wasiai-lendable/BACKLOG.md §6` | W1 |

---

## 20. Done Definition (checklist final F3)

- [ ] Pre-flight (§1) ejecutado y verificado
- [ ] 11 commits (W0..W7) en `feat/wkh-cobraya-agents` con mensajes pre-formateados + Co-Authored-By Claude
- [ ] `npm test` → ≥35 tests PASS (W0.5: 3 · W1: 11 · W2: 6 · W2.5: 5 · W3: 8 · W4: 5 · W5: 7 · W5.5: 4 · W6: 5)
- [ ] `forge test` → ≥12 tests PASS · gas commitInvoice < 80K · coverage 100%
- [ ] `npm run typecheck` + `npm run build` verdes
- [ ] Lighthouse PWA score > 90 en `/demo` (CD-16)
- [ ] `~offline/page.tsx` sirve en offline mode (AC-18)
- [ ] `node scripts/verify-audit-trail.js <audit.json>` → "ALL CHECKS PASSED" (AC-13, CD-13)
- [ ] `NEXT_PUBLIC_DEMO_MODE=true` corre el flow completo sin red (CD-3, AC-8)
- [ ] `doc/PRODUCTION-EVIDENCE.md` actualizado con ≥3 tx hashes Snowtrace + contract address (AC-10)
- [ ] 4 cobraya-* agents registrados en wasiai-v2 Supabase (AC-9)
- [ ] 0 nuevas violaciones de CD-1..CD-24 (auditable por AR)
- [ ] Branch `feat/wkh-cobraya-agents` lista para AR

**Salida esperada de F3 al orquestador**:
- Path branch: `feat/wkh-cobraya-agents`
- Resumen ejecutivo: # commits, # tests, # ACs PASS, # tx hashes en evidence, comando para AR (`/nexus-p5-ar WKH-COBRAYA-AGENTS`).

---

**End of Story File.**
Pipeline F2.5 done. Siguiente: `/nexus-p4-f3 WKH-COBRAYA-AGENTS` (nexus-dev wave-por-wave).
