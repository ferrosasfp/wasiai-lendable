# SDD — WKH-COBRAYA-AGENTS Cobraya agentic invoice factoring marketplace

> Status: F2 (SDD generated, pending SPEC_APPROVED)
> Pipeline: QUALITY · Branch: `feat/wkh-cobraya-agents` (commit `71f3a65`)
> Author: nexus-architect · Date: 2026-05-15
> Estimated effort: ~18-20h en 9 waves (W0..W7) + W8 manual video sprint

---

## 1. Resumen ejecutivo

Cobraya es un marketplace de factoraje agéntico para PyMEs mexicanas: Lupita sube CFDI → 4 agentes IA (`cobraya-cfdi-validator` $0.001 → `cobraya-fraud-detector` $0.005 onchain → `cobraya-credit-scorer` $0.05 con Claude Haiku + fallback → `cobraya-lender-matcher` $0.01 con auction) lo procesan en <60s → EIP-3009 settlement USDC en Avalanche Fuji.

Total cost por run = $0.066 USDC (debit via WKH-59 per-step pricing en wasiai-a2a). Cada paso firma un EIP-712 receipt + se compone audit trail JSON descargable + verificable offline (`scripts/verify-audit-trail.js`).

UI mobile-first PWA installable (iOS/Android via `@ducanh2912/next-pwa`). Reuso del pattern probado en `wasiai-agentshop` (Kite Hackathon, open source) + PWA pattern probado en `luma-ai` + Foundry pattern alineado con `wasiai-v2/contracts`.

Distribución: W0 bootstrap → W0.5 PWA scaffold → W1 mock data + types → W2 validator → W2.5 fraud-detector + Solidity Foundry deploy → W3 scorer + Claude → W4 matcher + auction → W5 EIP-3009 + /settle → W5.5 audit trail → W6 mobile-first UI → W7 register 4 agents en v2 marketplace + smoke E2E. W8 video producción es trabajo manual del user.

---

## 2. Codebase grounding (archivos leídos)

### Cobraya scaffold (target repo `/home/ferdev/.openclaw/workspace/wasiai-lendable/`)

| Path | Líneas | Por qué | Pattern extraído |
|---|---|---|---|
| `package.json` | 1-36 | Verificar stack base | Next 14.2.5 + viem 2.21.0 + zod 3.23.8. **Sin runner de tests instalado** — el work-item dice vitest, hay que agregarlo. Sin `@ducanh2912/next-pwa`. Puerto dev/start = 3010. |
| `next.config.js` | 1-7 | Verificar configuración base | Bare config — necesita wrap con `withPWA()` en W0.5. CommonJS (`.js`), no ESM `.mjs`. |
| `.env.local` | 1-89 | Estado real de wallets + secrets | OWNER + TREASURY + OPERATOR ya configurados. `DEPLOYER_PRIVATE_KEY=TREASURY` alias. `FRAUD_DETECTOR_AGENT_WALLET=TREASURY` (V1 reuse documentado). `COBRAYA_COMMITMENTS_ADDRESS=POPULATE_AFTER_DEPLOY_W2.5d`. `ANTHROPIC_API_KEY=COPY_FROM_WASIAI_A2A_DOTENV_AT_18:00`. `SNOWTRACE_API_KEY=GET_FREE_KEY_FROM_SNOWTRACE_BEFORE_18:00`. **NO existen aún** las 4 hot keys (VALIDATOR/FRAUD/SCORER/MATCHER) — se generan en W5.5. |
| `.env.example` | 1-26 | Pre-hack ejemplo | Contiene `ORACLE_GENAI_ENDPOINT` obsoleto. Hay que actualizar con todas las nuevas vars. |
| `src/types/invoice.ts` | 1-75 | Tipos base existentes | Tiene `Invoice`, `ValidatorResult`, `ScoreResult`, `LenderMatch`, `SettlementReceipt`, `Lender`. **Falta**: `anchorBuyer`, `paymentTermsDays`, `sectorRisk`, `uuidSat`, `auction` types. `ScoreResult.oraclePromptId` debe deprecarse → reemplazar con `rationaleProvenance`. |
| `src/core/scoring.ts` | 1-26 | Scoring scaffold | Implementación naive (`isAnchorTier1` + `sizeBonus`). **Hay que REPLACE COMPLETO** con la fórmula del BACKLOG §6 (base_score por buyer tier + amount_adjust + terms_adjust + sector_adjust). |
| `src/core/matching.ts` | 1-50 | Matching scaffold | Tiene `pickLenderForBand` (single match). **Hay que REPLACE** con auction logic (filter qualifying + score combined + rank). |
| `src/core/settlement.ts` | 1-31 | Math helpers | `mxnToUSDC` (rate 19.85), `usdcToOnchainAmount` (6 dec), `computeSettlement`, `snowtraceUrl`. Útil — mantener. |
| `src/core/invoice.ts` | 1-7 | `termDays` helper | Computes days between `issueDate` y `dueDate`. Mantener. |
| `src/infra/env.ts` | 1-19 | Env vars actuales | Tiene A2A_URL/A2A_KEY/FACILITATOR_URL/ORACLE_*/CHAIN_ID/USDC_ADDRESS/isDemoMode. **Falta**: TREASURY_PRIVATE_KEY, OWNER_ADDRESS, FRAUD_DETECTOR_PRIVATE_KEY, COBRAYA_COMMITMENTS_ADDRESS, ONCHAIN_AMOUNT_CAP_USDC, ANTHROPIC_API_KEY, hot keys, SNOWTRACE_API_KEY. Borrar ORACLE_*. Migrar a validación Zod opcional. |
| `src/infra/a2a-client.ts` | 1-29 | A2A compose client | `composeOnA2A(steps)` con header `x-a2a-key`. Útil. La chain header NO se manda — el a2a routing usa el slug del agent. Mantener pattern. |
| `src/infra/facilitator-client.ts` | 1-66 | Facilitator client | `settleOnFacilitator()` ya implementado con shape para POST /settle. Útil — mantener. |
| `src/infra/mock-adapter.ts` | 1-62 | Mock fallback path | `mockValidate/mockScore/mockMatch/mockSettle`. Útil. Hay que adaptar para 4 agents + auction shape. |
| `src/infra/oracle-client.ts` | 1-57 | Oracle GenAI obsoleto | **DELETE** — reemplazado por `src/infra/llm-client.ts` (W3). |
| `src/application/validate-invoice.ts` | 1-18 | Use case scaffold | Pattern `isDemoMode() → mock else compose`. Bien. Necesita refactor para usar el nuevo agent endpoint local. |
| `src/lib/mock-data.ts` | 1-89 | Mock data scaffold | 3 CFDIs + 3 lenders. **Datos diferentes** a los del BACKLOG §6 (ej. tiene "Panadería Don Memo", BACKLOG dice "Confecciones Nayeli"). **Hay que REPLACE** completo. |
| `src/app/api/settle/route.ts` | 1-29 | Settle route scaffold | Acepta `signature/nonce/validAfter/validBefore` desde el body (BUG: cliente no debería firmar — el server firma con TREASURY). **Hay que REPLACE** para firmar server-side. |
| `src/app/api/validate/route.ts` | 1-12 | Validate route scaffold | Delega a `validateInvoice()`. OK como wrapper, pero el WORK ITEM dice route es `/api/agents/cobraya-cfdi-validator/invoke` — el route `/api/validate` queda como wrapper interno UI-only o se elimina. **Decisión DT-K abajo**. |
| `src/app/demo/page.tsx` | 1-138 | Demo page scaffold | Usa `UploadInvoice` + `PipelineProgress` + `Settlement` con 3-step serial. Firma todo en `0x00...` (no firma real). **REPLACE COMPLETO** con 4-phase mobile-first + paralelización + auction + audit panel. |
| `src/app/page.tsx` | 1-72 | Landing scaffold | Layout 3 columns desktop. Aún menciona "Oracle GenAI" en `02 · Scoring`. **REPLACE** con mobile-first + narrativa Lupita + Walmart + 4 agentes. |
| `src/app/layout.tsx` | 1-16 | Root layout | Mínimo. Necesita PWA metadata (manifest, icons, appleWebApp, viewport.themeColor) + `<RegisterSW />` + `<InstallPrompt />`. |
| `src/components/UploadInvoice.tsx` | 1-30 | UI scaffold obsoleto | **DELETE** — reemplazado por `InvoicePicker.tsx` mobile-first. |
| `src/components/PipelineProgress.tsx` | 1-103 | Pipeline UI scaffold | 3 steps con labels antiguos (`invoice-validator`, `credit-scorer Oracle GenAI`, `lender-matcher`). **REPLACE** con 4 steps + vertical mobile stepper + paralelización visual. |
| `src/components/Settlement.tsx` | 1-69 | Settlement UI scaffold | Pattern OK. Adaptar a mobile-first (full-screen sheet con bottom-anchored CTA + audit download). |
| `doc/sdd/_INDEX.md` | 1-22 | Índice | HU 001 en `in progress`. Pasará a `spec approved` post-F2.5. |

### wasiai-agentshop (reference repo — Kite Hackathon pattern, open source, declared en proof-of-honesty)

| Path | Líneas | Por qué | Pattern extraído |
|---|---|---|---|
| `src/infra/eip3009-signer.ts` | 1-114 | EIP-3009 signing pattern | `signTransferAuthorization()` con domain `{name:"PYUSD",version:"1",chainId:KITE_CHAIN_ID,verifyingContract:PYUSD_ADDRESS}`, `randomBytes(32)` para nonce, `validBefore = now + 300s`, return `{from,to,value,validAfter,validBefore,nonce,signature}`. Cobraya adapta: chain `avalancheFuji`, asset USDC (6 dec), domain name `"USDC"` o el oficial de Circle. |
| `src/app/api/settle/route.ts` | 1-156 | Server-side settle pattern | POST recibe `{remittance, corridor, match}`, llama `settleRemittance()` (que internamente firma + posta al facilitator), arma 2 `TraceEvent` (section 03 = sign, section 04 = facilitator). Retorna `{receipt, traces}`. Cobraya replica: server-side sign con `TREASURY_PRIVATE_KEY`, post al facilitator, return tx hash + Snowtrace URL. |
| `src/app/api/marketplace/route.ts` | 1-157 | Marketplace listing pattern | `GET /api/marketplace` → fetch `${A2A_URL}/discover?capabilities=remittance&limit=10` → filter por slug allowlist `AGENTSHOP_SLUGS` → fallback estático si live ≠ 3 → return `{agents, totalEstimatedFee, ..., trace}`. Cobraya replica con `COBRAYA_SLUGS = [cobraya-cfdi-validator, cobraya-fraud-detector, cobraya-credit-scorer, cobraya-lender-matcher]` y `capabilities=invoice-factoring`. |
| `src/app/api/agents/agentshop-kyc-validator/invoke/route.ts` | 1-47 | Agent endpoint pattern | POST handler simple: parsea body → valida campos requeridos → invoca lógica core determinista → return JSON con shape estable. Sin AI. Cobraya `cobraya-cfdi-validator` sigue el mismo pattern. |
| `src/components/TraceConsole.tsx` | 1-80 | TraceConsole pattern | Recibe `traces: TraceEvent[]` + `activeSections` + `inFlightSections`. Renderiza 4 sections con `tooltip`. Cobraya copia + adapta sections (00 marketplace, 02 agents × 4, 03 sign, 04 settle). Mobile = collapsible bottom sheet. |
| `src/components/PipelineProgress.tsx` | 1-60 (verified head) | Pipeline pattern | Per-step StepCard con `state: WAITING|RUNNING|DONE|REJECTED`, child con outputs del step. Cobraya adapta a 4 steps + vertical stepper mobile. |
| `src/components/BrandIcon.tsx` | 1-30 | Branded SVG pattern | Trivial — SVG inline 56x56. Cobraya cambia colors/glyph (Avalanche-red ya está). |
| `src/components/RemittancePicker.tsx` | 1-50 (verified head) | Picker pattern | 3 cards full-width grid (md:grid-cols-3). Cobraya `InvoicePicker.tsx` adapta a vertical mobile-first stack (no md:grid). |
| `src/app/demo/page.tsx` | 241 líneas (verified count) | 4-phase demo orchestration | Patrón referencia para `src/app/demo/page.tsx` en Cobraya — useState hooks per phase, async functions per call, `Promise.all` para paralelismo. |

### wasiai-v2 contracts (Foundry pattern reference)

| Path | Líneas | Por qué | Pattern extraído |
|---|---|---|---|
| `contracts/foundry.toml` | 1-21 | Foundry config pattern | `solc 0.8.24`, `optimizer = true`, `optimizer_runs = 200`, `remappings @openzeppelin/=lib/openzeppelin-contracts/`, `[rpc_endpoints] fuji avalanche`. Cobraya copia + agrega `[etherscan]` section con `SNOWTRACE_API_KEY`. |
| `contracts/src/WasiAIMarketplace.sol` | 1-60 (verified head) | Solidity patterns | `Ownable2Step` + `ReentrancyGuard` + `Pausable` + custom errors + `EIP712`. Cobraya `CobrayaInvoiceCommitments.sol` usa subset: `Ownable2Step` + custom errors (NO ReentrancyGuard porque storage-only). Documentado en CONTRACT-DESIGN.md §3. |
| `contracts/src/` (estructura) | listing | Foundry layout | `src/` + `test/` + `script/` + `lib/forge-std` + `lib/openzeppelin-contracts`. Cobraya replica idéntico en `wasiai-lendable/contracts/`. |

### luma-ai (PWA pattern reference — same team, open source)

| Path | Líneas | Por qué | Pattern extraído |
|---|---|---|---|
| `next.config.mjs` | 1-91 | withPWA wrapper completo | `withPWAInit({dest:'public', cacheOnFrontEndNav:true, aggressiveFrontEndNavCaching:true, reloadOnOnline:true, disable:NODE_ENV==='development', extendDefaultRuntimeCaching:false, fallbacks:{document:'/~offline'}, workboxOptions:{...runtimeCaching:[...]}})`. Cobraya copia esta estructura + adapta los URL patterns NetworkOnly a wasiai-a2a + wasiai-facilitator + `/api/`. |
| `public/icons/` | 6 archivos | Asset estructura | `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon-{120,152,180}.png`. Cobraya replica con logo Cobraya. |
| `public/manifest.json` | listing exists | Manifest schema | Schema standard PWA. Cobraya customiza `name`, `theme_color`, `lang:"es"`, `categories:["finance","productivity"]`. |
| `scripts/generate-pwa-assets.mjs` | 7K (listing) | Asset generator | Toma logo PNG source → outputs all variants. Cobraya copia + apunta a logo Cobraya. |
| `src/components/pwa/{register-sw,install-prompt}.tsx` | 2 archivos | PWA UI components | `RegisterSW` registra SW on client mount; `InstallPrompt` handles `beforeinstallprompt`. Cobraya copia. |

---

## 3. Arquitectura de la solución

### 3.1 Architecture diagram (ASCII)

```
┌────────────────────────────────────────────────────────────────────────┐
│ PHONE (iPhone 14 Pro 393x852)                                          │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ Cobraya PWA standalone · Next.js 14 App Router · Vercel            │ │
│ │  src/app/demo/page.tsx (orchestrator)                              │ │
│ │     │                                                              │ │
│ │     ├─ Phase 0: GET /api/marketplace ──────► wasiai-a2a /discover  │ │
│ │     │                                        ◄── 4 cobraya-* agents│ │
│ │     │                                                              │ │
│ │     ├─ Phase 1: user taps InvoicePicker                            │ │
│ │     │                                                              │ │
│ │     ├─ Phase 2: 4 calls /compose (per-step, WKH-59 pricing)        │ │
│ │     │   ├─ step 1 (serial):                                        │ │
│ │     │   │   POST /api/agents/cobraya-cfdi-validator/invoke ($0.001)│ │
│ │     │   │   → POST wasiai-a2a /compose (debits A2A_KEY)            │ │
│ │     │   │                                                          │ │
│ │     │   ├─ steps 2+3 (Promise.all parallel):                       │ │
│ │     │   │   ├─ POST /api/agents/cobraya-fraud-detector/invoke      │ │
│ │     │   │   │   ($0.005)                                           │ │
│ │     │   │   │     │                                                │ │
│ │     │   │   │     ├─ viem readContract isCommitted(hash) ─────┐    │ │
│ │     │   │   │     │                                            │   │ │
│ │     │   │   │     └─ viem writeContract commitInvoice(...) ────┤   │ │
│ │     │   │   │           waitForTransactionReceipt(conf:1)     │   │ │
│ │     │   │   │                                                  ▼   │ │
│ │     │   │   │                          Avalanche Fuji RPC + CobrayaInvoiceCommitments.sol
│ │     │   │   │                                                      │ │
│ │     │   │   └─ POST /api/agents/cobraya-credit-scorer/invoke       │ │
│ │     │   │       ($0.05)                                            │ │
│ │     │   │         │                                                │ │
│ │     │   │         ├─ deterministic score (src/core/scoring.ts)     │ │
│ │     │   │         └─ rationale via Claude Haiku (5s timeout) or    │ │
│ │     │   │              local FALLBACK_TEMPLATES[band]              │ │
│ │     │   │                                                          │ │
│ │     │   └─ step 4 (serial, depends on score):                      │ │
│ │     │       POST /api/agents/cobraya-lender-matcher/invoke ($0.01) │ │
│ │     │       → auction array {auction[], recommendedLender, ...}    │ │
│ │     │                                                              │ │
│ │     │   ⤿ cada step firma EIP-712 receipt con su hot key           │ │
│ │     │   ⤿ AuditPanel update en tiempo real (bottom sheet)          │ │
│ │     │                                                              │ │
│ │     ├─ Phase 3: user taps "Sign & Settle"                          │ │
│ │     │   POST /api/settle                                           │ │
│ │     │     │                                                        │ │
│ │     │     ├─ Cap check: amount > ONCHAIN_AMOUNT_CAP_USDC?          │ │
│ │     │     │    yes → reject 422 + UI "testnet cap"                 │ │
│ │     │     │                                                        │ │
│ │     │     ├─ server-side sign EIP-3009 con TREASURY_PRIVATE_KEY    │ │
│ │     │     │                                                        │ │
│ │     │     └─ POST wasiai-facilitator /settle                       │ │
│ │     │           │                                                  │ │
│ │     │           ▼                                                  │ │
│ │     │      Avalanche Fuji · USDC transferWithAuthorization         │ │
│ │     │           │                                                  │ │
│ │     │           ▼  tx confirmed (~25s)                             │ │
│ │     │      OWNER wallet receives USDC                              │ │
│ │     │                                                              │ │
│ │     └─ Phase 3 end: user taps "Descargar audit trail"              │ │
│ │         GET /api/audit-trail/[requestId]                           │ │
│ │           ◄── JSON con 4 step receipts + settlement + sha256       │ │
│ │                                                                    │ │
│ │ Service Worker (sw.js generated by next-pwa):                      │ │
│ │   NetworkOnly: /api/*, wasiai-a2a, wasiai-facilitator (CD-17)      │ │
│ │   CacheFirst:  /icons, /splashes                                   │ │
│ │   NetworkFirst+~offline fallback: document navigations             │ │
│ └────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Hexagonal-light layers (reuso pattern wasiai-agentshop)

```
src/
├── core/          (pure domain — no I/O)
│   ├── scoring.ts          ← REPLACE (BACKLOG §6 formula)
│   ├── matching.ts         ← REPLACE (auction logic)
│   ├── settlement.ts       ← MANTENER (math)
│   └── invoice.ts          ← MANTENER (termDays helper)
│
├── infra/         (outbound I/O — adapters)
│   ├── env.ts              ← EXPAND (nuevas env vars)
│   ├── a2a-client.ts       ← MANTENER
│   ├── facilitator-client.ts ← MANTENER
│   ├── eip3009-signer.ts   ← NEW (W5)
│   ├── llm-client.ts       ← NEW (W3, reemplaza oracle-client.ts)
│   ├── agent-signer.ts     ← NEW (W5.5, hot keys EIP-712)
│   ├── mock-adapter.ts     ← UPDATE (4 agents + auction)
│   └── oracle-client.ts    ← DELETE
│
├── application/  (use cases — orquestación)
│   ├── validate-invoice.ts ← UPDATE (4 agents)
│   ├── score-invoice.ts    ← UPDATE
│   ├── match-lender.ts     ← UPDATE
│   └── settle-factoring.ts ← UPDATE
│
├── app/           (Next.js App Router)
│   ├── layout.tsx          ← UPDATE (PWA metadata)
│   ├── page.tsx            ← REPLACE (mobile-first landing)
│   ├── ~offline/page.tsx   ← NEW (W0.5)
│   ├── demo/page.tsx       ← REPLACE (4-phase mobile)
│   └── api/
│       ├── marketplace/route.ts ← NEW (W1, lista 4 cobraya-*)
│       ├── agents/
│       │   ├── cobraya-cfdi-validator/invoke/route.ts ← NEW (W2)
│       │   ├── cobraya-fraud-detector/invoke/route.ts ← NEW (W2.5)
│       │   ├── cobraya-credit-scorer/invoke/route.ts  ← NEW (W3)
│       │   └── cobraya-lender-matcher/invoke/route.ts ← NEW (W4)
│       ├── settle/route.ts ← REPLACE (server-side sign)
│       └── audit-trail/[requestId]/route.ts ← NEW (W5.5)
│
├── components/    (React UI mobile-first)
│   ├── BrandIcon.tsx        ← NEW (W6, SVG Cobraya)
│   ├── TraceConsole.tsx     ← NEW (W6, mobile bottom sheet)
│   ├── InvoicePicker.tsx    ← NEW (W6, vertical cards)
│   ├── LenderAuctionPanel.tsx ← NEW (W6, auction visual)
│   ├── AuditPanel.tsx       ← NEW (W5.5/W6, audit bottom sheet)
│   ├── Settlement.tsx       ← REPLACE (mobile-first)
│   ├── PipelineProgress.tsx ← REPLACE (4 steps vertical)
│   ├── CopyButton.tsx       ← NEW (W6, UI helper)
│   ├── InfoTooltip.tsx      ← NEW (W6, UI helper)
│   ├── UploadInvoice.tsx    ← DELETE
│   └── pwa/
│       ├── register-sw.tsx     ← NEW (W0.5)
│       └── install-prompt.tsx  ← NEW (W0.5)
│
├── types/         (DTOs)
│   ├── invoice.ts          ← EXTEND (anchorBuyer, paymentTermsDays, sectorRisk, uuidSat, auction)
│   ├── trace.ts            ← NEW (W6, TraceEvent type — copy from agentshop)
│   └── audit-trail.ts      ← NEW (W5.5, AuditTrail/AuditStep/AuditSettlement)
│
└── lib/
    ├── mock-data.ts        ← REPLACE (3 CFDIs + 4 buyers + 4 lenders del BACKLOG §6)
    └── abis/
        └── cobraya-invoice-commitments.ts ← NEW (W2.5e, export ABI)

contracts/                  ← NEW (W2.5, Foundry project)
├── foundry.toml
├── src/CobrayaInvoiceCommitments.sol
├── test/CobrayaInvoiceCommitments.t.sol
├── script/Deploy.s.sol
└── lib/{forge-std,openzeppelin-contracts}

public/
├── manifest.json           ← NEW (W0.5)
├── icons/*.png             ← NEW (W0.5)
└── splashes/*.png          ← NEW (W0.5)

scripts/
├── generate-pwa-assets.mjs ← NEW (W0.5)
└── verify-audit-trail.js   ← NEW (W5.5, standalone Node)
```

**Regla dependencia (heredada de wasiai-agentshop)**: `app → application → infra → core`. `core` no importa de ningún otro layer.

### 3.3 Smart contract integration

```
                         cobraya-fraud-detector invoke route
                                       │
                                       ▼
       ┌───────────────────────────────────────────────────────┐
       │  commitmentHash = keccak256(                          │
       │    encodePacked(['string','string','uint256'],        │
       │      [uuidCfdi, rfcEmisor, BigInt(amountMXN)])        │
       │  )                                                    │
       └───────────────────────────────────────────────────────┘
                                       │
                                       ▼
              ┌────────────────────────────────────────┐
              │  publicClient.readContract({           │
              │    address: COBRAYA_COMMITMENTS_ADDRESS,│
              │    abi: COMMITMENTS_ABI,               │
              │    functionName: "isCommitted",        │
              │    args: [commitmentHash]              │
              │  }) → [active, ts, committer]          │
              └────────────────────────────────────────┘
                       │
              ┌────────┴─────────┐
              │ active === true  │ → return { isUnique:false, originalCommitTimestamp, originalCommitter, rejectReason }
              │ active === false │
              └────────┬─────────┘
                       ▼
              ┌────────────────────────────────────────┐
              │  walletClient.writeContract({          │
              │    address: COBRAYA_COMMITMENTS_ADDRESS,│
              │    abi: COMMITMENTS_ABI,               │
              │    functionName: "commitInvoice",      │
              │    args: [commitmentHash, bytes32(0)]  │
              │  }) → txHash                           │
              │                                        │
              │  publicClient.waitForTransactionReceipt│
              │    ({ hash:txHash, confirmations:1 })  │
              │  → blockNumber                         │
              └────────────────────────────────────────┘
                                       │
                                       ▼
       return { isUnique:true, commitTxHash, snowtraceUrl, blockNumber, timestamp }
```

**Performance O(1)**: el contract usa `mapping(bytes32 => Commitment)`, lectura via `eth_call` = direct storage slot lookup (50-200ms en Avalanche Fuji), constant regardless of chain age. Documentado completo en CONTRACT-DESIGN.md §8.5.

**Defense en profundidad**: aunque el pre-check pase por race condition microsegundos, el contract revierte `AlreadyCommitted(hash, ts, committer)` si dos commits simultáneos del mismo hash llegan en blocks consecutivos. Atomicidad del EVM. Documentado CONTRACT-DESIGN.md §8.5.

### 3.4 PWA service worker strategy

Copy del pattern `luma-ai/next.config.mjs` (verified, lines 1-91), adaptado a Cobraya:

```js
// next.config.js (post-W0.5)
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
      { urlPattern: /^https:\/\/wasiai-a2a-production\.up\.railway\.app\//,
        handler: 'NetworkOnly',
        options: { cacheName: 'wasiai-a2a-networkonly' }},
      { urlPattern: /^https:\/\/wasiai-facilitator-production\.up\.railway\.app\//,
        handler: 'NetworkOnly',
        options: { cacheName: 'wasiai-facilitator-networkonly' }},
      { urlPattern: /\/api\//,
        handler: 'NetworkOnly',
        options: { cacheName: 'cobraya-api-networkonly' }},
      // Brand assets — long-lived cache
      { urlPattern: /\/(icons|splashes)\//,
        handler: 'CacheFirst',
        options: { cacheName: 'cobraya-brand-assets',
                   expiration: { maxEntries: 32, maxAgeSeconds: 60*60*24*30 }}},
      // Document navigations — NetworkFirst with ~offline fallback
      { urlPattern: ({request, sameOrigin}) =>
            sameOrigin && request.destination === 'document',
        handler: 'NetworkFirst',
        options: { cacheName: 'documents', networkTimeoutSeconds: 3 }},
    ],
  },
});
module.exports = withPWA({ reactStrictMode: true, poweredByHeader: false });
```

**Decisión**: el archivo será `next.config.js` (CommonJS, ya existe) en lugar de `.mjs` — el pattern luma-ai es `.mjs` (ESM) pero `@ducanh2912/next-pwa` v10 soporta ambos. Mantener `.js` para evitar romper otros lugares del scaffold que asumen CommonJS.

### 3.5 Agent pricing & flow timing

**Total cost por demo run**: $0.001 + $0.005 + $0.05 + $0.01 = **$0.066 USDC** (debit per-step via WKH-59).

**Paralelización fraud + scorer**:

```
T+0s:   validator starts
T+2s:   validator done → fraud + scorer START in parallel (Promise.all)
T+5s:   fraud-detector done (RPC read + commit tx ~3s en Fuji)
T+8s:   credit-scorer done (Claude API ~6s; fallback local ~0.1s)
T+8s:   matcher starts (depends on score)
T+10s:  matcher done → UI muestra auction
T+35s:  user selects lender + signs → facilitator → confirm (~25s Fuji)
T+60s:  DONE — tx hash visible + audit trail downloadable
```

Sin paralelización: 2 + 3 + 6 + 2 = 13s antes de auction. Con: 2 + max(3,6) + 2 = 10s.

---

## 4. Waves de implementación detalladas

### W0 — Bootstrap & env (15min) — depende: nada (bloquea todo)

**Pre-flight**:
- `git branch --show-current` debe retornar `feat/wkh-cobraya-agents` (verified `71f3a65`)
- Lectura `.env.local`: confirmar `OWNER_PRIVATE_KEY`, `TREASURY_PRIVATE_KEY`, `OPERATOR_PRIVATE_KEY`, `A2A_KEY`, `WASIAI_A2A_URL`, `WASIAI_FACILITATOR_URL` no son placeholders
- `curl ${WASIAI_A2A_URL}/health` → 200
- `curl ${WASIAI_FACILITATOR_URL}/health` → 200
- `curl ${AVALANCHE_RPC_URL} -d '{"jsonrpc":"2.0","method":"eth_getBalance","params":["0x1d024Bdb20B4c3E139B8516ed6d834a9654F21cF","latest"],"id":1}'` → TREASURY ≥ 2 AVAX
- Pedir al user: copy `ANTHROPIC_API_KEY` desde wasiai-a2a `.env` a `wasiai-lendable/.env.local`
- Pedir al user: obtener `SNOWTRACE_API_KEY` desde `snowtrace.io/myapikey` y copy a `.env.local`

**Baseline check**:
- `npm install` (sin nuevas deps todavía)
- `npm run typecheck` → debe estar verde (CD-2)
- `npm run build` → debe estar verde (CD-2)
- `npm test` no aplica todavía — vitest no instalado, se agrega en W2

**Validación**: typecheck PASS + build PASS + 5 health checks PASS.

**Archivos tocados**: ninguno (solo verificaciones + completar `.env.local`).

**ACs cubiertos**: pre-requisito de todos.

---

### W0.5 — PWA scaffold mobile-first (45min) — depende: W0 · paralelo con W1

**Sub-waves del BACKLOG §3 (W0.5a-e)**:

**W0.5a — Plugin + config (10min)**:
- `npm install @ducanh2912/next-pwa@^10.2.9`
- REPLACE `next.config.js` con wrap `withPWA()` (config exacta en §3.4 arriba — copy adapt de luma-ai `next.config.mjs:1-91`)

**W0.5b — Assets PWA (10min)**:
- NEW `public/manifest.json`:
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
      {"src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any"},
      {"src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any"},
      {"src": "/icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}
    ]
  }
  ```
- NEW `scripts/generate-pwa-assets.mjs` — copy de `luma-ai/scripts/generate-pwa-assets.mjs` (7KB), apuntar a logo Cobraya en `assets/cobraya-logo.png`
- Generar los 6 PNGs en `public/icons/` (192, 512, maskable-512, apple-touch-icon-120/152/180)
- Generar splashes en `public/splashes/` (3 variantes iPhone)
- **Fallback si el script falla**: usar logo placeholder de wasiai-agentshop adaptado con SVG → PNG via Sharp en el script

**W0.5c — Offline page + SW (10min)**:
- NEW `src/app/~offline/page.tsx`:
  ```tsx
  export default function OfflinePage() {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <h1 className="serif text-3xl mb-3">Sin conexión</h1>
        <p className="text-sm text-muted mb-6">El demo determinístico sigue funcionando.</p>
        <button onClick={() => location.reload()}
                className="bg-ink text-paper px-6 py-3 mono text-xs uppercase tracking-widest">
          Reintentar
        </button>
      </main>
    );
  }
  ```
- NEW `src/components/pwa/register-sw.tsx` — copy de luma-ai
- NEW `src/components/pwa/install-prompt.tsx` — copy de luma-ai

**W0.5d — Layout metadata (10min)**:
- UPDATE `src/app/layout.tsx`:
  ```tsx
  export const metadata: Metadata = {
    title: "Cobraya · Factoraje agéntico para PyMEs",
    description: "Tu factura, líquida en 30 segundos. USDC en Avalanche.",
    manifest: "/manifest.json",
    appleWebApp: { capable: true, statusBarStyle: "default", title: "Cobraya" },
    icons: {
      icon: [{ url: "/icons/icon-192.png", sizes: "192x192" },
             { url: "/icons/icon-512.png", sizes: "512x512" }],
      apple: [{ url: "/icons/apple-touch-icon-180.png", sizes: "180x180" }],
    },
  };
  export const viewport: Viewport = {
    width: "device-width", initialScale: 1, viewportFit: "cover",
    themeColor: "#0F8B4A",
  };
  ```
- Render `<RegisterSW />` + `<InstallPrompt />` dentro del `<body>`

**W0.5e — Smoke (5min)**:
- `npm run build && npm start` → DevTools Application: manifest válido, SW registered
- Lighthouse PWA → score > 90 (CD-16)
- Toggle DevTools offline mode → recarga sirve `~offline/page.tsx` (AC-18)

**Archivos tocados**: 9 nuevos + 2 modificados.

**Tests**: T-PWA-1 (manifest JSON valid via `JSON.parse`), T-PWA-2 (offline page renders), T-PWA-3 (install-prompt no crash on no-beforeinstallprompt).

**ACs cubiertos**: AC-16 (PWA installable), AC-18 (offline fallback).

---

### W1 — Mock data + types + core domain (30min) — depende: W0 · bloquea W2..W5

**Archivos**:

- **REPLACE** `src/lib/mock-data.ts`:
  - 3 CFDIs del BACKLOG §6 (Tortillería La Esperanza, Confecciones Nayeli, Construcciones Hermanos Ruiz) con `anchorBuyer`, `paymentTermsDays`, `sector`, `uuidSat`
  - 4 buyers tier-1 (Walmart México, Bimbo, Cemex, OXXO) con `sectorAdjustment`
  - 4 lenders catalog (Bankaool Pool A, Arkangeles Fund I, BBVA SME Bridge, Konfío Express) con `bandAllowlist`, `sectorAllowlist`, `minAmountMXN`, `maxAmountMXN`, `aprPct`, `advanceRatePct`, `speedMinutes`
  - Constantes export: `BUYERS_TIER_1`, `LENDERS_CATALOG`, `MOCK_INVOICES`

- **EXTEND** `src/types/invoice.ts`:
  ```typescript
  export interface Invoice {
    // existing fields
    id: string; uuid: string; issuer: {...}; receiver: {...};
    amount: number; currency: "MXN" | "USD";
    issueDate: string; dueDate: string; status: InvoiceStatus;
    // NEW
    anchorBuyer: string;           // e.g. "Walmart México"
    paymentTermsDays: number;      // 30 | 60 | 90
    sector: "food retail" | "apparel" | "construction" | "services" | "retail";
    uuidSat?: string;              // SAT UUID alias
  }

  export interface ScoreResult {
    score: number;
    band: "A" | "B" | "C" | "D";
    advanceRatePct: number;        // 80 | 88 | 92 | 95
    aprPct: number;                // 12 | 14.5 | 18 | 25
    rationale: string;
    rationaleProvenance: "anthropic-claude-haiku-4-5" | "local-fallback";
    // oraclePromptId DEPRECATED — kept optional for backwards compat
    oraclePromptId?: string;
  }

  // NEW types — auction
  export interface AuctionLender {
    lenderId: string;
    lenderName: string;
    aprPct: number;
    advanceRatePct: number;
    estimatedSettleMinutes: number;
    netAmountUSDC: number;
    rank: number;
    qualifies: boolean;
    rejectionReason?: string;      // when qualifies=false
  }

  export interface AuctionResult {
    auction: AuctionLender[];
    recommendedLender: string | null;     // null if no qualifying
    recommendationReason: string;
  }
  ```

- **REPLACE** `src/core/scoring.ts` con BACKLOG §6 formula:
  ```typescript
  // base_score by anchor buyer tier
  function baseScoreFor(anchorBuyer: string): number {
    const buyer = BUYERS_TIER_1.find(b => b.name === anchorBuyer);
    if (buyer) return 70;
    // tier-2 not used in V1 demo — fallback "unknown"
    return 30;
  }
  function amountAdjust(amountMXN: number): number {
    if (amountMXN < 50000) return 5;
    if (amountMXN <= 200000) return 0;
    return -5;
  }
  function termsAdjust(daysToPayment: number): number {
    if (daysToPayment <= 30) return 10;
    if (daysToPayment <= 60) return 0;
    return -8;
  }
  function sectorAdjust(sector: string): number {
    return { "food retail": 5, "apparel": 3, "retail": 0,
             "services": -3, "construction": -8 }[sector] ?? 0;
  }
  export function computeScore(args: {amountMXN: number; anchorBuyer: string;
                                       paymentTermsDays: number; sector: string})
    : { score: number; band: "A"|"B"|"C"|"D"; advanceRatePct: number; aprPct: number };

  export function computeBand(score: number): "A"|"B"|"C"|"D" {
    if (score >= 80) return "A"; if (score >= 60) return "B";
    if (score >= 40) return "C"; return "D";
  }
  export function bandParams(band): { advanceRatePct, aprPct } {
    return { A:{advanceRatePct:95,aprPct:12}, B:{advanceRatePct:92,aprPct:14.5},
             C:{advanceRatePct:88,aprPct:18}, D:{advanceRatePct:80,aprPct:25} }[band];
  }
  ```

- **REPLACE** `src/core/matching.ts` con auction logic:
  ```typescript
  export function runAuction(args: { band, amountMXN, anchorBuyer, sector }): AuctionResult {
    const all = LENDERS_CATALOG.map(lender => {
      const inBand = lender.bandAllowlist.includes(args.band);
      const inSector = lender.sectorAllowlist === "all" || lender.sectorAllowlist.includes(args.sector);
      const inAmount = args.amountMXN >= lender.minAmountMXN && args.amountMXN <= lender.maxAmountMXN;
      const qualifies = inBand && inSector && inAmount;
      const rejectionReason = !inBand ? `only bands ${lender.bandAllowlist.join(",")}`
                            : !inSector ? "sector not in allowlist"
                            : !inAmount ? "amount out of range" : undefined;
      return { lender, qualifies, rejectionReason };
    });

    // Score qualifying lenders: combined = aprPct * 0.6 (lower better) + advance * 0.4 (higher better) + speedBonus
    const scored = all.map(item => {
      if (!item.qualifies) return { ...item, combinedScore: -Infinity };
      const aprScore = (30 - item.lender.aprPct);          // lower apr = higher score
      const advanceScore = item.lender.advanceRatePct;
      const speedBonus = Math.max(0, 60 - item.lender.speedMinutes) / 60;
      const combinedScore = aprScore * 0.6 + advanceScore * 0.4 + speedBonus;
      return { ...item, combinedScore };
    });

    // Rank: qualifying first, sorted by combinedScore desc; non-qualifying last (rank N+1)
    const sorted = scored.sort((a,b) => b.combinedScore - a.combinedScore);

    const auction: AuctionLender[] = sorted.map((s, idx) => ({
      lenderId: s.lender.id,
      lenderName: s.lender.name,
      aprPct: s.lender.aprPct,
      advanceRatePct: s.lender.advanceRatePct,
      estimatedSettleMinutes: s.lender.speedMinutes,
      netAmountUSDC: computeNetUSDC(args.amountMXN, s.lender),  // uses settlement.ts
      rank: idx + 1,
      qualifies: s.qualifies,
      rejectionReason: s.rejectionReason,
    }));

    const winner = auction.find(a => a.qualifies);
    return {
      auction,
      recommendedLender: winner?.lenderId ?? null,
      recommendationReason: winner
        ? `Best combined APR-advance for band ${args.band} ${args.sector}`
        : `No lender qualifies for band ${args.band} sector ${args.sector}`,
    };
  }
  ```

- **UPDATE** `src/infra/env.ts` con Zod schema opcional:
  - Borrar `ORACLE_ENDPOINT`, `ORACLE_API_KEY`
  - Agregar: `TREASURY_PRIVATE_KEY`, `OWNER_ADDRESS`, `FRAUD_DETECTOR_PRIVATE_KEY`, `COBRAYA_COMMITMENTS_ADDRESS`, `ONCHAIN_AMOUNT_CAP_USDC`, `ANTHROPIC_API_KEY?`, `VALIDATOR_HOT_KEY`, `FRAUD_HOT_KEY`, `SCORER_HOT_KEY`, `MATCHER_HOT_KEY`, `AVALANCHE_RPC_URL`
  - **NO bloquear si Zod parse falla en demo mode** — log warning + continúa con fallback

- **UPDATE** `src/infra/mock-adapter.ts` — agregar `mockFraudCheck()` (siempre `isUnique:true` con fake tx hash) y `mockAuction()` (retorna `AuctionResult` con datos del BACKLOG §6 por CFDI)

- **NEW** `src/app/api/marketplace/route.ts` (copy pattern wasiai-agentshop `marketplace/route.ts:1-157` + adapt):
  - `COBRAYA_SLUGS = ["cobraya-cfdi-validator","cobraya-fraud-detector","cobraya-credit-scorer","cobraya-lender-matcher"]`
  - GET → fetch `${A2A_URL}/discover?capabilities=invoice-factoring&limit=10` con header `x-a2a-key`
  - Filter por slug allowlist
  - Static fallback con 4 entries `payment.chain="avalanche-fuji"`, `payment.asset="USDC"`, prices $0.001/$0.005/$0.05/$0.01
  - Return `{agents, totalEstimatedFee:0.066, ..., trace}`

- **Install test runner**: `npm install --save-dev vitest @vitest/ui @testing-library/react @testing-library/jest-dom jsdom` (necesario para W2+ tests)
- Add `test`, `test:watch` scripts en `package.json`
- NEW `vitest.config.ts` con jsdom env + path alias `@/*` → `src/*`

**Tests** (vitest):
- `tests/unit/core/scoring.test.ts`:
  - T-SCORING-1: Tortillería La Esperanza (Walmart, $48,500, 60d, food retail) → score=74, band=B
  - T-SCORING-2: Confecciones Nayeli (Bimbo, $28,200, 30d, apparel) → score=82, band=A
  - T-SCORING-3: Construcciones Hermanos Ruiz (Cemex, $156,800, 90d, construction) → score=58, band=C
  - T-SCORING-4: unknown buyer → score < 40, band=D
- `tests/unit/core/matching.test.ts`:
  - T-MATCHING-1: band B food retail $48.5K → rank 1 Arkangeles, rank 2 Bankaool, rank 3 Konfío, BBVA disqualified (band)
  - T-MATCHING-2: band A apparel $28.2K → rank 1 Bankaool, rank 2 Arkangeles, BBVA disqualified (amount), Konfío disqualified (band)
  - T-MATCHING-3: band C construction $156.8K → solo Konfío qualifies, recommendedLender = "lender-konfio"
- `tests/unit/api/marketplace.test.ts`:
  - T-MARKETPLACE-1: GET /api/marketplace returns 4 cobraya-* slugs (mock fetch)
  - T-MARKETPLACE-2: a2a fetch falla → static fallback con 4 entries

**Archivos tocados**: 6 reemplazos/extensiones + 1 nuevo (marketplace route) + 3 nuevos test files + vitest config + package.json.

**ACs cubiertos**: AC-3 (determinismo scoring), AC-9-v2 (marketplace 4 agents).

---

### W2 — cobraya-cfdi-validator agent ($0.001) (30min) — depende: W1

**Archivos**:

- **NEW** `src/app/api/agents/cobraya-cfdi-validator/invoke/route.ts`:
  ```typescript
  // POST shape (input):  { uuidCfdi, rfcEmisor, amountMXN, anchorBuyer }
  // POST shape (output): { isCompliant, anchorBuyerTier, policyId,
  //                        duplicateCheck: "clean"|"duplicate", signedAt, receipt? }
  // Logic:
  //   1. Validate uuidCfdi format (regex UUID v1-v5)
  //   2. Validate amountMXN > 0
  //   3. Check anchorBuyer in BUYERS_TIER_1 → anchorBuyerTier=1 else "unknown"
  //   4. Check duplicate via in-memory Set<uuidCfdi> (module-level, persists across requests in same process)
  //   5. isCompliant = (uuid valid) && (amount > 0) && (anchorBuyerTier === 1) && (duplicateCheck === "clean")
  //   6. policyId = `cobraya-tier-${anchorBuyerTier}-${sector ?? "any"}-2026`
  //   7. Sign EIP-712 receipt con VALIDATOR_HOT_KEY (W5.5 — initially stubbed)
  //   8. Return shape
  ```
  - Validar body con Zod: missing fields → 400
  - In-memory `Set<string>` para duplicate check (DT-B: suficiente para demo)

- **UPDATE** `src/application/validate-invoice.ts` para invocar el route local en lugar de a2a directo (será wrapped por a2a en W7 via compose, pero el endpoint vive aquí)

**Tests** (vitest):
- `tests/unit/api/cfdi-validator.test.ts`:
  - T-CFDI-1: happy path (Walmart, valid UUID, amount > 0) → `{isCompliant:true, anchorBuyerTier:1}`
  - T-CFDI-2: unknown buyer "AcmeCorp" → `{isCompliant:false, anchorBuyerTier:"unknown"}`
  - T-CFDI-3: invalid UUID format → 400
  - T-CFDI-4: amount = 0 → `{isCompliant:false}` con reason
  - T-CFDI-5: duplicate UUID (segundo POST con misma UUID) → `{duplicateCheck:"duplicate", isCompliant:false}`

**Archivos tocados**: 1 nuevo route + 1 update use case + 1 test file.

**ACs cubiertos**: AC-1 step 1, base de AC-13 (receipt step 0).

---

### W2.5 — cobraya-fraud-detector + Solidity Foundry deploy (2h) — depende: W2

Sub-waves del BACKLOG §3 + CONTRACT-DESIGN.md §8:

**W2.5a — Foundry init (20min)**:
```bash
cd wasiai-lendable && mkdir contracts && cd contracts
forge init --no-commit --no-git
forge install OpenZeppelin/openzeppelin-contracts --no-commit
```
- NEW `contracts/foundry.toml` — copy CONTRACT-DESIGN.md §5 exacto:
  - `solc_version = "0.8.24"`, `optimizer = true`, `optimizer_runs = 200`
  - `remappings = ["@openzeppelin/=lib/openzeppelin-contracts/"]`
  - `[rpc_endpoints] avalanche fuji`
  - `[etherscan] fuji = { key = "${SNOWTRACE_API_KEY}", url = "https://api-testnet.snowtrace.io/api" }`
- `forge build` → debe pasar (vacío en este momento)

**W2.5b — Contract (30min)**:
- NEW `contracts/src/CobrayaInvoiceCommitments.sol` — copy CONTRACT-DESIGN.md §3 exacto:
  - `pragma solidity ^0.8.24`
  - `import "@openzeppelin/contracts/access/Ownable2Step.sol"`
  - `enum CommitmentStatus { None, Active, Released }`
  - `struct Commitment { committer; committedAt; status; metadataPointer }`
  - `mapping(bytes32 => Commitment) public commitments`
  - `mapping(address => bool) public authorizedCommitters`
  - Custom errors: `ZeroAddress, ZeroHash, NotAuthorized(caller), AlreadyCommitted(hash, originalTimestamp, originalCommitter), NotCommitted(hash), InvalidStatus(hash, current), NotCommitter(caller, actualCommitter)`
  - Events: `InvoiceCommitted, InvoiceReleased, CommitterAuthorized`
  - Modifier `onlyAuthorized`
  - Constructor `(address initialCommitter) Ownable(msg.sender)` — auto-authorize
  - `setAuthorizedCommitter(address, bool) external onlyOwner`
  - `commitInvoice(bytes32 hash, bytes32 metadata) external onlyAuthorized`
  - `releaseInvoice(bytes32 hash) external` (only committer o owner)
  - `isCommitted(bytes32) external view returns (bool, uint64, address)`
  - `getCommitment(bytes32) external view returns (Commitment memory)`
  - **NO ReentrancyGuard** — storage-only, documentado en comment (DT del CONTRACT-DESIGN §3)

**W2.5c — Tests (30min)**:
- NEW `contracts/test/CobrayaInvoiceCommitments.t.sol` — copy CONTRACT-DESIGN.md §6 exacto. Mínimo 11 tests:
  - 2 constructor (auto-authorize, revert ZeroAddress)
  - 5 commitInvoice (happy, AlreadyCommitted, NotAuthorized, ZeroHash, owner can commit)
  - 4 releaseInvoice (happy, NotCommitted, AlreadyReleased, OnlyCommitterOrOwner)
  - 1 setAuthorizedCommitter (only owner)
  - 1 gas snapshot (`assertLt(gasUsed, 80_000)` — CD-11)
- `forge test -vv` → ALL PASS
- `forge coverage --report summary` → 100% lines/branches/funcs (CD-13)
- `forge test --gas-report` → commitInvoice < 80K gas (CD-11, target interno < 60K)

**W2.5d — Deploy (20min)**:
- NEW `contracts/script/Deploy.s.sol` — copy CONTRACT-DESIGN.md §7 exacto:
  ```solidity
  contract DeployCommitments is Script {
    function run() external returns (address) {
      uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
      address initialCommitter = vm.envAddress("FRAUD_DETECTOR_AGENT_WALLET");
      vm.startBroadcast(deployerKey);
      CobrayaInvoiceCommitments commitments = new CobrayaInvoiceCommitments(initialCommitter);
      vm.stopBroadcast();
      console.log("CobrayaInvoiceCommitments deployed at:", address(commitments));
      return address(commitments);
    }
  }
  ```
- Verify `.env.local` tiene `DEPLOYER_PRIVATE_KEY` y `FRAUD_DETECTOR_AGENT_WALLET` (ya están — usa TREASURY V1)
- Run:
  ```bash
  source ../.env.local
  forge script script/Deploy.s.sol:DeployCommitments \
    --rpc-url fuji --broadcast --verify \
    --etherscan-api-key $SNOWTRACE_API_KEY -vvv
  ```
- **Fallback CD-14**: si `--verify` falla con Snowtrace key, intentar `--verifier sourcify`. Si también falla, manual upload via Snowtrace UI (anti-CD-14 fallback solo si todo lo demás falla — documentar en PRODUCTION-EVIDENCE.md)
- Save `COBRAYA_COMMITMENTS_ADDRESS=0x...` en `.env.local`
- Update `doc/PRODUCTION-EVIDENCE.md §3` con deploy tx hash + Snowtrace verify URL + contract address

**W2.5e — Agent endpoint (20min)**:
- NEW `src/lib/abis/cobraya-invoice-commitments.ts` — export `COMMITMENTS_ABI` como `const` desde `contracts/out/CobrayaInvoiceCommitments.sol/CobrayaInvoiceCommitments.json`
- NEW `src/app/api/agents/cobraya-fraud-detector/invoke/route.ts` — pseudocode de CONTRACT-DESIGN.md §9:
  ```typescript
  // Input: { uuidCfdi, rfcEmisor, amountMXN }
  // Output happy: { isUnique:true, commitmentHash, commitTxHash, snowtraceUrl,
  //                 blockNumber, timestamp, receipt? }
  // Output dup:   { isUnique:false, commitmentHash, originalCommitTimestamp,
  //                 originalCommitter, rejectReason:"INVOICE_ALREADY_COMMITTED", receipt? }
  // Logic:
  //   - commitmentHash = keccak256(encodePacked(['string','string','uint256'], [...]))
  //   - publicClient.readContract({...isCommitted}) → [active, ts, committer]
  //   - active=true → return isUnique:false
  //   - else walletClient.writeContract({...commitInvoice with FRAUD_DETECTOR_PRIVATE_KEY})
  //          + waitForTransactionReceipt(confirmations:1)
  //   - Sign EIP-712 receipt con FRAUD_HOT_KEY
  //   - DEMO MODE: si isDemoMode() → mockFraudCheck() (siempre isUnique:true con fake hash)
  ```
- Chain: `avalancheFuji` desde `viem/chains`
- RPC: `process.env.AVALANCHE_RPC_URL` con `http()` transport

**W2.5f — Smoke + evidence (15min)**:
- 3 demo runs E2E → 3 distinct commit tx hashes capturados
- Update PRODUCTION-EVIDENCE.md con todos los hashes + Snowtrace URLs

**Tests** (vitest mocked):
- `tests/unit/api/fraud-detector.test.ts`:
  - T-FRAUD-1: nuevo UUID → mock `readContract` returns `[false,0,0x0]` → mock `writeContract` returns tx hash → response `isUnique:true`
  - T-FRAUD-2: UUID ya committed → mock `readContract` returns `[true, 12345, 0xABC]` → response `isUnique:false` SIN writeContract call
  - T-FRAUD-3: zero hash → 400 con error
  - T-FRAUD-4: RPC error → 502 con `rejectReason:"NETWORK_ERROR"` + UI fallback (NO break demo)
- Foundry tests (W2.5c) ya cubren contract-side.

**Archivos tocados**: 6 nuevos (Solidity x3 + foundry.toml + ABI + agent route) + 1 test + .env.local update + PRODUCTION-EVIDENCE update.

**ACs cubiertos**: AC-1 step 2, AC-12 (fraud-detection blocks doble-cesión), AC-10 (3+ tx hashes documentados).
**CDs cubiertos**: CD-11 (gas <80K), CD-13 (coverage 100%), CD-14 (forge verify automated), CD-15 (custom errors con params).

---

### W3 — cobraya-credit-scorer + Claude API (90min) — depende: W1

**Archivos**:

- **NEW** `src/infra/llm-client.ts` — DT-E (direct fetch, no SDK):
  ```typescript
  const FALLBACK_TEMPLATES: Record<"A"|"B"|"C"|"D", string> = {
    A: 'Factura emitida a anchor buyer tier-1 con plazo corto y sector de bajo riesgo. Banda A indica perfil crediticio sólido y riesgo de default mínimo.',
    B: 'Anchor buyer tier-1 con plazo medio y sector estable. Banda B refleja buen perfil con consideraciones de plazo de pago.',
    C: 'Anchor buyer aceptable pero con plazos largos o sector de mayor riesgo. Banda C amerita spread adicional.',
    D: 'Perfil con varios factores de riesgo. Banda D requiere análisis caso por caso.',
  };

  export async function generateRationale(args: {
    band: "A"|"B"|"C"|"D"; score: number; amountMXN: number;
    anchorBuyer: string; paymentTermsDays: number; sector: string;
  }): Promise<{ rationale: string; provenance: "anthropic-claude-haiku-4-5" | "local-fallback" }> {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key || key.startsWith("COPY_FROM_") || key.startsWith("set-me")) {
      return { rationale: FALLBACK_TEMPLATES[args.band], provenance: "local-fallback" };
    }
    try {
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
          messages: [{
            role: "user",
            content: `You are a credit analyst at a Mexican factoring fintech. ...` // BACKLOG §6 prompt
          }],
        }),
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) throw new Error(`Anthropic ${res.status}`);
      const data = await res.json();
      const text = data?.content?.[0]?.text ?? FALLBACK_TEMPLATES[args.band];
      return { rationale: text, provenance: "anthropic-claude-haiku-4-5" };
    } catch {
      return { rationale: FALLBACK_TEMPLATES[args.band], provenance: "local-fallback" };
    }
  }
  ```

- **NEW** `src/app/api/agents/cobraya-credit-scorer/invoke/route.ts`:
  ```typescript
  // Input: { amountMXN, anchorBuyer, paymentTermsDays, sector }
  // Output: { score, band, advanceRatePct, aprPct, rationale, rationaleProvenance, receipt? }
  // Logic:
  //   1. computeScore() from core/scoring.ts (determinista)
  //   2. computeBand + bandParams
  //   3. generateRationale() from llm-client.ts (Claude o fallback)
  //   4. Sign EIP-712 receipt con SCORER_HOT_KEY
  ```

- **UPDATE** `src/application/score-invoice.ts` para usar el endpoint local

- **DELETE** `src/infra/oracle-client.ts`

**Tests**:
- `tests/unit/api/credit-scorer.test.ts`:
  - T-SCORER-1: 2 invocations misma input → mismo `score` y mismo `band` (AC-3 determinismo)
  - T-SCORER-2: band A input → score=82, band=A, advanceRatePct=95, aprPct=12
  - T-SCORER-3: band B input → score=74, band=B, advanceRatePct=92, aprPct=14.5
  - T-SCORER-4: band C input → score=58, band=C, advanceRatePct=88, aprPct=18
- `tests/unit/infra/llm-client.test.ts`:
  - T-LLM-1: ANTHROPIC_API_KEY missing → returns fallback con `provenance:"local-fallback"`
  - T-LLM-2: fetch mock returns 200 con content → returns Claude text con `provenance:"anthropic-claude-haiku-4-5"`
  - T-LLM-3: fetch mock returns 500 → falls back con `provenance:"local-fallback"` (no throw)
  - T-LLM-4: timeout 5s → falls back

**Archivos tocados**: 1 nuevo infra + 1 nuevo route + 1 update use case + 1 delete + 2 tests.

**ACs cubiertos**: AC-1 step 3, AC-3 (determinismo), AC-4 (Claude opcional con fallback).

---

### W4 — cobraya-lender-matcher con auction (60min) — depende: W3

**Archivos**:

- **NEW** `src/app/api/agents/cobraya-lender-matcher/invoke/route.ts`:
  ```typescript
  // Input: { band, amountMXN, anchorBuyer, sector }
  // Output: AuctionResult (definida en src/types/invoice.ts W1)
  //   { auction: AuctionLender[], recommendedLender, recommendationReason, receipt? }
  // Logic:
  //   1. runAuction() from core/matching.ts (determinista)
  //   2. Sign EIP-712 receipt con MATCHER_HOT_KEY
  ```

- **UPDATE** `src/application/match-lender.ts` para usar el endpoint local

**Tests**:
- `tests/unit/api/lender-matcher.test.ts`:
  - T-MATCHER-1: caso 1 (band B food retail $48.5K 60d) → auction[1].lenderId === "lender-arkangeles-i", auction[1].rank===1, recommendedLender==="lender-arkangeles-i"
  - T-MATCHER-2: caso 2 (band A apparel $28.2K 30d) → rank 1 Bankaool, BBVA `qualifies:false, rejectionReason:"amount out of range"`
  - T-MATCHER-3: caso 3 (band C construction $156.8K 90d) → solo Konfío `qualifies:true`, recommendedLender==="lender-konfio", Arkangeles `qualifies:false, rejectionReason:"sector not in allowlist"`
  - T-AUCTION-1: response shape exact (N≥3, each item has all required fields, rank monotonic)
  - T-AUCTION-2: 2 invocations same input → identical ordering (determinismo, AC-3)

**Archivos tocados**: 1 nuevo route + 1 update use case + 1 test.

**ACs cubiertos**: AC-1 step 4, AC-2-v2 (auction shape).

---

### W5 — EIP-3009 server-side + /settle (60min) — depende: W4

**Archivos**:

- **NEW** `src/infra/eip3009-signer.ts` (copy pattern wasiai-agentshop `eip3009-signer.ts:1-114` + adapt):
  - Chain: `avalancheFuji` from `viem/chains` (chainId 43113)
  - Asset: USDC at `process.env.USDC_ADDRESS` (Fuji: `0x5425890298aed601595a70AB815c96711a31Bc65`)
  - Signer: `TREASURY_PRIVATE_KEY` (DT-F: server-side only, NEVER browser)
  - Domain: `{ name: "USDC", version: "2", chainId: 43113, verifyingContract: USDC_ADDRESS }` — **NOTE**: para Circle USDC en Fuji el name es "USD Coin" / version "2" del actual contract. Verificar via Snowtrace `name()` y `version()` del USDC contract antes de firmar — si discrepa, usar valores correctos.
  - Function `signTransferAuthorization({to, valueOnchain, timeoutSeconds=300})` returns `SignedAuthorization`

- **REPLACE** `src/app/api/settle/route.ts`:
  ```typescript
  // Input: { match: AuctionLender, smeWalletOverride?: 0x... }
  // Output: { receipt: SettlementReceipt, traces: TraceEvent[] }
  // Logic:
  //   1. Validar amount via auction match
  //   2. CAP CHECK: if (amount > ONCHAIN_AMOUNT_CAP_USDC) → 422 con
  //        { error: "cap_exceeded", testnetCapUSDC, requestedUSDC,
  //          message: "testnet cap — mainnet would settle full $X" }
  //      AC-7 + CD-5
  //   3. server-side sign EIP-3009 con TREASURY_PRIVATE_KEY (NEVER expose to client)
  //   4. POST wasiai-facilitator /settle (via facilitator-client.ts existente)
  //   5. Return { receipt, traces } con section 03 (sign) + 04 (settle)
  ```

- **UPDATE** `src/application/settle-factoring.ts` para usar el flow correcto

**Tests**:
- `tests/unit/infra/eip3009-signer.test.ts`:
  - T-EIP3009-1: sign genera typed data con domain correcto (chainId 43113, verifyingContract USDC)
  - T-EIP3009-2: nonce es 32-byte random (no colisión entre 2 firmas consecutivas)
  - T-EIP3009-3: validBefore = now + 300s default
- `tests/unit/api/settle.test.ts`:
  - T-SETTLE-1: happy path amount < cap → 200 con `txHash` real (mock facilitator)
  - T-SETTLE-2: amount = $0.06 > cap $0.05 → 422 con `error:"cap_exceeded"` (AC-7)
  - T-SETTLE-3: facilitator returns 500 → 502 con error (no crash)
  - T-SETTLE-4: TREASURY_PRIVATE_KEY missing → 500 + `server-config-error` (no expose key in error message — CD-9)

**Archivos tocados**: 1 nuevo signer + 1 replace route + 1 update use case + 2 tests.

**ACs cubiertos**: AC-5 (EIP-3009 server-side), AC-6 (tx hash + Snowtrace), AC-7 (cap rejection).
**CDs cubiertos**: CD-5 (cap honored), CD-9 (no key leak).

---

### W5.5 — Audit trail + signed receipts (45min) — depende: W5

**Archivos**:

- **NEW** `src/types/audit-trail.ts` — TS types exactos de AUDIT-TRAIL-SCHEMA.md §2:
  - `AuditTrail` con `schemaVersion="1.0.0"`, `requestId` (UUID v4), `startedAt/completedAt` ISO-8601, `totalLatencyMs`, `invoice`, `steps: AuditStep[]`, `settlement: AuditSettlement | null`, `totalCostUSDC`, `trailHashSHA256`
  - `AuditStep` con `stepIndex`, `agentSlug`, `agentName`, `priceUsdc`, `agentSigner`, `input/output`, `success/error`, `latencyMs`, `receipt` (EIP-712 typed data + signature), `onchain` nullable
  - `AuditSettlement` con `authorization` (EIP-3009 typed data), `signature`, `txHash`, `blockNumber`, `snowtraceUrl`, `deliveredAmountUSDC`, `facilitatorUrl`

- **NEW** `src/infra/agent-signer.ts` — EIP-712 helper con hot keys per-agent:
  ```typescript
  const DOMAIN = { name: "Cobraya", version: "1", chainId: 43113 };  // CD-12
  const TYPES = {
    Receipt: [
      { name: "agentSlug", type: "string" },
      { name: "stepIndex", type: "uint256" },
      { name: "inputHash", type: "bytes32" },
      { name: "outputHash", type: "bytes32" },
      { name: "startedAt", type: "uint256" },
      { name: "priceUsdc", type: "uint256" },
    ],
  };

  function getHotKey(agentSlug: string): `0x${string}` {
    const map = {
      "cobraya-cfdi-validator": process.env.VALIDATOR_HOT_KEY,
      "cobraya-fraud-detector": process.env.FRAUD_HOT_KEY,
      "cobraya-credit-scorer":  process.env.SCORER_HOT_KEY,
      "cobraya-lender-matcher": process.env.MATCHER_HOT_KEY,
    };
    const key = map[agentSlug];
    if (!key) throw new Error(`No hot key for ${agentSlug}`);
    return key as `0x${string}`;
  }

  export async function signReceipt(args: {
    agentSlug: string; stepIndex: number; input: object; output: object;
    startedAt: number; priceUsdc: number;
  }): Promise<{ domain, types, primaryType:"Receipt", message, signature }> {
    const account = privateKeyToAccount(getHotKey(args.agentSlug));
    const client = createWalletClient({ account, chain: avalancheFuji, transport: http() });
    const inputHash = keccak256(stringToBytes(JSON.stringify(args.input)));
    const outputHash = keccak256(stringToBytes(JSON.stringify(args.output)));
    const message = {
      agentSlug: args.agentSlug,
      stepIndex: BigInt(args.stepIndex),
      inputHash, outputHash,
      startedAt: BigInt(args.startedAt),
      priceUsdc: BigInt(Math.round(args.priceUsdc * 1e6)),
    };
    const signature = await client.signTypedData({
      account, domain: DOMAIN, types: TYPES, primaryType: "Receipt", message,
    });
    return { domain: DOMAIN, types: TYPES, primaryType: "Receipt", message, signature };
  }
  ```
- **Hot key generation** (one-time): script ad-hoc en W5.5 setup:
  ```bash
  node -e "const {generatePrivateKey} = require('viem/accounts'); console.log(generatePrivateKey())"
  # Run 4 veces, copy a .env.local: VALIDATOR_HOT_KEY, FRAUD_HOT_KEY, SCORER_HOT_KEY, MATCHER_HOT_KEY
  ```

- **NEW** `src/app/api/audit-trail/[requestId]/route.ts`:
  - In-memory `Map<requestId, AuditTrail>` (DT-B: demo-only persistence)
  - Cada agent endpoint en W2/W2.5/W3/W4/W5 deposita su step en este map
  - GET handler → return JSON con headers:
    ```
    Content-Type: application/json
    Content-Disposition: attachment; filename="cobraya-audit-{requestId}.json"
    ```

- **NEW** `src/components/AuditPanel.tsx` (UI lateral bottom-sheet) — render trail building en tiempo real

- **NEW** `scripts/verify-audit-trail.js` standalone Node (CD-13: NO importa nada de Cobraya, solo `viem` o `ethers`):
  ```javascript
  #!/usr/bin/env node
  // Usage: node scripts/verify-audit-trail.js <audit.json>
  const { recoverTypedDataAddress, createPublicClient, http } = require('viem');
  const { avalancheFuji } = require('viem/chains');
  // ... read JSON, recover address per step, verify against agentSigner field
  // ... fetch onchain tx receipt for fraud-detector step + settlement
  // ... recompute sha256 of trail (minus trailHashSHA256), compare
  // Print "ALL CHECKS PASSED" or list failures
  ```

- **WIRE** cada agent endpoint (W2, W2.5e, W3, W4) para llamar `signReceipt()` ANTES de return + push al audit-trail map con `requestId` (pasado en header `x-cobraya-request-id` desde el orchestrator)

**Tests**:
- `tests/unit/types/audit-trail.test.ts`:
  - T-AUDIT-1: schema válido — instancia con `JSON.parse` cumple TS types
- `tests/unit/infra/agent-signer.test.ts`:
  - T-AUDIT-2: signReceipt → `recoverTypedDataAddress` returns `privateKeyToAccount(VALIDATOR_HOT_KEY).address`
  - T-AUDIT-3: domain incluye chainId 43113 (CD-12)
- `tests/unit/api/audit-trail-download.test.ts`:
  - T-AUDIT-4: GET /api/audit-trail/{id} retorna JSON con header `Content-Disposition: attachment`
- E2E manual (W7): correr 1 demo run + `node scripts/verify-audit-trail.js downloaded.json` → "ALL CHECKS PASSED"

**Archivos tocados**: 3 nuevos infra/types + 1 nuevo route + 1 nuevo component + 1 nuevo script + 4 wires + 3 tests.

**ACs cubiertos**: AC-13 (audit trail + offline verify).
**CDs cubiertos**: CD-12 (EIP-712 domain strict), CD-13 (standalone verify).

---

### W6 — Mobile-first UI translation (120min) — depende: W2..W5.5

**Archivos**:

- **NEW** `src/components/BrandIcon.tsx` — SVG inline 56x56 con palette Cobraya (verde `#0F8B4A`). Pattern copy de `wasiai-agentshop/src/components/BrandIcon.tsx:1-30`, cambiar fill rect a `#0F8B4A` y glyph (no Avalanche-red triangle, sí algo más Cobraya — usar inicial "C" o glyph factura).

- **NEW** `src/types/trace.ts` — copy de `wasiai-agentshop/src/types/trace.ts` (TraceEvent + TraceSection types)

- **NEW** `src/components/TraceConsole.tsx` — copy pattern wasiai-agentshop `TraceConsole.tsx:1-80+`, adapt:
  - Sections: 00 marketplace, 02 agents (4 calls), 03 sign, 04 settle
  - Mobile: collapsible bottom sheet via `<details>` o lib `vaul` opcional
  - Tap-to-expand cada section

- **NEW** `src/components/InvoicePicker.tsx` — copy pattern `wasiai-agentshop/src/components/RemittancePicker.tsx:1-50+`, adapt:
  - 3 MOCK_INVOICES cards full-width vertical stack (NO `md:grid-cols-3`, solo `grid-cols-1`)
  - Tap-to-select
  - Cada card muestra: PyME name + flag + anchor buyer + amount MXN + payment terms + expected band hint

- **NEW** `src/components/LenderAuctionPanel.tsx` (v2 UI clave) — visual con 4 lenders bidding:
  - Render `AuctionResult.auction[]` vertical stack
  - Cada card: lender name + APR + advance + speed + netAmountUSDC + rank badge + `qualifies` indicator (star si rank===1 && qualifies, gray-out si !qualifies con `rejectionReason` tooltip)
  - Touch target ≥48px (CD-18 mobile, ≥44px Apple HIG)
  - Animaciones entrance < 200ms (Material guidelines)
  - User tap-to-select recommended → set as `selectedMatch` state

- **REPLACE** `src/components/PipelineProgress.tsx` (existente):
  - 4 steps en lugar de 3
  - Mobile vertical stepper (no horizontal bar)
  - Cada step: icon (large) + label + hint + state (WAITING/RUNNING/DONE/REJECTED) + child detalles (score for scorer, tx hash for fraud-detector)
  - Pattern copy de wasiai-agentshop `PipelineProgress.tsx` (verified head 1-60)

- **REPLACE** `src/components/Settlement.tsx`:
  - Mobile-first full-screen sheet en éxito
  - Tx hash copyable (CopyButton)
  - Snowtrace link button bottom-anchored
  - "Descargar audit trail" CTA secundario
  - "Sign & Settle" CTA primario sticky bottom (safe-area-inset-bottom)

- **NEW** `src/components/CopyButton.tsx` — copy exacto de wasiai-agentshop
- **NEW** `src/components/InfoTooltip.tsx` — copy exacto de wasiai-agentshop

- **REPLACE** `src/app/page.tsx`:
  - Mobile-first hero "Tu factura, líquida en 30 segundos"
  - Narrativa Lupita Tortillería La Esperanza → Walmart
  - CTA grande "Probar el demo" → `/demo`
  - Sin "Oracle GenAI" mention (CD anti-drift)
  - Production proof: wasiai.io live + 1,660+ tests + Kite Hack submission

- **REPLACE** `src/app/demo/page.tsx`:
  - 4 phases mobile-first (BACKLOG §3 W6):
    - **Phase 0**: GET /api/marketplace, render `<MarketplaceList>` (4 cobraya-* cards vertical)
    - **Phase 1**: `<InvoicePicker>` selección
    - **Phase 2**: 4 /compose calls:
      ```typescript
      // Phase 2 orchestration pseudocode
      const requestId = crypto.randomUUID();
      // Step 1 serial
      const validatorRes = await fetch("/api/agents/cobraya-cfdi-validator/invoke", {
        method:"POST",
        headers:{"x-cobraya-request-id":requestId,"Content-Type":"application/json"},
        body: JSON.stringify({uuidCfdi, rfcEmisor, amountMXN, anchorBuyer})
      });
      setValidator(await validatorRes.json());

      // Steps 2+3 parallel (DT-J)
      const [fraudRes, scorerRes] = await Promise.all([
        fetch("/api/agents/cobraya-fraud-detector/invoke", {...}),
        fetch("/api/agents/cobraya-credit-scorer/invoke", {...}),
      ]);
      setFraud(await fraudRes.json());
      setScore(await scorerRes.json());

      // Step 4 serial
      const matcherRes = await fetch("/api/agents/cobraya-lender-matcher/invoke", {
        body: JSON.stringify({band: score.band, amountMXN, anchorBuyer, sector})
      });
      setAuction(await matcherRes.json());
      ```
      - PipelineProgress vertical stepper
      - TraceConsole bottom sheet expandable
      - AuditPanel bottom sheet con badge counter
      - LenderAuctionPanel visible al final
    - **Phase 3**: Sign & Settle
      - User taps "Sign & Settle" → POST /api/settle con selectedMatch
      - Settlement full-screen sheet con tx hash + Snowtrace + audit download
  - Mobile UX rules: `safe-area-inset-bottom`, animaciones <200ms, viewport meta full-bleed

- **DELETE** `src/components/UploadInvoice.tsx`

**Tests**:
- `tests/unit/components/InvoicePicker.test.tsx`:
  - T-UI-PICKER-1: renderiza 3 cards (verificar MOCK_INVOICES.length)
- `tests/unit/components/LenderAuctionPanel.test.tsx`:
  - T-UI-AUCTION-1: 3 lenders qualifying renders 3 cards visibles
  - T-UI-AUCTION-2: rank 1 con `qualifies:true` muestra star
  - T-UI-AUCTION-3: lender con `qualifies:false` muestra grayed out
- `tests/unit/components/AuditPanel.test.tsx`:
  - T-UI-AUDIT-1: panel renderiza N steps + download CTA
- Visual manual: DevTools mobile 393x852 → no horizontal scroll, touch targets ≥44px (AC-17)

**Archivos tocados**: 8 nuevos components + 1 nuevo type + 2 replaces + 1 delete + 4 tests.

**ACs cubiertos**: AC-1 orquestación, AC-15 (auction visual), AC-17 (mobile-first responsive), AC-13 (audit UI).
**CDs cubiertos**: CD-18 (no desktop-only).

---

### W7 — Register 4 agents en v2 + smoke E2E (60min) — depende: W6

**Pasos**:

1. **SQL INSERT en wasiai-v2 Supabase** (4 agents):
   ```sql
   -- 4 rows en `agents` table
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

2. **Deploy Vercel preview** con env vars completas (la lista de §3.2 expanded). Validar:
   - `NEXT_PUBLIC_DEMO_MODE=false`
   - Todos los private keys + COBRAYA_COMMITMENTS_ADDRESS + ANTHROPIC_API_KEY + hot keys configurados

3. **Smoke E2E 3 runs** con `NEXT_PUBLIC_DEMO_MODE=false`:
   - Run 1: Tortillería La Esperanza → tx hash A en Snowtrace
   - Run 2: Confecciones Nayeli → tx hash B
   - Run 3: Construcciones Hermanos Ruiz → tx hash C
   - Capturar 3 audit trail JSONs distintos
   - Validar en cada run:
     - GET /api/marketplace returns 4 cobraya-* agents
     - POST /compose × 4 cada uno debita el priceUsdc correcto del A2A_KEY budget
     - Total debit per run = $0.066 USDC (verificable en wasiai-a2a admin)
     - fraud-detector commit tx visible en Snowtrace Fuji
     - /settle produce real tx hash en Snowtrace
     - Audit trail JSON descargable + `scripts/verify-audit-trail.js` → "ALL CHECKS PASSED"

4. **Update `doc/PRODUCTION-EVIDENCE.md`** con:
   - Contract deploy tx hash (W2.5d) + Snowtrace verify URL
   - 3 commit tx hashes de fraud-detector (1 per run)
   - 3 settle tx hashes (1 per run)
   - 3 audit trail JSONs path (committed to repo o gist)

**Archivos tocados**: 0 src files. Solo SQL INSERT remote + PRODUCTION-EVIDENCE.md update.

**ACs cubiertos**: AC-2-v2 ($0.066 debit), AC-9-v2 (4 cobraya-* en /discover), AC-10 (3+ tx hashes), AC-11 (smoke E2E pass).

---

### [Nota] W8 — Video production (6-8h manual)

NO va en F3. Es trabajo manual del user sábado 14:00-22:00 + domingo madrugada submission. Cubre AC-14.

---

## 5. Decisiones técnicas (DT-N)

Heredadas del work-item:

- **DT-A** — Debit step-by-step via wasiai-a2a `/compose` (WKH-59 pricing real). NO `/orchestrate` con placeholder.
- **DT-B** — Cache in-memory (`Map<>` y `Set<>`) para duplicate UUIDs + audit trail buffer. Sin Redis en demo.
- **DT-C** — `rationale` puede variar (LLM non-deterministic) pero `score/band` 100% deterministas. Tests verifican score/band, no rationale.
- **DT-D** — fraud-detector hace pre-check `eth_call isCommitted` (O(1) sin gas) antes de `writeContract commitInvoice`. Atomicidad EVM previene race condition real.
- **DT-E** — `llm-client.ts` usa `fetch` directo a `api.anthropic.com`. NO SDK Anthropic.
- **DT-F** — EIP-712 domain audit trail: `{name:"Cobraya", version:"1", chainId:43113}`. Hot keys per-agente efímeras generadas en W5.5.
- **DT-G** — Service worker `NetworkOnly` para todos los endpoints de pago (CD-17). Solo UI shell + brand assets cachean.
- **DT-H** — `commitInvoice` gas target interno 60K (CD-11 hard limit 80K). Foundry gas snapshot test enforce.
- **DT-I** — Mock data 100% determinista (CD-10). 3 CFDIs + 4 buyers + 4 lenders hardcoded.
- **DT-J** — Pipeline lineal hardcoded en `demo/page.tsx`. NO LLM planner. Parallelismo fraud||scorer via `Promise.all`.

**Nuevas decisiones del SDD**:

- **DT-K** — El endpoint canonical de cada agent es `/api/agents/<slug>/invoke`. Los routes scaffold pre-existentes (`/api/validate`, `/api/score`, `/api/match`) se mantienen como wrappers UI-only opcionales por ahora, pero el demo page llama directamente a `/api/agents/*/invoke` para que sea symmetric con lo que wasiai-a2a registra. **Cleanup post-hack**: borrar los wrappers redundantes.

- **DT-L** — `mock-adapter.ts` se mantiene como fallback path para `NEXT_PUBLIC_DEMO_MODE=true`. Cada agent route detecta `isDemoMode()` y devuelve el mock determinista — paracaídas del video pitch (AC-8 + CD-3).

- **DT-M** — Per-step audit trail buffer vive en `globalThis.__cobrayaAuditBuffer` (in-memory `Map<requestId, AuditTrail>`) — DT-B variant. Lifetime: hasta que el proceso Vercel se recicle (cold start). NO persistido a DB. V2 → Redis.

- **DT-N** — El header `x-cobraya-request-id` es generado por el client (`crypto.randomUUID()` en demo/page.tsx) y propagated en los 4 invoke calls + en GET /api/audit-trail. Sin este header el audit trail pierde correlación → cada agent route hace fallback a `crypto.randomUUID()` server-side si falta (logged como warning).

- **DT-O** — Vitest config: `jsdom` env, no JSX runtime config necesario (Next.js handles), `globals: true` para tests sin imports manuales de `describe/it/expect`.

- **DT-P** — USDC EIP-712 domain en Fuji: confirmar via `name()` y `version()` del contract `0x5425890298aed601595a70AB815c96711a31Bc65` antes de firmar. Default assumido: `{name:"USD Coin", version:"2", chainId:43113, verifyingContract:USDC_ADDRESS}`. Verificación en W5 pre-deploy. Si el USDC mock de Fuji no soporta EIP-3009 → demo mode fallback (CD-3 paracaídas).

---

## 6. Constraint Directives heredados + nuevos

Todos del work-item heredan literal:

- **CD-1**: TypeScript strict — sin `any` explícito. BLOQUEANTE.
- **CD-2**: Cada wave deja `npm run build` + `npm run typecheck` verde.
- **CD-3**: `NEXT_PUBLIC_DEMO_MODE=true` SIEMPRE funciona — paracaídas no negociable.
- **CD-4**: PROHIBIDO modificar wasiai-a2a / wasiai-facilitator / wasiai-v2.
- **CD-5**: `ONCHAIN_AMOUNT_CAP_USDC` honrado server-side en /settle.
- **CD-6**: NO `--no-verify` commits.
- **CD-7**: Commits firmados con `Co-Authored-By: Claude`.
- **CD-8**: 90min stuck → fallback a mock + ship resto.
- **CD-9**: NO leak de owner_ref / private keys / A2A_KEY hash en logs/UI.
- **CD-10**: Mock data determinístico (3 CFDIs, 4 buyers, 4 lenders hardcoded).
- **CD-11**: `commitInvoice` gas < 80K (target interno 60K). Verified `forge test --gas-report`.
- **CD-12**: EIP-712 domain audit `{name:"Cobraya",version:"1",chainId:43113}`.
- **CD-13**: `scripts/verify-audit-trail.js` standalone, solo `viem` o `ethers`.
- **CD-14**: `forge script Deploy.s.sol --verify` automated en Snowtrace.
- **CD-15**: Custom errors Solidity con params útiles.
- **CD-16**: Lighthouse PWA score > 90.
- **CD-17**: SW NUNCA cachea `/api/*` ni wasiai-a2a ni wasiai-facilitator (NetworkOnly).
- **CD-18**: NO desktop-only — viewport ≥360px sin horizontal scroll.

**Nuevos CDs del SDD**:

- **CD-19**: PROHIBIDO importar `core/*` desde `infra/*`. Layer rule strict — violation = AR BLOQUEANTE.
- **CD-20**: PROHIBIDO usar `Math.random()` o `Date.now()` dentro de `core/*` (rompe determinismo CD-10). Solo permitido en `infra/*` y `app/*`.
- **CD-21**: PROHIBIDO log de `process.env.*` keys sensibles (TREASURY_PRIVATE_KEY, *_HOT_KEY, ANTHROPIC_API_KEY, A2A_KEY) en ningún path. Reforzado de CD-9.
- **CD-22**: El header `x-a2a-key` SOLO va outbound a wasiai-a2a desde server-side. PROHIBIDO exponer en client-side fetch.
- **CD-23**: PROHIBIDO devolver el `commitmentHash` raw en respuestas del fraud-detector si el `uuidCfdi` contiene PII. El hash SÍ se devuelve (es público on-chain), pero el `rfcEmisor` se mask parcial en la respuesta JSON (igual que en audit trail — `rfcEmisorMasked: "TLE850***"`).
- **CD-24**: PROHIBIDO test de unit que importe `process.env.*` direct — debe usar `vi.stubEnv()` para evitar bleed entre tests.

---

## 7. Test plan (1+ test por AC)

| AC | Tipo | Wave | Archivo | Criterio PASS |
|---|---|---|---|---|
| AC-1 | Integration | W6 | `tests/unit/components/demo-page.test.tsx` (mock fetch) | 4 invocaciones disparadas en orden: validator → fraud||scorer → matcher |
| AC-2-v2 | Manual + smoke | W7 | PRODUCTION-EVIDENCE.md §debit | Total debit per run = $0.066 USDC en wasiai-a2a admin |
| AC-3 | Unit | W3 | `tests/unit/api/credit-scorer.test.ts` T-SCORER-1 | 2 invocations misma input → mismo score+band |
| AC-4 | Unit | W3 | `tests/unit/infra/llm-client.test.ts` T-LLM-1..3 | Sin key → fallback; con key happy → claude; con key error → fallback |
| AC-5 | Unit | W5 | `tests/unit/infra/eip3009-signer.test.ts` T-EIP3009-1 | typed data correcto con TREASURY_PRIVATE_KEY mock |
| AC-6 | Integration | W5+W7 | T-SETTLE-1 + PRODUCTION-EVIDENCE | tx hash en respuesta + Snowtrace URL formada |
| AC-7 | Unit | W5 | T-SETTLE-2 | amount > 0.05 → 422 con error:"cap_exceeded" |
| AC-8 | E2E | W6 | dry-run en demo mode | Todo el flow sin errors `DEMO_MODE=true` |
| AC-9-v2 | Integration | W1 | T-MARKETPLACE-1 | /api/marketplace retorna 4 cobraya-* agents |
| AC-10 | Manual | W7 | PRODUCTION-EVIDENCE.md §3 | 3+ tx hashes Snowtrace documentados |
| AC-12 | Solidity + agent | W2.5 | `contracts/test/CobrayaInvoiceCommitments.t.sol` + T-FRAUD-2 | Double-commit revierte AlreadyCommitted; agent retorna isUnique:false sin nueva tx |
| AC-13 | E2E offline | W5.5+W7 | `scripts/verify-audit-trail.js` ejecución | "ALL CHECKS PASSED" output |
| AC-14 | Manual | W8 | YouTube unlisted + portal submission | Video live + submission complete |
| AC-15 | Unit + visual | W4+W6 | T-MATCHER-1..3 + T-UI-AUCTION-1..3 | N≥3 lenders en DOM con rank-1 destacado |
| AC-16 | Manual + Lighthouse | W0.5+W7 | Chrome DevTools PWA score | Installable + score > 90 |
| AC-17 | Visual | W6 | DevTools mobile 393x852 | Sin horizontal scroll + touch targets ≥44px |
| AC-18 | Manual offline | W0.5 | DevTools offline mode | ~offline/page.tsx sirve sin red |

**Otros tests útiles** (no mapean directo a AC pero cubren CDs):
- T-PWA-1..3 (W0.5)
- T-SCORING-1..4 (W1)
- T-MATCHING-1..3 (W1)
- T-CFDI-1..5 (W2)
- T-FRAUD-1..4 (W2.5)
- T-MATCHER-1..3, T-AUCTION-1..2 (W4)
- T-AUDIT-1..4 (W5.5)
- T-UI-PICKER-1, T-UI-AUCTION-1..3, T-UI-AUDIT-1 (W6)

**Foundry tests** (W2.5c) — mínimo 11:
- 2 constructor + 5 commitInvoice + 4 releaseInvoice + 1 setAuthorizedCommitter + 1 gas snapshot

---

## 8. Riesgos y mitigaciones

| Riesgo | Severidad | Probabilidad | Mitigación |
|---|---|---|---|
| Anthropic API key no copy desde wasiai-a2a a tiempo | Media | Media | Fallback local templates (DT-E, CD-3) |
| Avalanche Fuji RPC slow/falla durante demo | Alta | Media | NEXT_PUBLIC_DEMO_MODE=true paracaídas (CD-3, AC-8) |
| Snowtrace API key no obtenida → `--verify` falla | Media | Baja | Fallback `--verifier sourcify` o manual upload (CD-14 documented exception) |
| TREASURY wallet sin AVAX suficiente para deploy + 3 commits | Alta | Baja | Pre-flight W0 check ≥2 AVAX. Tenemos 2.22 AVAX (BACKLOG §1). |
| Gas commitInvoice supera 80K en Fuji real | Alta | Baja | `forge test --gas-report` en W2.5c bloquea deploy. Target interno 60K. |
| USDC en Fuji NO implementa EIP-3009 (mock token sin método) | Crítica | Media | DT-P: verificar pre-W5 con `name()` y `version()`. Si falla → demo mode permanent + diagnostic en UI ("EIP-3009 unsupported in Fuji mock, mainnet ready") |
| Doble-debit /compose por race condition en UI | Media | Baja | Guard state `isRunning` en demo/page.tsx (pattern wasiai-agentshop) |
| Hot keys leak en logs si dev loggea env vars | Alta | Media | CD-21 + CD-9. Test T-LOGS-NO-LEAK (revisar logs en CI) — adicionar en AR. |
| Service worker cachea /api por mistake | Crítica | Baja | DevTools Network tab verifica NetworkOnly en W0.5e. CD-17 hard requirement. |
| 90min stuck en Foundry deploy | Alta | Media | CD-8: fallback a deploy manual via Remix o pre-deployed contract |
| Lighthouse PWA < 90 score | Media | Baja | W0.5e smoke + iterate icons/manifest |
| Auction edge case: ningún lender qualifies (caso C construction) | Baja | Alta | Pattern documentado: `recommendedLender: null` + UI muestra "no lender qualifies" sin crash (test T-MATCHING-3 / T-MATCHER-3 cubren esto) |

---

## 9. Readiness Check (self-check obligatorio)

- [x] ≥8 archivos del codebase leídos con path:line (29 archivos leídos — Cobraya scaffold 21 + agentshop reference 9 + v2 contracts 3 + luma-ai 4)
- [x] Exemplars verificados con Glob (`wasiai-agentshop/src/infra/eip3009-signer.ts` 114 líneas, `wasiai-v2/contracts/foundry.toml` 21 líneas, `luma-ai/next.config.mjs` 91 líneas — todos paths existen)
- [x] Todas las waves W0..W7 con archivos exactos + tests + ACs cubiertos
- [x] Cada AC mapeado a wave + test (§7 tabla completa, 18 ACs cubiertos)
- [x] DT-A..DT-J del work-item abordados (§5) + 6 nuevas DT-K..DT-P
- [x] CD-1..CD-18 cubiertos (§6 hereda literal) + 6 nuevas CD-19..CD-24
- [x] Cero [NEEDS CLARIFICATION] bloqueantes (los 2 no bloqueantes del work-item están resueltos: hot keys generan en W5.5, Snowtrace key en W0)

**Status**: SDD listo para SPEC_APPROVED. Siguiente fase F2.5 (Story File) — pendiente del gate humano.

---

## 10. Cambios de scope vs work-item

Ninguno. El SDD respeta literal:
- 4 agentes (no 3, no 5)
- 9 waves (W0..W8, W8 manual fuera de F3)
- Mock data del BACKLOG §6 (3 CFDIs + 4 buyers + 4 lenders)
- Auction shape v2 (no single match)
- Audit trail + offline verify (CD-13)
- PWA mobile-first (no desktop adapt)
- Foundry + Solidity 0.8.24 pattern alineado wasiai-v2

**Files Scope IN del work-item**: 50 (43 nuevos + 7 modificados + 2 deletes). SDD waves los desglosan en wave assignments exactos.

---

## 11. Anexo — quick reference paths verificados

**Exemplars que el Dev usará en F3**:

| Patrón | Archivo origen verificado | Wave que lo usa |
|---|---|---|
| EIP-3009 server-side signing | `wasiai-agentshop/src/infra/eip3009-signer.ts:1-114` | W5 |
| Settle route shape | `wasiai-agentshop/src/app/api/settle/route.ts:1-156` | W5 |
| Marketplace listing route | `wasiai-agentshop/src/app/api/marketplace/route.ts:1-157` | W1 |
| Agent invoke route shape | `wasiai-agentshop/src/app/api/agents/agentshop-kyc-validator/invoke/route.ts:1-47` | W2, W2.5, W3, W4 |
| TraceConsole component | `wasiai-agentshop/src/components/TraceConsole.tsx:1-80+` | W6 |
| PipelineProgress per-step | `wasiai-agentshop/src/components/PipelineProgress.tsx:1-60+` | W6 |
| Picker cards (3 mock items) | `wasiai-agentshop/src/components/RemittancePicker.tsx:1-50+` | W6 |
| BrandIcon SVG inline | `wasiai-agentshop/src/components/BrandIcon.tsx:1-30` | W6 |
| Foundry config | `wasiai-v2/contracts/foundry.toml:1-21` | W2.5a |
| Solidity Ownable2Step + custom errors | `wasiai-v2/contracts/src/WasiAIMarketplace.sol:1-60` (head) | W2.5b |
| Solidity contract spec exacto | `wasiai-lendable/doc/CONTRACT-DESIGN.md §3` (CobrayaInvoiceCommitments) | W2.5b |
| Foundry test spec exacto | `wasiai-lendable/doc/CONTRACT-DESIGN.md §6` | W2.5c |
| Deploy script spec | `wasiai-lendable/doc/CONTRACT-DESIGN.md §7` | W2.5d |
| Agent endpoint pseudocode | `wasiai-lendable/doc/CONTRACT-DESIGN.md §9` | W2.5e |
| withPWA config | `luma-ai/next.config.mjs:1-91` | W0.5a |
| PWA assets generator | `luma-ai/scripts/generate-pwa-assets.mjs` (~7KB) | W0.5b |
| Register SW + InstallPrompt | `luma-ai/src/components/pwa/{register-sw,install-prompt}.tsx` | W0.5c |
| Audit trail TS types exactos | `wasiai-lendable/doc/AUDIT-TRAIL-SCHEMA.md §2` | W5.5 |
| Audit verify script ejemplo | `wasiai-lendable/doc/AUDIT-TRAIL-SCHEMA.md §6` | W5.5 |
| Mock data exact specs | `wasiai-lendable/BACKLOG.md §6` (3 CFDIs + 4 buyers + 4 lenders + auction outputs) | W1 |
| Scoring formula determinista | `wasiai-lendable/BACKLOG.md §6` (base/amount/terms/sector adjusts + bands) | W1 |

---

**End of SDD.** Siguiente: gate humano SPEC_APPROVED, luego F2.5 Story File (responsabilidad del nexus-architect en próxima invocación).
