# Fraud Detector — Production Evidence (Avalanche Fuji)

**Purpose**: documentar 3 transacciones reales del agente `cobraya-fraud-detector` ejecutadas contra el contrato productivo `CobrayaInvoiceCommitments.sol` en Avalanche Fuji. Cualquier mentor / juez / auditor puede abrir los links de Snowtrace y verificar la cadena de evidencia end-to-end.

**Contrato target**: [`0x5F8F8a31e51d8B2FEe0E0C2f1AffC3B4c6B12506`](https://testnet.snowtrace.io/address/0x5F8F8a31e51d8B2FEe0E0C2f1AffC3B4c6B12506) (verificado en Snowtrace · ContractName `CobrayaInvoiceCommitments` · Solidity 0.8.24)

**Wallet committer** (TREASURY): [`0x1d024Bdb20B4c3E139B8516ed6d834a9654F21cF`](https://testnet.snowtrace.io/address/0x1d024Bdb20B4c3E139B8516ed6d834a9654F21cF)

**Método**: cada run ejecutó `commitInvoice(bytes32 invoiceHash)` con el hash SHA-256 del CFDI sintético procesado. La función es idempotente — un mismo hash committeado dos veces hace revert (anti doble-cesión).

---

## Run 1 · Tortillería La Esperanza · Walmart · $48,500 MXN

| Campo | Valor |
|---|---|
| **CFDI emisor** (masked) | `TLE8***` |
| **Anchor buyer** | Walmart México (tier-1, food retail) |
| **Monto** | $48,500 MXN |
| **Plazo** | 60 días |
| **Score / Banda** | 80 / A |
| **CFDI hash committeado** | `0x7b2bee36e3a7c87f0f5017377ece88b91dfc65976637bc5a906a26bed84867b8` |
| **Tx hash on-chain** | [`0x95dcbf3811f2749d0c0a3d1e75bdeef310ba42be1a281778452355bff05cfcc3`](https://testnet.snowtrace.io/tx/0x95dcbf3811f2749d0c0a3d1e75bdeef310ba42be1a281778452355bff05cfcc3) |
| **Block** | 55415097 |
| **Gas usado** | 51,392 (≪ límite CD-11 de 80K) |
| **Status** | ✅ Confirmed |
| **Latencia total pipeline** | 6.3 segundos (4 agentes) |
| **Costo total** | 0.066 USDC |
| **JSON crudo** | [`doc/evidence/run-1-Tortilleria_La_Esperanza.json`](evidence/run-1-Tortilleria_La_Esperanza.json) |

---

## Run 2 · Confecciones Nayeli · Apparel · $28,200 MXN

| Campo | Valor |
|---|---|
| **CFDI emisor** (masked) | `CNA9***` |
| **Anchor buyer** | Bimbo (tier-1, apparel) |
| **Monto** | $28,200 MXN |
| **Plazo** | 30 días |
| **Score / Banda** | 88 / A |
| **CFDI hash committeado** | `0x06ed16e9257f141c0f2d69c19636d41fa4ed4cc61c648fd1fcee22721e14126f` |
| **Tx hash on-chain** | [`0xf355450ea434cc24bd64730b10022cbeda1fdc6cf5819131a1dde86a8d192bf7`](https://testnet.snowtrace.io/tx/0xf355450ea434cc24bd64730b10022cbeda1fdc6cf5819131a1dde86a8d192bf7) |
| **Block** | 55415101 |
| **Gas usado** | 51,392 |
| **Status** | ✅ Confirmed |
| **Latencia total pipeline** | 6.6 segundos |
| **Costo total** | 0.066 USDC |
| **JSON crudo** | [`doc/evidence/run-2-Confecciones_Nayeli.json`](evidence/run-2-Confecciones_Nayeli.json) |

---

## Run 3 · Construcciones Hermanos Ruiz · Construction · ~$120K MXN

| Campo | Valor |
|---|---|
| **CFDI emisor** (masked) | `CHR7***` |
| **Anchor buyer** | Cemex (tier-1, construction) |
| **Monto** | ~$120,000 MXN |
| **Plazo** | 90 días |
| **Score / Banda** | 54 / C (sector con mayor riesgo + plazo largo) |
| **CFDI hash committeado** | `0xdc133f48fcefccd1...` |
| **Tx hash on-chain** | [`0xf77c8ffdbfa9c4826f4d2db33c9621e0926e4b75eafacbf30b5ee2be4ac2bcfc`](https://testnet.snowtrace.io/tx/0xf77c8ffdbfa9c4826f4d2db33c9621e0926e4b75eafacbf30b5ee2be4ac2bcfc) |
| **Block** | 55415103 |
| **Gas usado** | 51,392 |
| **Status** | ✅ Confirmed |
| **Latencia total pipeline** | 6.4 segundos |
| **Costo total** | 0.066 USDC |
| **JSON crudo** | [`doc/evidence/run-3-Construcciones_Hermanos_Ruiz.json`](evidence/run-3-Construcciones_Hermanos_Ruiz.json) |

---

## Verificación independiente

Cualquiera puede verificar las 3 transacciones sin necesitar acceso al repo:

### Snowtrace (UI web)

Abrir cada link de "Tx hash on-chain" arriba. Snowtrace muestra:
- Status (success/failed)
- Block number + timestamp
- From / To addresses
- Method name decodificado (`commitInvoice`)
- Input data crudo (el hash SHA-256 del CFDI)
- Gas usado

### Avalanche RPC (programmatic)

```bash
TX="0x95dcbf3811f2749d0c0a3d1e75bdeef310ba42be1a281778452355bff05cfcc3"
curl -s -X POST -H "Content-Type: application/json" \
  --data "{\"jsonrpc\":\"2.0\",\"method\":\"eth_getTransactionReceipt\",\"params\":[\"$TX\"],\"id\":1}" \
  https://api.avax-test.network/ext/bc/C/rpc | jq
```

Resultado esperado:
- `"status": "0x1"` (success)
- `"to": "0x5f8f8a31e51d8b2fee0e0c2f1affc3b4c6b12506"` (contrato Cobraya)
- `"from": "0x1d024bdb20b4c3e139b8516ed6d834a9654f21cf"` (TREASURY)
- `"blockNumber"` matches con la tabla
- `"logs"`: 1 evento `InvoiceCommitted(bytes32 indexed invoiceHash, address indexed committer, uint256 timestamp)`

---

## Lo que esta evidencia prueba

| Claim del pitch | Evidencia |
|---|---|
| "Smart contract en Avalanche Fuji" | ✅ Contrato verificado en Snowtrace, ChainID 43113 |
| "Anti doble-cesión on-chain" | ✅ 3 hashes distintos commiteados, función pública `commitInvoice` |
| "Gas < 80K por commit" (CD-11) | ✅ Real: 51,392 gas por tx (~36% under cap) |
| "Cobraya commitea el hash on-chain antes del settlement" | ✅ Las 3 tx ejecutadas por TREASURY antes de cualquier settlement |
| "Latencia agéntica < 10s" | ✅ Real: 6.3-6.6s para los 4 agentes |
| "Audit trail verificable offline" | ✅ JSON crudo en `doc/evidence/run-*.json` con receipts EIP-712 firmados |

---

## Reproducir las corridas

Las 3 evidencias se generaron a través del flujo real del agente, no manualmente. Reproducible vía:

```bash
# Hit el endpoint público del agente
curl -X POST https://wasiai-cobraya.vercel.app/api/agents/cobraya-fraud-detector/invoke \
  -H "Content-Type: application/json" \
  -H "x-a2a-key: <A2A_KEY>" \
  -d '{"cfdiHash": "0x...64-char-hex..."}'
```

Cada call con un hash distinto genera una nueva tx on-chain. El hash debe ser único — si se repite, el contrato hace revert con `INVOICE_ALREADY_COMMITTED`.

---

## Para el jurado / auditor regulatorio

Si vienen a auditar la trazabilidad agéntica de Cobraya, este documento más los 3 links de Snowtrace son suficientes para confirmar:

1. **Existe un contrato en Avalanche Fuji** (verificado, código público auditable)
2. **El contrato hace lo que el pitch dice** (commit hash, anti-doble cesión)
3. **Cobraya está usando el contrato en producción** (3 tx reales desde TREASURY)
4. **El gas es razonable** (51K vs 80K cap, ~36% under)
5. **Cada decisión agéntica queda registrada** (receipts EIP-712 + tx hash on-chain)

Esta evidencia es **inmutable** — vive en Avalanche, no puede ser modificada por nosotros ni por nadie. Hoy, en 1 año, en 5 años: las 3 tx van a seguir ahí.

---

**Última actualización**: 2026-05-16
**Próximas runs**: cada vez que un usuario corre el `/demo` público con `NEXT_PUBLIC_DEMO_MODE=false`, se genera una nueva tx on-chain. Las del demo público quedan en Snowtrace pero no son trackeadas aquí — este documento es solo para los 3 runs canónicos del hackathon.
