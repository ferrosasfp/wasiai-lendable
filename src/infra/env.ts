export const A2A_URL =
  process.env.WASIAI_A2A_URL ?? "https://wasiai-a2a-production.up.railway.app";
export const A2A_KEY = process.env.A2A_KEY ?? "";

export const FACILITATOR_URL =
  process.env.WASIAI_FACILITATOR_URL ?? "https://wasiai-facilitator-production.up.railway.app";

export const ORACLE_ENDPOINT = process.env.ORACLE_GENAI_ENDPOINT ?? "";
export const ORACLE_API_KEY = process.env.ORACLE_GENAI_API_KEY ?? "";

export const CHAIN_ID = Number(process.env.AVALANCHE_CHAIN_ID ?? 43113);

export const USDC_ADDRESS = (process.env.USDC_ADDRESS ??
  "0x5425890298aed601595a70AB815c96711a31Bc65") as `0x${string}`;

export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}
