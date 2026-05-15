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
| Pipeline NexusAgil | QUALITY AUTO en una sola HU `WKH-LENDABLE-AGENTS` con waves W0..W7 | Time-boxed: 39h hack. Una pipeline integral > múltiples HUs cada una con full ceremony. |
| Demo UI | 4-phase narrative + TraceConsole + PipelineProgress (mismo pattern agentshop) | UX validada con jurados Kite |
| Safety cap | `ONCHAIN_AMOUNT_CAP_USDC=0.05` | Mismo cap que agentshop (testnet finito, USDC faucet limitado) |
| Demo mode paracaídas | `NEXT_PUBLIC_DEMO_MODE=true` flag preservado | Si Fuji RPC o facilitator caen en vivo, demo determinista funciona offline |

---

## 2. Master HU — `WKH-LENDABLE-AGENTS`

**Objetivo**: 3 agentes Lendable componibles via wasiai-a2a + EIP-3009 settlement real en Avalanche Fuji + demo UI + smoke E2E con tx hash real visible en Snowtrace, todo listo para pitch el domingo 09:00.

**Pipeline**: QUALITY AUTO (clinical reviews reemplazan gates humanos)
**Estimación**: 4-6h trabajo neto (viernes 18:00 → sábado 14:00) + sábado tarde para pulido + ensayo
**Branch**: `feat/wkh-lendable-agents`
**Repo**: `/home/ferdev/.openclaw/workspace/wasiai-lendable`

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

### W2 — Agent endpoint #1: lendable-cfdi-validator ($0.001) (45min)
- `src/app/api/agents/lendable-cfdi-validator/invoke/route.ts` — POST handler con shape `{ senderName, amountMXN, anchorBuyer, uuidSat }` → returns `{ isCompliant, policyId, signedAt }`
- Lógica determinista (sin AI): check uuid format, amount > 0, anchorBuyer in registered tier-1 set, no duplicate uuid in seen-set (in-memory)
- `src/application/validate-invoice.ts` use case con isDemoMode() dispatch
- Tests unit minimal (3-5 happy + error paths)
- Validación: `curl POST /api/agents/lendable-cfdi-validator/invoke` retorna 200 con shape correcto

### W3 — Agent endpoint #2: lendable-credit-scorer ($0.05) (90min)
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

### W4 — Agent endpoint #3: lendable-lender-matcher ($0.01) (45min)
- `src/app/api/agents/lendable-lender-matcher/invoke/route.ts`
- Input shape: `{ band, amountMXN, anchorBuyer, sector }` → returns `{ lenderId, lenderName, advanceRatePct, aprPct, netAmountUSDC, estimatedSettleMinutes }`
- Lógica determinista (sin AI): filter lenders por band-allowlist + sector-allowlist + amount-range → score por (apr-rate × 0.6 + advance-rate × 0.4) → top pick
- `src/core/matching.ts` con la lógica + lender catalog
- `src/application/match-lender.ts` use case
- Validación: input determinista produce siempre mismo lender

### W5 — EIP-3009 signing server-side + settlement (60min)
- `src/infra/eip3009-signer.ts` (NEW, copy pattern de agentshop) — recibe USDC token address, sender (TREASURY priv key), receiver (OWNER address), amount, deadline → returns signed EIP-712 typed data
- `src/app/api/settle/route.ts` — POST handler que invoca eip3009-signer + manda al wasiai-facilitator `/settle`
- Cap safety: `ONCHAIN_AMOUNT_CAP_USDC=0.05` (env var) — reject si amount > cap, mostrar "testnet cap" en UI
- Validación: smoke test contra Fuji con TREASURY → recibo OWNER, tx hash visible en Snowtrace

### W6 — Demo UI translation (60min)
- `src/components/BrandIcon.tsx` (NEW) — SVG branded Lendable
- `src/components/TraceConsole.tsx` (NEW, copy pattern de agentshop)
- `src/components/PipelineProgress.tsx` ya existe — adapt agent names
- `src/components/Settlement.tsx` ya existe — adapt
- `src/app/page.tsx` — landing con narrativa "Tortillería La Esperanza factura a Walmart"
- `src/app/demo/page.tsx` — 4 phases:
  - Phase 0: marketplace `/discover` (mostrar 3 lendable-* agents en `payment.chain=avalanche-fuji`)
  - Phase 1: usuario selecciona CFDI (1 de 3 pre-loaded)
  - Phase 2: 3 calls /compose en sequence (validator → scorer → matcher) — trace visible
  - Phase 3: Sign & Settle — EIP-3009 + facilitator → Snowtrace link
- Validación: dry-run UI completo en demo mode (sin red) → 4 phases visibles + trace populated

### W7 — Register agents en v2 marketplace + smoke real tx (45min)
- SQL INSERT (or v2 admin UI): registrar 3 agentes en `agents` table con:
  - slug, name, description, capabilities, priceUsdc, payment.chain=avalanche-fuji, payment.asset=USDC, endpoint URL pointing a Lendable Vercel deploy
- Smoke flow `NEXT_PUBLIC_DEMO_MODE=false` contra Lendable Vercel + a2a prod + facilitator + Fuji:
  - `/discover` returns 3 lendable-* agents
  - `/compose × 3` cada uno debita el priceUsdc real (post-WKH-59) → total $0.061 desde Lendable A2A_KEY budget
  - `/settle` produce tx hash real en Snowtrace
- Validación: tx hash documentado en `doc/EVIDENCE.md` con link Snowtrace

### W8 — Pitch + video backup + submission (sábado tarde)
- Polish `doc/PITCH.md` (drop Oracle ya hecho pre-hack)
- Grabar video 90s del demo en demo mode (paracaídas si demo en vivo falla)
- Ensayo timing pitch 5min × 3 veces
- Slide deck (opcional) basado en PITCH.md
- Submission al portal del hackathon

---

## 4. Acceptance Criteria (master, EARS)

- **AC-1**: WHEN PyME selecciona un CFDI en `/demo` THEN UI dispara 3 calls `/compose` sequencial (validator → scorer → matcher) contra wasiai-a2a en chain `avalanche-fuji`.
- **AC-2**: WHEN los 3 agents responden 200 OK THEN Lendable A2A_KEY budget se decrementa por `$0.001 + $0.05 + $0.01 = $0.061` USDC equivalent (debit via WKH-59 pricing real).
- **AC-3**: WHEN credit-scorer corre 2 veces con misma input THEN retorna mismo `score` y `band` (determinismo demo).
- **AC-4**: WHEN `ANTHROPIC_API_KEY` está seteada AND lendable-credit-scorer corre THEN el `rationale` field es generado por Claude. WHEN no está o falla THEN fallback a template local.
- **AC-5**: WHEN usuario click "Sign & Settle" THEN EIP-3009 typed data firmado server-side con TREASURY_PRIVATE_KEY → POST `/settle` al wasiai-facilitator → tx submitted a Avalanche Fuji.
- **AC-6**: WHEN settlement succeeds THEN UI muestra tx hash + link a Snowtrace + amount USDC delivered (net of fees).
- **AC-7**: WHEN amount > `ONCHAIN_AMOUNT_CAP_USDC` (0.05) THEN UI muestra "testnet cap — mainnet would settle full $X" sin gatillar tx (safety).
- **AC-8**: WHEN `NEXT_PUBLIC_DEMO_MODE=true` THEN flow completo corre con mocks deterministas, sin red ni wallets — paracaídas para pitch live.
- **AC-9**: WHEN `/discover` se llama desde Lendable A2A_KEY THEN devuelve los 3 lendable-* agents con `payment.chain=avalanche-fuji`, `payment.asset=USDC`, y priceUsdc correcto.
- **AC-10**: WHEN hack-day acaba THEN al menos 1 tx hash real en Snowtrace Fuji está documentado en `doc/EVIDENCE.md` + visible en deploy live.

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

### Lenders catalog (pool inversores)

| ID | Name | Band allowlist | Sector allowlist | Min amount MXN | Max amount MXN | APR % | Advance % |
|---|---|---|---|---|---|---|---|
| lender-bankaool | Bankaool Pool A | A, B | all | 10,000 | 500,000 | 14.5 | 92 |
| lender-arkangeles-i | Arkangeles Fund I | A, B, C | food retail, apparel | 5,000 | 200,000 | 15.8 | 90 |
| lender-bbva-sme | BBVA SME Bridge | A | all | 50,000 | 1,000,000 | 12.0 | 95 |
| lender-konfio | Konfío Express | B, C, D | all | 5,000 | 100,000 | 22.0 | 85 |

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
**Source of truth**: este documento + `doc/TRANSLATION-MATRIX.md` (qué de agentshop traducir).
