// src/core/scoring.ts — REPLACE W1
// CD-20: NO Math.random() ni Date.now() en este archivo.
// CD-19: NO imports desde src/infra/*.
import { BUYERS_TIER_1 } from "@/lib/mock-data";

export type Band = "A" | "B" | "C" | "D";

export const ANCHOR_BUYERS_TIER_1 = BUYERS_TIER_1.map((b) => b.name);

export function isAnchorBuyerTier1(receiverName: string): boolean {
  const lower = receiverName.toLowerCase();
  return BUYERS_TIER_1.some((b) => lower.includes(b.name.toLowerCase()));
}

export interface ScoreInput {
  amountMXN: number;
  anchorBuyer: string;
  paymentTermsDays: number;
  sector: string;
}

export interface BandParams {
  advanceRatePct: number;
  aprPct: number;
}

function baseScoreFor(anchorBuyer: string): number {
  return BUYERS_TIER_1.some((b) => b.name === anchorBuyer) ? 70 : 30;
}

function amountAdjust(amountMXN: number): number {
  if (amountMXN < 50_000) return 5;
  if (amountMXN <= 200_000) return 0;
  return -5;
}

function termsAdjust(daysToPayment: number): number {
  if (daysToPayment <= 30) return 10;
  if (daysToPayment <= 60) return 0;
  return -8;
}

const SECTOR_ADJUST: Record<string, number> = {
  "food retail": 5,
  apparel: 3,
  retail: 0,
  services: -3,
  construction: -8,
};

function sectorAdjust(sector: string): number {
  return SECTOR_ADJUST[sector] ?? 0;
}

export function computeBand(score: number): Band {
  if (score >= 80) return "A";
  if (score >= 60) return "B";
  if (score >= 40) return "C";
  return "D";
}

const BAND_PARAMS: Record<Band, BandParams> = {
  A: { advanceRatePct: 95, aprPct: 12 },
  B: { advanceRatePct: 92, aprPct: 14.5 },
  C: { advanceRatePct: 88, aprPct: 18 },
  D: { advanceRatePct: 80, aprPct: 25 },
};

export function bandParams(band: Band): BandParams {
  return BAND_PARAMS[band];
}

export function computeScore(input: ScoreInput): {
  score: number;
  band: Band;
  advanceRatePct: number;
  aprPct: number;
} {
  const score =
    baseScoreFor(input.anchorBuyer) +
    amountAdjust(input.amountMXN) +
    termsAdjust(input.paymentTermsDays) +
    sectorAdjust(input.sector);
  const band = computeBand(score);
  const params = bandParams(band);
  return { score, band, ...params };
}

// --- Legacy helper kept for backwards compat with existing application code -
// @deprecated use computeScore() with full input shape.
export function computeHeuristicScore(args: { isAnchorTier1: boolean; amount: number }): number {
  const base = args.isAnchorTier1 ? 75 : 55;
  const sizeBonus = args.amount > 200000 ? 10 : args.amount > 100000 ? 5 : 0;
  return Math.min(95, base + sizeBonus);
}
