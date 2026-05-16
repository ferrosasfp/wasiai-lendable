// src/core/matching.ts — REPLACE W1
// CD-19/20: pure domain — NO infra imports, NO Math.random / Date.now.
import { LENDERS_CATALOG, type LenderEntry } from "@/lib/mock-data";
import type { AuctionLender, AuctionResult } from "@/types/invoice";
import { computeSettlement } from "@/core/settlement";
import type { Band } from "@/core/scoring";

export interface MatchingInput {
  band: Band;
  amountMXN: number;
  anchorBuyer: string;
  sector: string;
}

interface Scored {
  lender: LenderEntry;
  qualifies: boolean;
  rejectionReason?: string;
  combinedScore: number;
}

function qualify(
  lender: LenderEntry,
  input: MatchingInput,
): { qualifies: boolean; rejectionReason?: string } {
  const inBand = lender.bandAllowlist.includes(input.band);
  const inSector =
    lender.sectorAllowlist === "all" || lender.sectorAllowlist.includes(input.sector);
  const inAmount = input.amountMXN >= lender.minAmountMXN && input.amountMXN <= lender.maxAmountMXN;
  if (!inBand) return { qualifies: false, rejectionReason: `only bands ${lender.bandAllowlist.join(",")}` };
  if (!inSector) return { qualifies: false, rejectionReason: "sector not in allowlist" };
  if (!inAmount) return { qualifies: false, rejectionReason: "amount out of range" };
  return { qualifies: true };
}

function combinedScoreFor(lender: LenderEntry): number {
  const aprScore = 30 - lender.aprPct;                                  // lower apr → higher score
  const advanceScore = lender.advanceRatePct;
  const speedBonus = Math.max(0, 60 - lender.speedMinutes) / 60;
  return aprScore * 0.6 + advanceScore * 0.4 + speedBonus;
}

export function runAuction(input: MatchingInput): AuctionResult {
  const scored: Scored[] = LENDERS_CATALOG.map((lender) => {
    const q = qualify(lender, input);
    return {
      lender,
      qualifies: q.qualifies,
      rejectionReason: q.rejectionReason,
      combinedScore: q.qualifies ? combinedScoreFor(lender) : -Infinity,
    };
  });

  scored.sort((a, b) => b.combinedScore - a.combinedScore);

  const auction: AuctionLender[] = scored.map((s, idx) => {
    const settlement = computeSettlement(input.amountMXN, s.lender.advanceRatePct, s.lender.aprPct);
    const auctionItem: AuctionLender = {
      lenderId: s.lender.id,
      lenderName: s.lender.name,
      aprPct: s.lender.aprPct,
      advanceRatePct: s.lender.advanceRatePct,
      estimatedSettleMinutes: s.lender.speedMinutes,
      netAmountUSDC: settlement.netUSDC,
      rank: idx + 1,
      qualifies: s.qualifies,
    };
    if (s.rejectionReason !== undefined) {
      auctionItem.rejectionReason = s.rejectionReason;
    }
    return auctionItem;
  });

  const winner = auction.find((a) => a.qualifies) ?? null;
  return {
    auction,
    recommendedLender: winner ? winner.lenderId : null,
    recommendationReason: winner
      ? `Best combined APR-advance for band ${input.band} ${input.sector}`
      : `No lender qualifies for band ${input.band} sector ${input.sector}`,
  };
}
