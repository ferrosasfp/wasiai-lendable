# Cobraya — Post-Hackathon Roadmap V1

**Estado**: planificado en Jira (proyecto WKH, prefijo "HL ·") · ejecución 100% post-submisión del hackathon LatAm Institucional (deadline 17-may-2026).

**Objetivo final**: **100% de las stories completadas post-hackathon.** No es opcional — es la diferencia entre "demo de hackathon" y "producto auditable" frente a CNBV, lenders institucionales y auditores fiscales.

---

## Epic raíz

**[WKH-94](https://ferrosasfp.atlassian.net/browse/WKH-94)** — HL · Cobraya — Post-Hackathon Roadmap V1: production-grade agents

---

## Stories (status snapshot)

| ID | Item | Jira | Status | Esfuerzo | Riesgo |
|---|---|---|---|---|---|
| A1 | fraud-detector verify prod + 3 tx reales en Snowtrace | (pre-Jira) | ✅ DONE | 1.5h | bajo |
| A2 | cfdi-validator: parsear XML real del SAT + dedup en Supabase | [WKH-95](https://ferrosasfp.atlassian.net/browse/WKH-95) | 📋 TODO | 3.5-4h | medio |
| A3-mini | lender-matcher: 1 wallet EOA (Arkangeles) firmando EIP-712 — patrón demostrado | [WKH-99](https://ferrosasfp.atlassian.net/browse/WKH-99) | 📋 TODO | 1.5h | bajo |
| A3 | lender-matcher: 4 EOAs reales firmando EIP-712 (completa lo de A3-mini) | [WKH-96](https://ferrosasfp.atlassian.net/browse/WKH-96) | 📋 TODO | 3h (post-A3-mini) | medio |
| A4 (3 opciones) | credit-scorer mejorado — **elegir UNA opción post-hack** | — | 📋 TODO | 1-2.5h | bajo |
| ↳ A4 original | + 5 factores nuevos (2 mocked) | [WKH-97](https://ferrosasfp.atlassian.net/browse/WKH-97) | 📋 TODO | 2-2.5h | bajo |
| ↳ A4-reducido | + 3 factores reales (sin mocks) | [WKH-100](https://ferrosasfp.atlassian.net/browse/WKH-100) | 📋 TODO | ~1h | bajo |
| ↳ A4-alt ⭐ | audit-grade explainability del modelo actual | [WKH-101](https://ferrosasfp.atlassian.net/browse/WKH-101) | 📋 TODO | ~1.5h | bajo |
| A5 | /transparencia page pública | [WKH-98](https://ferrosasfp.atlassian.net/browse/WKH-98) | 📋 TODO | 1.5-2h | bajo |
| A6 | /pitch landing (varias iteraciones) | (pre-Jira) | ✅ DONE | n/a | n/a |

**Total esfuerzo para 100% (escenario A4-alt recomendado)**: 1.5 + 4 + 1.5 + 3 + 1.5 = **11.5h de Dev** (≈ 3 días de trabajo enfocado).

### Decisión pendiente: cuál A4 ejecutar (mutuamente excluyentes)

| Opción | Esfuerzo | Defensibilidad | Cuándo elegirla |
|---|---|---|---|
| **A4 original** ([WKH-97](https://ferrosasfp.atlassian.net/browse/WKH-97)) | 2-2.5h | Media (2 factores mocked se notan) | Solo si la audiencia post-hack no es técnica |
| **A4-reducido** ([WKH-100](https://ferrosasfp.atlassian.net/browse/WKH-100)) | ~1h | Alta (3 factores 100% reales) | Si el goal es profundidad sin mocks |
| **A4-alt** ([WKH-101](https://ferrosasfp.atlassian.net/browse/WKH-101)) ⭐ | ~1.5h | Muy alta (explainability + sensitivity + versioning) | **Recomendada**. Lo que un regulador realmente pide |

---

## Orden de ejecución sugerido

1. **A5** ([WKH-98](https://ferrosasfp.atlassian.net/browse/WKH-98)) — quick win, riesgo bajo, página `/transparencia` con tx history público. ~2h.
2. **A2** ([WKH-95](https://ferrosasfp.atlassian.net/browse/WKH-95)) — el más urgente regulatoriamente (sello SAT real). ~4h.
3. **A3-mini** ([WKH-99](https://ferrosasfp.atlassian.net/browse/WKH-99)) — demuestra patrón con 1 lender (Arkangeles), construye el helper que A3 completo va a reutilizar. ~1.5h.
4. **A3** ([WKH-96](https://ferrosasfp.atlassian.net/browse/WKH-96)) — extiende A3-mini a los 4 lenders. ~3h (baja de 4.5-5h gracias al helper de A3-mini).
5. **A4 (la opción elegida)** — WKH-101 (A4-alt) recomendado, WKH-100 (A4-reducido) alternativa, WKH-97 (A4 original) menos defendible.

---

## Por qué este roadmap importa

Cada story cierra un gap entre "lo que el pitch dice" y "lo que el código realmente hace". Para audiencias críticas (CNBV, abogados fiscales, risk officers institucionales), estos gaps son la diferencia entre "demo de hackathon" y "producto auditable".

### A2 — el más urgente regulatorio
El pitch dice "valida con el SAT" pero hoy confía en los campos parseados del caller. Implementar XML parser + verificación criptográfica del SelloSAT convierte el claim en algo demostrable. Sin esto, piloto CNBV pide "muéstrenme cómo verifican el sello".

### A3-mini + A3 — el más urgente para partnerships
El pitch dice "4 ofertas firmadas EIP-712" pero solo hay 1 firma global del matcher. A3-mini implementa una wallet (Arkangeles) firmando — demuestra el patrón con 30% del tiempo. A3 completa para los 4 lenders.

### A4 — 3 opciones, elegir post-hack
- **A4 original** (WKH-97): + 5 factores (2 mocked). Más sofisticación aparente. 2-2.5h.
- **A4-reducido** (WKH-100): + 3 factores REALES (RFC age + sector volatility INEGI + historial Cobraya). Sin mocks. ~1h.
- **A4-alt** (WKH-101) ⭐: explainability del modelo actual (breakdown, sensitivity analysis, model versioning). Lo que un regulador realmente pide. ~1.5h.

**Recomendación**: A4-alt. Defensibilidad regulatoria > sofisticación aparente. Ver descripciones detalladas en cada story de Jira.

### A5 — el más vendedor visualmente
Página pública con histórico de todas las tx del demo. Para auditor regulatorio o investment officer, ver "X commits en N días" dice más que cualquier deck.

---

## Métrica de éxito del V1 (100%)

Cuando todas las stories estén DONE, cualquier mentor / auditor que abra el repo + corra el demo + lea `/transparencia` debe poder verificar end-to-end:

1. ✅ El CFDI fue validado contra el SAT (firma criptográfica real)
2. ✅ El hash quedó committed on-chain en Avalanche Fuji (A1 ya hecho)
3. ✅ Las 4 ofertas de lenders vienen firmadas por 4 wallets distintas
4. ✅ El credit-scorer es auditable según la opción A4 elegida (factores reales y/o breakdown + sensitivity)
5. ✅ El histórico de uso del producto es público y visible

Sin más mocks, sin claims falsos, sin teatro.

---

## Constraints transversales

- **CD-1**: TypeScript strict, sin `any`
- **CD-2**: `npm test` + `npm run build` verdes pre-merge
- **CD-4**: NO modificar `wasiai-a2a`, `wasiai-facilitator`, `wasiai-v2`
- **CD-5**: Cap `ONCHAIN_AMOUNT_CAP_USDC=0.05` honrado en cualquier settlement
- **CD-6**: NO commits con `--no-verify`
- **CD-7**: Co-Authored-By Claude en commits
- **CD-9**: NO leak de `owner_ref`, private keys, o A2A_KEY hash en logs
- **CD-18**: mobile-first ≥360px, touch targets ≥48px
- **CD-30**: NO tocar `src/core/*` directamente — extender via `src/infra/` o `src/lib/`
- **WKH-53**: Ownership Guard — toda query/mutación sobre `a2a_agent_keys` filtra por `owner_ref`

---

## Mantenimiento

Este doc se actualiza cuando una story se marca DONE en Jira. Para chequear el estado real consultá Jira directamente — este doc es snapshot, no source of truth.

**Última actualización**: 2026-05-16 (post-A4 variantes creación, pre-submission hackathon)
