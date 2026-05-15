# Lendable — Hackathon Backlog (planning pre-hack, no code)

> Documento de planificación previa al hackathon Avalanche LATAM Fintech Build (mayo 15-17 2026).
> **Status**: planning only — el código se escribe a partir del viernes 15 mayo 18:00 hora MX.
> **Master ticket**: `WKH-LENDABLE-AGENTS` — pipeline NexusAgil QUALITY AUTO que ejecuta en hack-day.

---

## 1. Strategy decisions (already taken)

| Decisión | Valor | Justificación |
|---|---|---|
| Use case | Factoraje agéntico para PyMEs mexicanas con buyers tier-1 (Walmart, Bimbo, Cemex, OXXO) | LATAM-specific, fintech vertical sin solución agéntica, regulación amigable (LGTOC) |
| Persona principal del demo | "Tortillería La Esperanza" (PyME) facturando a Walmart MX | Mismo patrón que WasiAgentShop (Luis Quispe → Rosa) — protagonista relatable |
| Chain settlement | Avalanche Fuji (mainnet code-ready) | Sponsor primario del hack + USDC nativo + sub-segundo finality |
| Asset | USDC | Nativo Avalanche, sin bridges |
| Agente wallets | OWNER = SME (recibe) · TREASURY = Lender (firma EIP-3009) · OPERATOR = a2a gateway (no se toca) | Roles claros, todos en Fuji testnet |
| Architecture template | Reuso del pattern probado en `wasiai-agentshop` (Kite Hackathon submission) | Patrón end-to-end validado en prod, ahorra ~60% del tiempo de hack-day |
| Credit-scorer AI | **Hybrid**: heurística determinista (score) + LLM API opcional para explicación textual | Oracle GenAI dropeado por riesgo de signup/region. Hybrid es anti-frágil. |
| LLM provider preferido | Anthropic Claude API (vía env var `ANTHROPIC_API_KEY`) | Familiar, confiable. Fallback a explicación local con templates si no hay key. |
| **Ambición scope (v2)** | **4 agentes + onchain fraud detection + lender auction + audit trail panel + video pitch profesional** | Decisión 2026-05-15: tenemos head-start (wasiai-a2a multi-chain prod + wasiai-agentshop pattern probado). Usar ventaja para diferenciar vs hackathon-toys. Win condition = LATAM institutions notice WasiAI. |
| Pipeline NexusAgil | QUALITY AUTO en una sola HU `WKH-LENDABLE-AGENTS` con waves W0..W8 (v2) | Time-boxed: 39h hack. Una pipeline integral > múltiples HUs cada una con full ceremony. |
| Demo UI | 4-phase narrative + TraceConsole + PipelineProgress (mismo pattern agentshop) | UX validada con jurados Kite |
| Safety cap | `ONCHAIN_AMOUNT_CAP_USDC=0.05` | Mismo cap que agentshop (testnet finito, USDC faucet limitado) |
| Demo mode paracaídas | `NEXT_PUBLIC_DEMO_MODE=true` flag preservado | Si Fuji RPC o facilitator caen en vivo, demo determinista funciona offline |

---

## 2. Master HU — `WKH-LENDABLE-AGENTS`

**Objetivo (v2)**: **4 agentes** Lendable componibles via wasiai-a2a + **onchain fraud-detector** con commitment contract + **lender auction** (no single match) + **audit trail panel + JSON download** + EIP-3009 settlement real en Avalanche Fuji + demo UI + smoke E2E con tx hash real visible en Snowtrace + **video pitch profesional 3 min** ready to submit.

**Pipeline**: QUALITY AUTO (clinical reviews reemplazan gates humanos)
**Estimación**: ~18h trabajo neto distribuido viernes noche + sábado completo (v2 upgrade respecto a v1 12h)
**Branch**: `feat/wkh-lendable-agents`
**Repo**: `/home/ferdev/.openclaw/workspace/wasiai-lendable`

### v2 differentiation summary

| Upgrade | What it adds | Why for "win" |
|---|---|---|
| **4 agentes con fraud-detector onchain** | `lendable-fraud-detector` agent + `LendableInvoiceCommitments.sol` contract en Avalanche Fuji | Resuelve doble-cesión (problema regulatorio #1 del factoring MX). Avalanche-native narrative (sub-second finality habilita esto). CNBV-friendly. |
| **Lender auction (no single match)** | Matcher devuelve 3-4 lenders compitiendo con APR/advance/settle-time, SME elige | Momento "competencia entre lenders" que cualquier institucional LATAM entiende sin abstracción. Bankaool quiere estar en esta subasta. |
| **Audit trail panel + JSON descargable** | Cada step firma EIP-712 receipt; UI panel building en tiempo real; download endpoint | CNBV Circular 4/2024 "trazabilidad agéntica" implementada literal. Compliance officer ve esto y cierra conversación. |
| **TAM moment in video** | "$24B/yr MX factoring TAM. 1% migration = $240M/yr agent fees." | Hace explícito el platform thesis. Jurado institucional **necesita** el número para recordar el demo. |
| **Production proof reel** | 15 sec del video con wasiai.io live + GitHub repos + 1,660+ tests + tx hashes anteriores + Kite Hack submission | Production signal diferencia de "deployed to Vercel ayer". Jurado se acuerda al otro día. |

---

## 3. Waves de implementación

### W0 — Bootstrap & env (15min)
- Crear `feat/wkh-lendable-agents` desde `main`
- Cargar privkeys OWNER + TREASURY en `.env.local` (gitignored)
- Confirmar A2A_KEY Lendable funded en chain 43113 (SQL Day-1 ya corrido)
- Smoke prerequisites: `/health` de a2a + facilitator + `/discover` desde Lendable A2A_KEY
- Validación: `npm test` baseline scaffold actual PASS

### W1 — Mock data + types domain (30min)
- `src/lib/mock-data.ts` con 3 CFDIs + 4 buyers (Walmart MX, Bimbo, Cemex, OXXO) + 4 lenders (Bankaool, Arkangeles Fund I, BBVA, Konfío)
- `src/types/invoice.ts` extender con campos faltantes (anchor_buyer, payment_terms, sector_risk, uuid_sat)
- `src/core/scoring.ts` con scoring bands (A/B/C/D) + spread por banda
- `src/core/matching.ts` con criterios de match (banda + monto + sector)
- Validación: typecheck PASS, sin importar nada externo

### W2 — Agent endpoint #1: lendable-cfdi-validator ($0.001) (30min)
- `src/app/api/agents/lendable-cfdi-validator/invoke/route.ts` — POST handler con shape `{ senderName, amountMXN, anchorBuyer, uuidSat }` → returns `{ isCompliant, policyId, signedAt }`
- Lógica determinista (sin AI): check uuid format, amount > 0, anchorBuyer in registered tier-1 set, no duplicate uuid in seen-set (in-memory)
- `src/application/validate-invoice.ts` use case con isDemoMode() dispatch
- Tests unit minimal (3-5 happy + error paths)
- Validación: `curl POST /api/agents/lendable-cfdi-validator/invoke` retorna 200 con shape correcto

### W2.5 — Agent endpoint #2 + Solidity contract: lendable-fraud-detector ($0.005) (90min)

> **NEW en v2**. Ver design completo en `doc/CONTRACT-DESIGN.md`.

- **W2.5a** (30min) — Deploy contract `LendableInvoiceCommitments.sol` a Avalanche Fuji:
  - Crear `contracts/LendableInvoiceCommitments.sol` (código del CONTRACT-DESIGN.md §2)
  - Script `scripts/deploy-commitments.ts` con viem
  - Run script: deploy + 1 confirmation + capture address
  - Save address en `.env.local` como `LENDABLE_COMMITMENTS_ADDRESS=0x...`
  - Verify on Snowtrace (5 min)
  - Update `doc/PRODUCTION-EVIDENCE.md` §3 con deploy tx hash + Snowtrace URL
- **W2.5b** (60min) — Agent endpoint:
  - `src/app/api/agents/lendable-fraud-detector/invoke/route.ts`
  - Input: `{ uuidCfdi, rfcEmisor, amountMXN }`
  - Compute `commitmentHash = keccak256(uuidCfdi || rfcEmisor || amountMXN)` con viem
  - Call `isCommitted(hash)` → if exists, reject 200 with `{ isUnique: false, ... }`
  - Else call `commitInvoice(hash, 0x0)` + await 1 confirmation
  - Return `{ isUnique: true, commitmentHash, commitTxHash, snowtraceUrl, timestamp }`
  - Tests unit minimal (mock RPC call con happy + reject paths)
- Validación: `curl POST` con UUID nuevo → 200 isUnique:true; mismo UUID dos veces → segundo intento isUnique:false sin double-commit
- Cubre AC nueva (v2): AC-12 fraud-detection blocks doble-cesión

### W3 — Agent endpoint #3: lendable-credit-scorer ($0.05) (90min)
- `src/app/api/agents/lendable-credit-scorer/invoke/route.ts`
- Input shape: `{ amountMXN, anchorBuyer, paymentTermsDays, sector }` → returns `{ score, band, advanceRatePct, aprPct, rationale }`
- Lógica:
  - Score determinista en `src/core/scoring.ts`: base score por buyer tier + adjust por amount + adjust por payment terms + adjust por sector → band A (80+) / B (60-80) / C (40-60) / D (<40)
  - Spread y APR derivados de band
  - Rationale: si `ANTHROPIC_API_KEY` está seteada → llamada corta a Claude API con prompt estructurado para generar narrative. Si no o falla → template determinista local.
- `src/infra/llm-client.ts` (NEW) — wrapper genérico con fallback. NO usa SDK específico; fetch a la API directamente con timeout 5s.
- `src/application/score-invoice.ts` use case
- Tests unit: score determinista cubre 4 bands, fallback narrative cuando LLM falla, happy path LLM mock
- Validación: 2 invocations con la misma input retornan mismo `score`+`band` (determinismo del demo)

### W4 — Agent endpoint #4: lendable-lender-matcher ($0.01) WITH AUCTION (60min, v2 upgrade)

> **v2 upgrade**: matcher devuelve AUCTION (3-4 lenders compitiendo ranked) en lugar de single match.

- `src/app/api/agents/lendable-lender-matcher/invoke/route.ts`
- Input shape: `{ band, amountMXN, anchorBuyer, sector }` → returns:
  ```ts
  {
    auction: Array<{
      lenderId: string;
      lenderName: string;
      aprPct: number;
      advanceRatePct: number;
      estimatedSettleMinutes: number;
      netAmountUSDC: number;
      rank: number;        // 1 = best
      qualifies: boolean;  // does this lender qualify for this band+sector
    }>;
    recommendedLender: string;     // lenderId of rank 1
    recommendationReason: string;  // 1-sentence explanation
  }
  ```
- Lógica determinista en `src/core/matching.ts`:
  - Filter lenders por band-allowlist + sector-allowlist + amount-range
  - Para cada qualifier: compute combined score `(apr-rate × 0.6 + advance-rate × 0.4 + speed-bonus)`
  - Sort descending → rank 1..N
  - Recommendation = rank 1
- `src/application/match-lender.ts` use case
- Tests unit: 3 invocations con misma input → mismo ordering (determinismo)
- Validación: input determinista produce siempre misma auction order
- Cubre AC: AC-2-v2 (auction shape), AC-3 (determinismo)

### W5 — EIP-3009 signing server-side + settlement (60min)
- `src/infra/eip3009-signer.ts` (NEW, copy pattern de agentshop) — recibe USDC token address, sender (TREASURY priv key), receiver (OWNER address), amount, deadline → returns signed EIP-712 typed data
- `src/app/api/settle/route.ts` — POST handler que invoca eip3009-signer + manda al wasiai-facilitator `/settle`
- Cap safety: `ONCHAIN_AMOUNT_CAP_USDC=0.05` (env var) — reject si amount > cap, mostrar "testnet cap" en UI
- Validación: smoke test contra Fuji con TREASURY → recibo OWNER, tx hash visible en Snowtrace

### W5.5 — Audit trail panel + signed receipts (45min, v2 NEW)

> **NEW en v2**. Ver schema completo en `doc/AUDIT-TRAIL-SCHEMA.md`.

- `src/types/audit-trail.ts` — TypeScript types del schema
- `src/infra/agent-signer.ts` — helper para firmar EIP-712 receipts con hot keys per-agent
- `src/components/AuditPanel.tsx` — UI lateral durante demo, building receipts en tiempo real
- `src/app/api/audit-trail/[requestId]/route.ts` — GET endpoint que retorna JSON con Content-Disposition: attachment
- Env vars nuevos: `VALIDATOR_HOT_KEY`, `FRAUD_HOT_KEY`, `SCORER_HOT_KEY`, `MATCHER_HOT_KEY` (generated during hack)
- Wire cada agent endpoint para firmar receipt antes de return
- `scripts/verify-audit-trail.js` — verification script standalone (mostrable a auditores)
- Validación: 1 demo run → audit JSON download funciona, signatures verifican offline
- Cubre AC nueva (v2): AC-13 audit trail + verification

### W6 — Demo UI translation con auction visual (90min, v2 expanded)
- `src/components/BrandIcon.tsx` (NEW) — SVG branded Lendable
- `src/components/TraceConsole.tsx` (NEW, copy pattern de agentshop)
- `src/components/LenderAuctionPanel.tsx` (NEW v2) — visual con 4 lenders bidding, animated entrance, ranked, recommended star
- `src/components/PipelineProgress.tsx` ya existe — adapt to **4 agents**
- `src/components/Settlement.tsx` ya existe — adapt
- `src/app/page.tsx` — landing con narrativa "Tortillería La Esperanza factura a Walmart"
- `src/app/demo/page.tsx` — 4 phases (v2 — fraud-detector visible):
  - Phase 0: marketplace `/discover` (mostrar **4** lendable-* agents en `payment.chain=avalanche-fuji`)
  - Phase 1: usuario selecciona CFDI (1 de 3 pre-loaded)
  - Phase 2: **4 calls /compose** en sequence con paralelización visible (validator → [fraud + scorer parallel] → matcher con auction visible) — trace visible + audit panel building
  - Phase 3: Sign & Settle — EIP-3009 + facilitator → Snowtrace link + audit JSON download button
- Validación: dry-run UI completo en demo mode (sin red) → 4 phases visibles + 4 agent traces + auction visual + audit panel populated

### W7 — Register 4 agents en v2 marketplace + smoke real tx (60min, v2)
- SQL INSERT (or v2 admin UI): registrar **4 agentes** en `agents` table con:
  - slug, name, description, capabilities, priceUsdc, payment.chain=avalanche-fuji, payment.asset=USDC, endpoint URL pointing a Lendable Vercel deploy
  - lendable-cfdi-validator $0.001
  - lendable-fraud-detector $0.005 (v2 NEW)
  - lendable-credit-scorer $0.05
  - lendable-lender-matcher $0.01
- Smoke flow `NEXT_PUBLIC_DEMO_MODE=false` contra Lendable Vercel + a2a prod + facilitator + Fuji:
  - `/discover` returns **4** lendable-* agents
  - `/compose × 4` cada uno debita el priceUsdc real (post-WKH-59) → total **$0.066** desde Lendable A2A_KEY budget
  - fraud-detector commit tx visible en Snowtrace
  - `/settle` produce tx hash real en Snowtrace
  - Audit trail JSON descargable
- Run end-to-end **3 demo runs** sucesivos (capturar 3 audit trails diferentes para video)
- Validación: 3+ tx hashes documentados en `doc/PRODUCTION-EVIDENCE.md` §3 con link Snowtrace

### W8 — Video pitch profesional 3min + submission (sábado tarde + domingo, 6-8h, v2 expanded)

> **v2 MAJOR upgrade**: el pitch NO es en vivo — es video submission. Tenemos tiempo de producirlo bien.
> Ver script completo en `doc/VIDEO-SCRIPT.md` (7 scenes, 3 min total).

- **Sábado 14:00-15:00** — Generate ElevenLabs voiceover (audicionar 2-3 voces, generar las 7 scenes en español neutro)
- **Sábado 15:00-16:00** — Screen recording de demo (3-5 takes, capturar best happy path + Snowtrace tabs + GitHub repos + production endpoints)
- **Sábado 16:00-17:00** — License music (Artlist o Epidemic) + buscar 4-5 stock footage shots de Artgrid (PyME mexicana, mercado, etc)
- **Sábado 17:00-19:00** — Primer edit CapCut: assemble scenes + voiceover sync + on-screen text overlays + transitions
- **Sábado 19:00-19:30** — Captions: auto ES + manual EN translation
- **Sábado 19:30-20:00** — Color grading + sound mix + export 1080p H.264
- **Sábado 20:00-21:00** — Upload YouTube unlisted + verify quality desktop+mobile
- **Sábado 21:00-22:00** — Cushion buffer / fresh eyes review / fixes
- **Domingo 00:00-06:00** — Submission portal hackathon + final polish + LinkedIn post drafted
- Validación: video <3:30 con buffer, subtitles legibles, audio quality clear, demo flow shows happy end-to-end

Cubre AC nueva (v2): AC-14 video submission complete + lives en YouTube unlisted

---

## 4. Acceptance Criteria (master, EARS — v2 expanded)

- **AC-1**: WHEN PyME selecciona un CFDI en `/demo` THEN UI dispara **4 calls** `/compose` (validator → fraud-detector || credit-scorer parallel → matcher) contra wasiai-a2a en chain `avalanche-fuji`.
- **AC-2-v2**: WHEN los 4 agents responden 200 OK THEN Lendable A2A_KEY budget se decrementa por `$0.001 + $0.005 + $0.05 + $0.01 = $0.066` USDC equivalent (debit via WKH-59 pricing real).
- **AC-3**: WHEN credit-scorer corre 2 veces con misma input THEN retorna mismo `score` y `band` (determinismo demo).
- **AC-4**: WHEN `ANTHROPIC_API_KEY` está seteada AND lendable-credit-scorer corre THEN el `rationale` field es generado por Claude. WHEN no está o falla THEN fallback a template local.
- **AC-5**: WHEN usuario click "Sign & Settle" THEN EIP-3009 typed data firmado server-side con TREASURY_PRIVATE_KEY → POST `/settle` al wasiai-facilitator → tx submitted a Avalanche Fuji.
- **AC-6**: WHEN settlement succeeds THEN UI muestra tx hash + link a Snowtrace + amount USDC delivered (net of fees).
- **AC-7**: WHEN amount > `ONCHAIN_AMOUNT_CAP_USDC` (0.05) THEN UI muestra "testnet cap — mainnet would settle full $X" sin gatillar tx (safety).
- **AC-8**: WHEN `NEXT_PUBLIC_DEMO_MODE=true` THEN flow completo corre con mocks deterministas, sin red ni wallets — paracaídas para video pitch.
- **AC-9-v2**: WHEN `/discover` se llama desde Lendable A2A_KEY THEN devuelve los **4** lendable-* agents con `payment.chain=avalanche-fuji`, `payment.asset=USDC`, y priceUsdc correcto.
- **AC-10**: WHEN hack-day acaba THEN al menos **3 tx hashes** reales en Snowtrace Fuji documentados en `doc/PRODUCTION-EVIDENCE.md` + visibles en deploy live.

### AC nuevas en v2

- **AC-12 (fraud-detector)**: WHEN `lendable-fraud-detector` recibe un CFDI cuyo `commitmentHash` ya existe en `LendableInvoiceCommitments.sol` THEN retorna `{ isUnique: false, originalCommitTimestamp, originalCommitter }` y NO emite nueva tx onchain. WHEN es único THEN commits onchain con tx exitosa.
- **AC-13 (audit trail)**: WHEN demo run completa THEN UI ofrece "Descargar audit trail JSON"; el JSON descargado tiene 4 step receipts firmados con EIP-712, hash SHA-256 final, y se puede verificar offline con `scripts/verify-audit-trail.js` retornando ALL CHECKS PASSED.
- **AC-14 (video submission)**: WHEN domingo 06:00 THEN video 3-min en YouTube unlisted + portal hackathon submission completo con repo URL + live demo URL + video URL.
- **AC-15 (auction visual)**: WHEN matcher returns auction array of N>=3 lenders THEN UI muestra todos los lenders rankeados, con star en `recommendedLender`, con APR/advance/speed visible per cada uno.

---

## 5. Constraint Directives (inviolables durante hack)

- **CD-1**: TypeScript strict — sin `any` explícito (mismo standard que wasiai-a2a)
- **CD-2**: Cada wave deja `npm test` + `npm run build` verde antes de merge a feat branch
- **CD-3**: `NEXT_PUBLIC_DEMO_MODE` flag must ALWAYS work — paracaídas no negociable
- **CD-4**: NO modificar `wasiai-a2a`, `wasiai-facilitator`, `wasiai-v2` durante el hack. Solo consumirlos. Si algo falla, fallback a demo mode.
- **CD-5**: Cap de tx: `ONCHAIN_AMOUNT_CAP_USDC` env var honrada en cada settle (no mainnet-like amounts en testnet)
- **CD-6**: NO commits con `--no-verify`
- **CD-7**: Cada commit firmado con `Co-Authored-By: Claude` (anti-blindaje: timestamps verifican que código se escribió durante el hack)
- **CD-8**: Si me empantano en algo más de 90 min → switcho de scope (fallback a mock para esa pieza, ship el resto)
- **CD-9**: NO leak de `owner_ref`, privkeys, A2A_KEY hash en logs/UI
- **CD-10**: Mock data en `src/lib/mock-data.ts` debe ser determinístico — 3 CFDIs predefinidos, no random
- **CD-11 (v2)**: Contract `LendableInvoiceCommitments` gas budget per commit < 60K — si supera, optimizar antes de deploy. Gas price cap maxFeePerGas 50 nAVAX.
- **CD-12 (v2)**: EIP-712 receipts must use domain `{ name: "Lendable", version: "1", chainId: 43113 }`. NO usar `chainId: 0` o tipos non-strict.
- **CD-13 (v2)**: `verify-audit-trail.js` debe poder correrse SIN dependencies de Lendable (standalone Node, solo ethers/viem) — para demostrar offline auditor verification

---

## 6. Mock data specs (para W1, no implementación)

### CFDIs pre-loaded (3 ejemplos para el picker)

| Nombre comercial | Emisor (PyME) | Anchor buyer | Amount MXN | Payment terms | Sector | Expected band |
|---|---|---|---|---|---|---|
| Tortillería La Esperanza | RFC TLE850315 | **Walmart México** | 48,500 | 60d | Food retail | **B (74)** |
| Confecciones Nayeli | RFC CNA920514 | **Bimbo** | 28,200 | 30d | Apparel | **A (82)** |
| Construcciones Hermanos Ruiz | RFC CHR770822 | **Cemex** | 156,800 | 90d | Construction | **C (58)** |

### Buyers tier registry

| Buyer | Tier | Sector adjustment |
|---|---|---|
| Walmart México | 1 | +5 |
| Bimbo | 1 | +5 |
| Cemex | 1 | +3 |
| OXXO | 1 | +3 |

### Lenders catalog (pool inversores) — para auction

| ID | Name | Band allowlist | Sector allowlist | Min amount MXN | Max amount MXN | APR % | Advance % | Speed (min) |
|---|---|---|---|---|---|---|---|---|
| lender-bankaool | Bankaool Pool A | A, B | all | 10,000 | 500,000 | 14.5 | 92 | 30 |
| lender-arkangeles-i | Arkangeles Fund I | A, B, C | food retail, apparel | 5,000 | 200,000 | 15.8 | 90 | 45 |
| lender-bbva-sme | BBVA SME Bridge | A | all | 50,000 | 1,000,000 | 12.0 | 95 | 120 |
| lender-konfio | Konfío Express | B, C, D | all | 5,000 | 100,000 | 22.0 | 85 | 5 |

### Auction outputs por CFDI (deterministic, ranked)

#### Caso 1 — Tortillería La Esperanza (band B, food retail, $48.5K MXN, 60d)

| Rank | Lender | APR | Advance | Speed | Qualifies | Why |
|---|---|---|---|---|---|---|
| 1 ★ | Arkangeles Fund I | 14.5% | 92% | 45min | ✓ | best combined score for B+food retail |
| 2 | Bankaool Pool A | 14.5% | 92% | 30min | ✓ | same APR/advance, slower combined score |
| 3 | Konfío Express | 22.0% | 85% | 5min | ✓ | worst rate but fastest |
| - | BBVA SME Bridge | 12.0% | 95% | 120min | ✗ | only band A |

#### Caso 2 — Confecciones Nayeli (band A, apparel, $28.2K MXN, 30d)

| Rank | Lender | APR | Advance | Speed | Qualifies | Why |
|---|---|---|---|---|---|---|
| 1 ★ | Bankaool Pool A | 14.5% | 92% | 30min | ✓ | best for A+apparel small amount |
| 2 | Arkangeles Fund I | 15.8% | 90% | 45min | ✓ | qualifies, worse rate |
| - | BBVA SME Bridge | 12.0% | 95% | 120min | ✗ | min amount $50K, este es $28K |
| - | Konfío Express | 22.0% | 85% | 5min | ✗ | only B/C/D |

#### Caso 3 — Construcciones Hermanos Ruiz (band C, construction, $156.8K MXN, 90d)

| Rank | Lender | APR | Advance | Speed | Qualifies | Why |
|---|---|---|---|---|---|---|
| 1 ★ | Arkangeles Fund I | 15.8% | 90% | 45min | ✗ (sector) | NO qualifies — sector not in allowlist |
| 2 | Konfío Express | 22.0% | 85% | 5min | ✓ | only qualifying lender |
| - | Bankaool Pool A | 14.5% | 92% | 30min | ✗ | only A, B |
| - | BBVA SME Bridge | 12.0% | 95% | 120min | ✗ | only A |

> **Demo storytelling note**: Caso 3 ilustra que NO siempre hay lender bueno — Konfío 22% es lo único disponible. Esto es **realismo**: el demo no es siempre happy-happy, también muestra que el sistema es honesto en mostrar las opciones que hay.

### Scoring formula determinista

```
base_score = match(anchor_buyer):
  tier-1 → 70
  tier-2 → 50
  unknown → 30

amount_adjust = if amount_mxn < 50000 → +5; if 50000-200000 → 0; if >200000 → -5
terms_adjust = if days_to_payment <= 30 → +10; if 31-60 → 0; if >60 → -8
sector_adjust = food_retail/+5, apparel/+3, retail/0, services/-3, construction/-8

final_score = base_score + amount_adjust + terms_adjust + sector_adjust
band = score >=80 A / >=60 B / >=40 C / <40 D
advance_rate = A 95% / B 92% / C 88% / D 80%
apr = A 12% / B 14.5% / C 18% / D 25%
```

### Claude API prompt template (W3)

```
You are a credit analyst at a Mexican factoring fintech. Given the deterministic score
output below, write a 2-sentence rationale in Spanish explaining why this invoice
received this band. Be concrete and reference specific factors (anchor buyer tier,
payment terms, sector risk). DO NOT change the score or band.

Input: amount_mxn=48500, anchor_buyer=Walmart México (tier 1),
payment_terms=60d, sector=food retail, score=74, band=B

Output: 2 sentences in Spanish, professional tone, no jargon.
```

Expected output ~30-50 words.

---

## 7. Risk register (hack-specific)

| Riesgo | Prob | Mitigación |
|---|---|---|
| Anthropic API key no disponible / costo / rate limit | media | Hybrid fallback ya cubre (template local sin AI) |
| Avalanche Fuji RPC tarda / falla en vivo | media | NEXT_PUBLIC_DEMO_MODE=true paracaídas |
| `/settle` al facilitator falla en vivo | baja | demo mode fallback |
| v2 marketplace tarda en validar agentes nuevos | baja | son nuestros, los registramos directo en Supabase |
| TREASURY wallet sin USDC suficiente en Fuji | baja | 20 USDC ya fondeado |
| Cansancio / bug nocturno | alta | dormir 23:00-02:00 sábado, demo mode siempre OK |
| Pitch live conexión / pantalla | media | video backup grabado sábado tarde |
| Agente IA del competidor sale igual de bueno | media | foco en "agent-native infra productiva" no "primero hacedlo" |

---

## 8. Out of scope (post-hack)

- Real CFDI parsing del SAT (hoy mockeado, V2 con `mensaje.sat.gob.mx` real)
- Refunds on agent failure (WKH-93 ya creado en wasiai-a2a backlog)
- Multi-step orchestration con `/orchestrate` agéntico (LLM planner) — agent-native + ReAct combinado
- Anti-fraud agent adicional (`fraud-detector` para band D)
- Insurance pool sobre lenders (modelo Goldfinch-like)
- Mainnet deploy (código ready pero requiere KYC con Bankaool real)
- Mobile app
- Dashboard de lenders (UI para que ellos manejen su pool)

---

## 9. Reference architecture (validated en wasiai-agentshop)

```
PyME (UI) ──▶ Lendable Vercel (Next.js)
                    │
                    ▼  /api/marketplace/route.ts
              wasiai-a2a /discover  ◀── 3 agents listed
                    │
                    ▼  /api/{kyc,score,match}/route.ts × 3
              wasiai-a2a /compose × 3 agents  ◀── Each call debits priceUsdc real
                    │
              TREASURY signs EIP-3009 (server-side)
                    │
                    ▼  /api/settle/route.ts
              wasiai-facilitator /settle  ◀── facilitator pays gas in AVAX
                    │
                    ▼
              Avalanche Fuji · USDC transferWithAuthorization  ◀── real tx, Snowtrace verifiable
                    │
                    ▼
              OWNER wallet receives USDC
```

Mismo pattern probado end-to-end en wasiai-agentshop con Kite Ozone + PYUSD.
Para Lendable: swap chain (Kite → Avalanche Fuji), asset (PYUSD → USDC), narrative, agents.

---

**Branch obligatorio**: `feat/wkh-lendable-agents` desde `main` el viernes 18:00.
**Pipeline a invocar**: `/nexus-auto WKH-LENDABLE-AGENTS` con este BACKLOG como input.
**Source of truth**: este documento + `doc/TRANSLATION-MATRIX.md` (qué de agentshop traducir) + `doc/CONTRACT-DESIGN.md` (Solidity spec) + `doc/AUDIT-TRAIL-SCHEMA.md` (audit JSON spec) + `doc/VIDEO-SCRIPT.md` (3-min video script) + `doc/PRODUCTION-EVIDENCE.md` (catalog evidence for video).
