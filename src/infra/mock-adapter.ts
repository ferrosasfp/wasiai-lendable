import { termDays } from "@/core/invoice";
import { buildLenderMatch } from "@/core/matching";
import { computeBand, computeHeuristicScore, isAnchorBuyerTier1 } from "@/core/scoring";
import { mxnToUSDC } from "@/core/settlement";
import type {
  Invoice,
  LenderMatch,
  ScoreResult,
  SettlementReceipt,
  ValidatorResult,
} from "@/types/invoice";
import { CHAIN_ID } from "./env";

export function mockValidate(invoice: Invoice): ValidatorResult {
  return {
    isValid: true,
    cfdiUuid: invoice.uuid,
    satMatch: true,
    duplicateCheck: "clean",
  };
}

export function mockScore(invoice: Invoice): ScoreResult {
  const isAnchorTier1 = isAnchorBuyerTier1(invoice.receiver.name);
  const score = computeHeuristicScore({ isAnchorTier1, amount: invoice.amount });
  const band = computeBand(score);
  return {
    score,
    band,
    rationale: `${invoice.issuer.name} bills to ${invoice.receiver.name} (tier ${
      isAnchorTier1 ? "1 anchor buyer" : "2 buyer"
    }). 12-month payment history clean, no SAT flags.`,
    oraclePromptId: `oracle-mock-${Date.now()}`,
  };
}

export function mockMatch(invoice: Invoice, score: ScoreResult): LenderMatch {
  const grossUSDC = mxnToUSDC(invoice.amount);
  const term = termDays(invoice) || 60;
  return buildLenderMatch({ invoice, score, grossUSDC, termDays: term });
}

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
