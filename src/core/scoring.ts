export const ANCHOR_BUYERS_TIER_1 = [
  "Walmart",
  "OXXO",
  "Palacio",
  "Liverpool",
  "Coppel",
] as const;

export function isAnchorBuyerTier1(receiverName: string): boolean {
  const lower = receiverName.toLowerCase();
  return ANCHOR_BUYERS_TIER_1.some((a) => lower.includes(a.toLowerCase()));
}

export function computeBand(score: number): "A" | "B" | "C" | "D" {
  if (score >= 80) return "A";
  if (score >= 70) return "B";
  if (score >= 55) return "C";
  return "D";
}

export function computeHeuristicScore(args: { isAnchorTier1: boolean; amount: number }): number {
  const base = args.isAnchorTier1 ? 75 : 55;
  const sizeBonus = args.amount > 200000 ? 10 : args.amount > 100000 ? 5 : 0;
  return Math.min(95, base + sizeBonus);
}
