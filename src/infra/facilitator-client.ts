import { usdcToOnchainAmount } from "@/core/settlement";
import type { LenderMatch, SettlementReceipt } from "@/types/invoice";
import { CHAIN_ID, FACILITATOR_URL, USDC_ADDRESS } from "./env";

export interface SignedAuthorization {
  signature: `0x${string}`;
  nonce: `0x${string}`;
  validAfter: number;
  validBefore: number;
}

interface SettleRequest {
  chainId: number;
  asset: `0x${string}`;
  from: `0x${string}`;
  to: `0x${string}`;
  amount: string;
  signature: `0x${string}`;
  nonce: `0x${string}`;
  validAfter: number;
  validBefore: number;
}

export async function settleOnFacilitator(
  match: LenderMatch,
  smeWallet: `0x${string}`,
  lenderWallet: `0x${string}`,
  signedAuthorization: SignedAuthorization,
): Promise<SettlementReceipt> {
  const body: SettleRequest = {
    chainId: CHAIN_ID,
    asset: USDC_ADDRESS,
    from: lenderWallet,
    to: smeWallet,
    amount: usdcToOnchainAmount(match.estimatedSettlement.netUSDC).toString(),
    signature: signedAuthorization.signature,
    nonce: signedAuthorization.nonce,
    validAfter: signedAuthorization.validAfter,
    validBefore: signedAuthorization.validBefore,
  };

  const res = await fetch(`${FACILITATOR_URL}/settle`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Facilitator settle failed: ${res.status} ${await res.text()}`);
  }

  const result = (await res.json()) as {
    txHash: `0x${string}`;
    blockNumber: number;
    from: `0x${string}`;
  };
  return {
    txHash: result.txHash,
    chainId: CHAIN_ID,
    blockNumber: result.blockNumber,
    from: result.from,
    to: smeWallet,
    amountUSDC: match.estimatedSettlement.netUSDC,
    facilitator: "wasiai-facilitator",
  };
}
