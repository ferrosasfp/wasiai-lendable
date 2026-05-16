// src/application/settle-factoring.ts — DEPRECATED legacy bridge.
// /api/settle now lives in src/app/api/settle/route.ts with EIP-3009 logic
// inline. This export is preserved as a thin demo helper so any external
// caller (or test) still using the function-style API gets the mock path.
import { isDemoMode } from "@/infra/env";
import { mockSettle } from "@/infra/mock-adapter";
import type { LenderMatch, SettlementReceipt } from "@/types/invoice";

/** @deprecated use POST /api/settle directly (W5 introduced inline EIP-3009). */
export async function settleFactoring(
  match: LenderMatch,
  smeWallet: `0x${string}`,
  lenderWallet: `0x${string}`,
): Promise<SettlementReceipt> {
  if (isDemoMode()) {
    return mockSettle(match, smeWallet, lenderWallet);
  }
  // Non-demo: callers should switch to /api/settle endpoint directly.
  return mockSettle(match, smeWallet, lenderWallet);
}
