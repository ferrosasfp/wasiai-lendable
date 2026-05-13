const USDC_DECIMALS = 6;
export const USDC_MXN_RATE = 19.85;

export function mxnToUSDC(mxn: number): number {
  return Math.round((mxn / USDC_MXN_RATE) * 100) / 100;
}

export function usdcToOnchainAmount(usdc: number): bigint {
  return BigInt(Math.round(usdc * 10 ** USDC_DECIMALS));
}

export function computeSettlement(args: {
  grossUSDC: number;
  advanceRate: number;
  rateAPR: number;
  termDays: number;
}): { advancedUSDC: number; feeUSDC: number; netUSDC: number } {
  const advancedUSDC = round2(args.grossUSDC * args.advanceRate);
  const feeUSDC = round2(advancedUSDC * (args.rateAPR / 100) * (args.termDays / 365));
  const netUSDC = round2(advancedUSDC - feeUSDC);
  return { advancedUSDC, feeUSDC, netUSDC };
}

export function snowtraceUrl(txHash: `0x${string}`, chainId: number): string {
  if (chainId === 43114) return `https://snowtrace.io/tx/${txHash}`;
  return `https://testnet.snowtrace.io/tx/${txHash}`;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
