import type { Invoice, LenderMatch, ScoreResult } from "@/types/invoice";
import { computeSettlement } from "./settlement";

export interface LenderCatalogEntry {
  id: string;
  name: string;
  apr: number;
  advance: number;
  accepts: ReadonlyArray<"A" | "B" | "C" | "D">;
}

export const DEFAULT_LENDER_CATALOG: ReadonlyArray<LenderCatalogEntry> = [
  { id: "lnd-arkangeles-fund-i", name: "Arkangeles Fund I", apr: 14.5, advance: 0.92, accepts: ["A", "B"] },
  { id: "lnd-bankaool-sme", name: "Bankaool SME Pool", apr: 18.0, advance: 0.88, accepts: ["A", "B", "C"] },
  { id: "lnd-latam-yield-dao", name: "LATAM Yield DAO", apr: 24.0, advance: 0.80, accepts: ["B", "C", "D"] },
];

export function pickLenderForBand(
  band: ScoreResult["band"],
  catalog: ReadonlyArray<LenderCatalogEntry> = DEFAULT_LENDER_CATALOG,
): LenderCatalogEntry {
  return catalog.find((l) => l.accepts.includes(band)) ?? catalog[catalog.length - 1];
}

export function buildLenderMatch(args: {
  invoice: Invoice;
  score: ScoreResult;
  grossUSDC: number;
  termDays: number;
  catalog?: ReadonlyArray<LenderCatalogEntry>;
}): LenderMatch {
  const lender = pickLenderForBand(args.score.band, args.catalog);
  const { advancedUSDC, feeUSDC, netUSDC } = computeSettlement({
    grossUSDC: args.grossUSDC,
    advanceRate: lender.advance,
    rateAPR: lender.apr,
    termDays: args.termDays,
  });
  return {
    lenderId: lender.id,
    lenderName: lender.name,
    advanceRate: lender.advance,
    rateAPR: lender.apr,
    estimatedSettlement: {
      grossUSDC: advancedUSDC,
      feeUSDC,
      netUSDC,
    },
  };
}
