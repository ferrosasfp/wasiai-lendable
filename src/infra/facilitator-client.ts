// src/infra/facilitator-client.ts — x402 v2 canonical body.
// CD-4: consume-only — never modify wasiai-facilitator upstream.
// The wasiai-facilitator at FACILITATOR_URL implements x402 protocol v2 and
// rejects any non-canonical body shape with HTTP 400. Earlier W5 sent a flat
// custom payload — that path returns HTTP 400 from the live facilitator and
// our /api/settle propagates a 502 "settle_failed", which is why the demo
// silently fell back to DEMO_MODE=true (and to non-existent mock tx hashes
// that Snowtrace cannot resolve). This client now builds the canonical body
// that wasiai-agentshop already proved end-to-end on Kite (real PYUSD tx).
import { CHAIN_ID, FACILITATOR_URL, USDC_ADDRESS } from "./env";
import type { SignedAuthorization } from "./eip3009-signer";

const FACILITATOR_TIMEOUT_MS = 10_000;
const RESOURCE_URL = "https://wasiai-cobraya.vercel.app/factor";

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

interface X402Authorization {
  from: `0x${string}`;
  to: `0x${string}`;
  value: string;
  validAfter: string;
  validBefore: string;
  nonce: `0x${string}`;
}

interface X402CanonicalBody {
  x402Version: 2;
  resource: { url: string };
  accepted: {
    scheme: "exact";
    network: string;
    amount: string;
    asset: `0x${string}`;
    payTo: `0x${string}`;
    maxTimeoutSeconds: number;
    extra: { assetTransferMethod: "eip3009" };
  };
  payload: {
    signature: `0x${string}`;
    authorization: X402Authorization;
  };
}

interface FacilitatorSettleResponse {
  settled?: boolean;
  transactionHash?: `0x${string}`;
  blockNumber?: number;
  amount?: string;
  from?: string;
  to?: string;
  asset?: string;
  network?: string;
  error?: { code?: string; message?: string; http?: number };
}

function toCanonicalAuthorization(auth: SignedAuthorization): X402Authorization {
  return {
    from: auth.from,
    to: auth.to,
    value: auth.value.toString(),
    validAfter: auth.validAfter.toString(),
    validBefore: auth.validBefore.toString(),
    nonce: auth.nonce,
  };
}

function buildCanonicalBody(auth: SignedAuthorization): X402CanonicalBody {
  const canonicalAuth = toCanonicalAuthorization(auth);
  return {
    x402Version: 2,
    resource: { url: RESOURCE_URL },
    accepted: {
      scheme: "exact",
      network: `eip155:${CHAIN_ID}`,
      amount: canonicalAuth.value,
      asset: USDC_ADDRESS as `0x${string}`,
      payTo: canonicalAuth.to,
      maxTimeoutSeconds: 300,
      extra: { assetTransferMethod: "eip3009" },
    },
    payload: {
      signature: auth.signature,
      authorization: canonicalAuth,
    },
  };
}

export async function settleOnFacilitator(
  args: FacilitatorSettleArgs,
): Promise<FacilitatorSettleResult> {
  const { authorization } = args;
  const body = buildCanonicalBody(authorization);

  const res = await fetch(`${FACILITATOR_URL}/settle`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(FACILITATOR_TIMEOUT_MS),
  });

  const result = (await res.json().catch(() => null)) as FacilitatorSettleResponse | null;
  if (!res.ok || !result) {
    // CD-9: do not echo request body (signature is sensitive).
    const detail = result?.error?.message ?? `(no body)`;
    throw new Error(`Facilitator /settle HTTP ${res.status}: ${detail}`);
  }
  if (result.settled !== true || !result.transactionHash) {
    const detail =
      result.error?.message ?? `settled=${result.settled} tx=${result.transactionHash ?? "none"}`;
    throw new Error(`Facilitator did not settle: ${detail}`);
  }

  const snowtraceUrl =
    CHAIN_ID === 43114
      ? `https://snowtrace.io/tx/${result.transactionHash}`
      : `https://testnet.snowtrace.io/tx/${result.transactionHash}`;

  return {
    txHash: result.transactionHash,
    blockNumber: result.blockNumber ?? 0,
    snowtraceUrl,
    deliveredAmountUSDC: Number(authorization.value) / 1_000_000,
  };
}
