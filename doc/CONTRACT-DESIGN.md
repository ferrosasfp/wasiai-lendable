# Smart Contract Design — `LendableInvoiceCommitments.sol`

> **Status**: planning doc (design only, no implementation).
> Contract gets deployed during the hack (W2.5 of `WKH-LENDABLE-AGENTS` pipeline).
>
> **Network**: Avalanche Fuji testnet (chainId 43113). Mainnet-ready (43114) sin cambios.
> **Solidity version**: ^0.8.20 (latest stable, matches viem default ABI).
> **Deployer**: dedicated wallet (no usar OPERATOR — separación de responsabilidades).

---

## 1. Propósito

El contrato es el **anti-fraud layer onchain** del `lendable-fraud-detector` agent. Resuelve **doble-cesión de facturas** — el problema regulatorio #1 del factoring en MX (CNBV lleva 4+ años pidiendo solución).

**Flow**:
1. PyME presenta CFDI a Lendable
2. `lendable-fraud-detector` calcula `commitmentHash = keccak256(uuid_cfdi || rfc_emisor || amount_mxn)`
3. Llama al contrato: si `committedAt[hash] != 0` → REJECT (ya fue cedida en otra plataforma)
4. Si no, llama `commitInvoice(hash)` → escribe en storage + emite event
5. La factura queda "cesionada" a Lendable hasta que el lender confirme repago

---

## 2. Interfaz pública

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract LendableInvoiceCommitments {
    // ───────── Events ─────────

    event InvoiceCommitted(
        bytes32 indexed commitmentHash,
        address indexed committer,
        uint256 timestamp,
        bytes32 metadataPointer  // IPFS CID or null — future-extensible
    );

    event InvoiceReleased(
        bytes32 indexed commitmentHash,
        address indexed releaser,
        uint256 timestamp
    );

    // ───────── Storage ─────────

    /// @notice commitmentHash → block timestamp of commitment (0 = not committed)
    mapping(bytes32 => uint256) public committedAt;

    /// @notice commitmentHash → address that committed (for governance/audit)
    mapping(bytes32 => address) public committer;

    /// @notice Optional: governance address for emergency release (multisig in prod)
    address public governance;

    // ───────── Errors ─────────

    error AlreadyCommitted(bytes32 hash, uint256 originalTimestamp);
    error NotCommitted(bytes32 hash);
    error NotAuthorized(address caller);

    // ───────── Constructor ─────────

    constructor(address _governance) {
        governance = _governance;
    }

    // ───────── Core functions ─────────

    /// @notice Commits an invoice hash. Reverts if already committed.
    /// @param commitmentHash keccak256(uuid_cfdi || rfc_emisor || amount_mxn)
    /// @param metadataPointer Optional IPFS CID with off-chain metadata (use bytes32(0) if none)
    function commitInvoice(bytes32 commitmentHash, bytes32 metadataPointer) external {
        if (committedAt[commitmentHash] != 0) {
            revert AlreadyCommitted(commitmentHash, committedAt[commitmentHash]);
        }
        committedAt[commitmentHash] = block.timestamp;
        committer[commitmentHash] = msg.sender;
        emit InvoiceCommitted(commitmentHash, msg.sender, block.timestamp, metadataPointer);
    }

    /// @notice Releases a commitment (called after repayment confirmed)
    /// @dev Only the original committer or governance can release
    function releaseInvoice(bytes32 commitmentHash) external {
        if (committedAt[commitmentHash] == 0) {
            revert NotCommitted(commitmentHash);
        }
        if (msg.sender != committer[commitmentHash] && msg.sender != governance) {
            revert NotAuthorized(msg.sender);
        }
        delete committedAt[commitmentHash];
        delete committer[commitmentHash];
        emit InvoiceReleased(commitmentHash, msg.sender, block.timestamp);
    }

    // ───────── View functions ─────────

    /// @notice Check if a commitment exists
    /// @return committed True if hash is currently committed
    /// @return timestamp Block timestamp of the commitment (0 if not committed)
    function isCommitted(bytes32 commitmentHash) external view returns (bool committed, uint256 timestamp) {
        timestamp = committedAt[commitmentHash];
        committed = timestamp != 0;
    }
}
```

---

## 3. Gas estimates (Avalanche Fuji)

| Function | Estimate | Cost en AVAX a 25 nAVAX/gas |
|---|---|---|
| `commitInvoice` (first commit) | ~55,000 gas | ~0.00138 AVAX |
| `commitInvoice` (revert AlreadyCommitted) | ~25,000 gas | ~0.000625 AVAX |
| `releaseInvoice` | ~30,000 gas | ~0.00075 AVAX |
| `isCommitted` (view) | 0 (no tx) | 0 |

Para el demo: 3 commits = ~0.005 AVAX. TREASURY wallet tiene 2.22 AVAX. Sobrado.

---

## 4. Wallet de deploy

**No usar OPERATOR** (esa es del wasiai-a2a gateway, separación de responsabilidades). Opciones:

**Opción A (recomendada)**: usar TREASURY wallet (`0x1d024Bdb20B4c3E139B8516ed6d834a9654F21cF`) para deploy + commits.
- Pro: ya fondeada, ya en uso para EIP-3009 signing
- Pro: simplificación operacional (1 wallet pa todo Lendable)
- Con: mezcla "lender role" con "fraud-detector role" — aceptable para hackathon, V2 separamos

**Opción B**: deploy con OPERATOR, commits con TREASURY. Más limpio pero requiere OPERATOR firmar el deploy (no querés tocar OPERATOR).

**Decisión para el hack**: Opción A. TREASURY deploy + TREASURY commits. Documentar como "V2 split: dedicated fraud-detector wallet".

---

## 5. Deploy strategy (Wave W2.5 del pipeline)

1. **Crear archivo** `contracts/LendableInvoiceCommitments.sol` (este código)
2. **Compilar** con `solc` o foundry/hardhat (decisión: usar **viem** + raw bytecode para evitar dependencia nueva)
3. **Deploy** vía script `scripts/deploy-commitments.ts`:
   - Lee TREASURY_PRIVATE_KEY de env
   - Crea wallet client viem para Fuji
   - Envía deploy tx con `constructor(governance=TREASURY_ADDRESS)`
   - Espera 1 confirmation
   - Output: contract address → save a `.env.local` como `LENDABLE_COMMITMENTS_ADDRESS=0x...`
4. **Verify** en Snowtrace (opcional pero da production signal):
   - `https://testnet.snowtrace.io/address/{ADDRESS}#code`
   - Source verification via Snowtrace's API (5 min)
5. **Smoke test**: llamar `isCommitted(0x0)` → returns `(false, 0)`. Demuestra el contract responde.

**Estimación de tiempo W2.5**: 1.5h (incluye design, deploy, verification, smoke).

---

## 6. Integración con el agente `lendable-fraud-detector`

### Endpoint shape

```ts
// src/app/api/agents/lendable-fraud-detector/invoke/route.ts (HACK-DAY)

POST /api/agents/lendable-fraud-detector/invoke
Input: {
  uuidCfdi: string;       // UUID format
  rfcEmisor: string;      // RFC del SAT
  amountMXN: number;
}
Output:
  Success (no double-cession):
  {
    isUnique: true,
    commitmentHash: "0x...",
    commitTxHash: "0x...",            // tx que escribió en el contract
    snowtraceUrl: "https://testnet.snowtrace.io/tx/0x...",
    timestamp: 1715XXXXXX
  }

  Rejection (double-cession detected):
  {
    isUnique: false,
    commitmentHash: "0x...",
    originalCommitTimestamp: 1715XXXXXX,
    originalCommitter: "0x...",
    rejectReason: "INVOICE_ALREADY_COMMITTED"
  }
```

### Cost del agent (en a2a marketplace)

`priceUsdc: 0.005` USDC (entre validator $0.001 y scorer $0.05, refleja el on-chain write cost).

**Total demo cost actualizado**: $0.001 (validator) + $0.005 (fraud) + $0.05 (scorer) + $0.01 (matcher) = **$0.066** USDC por demo run. (Antes $0.061, ahora +$0.005 por el fraud-detector).

### Flow timing en demo

El fraud-detector debe correr **en paralelo** con el credit-scorer, no en serie, para no impactar tiempo total del demo (mantener "<60s" como narrative).

```
T+0:   validator starts
T+2s:  validator done → scorer + fraud-detector start IN PARALLEL
T+8s:  scorer done (LLM call ~5s)
T+5s:  fraud-detector done (RPC + commit tx ~3s)
T+8s:  matcher starts (depends on score result)
T+12s: matcher done → SME sees auction
T+25s: SME signs settle → facilitator → tx confirms
```

---

## 7. Risks específicos del contract

| Risk | Mitigation |
|---|---|
| Fuji RPC slow/timeout durante commit | Timeout 5s, fallback "fraud check skipped (network)" with warn banner. Demo mode siempre paracaídas. |
| TREASURY wallet sin gas para commit | Pre-check balance, fallback igual al de arriba. 2.22 AVAX cubre ~1600 commits sobradamente. |
| Contract revert during demo (race condition impossible — single deployer) | N/A para hackathon. V2 con multi-deployer requiere reentrancy guard. |
| Storage cost grows unbounded | Por design: `releaseInvoice` libera el slot. V1 hackathon: no release flow, V2 sí. Storage growth en demo es trivial. |
| Front-running de commits (alguien observa nuestra factura y commitea primero) | No-issue para Lendable: el hash incluye RFC del emisor (privado). Aunque MEV bot observe, no puede regenerar el hash sin RFC. |
| Gas price spike Fuji | Set `maxFeePerGas` a 50 nAVAX (2x baseline). Si supera, fallback warning. |

---

## 8. Out of scope (post-hack)

- Multi-signature governance (V2 con Safe)
- Permit-based commits (no signature needed, ya está públicamente abierto en V1)
- Cross-chain commitment (Lendable solo usa Avalanche, V2 considerar)
- Rich metadata pointer (IPFS CID con JSON estructurado del invoice)
- Slashing si committer no libera tras repago (incentive design V2)
- Subnet deployment (si Bankaool quiere su propio rail)

---

## 9. Source of truth

- This file: `/doc/CONTRACT-DESIGN.md` (planning)
- Implementation file (hack-day): `contracts/LendableInvoiceCommitments.sol`
- Deploy script (hack-day): `scripts/deploy-commitments.ts`
- Verification on chain: Snowtrace Fuji link goes to `doc/PRODUCTION-EVIDENCE.md`
