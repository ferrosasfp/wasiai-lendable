# Lendable — SmartFactoring agéntico para PyMEs

> Marketplace agent-native de factoraje de facturas. Validación, scoring y matching los hacen 3 agentes IA componibles vía WasiAI A2A. Settlement en USDC sobre Avalanche.

**Hackathon Build LATAM Fintech** · Avalanche · Mayo 2026 · Solo · Bankaool / Arkangeles / Oracle

---

## El problema

PyMEs mexicanas con facturas a 30/60/90 días no tienen capital de trabajo. Factoraje tradicional toma 3-7 días, requiere papeleo presencial, y el spread se queda casi entero con la financiera porque hay 4 capas humanas entre la PyME y el inversor que firma el cheque.

## La solución

Una factura entra. Tres agentes la procesan en paralelo y entregan veredicto en <60s:

1. **invoice-validator** — verifica CFDI contra el SAT (mock-Oracle), extrae monto y emisor, detecta duplicados.
2. **credit-scorer** — usa Oracle GenAI para puntuar al emisor en base a historial fiscal + buró + comportamiento de pago.
3. **lender-matcher** — busca el inversor con mejor tasa para ese perfil de riesgo en el pool de lenders activos.

Si hay match, el inversor firma una autorización gasless (EIP-3009) y nuestro facilitator settlement en USDC sobre Avalanche mainnet. La PyME recibe el cash en su wallet en segundos.

## Por qué Avalanche

- USDC nativo + finalidad sub-segundo → settlement real-time
- Sub-segundo finality permite UX de "click → cash"
- Fee predecible → la PyME ve el net amount antes de firmar
- Subnet-ready si una contraparte (banco) necesita su propio rail

## Por qué los 3 sponsors caen aquí

| Sponsor | Encaje |
|---------|--------|
| **Bankaool** | PyMEs son su core de clientes. Lendable les abre canal agéntico nuevo sin mover su core bancario. |
| **Arkangeles** | Plataforma de matching para PyMEs. Lendable es su capa de settlement onchain. |
| **Oracle** | Credit scoring corre sobre Oracle GenAI. Cada llamada del scorer paga al endpoint de Oracle. |

## Arquitectura

```
[ PyME sube CFDI ] ─→ [ Lendable UI ]
                          │
                          ▼
                  [ WasiAI A2A: /compose ]
                          │
              ┌───────────┼───────────┐
              ▼           ▼           ▼
        [validator]  [scorer]    [matcher]
            (SAT)   (Oracle AI)  (lenders)
              │           │           │
              └───────────┼───────────┘
                          ▼
                 [ veredicto + lender ]
                          │
            inversor firma EIP-3009 ─┐
                                     ▼
                       [ wasiai-facilitator ]
                                     │
                                     ▼
                       [ Avalanche · USDC settle ]
                                     │
                                     ▼
                       [ PyME wallet · cash ]
```

## Stack

- **Frontend**: Next.js 14 App Router · TypeScript strict · Tailwind
- **Agents**: 3 endpoints REST (validate / score / match) — descubiertos vía WasiAI A2A `/discover`, orquestados vía `/compose`
- **AI**: Oracle GenAI para credit scoring
- **Onchain**: viem + EIP-3009 (transferWithAuthorization) en Avalanche (Fuji para demo, mainnet code-ready)
- **Settlement**: wasiai-facilitator (self-hosted, en prod desde 2026-05)
- **Hosting**: Vercel (UI) + Railway (existing wasiai-facilitator)

## Arquitectura de capas (hexagonal-light)

```
src/
├── core/          reglas puras: scoring bands, lender catalog, fee math, mxn↔usdc
├── infra/         I/O outbound: a2a-client, oracle-client, facilitator-client, mock-adapter
├── application/   use cases: validate-invoice, score-invoice, match-lender, settle-factoring
├── app/           Next.js (UI + API routes)
├── components/    React UI
└── types/         DTOs compartidos
```

La regla de dependencia es concéntrica: `app → application → infra → core`. `core` no importa de ningún otro layer. Cada use case en `application/` hace un único dispatch en `isDemoMode()` y delega a `infra/` (real) o `infra/mock-adapter` (determinista). Eso permite que el demo corra sin red y que pasar a producción real sea cambiar una env var.

## Diseño de agentes — qué es y qué no es

Para evitar confusión común en pitches/demos agénticos:

| Concepto | ¿Aplica a Lendable? | Cómo se ve hoy |
|----------|--------------------|----------------|
| **Agent-native** (agentes discoverable + componible) | Sí | 3 agentes vía WasiAI A2A `/discover` + `/compose` |
| **Sovereign agents** (cada uno corre en su servicio) | Sí | Validator, scorer, matcher son endpoints separados |
| **Onchain settlement** (USDC + EIP-3009 + facilitator self-hosted) | Sí | Avalanche Fuji/mainnet vía wasiai-facilitator |
| **Pipeline lineal** (validator → scorer → matcher → settle, orden fijo) | Sí | Hard-coded en `src/app/demo/page.tsx` |
| **Autonomous agent** (LLM decide next action) | No | La secuencia la decide el cliente, no un LLM |
| **ReAct loop** (Reason → Act → Observe → Reason → …) | No | Cada agente es un RPC stateless, no hay loop |
| **Inter-agent reasoning** (agent A decide consultar agent B) | No | La composición la define `/compose` steps[], no los agentes mismos |

**Por qué no usamos ReAct hoy.** Tres razones, en orden de peso:

1. **Determinismo del demo.** Un pipeline fijo corre en 90 segundos exactos; un loop ReAct con LLM puede tardar 30-120s impredecibles y dar resultados diferentes en cada corrida. Eso asusta al jurado en vivo.
2. **Narrativa enfocada.** El pitch es "settlement onchain agéntico componible", no "razonamiento agéntico". Agregar ReAct dispersa la atención sin sumar al hilo de Avalanche/sponsors.
3. **Cost de iteración.** Un loop ReAct serio toma 6-10h de trabajo más QA. Esas horas las invertimos en la integración con Oracle GenAI + Bankaool, que son sponsors directos.

**Cuándo sí tiene sentido.** Post-hackathon, cuando Lendable v2 necesite:
- Ramificación condicional (banda D → llamar `fraud-detector` antes de `matcher`)
- Retry inteligente (si Oracle GenAI devuelve incertidumbre, consultar segunda fuente)
- Negociación entre agentes (lender propone tasa → matcher contra-propone)

En ese momento se agrega un `factoring-orchestrator` agéntico encima del pipeline actual sin tocar los 3 agentes existentes. La arquitectura hexagonal de hoy lo deja preparado.

## Run local

```bash
npm install
cp .env.example .env.local
npm run dev
```

Abrí `http://localhost:3000` y pasá por el flujo en `/demo`.

## Demo flow

Ver `doc/DEMO-FLOW.md` para el guión paso a paso.

## Hack plan (39h)

Ver `doc/HACK-PLAN.md` para el checklist completo.

## Pitch (español)

Ver `doc/PITCH.md` para el texto del pitch.

---

## Built on WasiAI

Lendable corre sobre infraestructura WasiAI que **ya está en producción**:

- **wasiai-a2a** — gateway A2A protocol — github.com/ferrosasfp/wasiai-a2a
- **wasiai-v2** — marketplace de agentes — github.com/ferrosasfp/wasiai-v2
- **wasiai-facilitator** — self-hosted x402 facilitator — github.com/ferrosasfp/wasiai-facilitator

Esto no es un MVP de fin de semana. Es una capa nueva sobre rails productivos con 1,660+ tests y settlements reales onchain. Ver `https://wasiai.io/evidence` para el evidence kit.

---

**Fernando Rosas** · fernando@wasiai.io · [wasiai.io](https://wasiai.io)
