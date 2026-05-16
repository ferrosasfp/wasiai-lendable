// src/infra/facilitator-client.ts — W5 refactor
// Accepts a SignedAuthorization (EIP-3009) + lender context.
// CD-4: consume-only — never modify wasiai-facilitator upstream.
import { CHAIN_ID, FACILITATOR_URL, USDC_ADDRESS } from "./env";
import type { SignedAuthorization } from "./eip3009-signer";

export interface FacilitatorSettleArgs {
  authorization: SignedAuthorization;
  lenderId: string;
}

export interface FacilitatorSettleResult {
  txHash: `0x${string}`;
  blockNumber: number;
  snowtraceUrl: string;
  deliveredAmountUSDC: number;
}

interface RawFacilitatorResponse {
  txHash: `0x${string}`;
  blockNumber: number;
  from: `0x${string}`;
}

export async function settleOnFacilitator(
  args: FacilitatorSettleArgs,
): Promise<FacilitatorSettleResult> {
  const { authorization } = args;
  const body = {
    chainId: CHAIN_ID,
    asset: USDC_ADDRESS,
    from: authorization.from,
    to: authorization.to,
    amount: authorization.value.toString(),
    signature: authorization.signature,
    nonce: authorization.nonce,
    validAfter: Number(authorization.validAfter),
    validBefore: Number(authorization.validBefore),
  };

  const res = await fetch(`${FACILITATOR_URL}/settle`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    // CD-9: do not include request body (signature is sensitive enough).
    throw new Error(`Facilitator settle failed: ${res.status}`);
  }

  const result = (await res.json()) as RawFacilitatorResponse;
  const snowtraceUrl =
    CHAIN_ID === 43114
      ? `https://snowtrace.io/tx/${result.txHash}`
      : `https://testnet.snowtrace.io/tx/${result.txHash}`;

  // USDC has 6 decimals — convert authorization.value back to display USDC.
  const deliveredAmountUSDC = Number(authorization.value) / 1_000_000;

  return {
    txHash: result.txHash,
    blockNumber: result.blockNumber,
    snowtraceUrl,
    deliveredAmountUSDC,
  };
}
