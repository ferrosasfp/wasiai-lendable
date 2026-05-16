// src/core/settlement.ts
// CD-20: NO Math.random() / Date.now() here.

const USDC_DECIMALS = 6;
export const USDC_MXN_RATE = 19.85;

export function mxnToUSDC(mxn: number): number {
  return Math.round((mxn / USDC_MXN_RATE) * 100) / 100;
}

export function usdcToOnchainAmount(usdc: number): bigint {
  return BigInt(Math.round(usdc * 10 ** USDC_DECIMALS));
}

/**
 * Positional wrapper used by matching.ts auction.
 * advanceRatePct/aprPct are PERCENT integers (90 = 90%, 14 = 14%).
 * Returns USDC values (rounded to 4 decimals to keep onchain math tidy).
 */
export function computeSettlement(
  amountMXN: number,
  advanceRatePct: number,
  aprPct: number,
): { advanceUSDC: number; feeUSDC: number; netUSDC: number } {
  const grossUSDC = mxnToUSDC(amountMXN);
  const advanceUSDC = round4(grossUSDC * (advanceRatePct / 100));
  // assume 60-day term (typical PyME MX); kept as constant in pure layer
  const termDays = 60;
  const feeUSDC = round4(advanceUSDC * (aprPct / 100) * (termDays / 365));
  const netUSDC = round4(advanceUSDC - feeUSDC);
  return { advanceUSDC, feeUSDC, netUSDC };
}

export function snowtraceUrl(txHash: `0x${string}`, chainId: number): string {
  if (chainId === 43114) return `https://snowtrace.io/tx/${txHash}`;
  return `https://testnet.snowtrace.io/tx/${txHash}`;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
