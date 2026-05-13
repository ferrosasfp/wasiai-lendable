import { isDemoMode } from "@/infra/env";
import {
  settleOnFacilitator,
  type SignedAuthorization,
} from "@/infra/facilitator-client";
import { mockSettle } from "@/infra/mock-adapter";
import type { LenderMatch, SettlementReceipt } from "@/types/invoice";

export async function settleFactoring(
  match: LenderMatch,
  smeWallet: `0x${string}`,
  lenderWallet: `0x${string}`,
  signedAuthorization: SignedAuthorization,
): Promise<SettlementReceipt> {
  if (isDemoMode()) {
    return mockSettle(match, smeWallet, lenderWallet);
  }
  return settleOnFacilitator(match, smeWallet, lenderWallet, signedAuthorization);
}
