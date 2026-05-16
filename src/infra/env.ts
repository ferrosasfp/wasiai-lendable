// src/infra/env.ts
// CD-21: NO console.log de env vars. CD-9: no leak en respuestas/UI.

export const A2A_URL =
  process.env.WASIAI_A2A_URL ?? "https://wasiai-a2a-production.up.railway.app";
export const A2A_KEY = process.env.A2A_KEY ?? "";

export const FACILITATOR_URL =
  process.env.WASIAI_FACILITATOR_URL ?? "https://wasiai-facilitator-production.up.railway.app";

export const CHAIN_ID = Number(process.env.AVALANCHE_CHAIN_ID ?? process.env.CHAIN_ID ?? 43113);

export const USDC_ADDRESS = (process.env.USDC_ADDRESS ??
  "0x5425890298aed601595a70AB815c96711a31Bc65") as `0x${string}`;

// W1 additions (story §6.5).
export const TREASURY_PRIVATE_KEY = process.env.TREASURY_PRIVATE_KEY ?? "";
export const OWNER_ADDRESS = process.env.OWNER_ADDRESS ?? "";
export const FRAUD_DETECTOR_PRIVATE_KEY = process.env.FRAUD_DETECTOR_PRIVATE_KEY ?? "";
export const COBRAYA_COMMITMENTS_ADDRESS = process.env.COBRAYA_COMMITMENTS_ADDRESS ?? "";
export const ONCHAIN_AMOUNT_CAP_USDC = parseFloat(process.env.ONCHAIN_AMOUNT_CAP_USDC ?? "0.05");
export const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? "";
export const AVALANCHE_RPC_URL =
  process.env.AVALANCHE_RPC_URL ?? "https://api.avax-test.network/ext/bc/C/rpc";

// W5.5 — getter functions (lazy read so build doesn't throw on missing keys).
export function getValidatorHotKey(): string {
  return process.env.VALIDATOR_HOT_KEY ?? "";
}
export function getFraudHotKey(): string {
  return process.env.FRAUD_HOT_KEY ?? "";
}
export function getScorerHotKey(): string {
  return process.env.SCORER_HOT_KEY ?? "";
}
export function getMatcherHotKey(): string {
  return process.env.MATCHER_HOT_KEY ?? "";
}

export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}
