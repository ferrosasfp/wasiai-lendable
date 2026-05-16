# Work Item — WKH-COBRAYA-AGENTS — Cobraya agentic invoice factoring marketplace

## Resumen

Cobraya es un marketplace de factoraje agéntico para PyMEs mexicanas. Lupita, dueña de "Tortillería La Esperanza" en CDMX, sube un CFDI de $48,500 MXN a Walmart México. Cuatro agentes IA componibles procesan la factura en menos de 60 segundos: el `cobraya-cfdi-validator` verifica el shape y el anchor buyer, el `cobraya-fraud-detector` previene doble-cesión con un commitment onchain en `CobrayaInvoiceCommitments.sol` (Avalanche Fuji), el `cobraya-credit-scorer` computa un score determinista con rationale narrativa por Claude Haiku (fallback local si no hay clave), y el `cobraya-lender-matcher` devuelve una subasta entre 4 lenders compitiendo por APR/advance/velocidad. Al final, Lupita elige su lender y recibe USDC en su wallet via EIP-3009 settlement en Avalanche Fuji.

El costo total del pipeline por run es $0.066 USDC (debitado del Cobraya A2A_KEY via WKH-59 pricing real en wasiai-a2a). Cada paso firma un EIP-712 receipt que forma parte de un audit trail JSON descargable, implementando la "trazabilidad agéntica" de CNBV Circular 4/2024 de forma literal y verificable offline. La UI es mobile-first PWA installable (iOS/Android) con auction visual y audit panel, construida con Next.js 14 App Router sobre el patrón arquitectónico validado en el hackathon anterior `wasiai-agentshop` (Kite Hackathon, ya en prod).

---

## Sizing

- **SDD_MODE**: full
- **Pipeline**: QUALITY (no negociable — payment path + smart contract onchain + multi-stack cross-cutting)
- **Estimación**: L (~18-20h efectivos distribuidos en viernes noche + sábado, 9 waves)
- **Branch sugerido**: `feat/wkh-cobraya-agents` (ya creada desde main, commit `71f3a65`)
- **Skills relevantes**: Foundry/Solidity smart contracts · PWA/mobile-first Next.js

---

## Audit de codebase — F0 findings

### Scaffold existente (pre-hack, NO contiene business logic)

| Archivo | Estado | Acción en hack |
|---|---|---|
| `src/types/invoice.ts` | Existe — tipos base `Invoice`, `ValidatorResult`, `ScoreResult`, `LenderMatch`, `SettlementReceipt`, `Lender` | Extender con `anchor_buyer`, `payment_terms`, `sector_risk`, `uuid_sat`, auction fields |
| `src/components/PipelineProgress.tsx` | Existe — 3 agentes, labels de agentshop (Oracle GenAI), single match | Adaptar a 4 agentes + mobile vertical stepper |
| `src/components/UploadInvoice.tsx` | Existe — flujo de upload (no se usa) | DELETE — reemplazado por `InvoicePicker` |
| `next.config.js` | Existe — bare config sin PWA | Wrap con `withPWA()` en W0.5 |
| `tailwind.config.ts` | Existe | Mantener |
| `src/app/globals.css` | Existe | Mantener / copiar de agentshop si necesario |
| `.env.example` | Existe — tiene `ORACLE_GENAI_ENDPOINT` (obsoleto), falta vars nuevas | Actualizar con todas las nuevas vars |
| `package.json` | Existe — sin `@ducanh2912/next-pwa`, sin test runner | Instalar PWA plugin en W0.5 |

### Archivos a crear (cero en scaffold actual)

| Archivo | Wave |
|---|---|
| `src/lib/mock-data.ts` | W1 |
| `src/core/scoring.ts` | W1 |
| `src/core/matching.ts` | W1 |
| `src/infra/a2a-client.ts` | W0/W1 |
| `src/infra/facilitator-client.ts` | W5 |
| `src/infra/mock-adapter.ts` | W1 |
| `src/infra/eip3009-signer.ts` | W5 |
| `src/infra/llm-client.ts` | W3 |
| `src/infra/agent-signer.ts` | W5.5 |
| `src/infra/env.ts` | W1 |
| `src/application/validate-invoice.ts` | W2 |
| `src/application/score-invoice.ts` | W3 |
| `src/application/match-lender.ts` | W4 |
| `src/application/settle-factoring.ts` | W5 |
| `src/types/audit-trail.ts` | W5.5 |
| `src/lib/abis/cobraya-invoice-commitments.ts` | W2.5 |
| `src/app/api/agents/cobraya-cfdi-validator/invoke/route.ts` | W2 |
| `src/app/api/agents/cobraya-fraud-detector/invoke/route.ts` | W2.5 |
| `src/app/api/agents/cobraya-credit-scorer/invoke/route.ts` | W3 |
| `src/app/api/agents/cobraya-lender-matcher/invoke/route.ts` | W4 |
| `src/app/api/marketplace/route.ts` | W0/W1 |
| `src/app/api/settle/route.ts` | W5 |
| `src/app/api/audit-trail/[requestId]/route.ts` | W5.5 |
| `src/components/BrandIcon.tsx` | W6 |
| `src/components/TraceConsole.tsx` | W6 |
| `src/components/InvoicePicker.tsx` | W6 |
| `src/components/LenderAuctionPanel.tsx` | W6 |
| `src/components/AuditPanel.tsx` | W5.5/W6 |
| `src/components/Settlement.tsx` | W6 |
| `src/components/CopyButton.tsx` | W6 |
| `src/components/pwa/register-sw.tsx` | W0.5 |
| `src/components/pwa/install-prompt.tsx` | W0.5 |
| `src/app/~offline/page.tsx` | W0.5 |
| `src/app/page.tsx` | W6 |
| `src/app/demo/page.tsx` | W6 |
| `src/app/layout.tsx` | W0.5/W6 |
| `public/manifest.json` | W0.5 |
| `public/icons/icon-192.png` | W0.5 |
| `public/icons/icon-512.png` | W0.5 |
| `public/icons/icon-maskable-512.png` | W0.5 |
| `public/icons/apple-touch-icon-{120,152,180}.png` | W0.5 |
| `public/splashes/splash-iphone-*.png` | W0.5 |
| `scripts/generate-pwa-assets.mjs` | W0.5 |
| `scripts/verify-audit-trail.js` | W5.5 |
| `contracts/foundry.toml` | W2.5 |
| `contracts/src/CobrayaInvoiceCommitments.sol` | W2.5 |
| `contracts/test/CobrayaInvoiceCommitments.t.sol` | W2.5 |
| `contracts/script/Deploy.s.sol` | W2.5 |
| `doc/PRODUCTION-EVIDENCE.md` | W2.5/W7 |

### Archivos a eliminar

| Archivo | Razón |
|---|---|
| `src/components/UploadInvoice.tsx` | No se usa en flow demo — reemplazado por InvoicePicker |
| `src/infra/oracle-client.ts` (si existe) | Oracle GenAI dropeado — reemplazado por llm-client.ts |

### Observación importante

El `PipelineProgress.tsx` existente menciona "Oracle GenAI" explícitamente en el hint del scorer — debe corregirse en W6. El `ScoreResult.oraclePromptId` en `invoice.ts` también debe refactorizarse.

---

## Acceptance Criteria (EARS)

### Pipeline base

- **AC-1**: WHEN PyME selecciona un CFDI en `/demo` THEN la UI dispara 4 calls `/compose` contra wasiai-a2a en cadena `avalanche-fuji` en el orden: `cobraya-cfdi-validator` → (`cobraya-fraud-detector` || `cobraya-credit-scorer` en paralelo) → `cobraya-lender-matcher`.

- **AC-2**: WHEN los 4 agents responden 200 OK THEN el Cobraya A2A_KEY budget se decrementa por `$0.001 + $0.005 + $0.05 + $0.01 = $0.066` USDC (debit via WKH-59 real per-step pricing en wasiai-a2a).

- **AC-3**: WHEN `cobraya-credit-scorer` corre 2 veces con la misma input `{ amountMXN, anchorBuyer, paymentTermsDays, sector }` THEN retorna el mismo `score` y el mismo `band` en ambas invocaciones (determinismo).

- **AC-4**: WHEN `ANTHROPIC_API_KEY` está seteada AND `cobraya-credit-scorer` corre THEN el campo `rationale` es generado por Claude API. WHEN `ANTHROPIC_API_KEY` no está seteada o la llamada falla THEN `rationale` se genera desde el template local correspondiente al band (`FALLBACK_TEMPLATES[band]`) sin fallar el request.

- **AC-5**: WHEN el usuario hace click "Sign & Settle" THEN EIP-3009 typed data es firmado server-side con `TREASURY_PRIVATE_KEY` → se invoca POST `/settle` al wasiai-facilitator → la transacción es submitted a Avalanche Fuji.

- **AC-6**: WHEN el settlement confirma en Fuji THEN la UI muestra el tx hash, el link a Snowtrace, y el amount USDC entregado (net of fees).

- **AC-7**: IF el `amount` a liquidar supera `ONCHAIN_AMOUNT_CAP_USDC` (0.05 USDC) THEN la UI muestra "testnet cap — mainnet would settle full $X" sin gatillar ninguna transacción onchain.

- **AC-8**: WHILE `NEXT_PUBLIC_DEMO_MODE=true` the system SHALL ejecutar el flow completo con mocks deterministas sin requerir red real, wallets, ni RPC de Fuji.

- **AC-9**: WHEN `/api/marketplace` se invoca con el Cobraya A2A_KEY THEN devuelve exactamente 4 agentes con slug `cobraya-*`, `payment.chain=avalanche-fuji`, `payment.asset=USDC`, y `priceUsdc` correcto para cada uno.

- **AC-10**: WHEN el hack concluye THEN `doc/PRODUCTION-EVIDENCE.md` documenta al menos 3 tx hashes reales distintos en Snowtrace Fuji (fraud-detector commits + settle txs) con links verificables.

### Fraud detection

- **AC-12**: WHEN `cobraya-fraud-detector` recibe un CFDI cuyo `commitmentHash` (keccak256 de uuid_cfdi || rfc_emisor || amount_mxn) ya existe con status `Active` en `CobrayaInvoiceCommitments.sol` THEN retorna `{ isUnique: false, originalCommitTimestamp, originalCommitter }` sin emitir nueva transacción onchain. WHEN el hash no existe THEN hace `commitInvoice` onchain, espera 1 confirmación, y retorna `{ isUnique: true, commitTxHash, snowtraceUrl, blockNumber }`.

### Audit trail

- **AC-13**: WHEN un demo run completa THEN la UI ofrece "Descargar audit trail JSON"; el archivo descargado contiene 4 step receipts firmados con EIP-712 (domain `{ name: "Cobraya", version: "1", chainId: 43113 }`), un hash SHA-256 final del trail, y al correr `node scripts/verify-audit-trail.js <archivo.json>` la salida es `ALL CHECKS PASSED`.

### Video submission

- **AC-14**: WHEN domingo 06:00 hora MX THEN existe un video de 3 minutos en YouTube (unlisted), el portal del hackathon tiene la submission completa con repo URL + live demo URL + video URL, y el video muestra el demo flow completo con tx hash real visible en Snowtrace.

### Auction visual

- **AC-15**: WHEN `cobraya-lender-matcher` retorna un `auction` array con N >= 3 lenders THEN la UI muestra todos los lenders rankeados, con indicador visual en `recommendedLender` (rank 1), y APR / advance rate / estimated settle time visible por cada lender.

### PWA

- **AC-16**: WHEN el usuario abre Cobraya en un dispositivo móvil (iOS Safari / Android Chrome) THEN el PWA manifest es detectado por el browser, el install prompt aparece (Android automático via `beforeinstallprompt`, iOS via Share menu → Add to Home Screen), y la app instalada abre en modo standalone sin browser chrome.

- **AC-17**: WHEN `/demo` renderea en viewport 393x852px (iPhone 14 Pro) THEN la UI es legible sin zoom horizontal, todos los touch targets son >= 44px, y los elementos críticos (auction cards, sign button, audit download) son accesibles con un dedo sin scroll horizontal.

- **AC-18**: WHEN el usuario pierde conexión de red durante un demo run THEN el service worker sirve `src/app/~offline/page.tsx` con el mensaje "Sin conexión. El demo determinístico sigue funcionando." y un botón de reload.

---

## Scope IN

### Archivos nuevos a crear

```
contracts/
  foundry.toml
  src/CobrayaInvoiceCommitments.sol
  test/CobrayaInvoiceCommitments.t.sol
  script/Deploy.s.sol

public/
  manifest.json
  icons/icon-192.png
  icons/icon-512.png
  icons/icon-maskable-512.png
  icons/apple-touch-icon-120.png
  icons/apple-touch-icon-152.png
  icons/apple-touch-icon-180.png
  splashes/splash-iphone-*.png (3 variantes)

scripts/
  generate-pwa-assets.mjs
  verify-audit-trail.js

src/
  lib/mock-data.ts
  lib/abis/cobraya-invoice-commitments.ts
  core/scoring.ts
  core/matching.ts
  infra/a2a-client.ts
  infra/facilitator-client.ts
  infra/mock-adapter.ts
  infra/eip3009-signer.ts
  infra/llm-client.ts
  infra/agent-signer.ts
  infra/env.ts
  application/validate-invoice.ts
  application/score-invoice.ts
  application/match-lender.ts
  application/settle-factoring.ts
  types/audit-trail.ts
  app/api/agents/cobraya-cfdi-validator/invoke/route.ts
  app/api/agents/cobraya-fraud-detector/invoke/route.ts
  app/api/agents/cobraya-credit-scorer/invoke/route.ts
  app/api/agents/cobraya-lender-matcher/invoke/route.ts
  app/api/marketplace/route.ts
  app/api/settle/route.ts
  app/api/audit-trail/[requestId]/route.ts
  app/~offline/page.tsx
  app/page.tsx
  app/demo/page.tsx
  app/layout.tsx
  components/BrandIcon.tsx
  components/TraceConsole.tsx
  components/InvoicePicker.tsx
  components/LenderAuctionPanel.tsx
  components/AuditPanel.tsx
  components/Settlement.tsx
  components/CopyButton.tsx
  components/InfoTooltip.tsx
  components/pwa/register-sw.tsx
  components/pwa/install-prompt.tsx

doc/PRODUCTION-EVIDENCE.md
```

### Archivos existentes a modificar

```
src/types/invoice.ts          — extensión: anchorBuyer, paymentTermsDays, sector, auction types
src/components/PipelineProgress.tsx — adaptar 4 agentes + labels Cobraya + mobile
next.config.js                — withPWA wrap + runtimeCaching rules
package.json                  — instalar @ducanh2912/next-pwa
.env.example                  — nuevas vars: TREASURY_PRIVATE_KEY, OWNER_ADDRESS, etc.
```

### Archivos a eliminar

```
src/components/UploadInvoice.tsx
src/infra/oracle-client.ts (si existe en scaffold)
```

### Registros externos (SQL / no filesystem)

- SQL INSERT de 4 agentes en wasiai-v2 Supabase marketplace (W7)
- `COBRAYA_COMMITMENTS_ADDRESS` en Vercel env vars (post-deploy W2.5)
- 4 hot keys env vars en Vercel (`VALIDATOR_HOT_KEY`, etc.)

---

## Scope OUT

- NO modificar `wasiai-a2a` — solo consumir (CD-4)
- NO modificar `wasiai-facilitator` — solo consumir (CD-4)
- NO modificar `wasiai-v2` — solo insertar agentes via SQL (CD-4)
- NO Oracle GenAI integration (dropeado pre-hack; híbrido Claude + fallback local)
- NO camera capture de CFDIs (pre-loaded deterministas — cámara agrega complejidad innecesaria)
- NO push notifications (infra adicional, no aporta al video)
- NO Web Share API / Background Sync / Geolocation (scope guard PWA)
- NO mainnet deploy (código mainnet-ready pero requiere KYC Bankaool real)
- NO real CFDI parsing del SAT (mocked — V2 con `mensaje.sat.gob.mx`)
- NO refunds onchain (WKH-93 en backlog post-hack de wasiai-a2a)
- NO multi-step orquestación agéntica con LLM planner / ReAct / `/orchestrate`
- NO anti-fraud para band D (agente adicional — V2)
- NO dashboard de lenders
- NO hash anchor onchain del audit trail (V2 post-hack — `metadataPointer` en V2)
- NO KYC linkage en audit trail
- NO Safe multisig governance del contract (V2)
- NO subgraph / The Graph (V1 solo point queries O(1))
- NO ReentrancyGuard en el contrato V1 (no hay token transfers — documentado en código)

---

## Decisiones Técnicas iniciales (DT-N)

- **DT-A**: El debit de agentes se hace step-by-step via wasiai-a2a `/compose` (WKH-59 pricing real ya en prod). NO se usa `/orchestrate` con `$1` placeholder. Justificación: wasiai-a2a ya soporta per-step debit post-WKH-59; orchestrate tiene el placeholder sin resolver (DT-I de WKH-59 — out of scope).

- **DT-B**: Cache en memoria con Map + TTL para el `seen-set` de UUIDs en `cobraya-cfdi-validator` (duplicate check in-memory). Suficiente para el demo; en V2 → Redis. Justificación: no hay state compartido entre llamadas fuera de la sesión, y el demo corre en un único proceso Vercel.

- **DT-C**: El campo `rationale` en `cobraya-credit-scorer` puede variar entre llamadas (Claude output no es determinista), pero `score` y `band` son 100% deterministas. Los tests verifican determinismo de score/band, no de rationale. Justificación: permite AC-3 + AC-4 sin conflicto.

- **DT-D**: `cobraya-fraud-detector` hace pre-check via `eth_call isCommitted()` (O(1), sin gas) antes de `writeContract commitInvoice()`. Race condition atómica: si dos calls ven `active=false` simultáneamente, el EVM garantiza que solo la primera tx confirma; la segunda recibe `AlreadyCommitted` revert. Justificación: seguridad por diseño del EVM (documentado en CONTRACT-DESIGN.md §8.5).

- **DT-E**: `llm-client.ts` llama directamente a `api.anthropic.com/v1/messages` via `fetch` con timeout de 5 segundos. No usa el SDK oficial de Anthropic. Justificación: evita una dependencia de npm extra en un hack donde el fallback local es completamente funcional.

- **DT-F**: EIP-712 domain para audit trail receipts: `{ name: "Cobraya", version: "1", chainId: 43113 }`. Las hot keys per-agente son efímeras (generadas durante el hack). Justificación: CD-12 + separación clara de responsabilidades de firma por agente.

- **DT-G**: Service worker con `NetworkOnly` para todos los endpoints que involucran gasto (`/api/*`, wasiai-a2a, wasiai-facilitator). Solo UI shell y static assets se cachean. Justificación: CD-17 — cachear payment calls sería fraude financiero.

- **DT-H**: `commitInvoice` gas budget target < 60K (CD-11 dice < 80K — usamos 60K como target interno para buffer). Foundry gas snapshot en tests. Justificación: slot fría en Avalanche Fuji estimado ~70K; si supera 60K en tests, optimizar antes de deploy.

- **DT-I**: Mock data 100% determinista y hardcodeada en `src/lib/mock-data.ts`. Los 3 CFDIs, 4 buyers, 4 lenders, y auction outputs por caso están fijos (CD-10). Justificación: demo reproducible sin red + misma UI en todas las tomas del video.

- **DT-J**: El flujo completo se implementa como pipeline lineal hard-coded en `src/app/demo/page.tsx`. No hay LLM planner ni ReAct. El parallelismo fraud-detector || credit-scorer se implementa con `Promise.all()`. Justificación: determinismo demo + narrativa enfocada en settlement onchain (ver README §Diseño de agentes).

---

## Constraint Directives (CD-1 a CD-18)

- **CD-1**: TypeScript strict — sin `any` explícito. Violación detectada en AR es BLOQUEANTE.
- **CD-2**: Cada wave deja `npm run build` + `npm run typecheck` verde antes de merge a la feat branch.
- **CD-3**: `NEXT_PUBLIC_DEMO_MODE=true` DEBE siempre funcionar — correr el flow completo sin red ni wallets. Paracaídas no negociable para video pitch.
- **CD-4**: PROHIBIDO modificar `wasiai-a2a`, `wasiai-facilitator`, `wasiai-v2`. Solo consumirlos. Si algo falla, fallback a demo mode.
- **CD-5**: `ONCHAIN_AMOUNT_CAP_USDC` env var DEBE ser honrada en cada settle (rechazar si amount > cap, mostrar "testnet cap" en UI).
- **CD-6**: NO commits con `--no-verify`.
- **CD-7**: Cada commit firmado con `Co-Authored-By: Claude` (anti-blindaje: timestamps verifican código escrito durante el hack).
- **CD-8**: Si el pipeline se empantana más de 90 minutos en un ítem → fallback a mock para esa pieza, shipear el resto. Scope flexibility controlada.
- **CD-9**: PROHIBIDO hacer leak de `owner_ref`, private keys, o A2A_KEY hash en logs, UI, o respuestas de API.
- **CD-10**: Mock data en `src/lib/mock-data.ts` DEBE ser determinístico — 3 CFDIs predefinidos, no random. Misma input → misma output siempre.
- **CD-11**: `CobrayaInvoiceCommitments.commitInvoice` gas budget < 80K. OBLIGATORIO verificar via `forge test --gas-report` antes del deploy. Target interno 60K.
- **CD-12**: EIP-712 receipts DEBEN usar domain `{ name: "Cobraya", version: "1", chainId: 43113 }`. PROHIBIDO usar `chainId: 0` o tipos non-strict.
- **CD-13**: `scripts/verify-audit-trail.js` DEBE poder correr SIN dependencias de Cobraya (standalone Node.js, solo ethers/viem) — para demostrar offline auditor verification ante jurado.
- **CD-14**: `forge script Deploy.s.sol --verify` DEBE completar la verification automática en Snowtrace. PROHIBIDO upload manual del bytecode.
- **CD-15**: NO custom errors Solidity sin params útiles — todos llevan información (`AlreadyCommitted(hash, ts, committer)`, etc.).
- **CD-16**: Lighthouse PWA score > 90 OBLIGATORIO verificar pre-submission. Manifest válido, SW registered, icons completos, offline fallback funcional.
- **CD-17**: Service worker NUNCA cachea calls a `/api/*` ni a wasiai-a2a ni a wasiai-facilitator (NetworkOnly rules). Solo UI shell + static assets.
- **CD-18**: PROHIBIDO layouts desktop-only. Todo el UI DEBE funcionar en viewport >= 360px width (Android budget) sin scroll horizontal.

---

## Análisis de paralelismo y waves

### Dependencias entre waves

```
W0 (Bootstrap) ──────────────────────────────────────── bloquea todo
  └─ W0.5 (PWA scaffold) ────────────────────────────── paralelo con W1
  └─ W1 (Mock data + types) ─────────────────────────── bloquea W2..W5
       └─ W2 (cfdi-validator agent) ─────────────────── bloquea W2.5
            └─ W2.5 (fraud-detector + Foundry) ────────── paralelo con W3 post-validator
       └─ W3 (credit-scorer + Claude) ──────────────────
       └─ W4 (lender-matcher + auction) ─────────────── depende de W3 (necesita score types)
            └─ W5 (EIP-3009 + settle) ──────────────────
                 └─ W5.5 (audit trail + signed receipts) ─ bloquea W6 audit panel
                      └─ W6 (UI translation mobile-first) ─ depende de W2..W5.5
                           └─ W7 (register + smoke E2E) ─── depende de todo lo anterior
                                └─ W8 (video — manual) ────── depende de W7
```

### Timeline estimado

| Wave | Effort | Descripción |
|---|---|---|
| W0 | 15min | Bootstrap, env, smoke prerequisites |
| W0.5 | 45min | PWA scaffold (plugin, manifest, icons, offline, layout) |
| W1 | 30min | Mock data + types + core/scoring + core/matching |
| W2 | 30min | `cobraya-cfdi-validator` agent endpoint + tests |
| W2.5 | 2h | `cobraya-fraud-detector` + Foundry project + Solidity deploy + Snowtrace verify |
| W3 | 90min | `cobraya-credit-scorer` + llm-client + fallback |
| W4 | 60min | `cobraya-lender-matcher` + auction shape |
| W5 | 60min | EIP-3009 signer + `/api/settle` |
| W5.5 | 45min | Audit trail types + agent-signer + AuditPanel + download endpoint + verify script |
| W6 | 120min | Demo UI mobile-first (BrandIcon, TraceConsole, InvoicePicker, LenderAuctionPanel, pages) |
| W7 | 60min | SQL INSERT 4 agentes + smoke E2E 3 runs + PRODUCTION-EVIDENCE.md |
| W8 | 6-8h | Video production (manual, sábado 14:00-22:00) |
| **Total** | **~18-20h** | Viernes noche + sábado completo + domingo submission |

### Paralelismo en el pipeline de ejecución del demo

```
T+0s:  validator starts
T+2s:  validator done → fraud-detector + credit-scorer START IN PARALLEL (Promise.all)
T+5s:  fraud-detector done (RPC read + commit tx ~3s en Fuji)
T+8s:  credit-scorer done (LLM ~6s, fallback ~0.1s)
T+8s:  matcher starts (depende de score de credit-scorer)
T+10s: matcher done → UI muestra auction
T+35s: user selects lender + signs → facilitator → confirm (~25s Fuji)
T+60s: DONE — tx hash visible en UI + audit trail downloadable
```

---

## Categoría de riesgo para AR (Adversarial Review)

El AR DEBE atacar específicamente:

| Vector de ataque | Severidad potencial | Dónde buscar |
|---|---|---|
| Smart contract — doble-commit race condition | BLOQUEANTE | `contracts/src/CobrayaInvoiceCommitments.sol` — verificar que la validación de `status != None` es atómica y no puede bypassearse |
| Smart contract — access control | BLOQUEANTE | `onlyAuthorized` modifier — verificar que nadie sin autorización puede commitInvoice |
| EIP-3009 signer — private key exposure | BLOQUEANTE | `src/infra/eip3009-signer.ts` + `src/app/api/settle/route.ts` — TREASURY_PRIVATE_KEY NUNCA llega al browser |
| Owner-ref / private key leak en logs | BLOQUEANTE | Todos los API routes — verificar que no loguean env vars, no exponen owner_ref |
| Doble-debit — /compose llamado dos veces | ALTO | `src/app/demo/page.tsx` — verificar que compose calls tienen guard contra double-trigger |
| Agent input validation — injection via CFDI fields | ALTO | Todos los `invoke/route.ts` — verificar validación de inputs (uuidCfdi, rfcEmisor, amountMXN) |
| PWA service worker — cache poisoning de payment calls | ALTO | `next.config.js` runtimeCaching — verificar NetworkOnly enforcement para `/api/*` y wasiai-a2a |
| Fraud-detector — fake bypass con `isUnique: true` forjado | ALTO | `src/app/api/agents/cobraya-fraud-detector/invoke/route.ts` — la UI debe confiar en el resultado del contrato, no en un campo manipulable |
| Cap bypass — ONCHAIN_AMOUNT_CAP_USDC no chequeado | MEDIO | `src/app/api/settle/route.ts` — verificar que el cap se chequea server-side, no solo en UI |
| Gas budget excedido en commitInvoice | MEDIO | `contracts/test/CobrayaInvoiceCommitments.t.sol` — gas snapshot test debe pasar |
| EIP-712 domain incorrecto (chainId: 0) | MEDIO | `src/infra/agent-signer.ts` — verificar domain strict contra CD-12 |
| Fallback LLM oculto — demo puede mentir sobre provenance | BAJO | `src/infra/llm-client.ts` — `rationaleProvenance` field debe indicar "local-fallback" vs "anthropic-claude-haiku" |

---

## Test plan inicial

| AC | Tipo de test | Herramienta | Criterio de PASS |
|---|---|---|---|
| AC-1 | Integration test | vitest + MSW | 4 compose calls disparados en orden correcto |
| AC-2 | Unit test (mock a2a) | vitest | Budget decrement = $0.066 en 4 calls |
| AC-3 | Unit test determinismo | vitest | 2 invocations misma input → mismo score+band |
| AC-4 | Unit test fallback | vitest | Mock ANTHROPIC_API_KEY ausente → template local no falla |
| AC-5 | Unit test signer | vitest | EIP-3009 typed data correcto con TREASURY key mock |
| AC-6 | Integration test | vitest + mock facilitator | tx hash en respuesta, URL Snowtrace formada |
| AC-7 | Unit test cap | vitest | amount > 0.05 → no tx, UI message correcto |
| AC-8 | E2E test | demo mode flag | Todo el flow sin red → sin errors |
| AC-9 | Integration test | vitest | /api/marketplace retorna 4 agentes cobraya-* |
| AC-10 | Manual + `doc/PRODUCTION-EVIDENCE.md` | Snowtrace | 3 tx hashes documentados |
| AC-12 | Unit test Solidity + agent | forge test -vv + vitest | Double-commit → isUnique:false sin tx |
| AC-12 | Forge test coverage | forge coverage | 100% lines/branches CobrayaInvoiceCommitments.sol |
| AC-13 | E2E + offline verify | node scripts/verify-audit-trail.js | ALL CHECKS PASSED |
| AC-14 | Manual | YouTube + portal | Video live + submission complete |
| AC-15 | Unit test UI | vitest/react-testing-library | N>=3 lenders en DOM, rank-1 destacado |
| AC-16 | Manual + Lighthouse | Chrome DevTools | PWA installable + score >90 |
| AC-17 | Visual test | Chrome DevTools mobile 393x852 | Sin scroll horizontal, tap targets >=44px |
| AC-18 | Manual offline test | DevTools offline mode | ~offline/page.tsx sirve sin red |

---

## Missing Inputs

- **[NEEDS CLARIFICATION — no bloqueante]** `VALIDATOR_HOT_KEY`, `FRAUD_HOT_KEY`, `SCORER_HOT_KEY`, `MATCHER_HOT_KEY` no existen aún (se generan durante el hack en W5.5). Default approach: Architect documentará en SDD la generación de estas keys ephemeral con `viem generatePrivateKey()` durante W5.5.

- **[NEEDS CLARIFICATION — no bloqueante]** `SNOWTRACE_API_KEY` no está en `.env.example` — se necesita para `forge verify`. Default approach: el deployer la obtiene de snowtrace.io/myapikey durante W2.5d, se carga en `.env.local`.

- **[RESUELTO]** Auction outputs deterministas por CFDI están documentados en BACKLOG.md §6 — no requieren clarificación.

- **[RESUELTO]** Gas estimates de `commitInvoice` (~70K) están en CONTRACT-DESIGN.md §4 — dentro del budget CD-11 (<80K). El target interno es 60K; si supera en tests, se optimiza el struct packing antes del deploy.

- **[RESUELTO]** La CFDI con band C (Construcciones Hermanos Ruiz) tiene solo 1 qualifying lender (Konfío 22%). Esto es intencional — el demo muestra honestidad (no siempre hay buena opción). AC-15 requiere N>=3 lenders en el array, pero `qualifies: false` para los 3 restantes es correcto (están en el array, solo no califican). Architect deberá confirmar el contrato de la respuesta del matcher en el SDD.

- **[RESUELTO]** CD-11 dice gas < 80K, CONTRACT-DESIGN.md §11 dice < 80K. La discrepancia con el target interno 60K es intencional (buffer de seguridad). El test gas snapshot usa 80K como hard limit.
