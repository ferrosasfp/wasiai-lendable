# Lendable · 39h hack plan

**Evento**: Build LATAM Fintech · Avalanche · online · solo
**Inicio**: viernes 15 de mayo · 18:00 hora MX
**Cierre**: domingo 17 de mayo · 09:00 hora MX
**Premio**: 5K USDC + viaje presencial para exponer
**Sponsors**: Avalanche · Bankaool · Arkangeles

> **Nota sobre Oracle**: originalmente considerado como integration target (Oracle GenAI para credit scoring). Decisión tomada pre-hack (2026-05-15): dropear por riesgo de signup time-boxed + region allowlist incierto para LATAM. Reemplazado por arquitectura "deterministic scoring + LLM narrative" usando Anthropic Claude API (provider-agnostic).

---

## Pre-hack (antes del 15 mayo 18:00)

Lo hago antes de que arranque el cronómetro, no cuenta en las 39h.

- [x] Repo scaffold con Next.js + agents skeleton + mock data
- [x] Push inicial a github.com/ferrosasfp/wasiai-lendable
- [x] Vercel deploy preview activo (https://wasiai-lendable.vercel.app)
- [x] Wallet de demo SME (OWNER) fondeada con AVAX testnet (Fuji) — 0.49 AVAX
- [x] Lender wallet (TREASURY) fondeada con USDC mock Fuji — 20 USDC + 2.22 AVAX
- [x] A2A_KEY Lendable creada en wasiai-a2a Supabase
- [x] wasiai-a2a multi-chain prod activo (kite-ozone-testnet + avalanche-fuji)
- [x] BACKLOG.md + TRANSLATION-MATRIX.md + README + PITCH + DEMO-FLOW + HACK-PLAN documentados (sin código de negocio)
- [ ] SQL Day-1: fondear A2A_KEY budget en chain 43113 con $10 USDC equivalent (ejecutar 18:00 sharp)
- [ ] Privkeys OWNER + TREASURY salvadas en `.env.local` (gitignored — preparar 15 min antes)
- [ ] Dry run del flujo demo en `https://wasiai-lendable.vercel.app/demo` en demo mode (verificar UI scaffolded funciona)
- [ ] Anthropic API key disponible en env (opcional — fallback determinista funciona sin él)

## Día 1 — Viernes 15 (18:00 → 23:59) · 6h

**Objetivo**: kickoff + lanzar `/nexus-auto WKH-LENDABLE-AGENTS` + completar W0-W5 (3 agentes + EIP-3009 + settle real).

- [ ] 18:00 conectar al evento + lectura final del brief + git checkout -b feat/wkh-lendable-agents
- [ ] 18:15 SQL Day-1 ejecutar (`register_a2a_key_deposit('795415ba...', 43113, 10.0)`)
- [ ] 18:20 cargar `.env.local` con OWNER_PRIVATE_KEY, TREASURY_PRIVATE_KEY, OWNER_ADDRESS, ANTHROPIC_API_KEY?
- [ ] 18:30 lanzar `/nexus-auto WKH-LENDABLE-AGENTS` con BACKLOG.md como input
- [ ] 19:00 W0 + W1 (bootstrap + mock data) done
- [ ] 20:00 W2 lendable-cfdi-validator agent endpoint done
- [ ] 21:30 W3 lendable-credit-scorer agent done (heurística + Claude rationale)
- [ ] 22:15 W4 lendable-lender-matcher agent done
- [ ] 23:15 W5 EIP-3009 signer + /settle wired
- [ ] 23:45 smoke local: 3 compose calls + 1 settle contra Fuji
- [ ] 23:59 commit + sleep

## Día 2 — Sábado 16 (08:00 → 23:59) · 16h

**Objetivo**: W6-W7 (UI translation + register agents) + W8 (pitch + video).

- [ ] 08:00 café + revisar logs del overnight
- [ ] 09:00 W6 UI translation: BrandIcon + TraceConsole + InvoicePicker + 4-phase demo page
- [ ] 11:00 W7 SQL INSERT registrar 3 agentes en v2 marketplace (slug, priceUsdc, payment.chain=avalanche-fuji, payment.asset=USDC, endpoint URL pointing a Lendable Vercel)
- [ ] 12:00 deploy Vercel con env vars prod (NEXT_PUBLIC_DEMO_MODE=false, A2A_KEY, TREASURY_PRIVATE_KEY, etc)
- [ ] 13:00 smoke E2E contra prod: /discover from Lendable → /compose × 3 (verificar debit $0.061) → /settle real tx Fuji
- [ ] 13:30 capturar tx hash + Snowtrace link → `doc/EVIDENCE.md`
- [ ] 14:00 lunch
- [ ] 15:00 pulir UI demo (animaciones, colores, copy) — solo si E2E PASS
- [ ] 17:00 grabar video demo 90s (backup por si falla la red en vivo)
- [ ] 19:00 ensayo pitch 5min × 1 + ajustes
- [ ] 21:00 ensayo timing × 3
- [ ] 23:00 commit + sleep

## Día 3 — Domingo 17 (00:00 → 09:00) · 9h

**Objetivo**: bugfix + submit + pitch.

- [ ] 02:00 wake + revisar deploy + checks finales
- [ ] 03:00 contingencia si algo se rompe (rollback a demo mode si necesario)
- [ ] 05:00 último ensayo del pitch
- [ ] 06:00 submission al portal del hackathon
- [ ] 07:00 prep final del pitch + screen share check
- [ ] 09:00 pitch en vivo

---

## Reglas inviolables durante el hack

1. **No reescribir wasiai-a2a / wasiai-facilitator durante el hack.** Solo consumirlos. Si algo del facilitator no funciona en Fuji, fallback a demo mode antes que arreglarlo en vivo.
2. **TypeScript strict.** Cero `any` aunque sea hackathon.
3. **Cada commit deja el build verde.** Si rompo el build, lo arreglo antes del siguiente cambio.
4. **Demo mode siempre disponible.** El env `NEXT_PUBLIC_DEMO_MODE=true` debe permitir correr el flujo completo sin red ni wallets. Es mi paracaídas para el pitch.
5. **Si me empantano en algo más de 90 min, switcho de scope.** Mejor terminar todo en demo mode que tener una pieza real y el resto roto.

---

## Riesgos y mitigación

| Riesgo | Probabilidad | Mitigación |
|--------|--------------|-----------|
| Anthropic API key / rate limit / no disponible | media | Hybrid fallback ya cubre (template determinista local sin AI). Demo no cambia. |
| Fuji RPC se cae | baja | `NEXT_PUBLIC_DEMO_MODE=true` paracaídas funciona offline |
| wasiai-facilitator falla durante demo | baja | demo mode fallback con tx hash determinista |
| wasiai-a2a tarda en validar agentes nuevos | baja | son míos, los registro directo en Supabase |
| TREASURY wallet sin USDC en Fuji | baja | 20 USDC ya fondeado · faucet circle.com como backup |
| Lendable A2A_KEY sin budget Avalanche | baja | SQL Day-1 a las 18:00 + cap $50/day |
| Cansancio domingo 04:00 | alta | dormir 23:00 a 02:00 sábado/domingo |
| El pitch en vivo se cuelga | media | video backup de 90s grabado el sábado |

---

## Entregables hackathon

- [ ] Repo público con README + demo flow
- [ ] Vercel deploy live
- [ ] 1 tx hash real en Fuji visible en el demo
- [ ] Pitch 5 min en español
- [ ] Video backup 90s
- [ ] Slide deck (`doc/PITCH.md` → keynote)

---

## Post-hack (independientemente del resultado)

- Publicar caso de uso en blog wasiai.io
- LinkedIn post con tx hash + lessons learned
- Convertir el código de demo mode en template open source para futuros hackathons
