// src/application/mock-adapter.ts — CR fix BLQ-MED CR-1.
// Moved out of `src/infra/` (was violating CD-19: `infra` may not import
// `core`). Application is the correct home: it orchestrates core (pure rules)
// and may also depend on infra primitives (env, chain id).
// Layer order is now clean: app → application → { infra, core }.
// New W1 helpers (mockFraudCheck, mockAuction) are deterministic — no Math.random().
import { keccak256, encodePacked } from "viem";
import { termDays } from "@/core/invoice";
import { computeBand, computeHeuristicScore, isAnchorBuyerTier1, computeScore } from "@/core/scoring";
import { mxnToUSDC } from "@/core/settlement";
import { runAuction } from "@/core/matching";
import type {
  AuctionResult,
  Invoice,
  LenderMatch,
  ScoreResult,
  SettlementReceipt,
  ValidatorResult,
} from "@/types/invoice";
import { CHAIN_ID } from "@/infra/env";

export function mockValidate(invoice: Invoice): ValidatorResult {
  return {
    isValid: true,
    cfdiUuid: invoice.uuid,
    satMatch: true,
    duplicateCheck: "clean",
  };
}

export function mockScore(invoice: Invoice): ScoreResult {
  // Deterministic — use new computeScore() pipeline.
  const scored = computeScore({
    amountMXN: invoice.amount,
    anchorBuyer: invoice.anchorBuyer,
    paymentTermsDays: invoice.paymentTermsDays,
    sector: invoice.sector,
  });
  const isAnchorTier1 = isAnchorBuyerTier1(invoice.receiver.name);
  return {
    score: scored.score,
    band: scored.band,
    advanceRatePct: scored.advanceRatePct,
    aprPct: scored.aprPct,
    rationale: `${invoice.issuer.name} factura a ${invoice.receiver.name} (tier ${
      isAnchorTier1 ? "1 anchor buyer" : "2 buyer"
    }). Banda determinista ${scored.band} basada en sector, monto y plazo.`,
    rationaleProvenance: "local-fallback",
  };
}

export function mockMatch(invoice: Invoice, score: ScoreResult): LenderMatch {
  // Use auction winner as legacy LenderMatch shape (backwards compat for old /api/match route).
  const auction = runAuction({
    band: score.band,
    amountMXN: invoice.amount,
    anchorBuyer: invoice.anchorBuyer,
    sector: invoice.sector,
  });
  const winner = auction.auction.find((a) => a.qualifies);
  const grossUSDC = mxnToUSDC(invoice.amount);
  if (!winner) {
    return {
      lenderId: "no-match",
      lenderName: "Sin lender que califique",
      advanceRate: 0,
      rateAPR: 0,
      estimatedSettlement: { grossUSDC, feeUSDC: 0, netUSDC: 0 },
    };
  }
  return {
    lenderId: winner.lenderId,
    lenderName: winner.lenderName,
    advanceRate: winner.advanceRatePct / 100,
    rateAPR: winner.aprPct,
    estimatedSettlement: {
      grossUSDC,
      feeUSDC: round4(grossUSDC * (winner.advanceRatePct / 100) - winner.netAmountUSDC),
      netUSDC: winner.netAmountUSDC,
    },
  };
}

// CD-20 reminder: mockSettle uses Math.random() / Date.now() — this is OK in
// src/infra/* (just NOT in src/core/*). Demo mode only.
export function mockSettle(
  match: LenderMatch,
  smeWallet: `0x${string}`,
  lenderWallet: `0x${string}`,
): SettlementReceipt {
  const fakeHash = ("0x" +
    Array.from({ length: 64 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join(
      "",
    )) as `0x${string}`;

  return {
    txHash: fakeHash,
    chainId: CHAIN_ID,
    blockNumber: 35000000 + Math.floor(Math.random() * 100000),
    from: lenderWallet,
    to: smeWallet,
    amountUSDC: match.estimatedSettlement.netUSDC,
    facilitator: "wasiai-facilitator (demo mode)",
  };
}

// --- W1 helpers used by /api/agents endpoints (mock paths for CD-3) -------

export function mockFraudCheck(input: {
  uuidCfdi: string;
  rfcEmisor: string;
  amountMXN: number;
}) {
  const hash = keccak256(
    encodePacked(
      ["string", "string", "uint256"],
      [input.uuidCfdi, input.rfcEmisor, BigInt(input.amountMXN)],
    ),
  );
  return {
    isUnique: true,
    commitmentHash: hash,
    commitTxHash: "0xMOCK_FRAUD_TX_HASH_DEMO_MODE" as `0x${string}`,
    snowtraceUrl: "https://testnet.snowtrace.io/tx/0xMOCK_FRAUD_TX_HASH_DEMO_MODE",
    blockNumber: 99999999,
    timestamp: 1715800000,
  };
}

export function mockAuction(input: {
  amountMXN: number;
  anchorBuyer: string;
  paymentTermsDays: number;
  sector: string;
}): AuctionResult {
  const { band } = computeScore(input);
  return runAuction({
    band,
    amountMXN: input.amountMXN,
    anchorBuyer: input.anchorBuyer,
    sector: input.sector,
  });
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

// keep termDays/legacy heuristic helpers referenced for back-compat
export { termDays, computeBand, computeHeuristicScore };
