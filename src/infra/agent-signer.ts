// src/infra/agent-signer.ts
// EIP-712 receipt signer for per-step audit attestation.
// CD-12: domain strict { name:"Cobraya", version:"1", chainId:43113 }.
// CD-13: types/structure mirrored in scripts/verify-audit-trail.js for offline verify.
//
// History: an earlier revision also exposed `getOrInitTrail/pushStep/pushSettlement/
// getTrail` backed by a `globalThis` Map. That worked locally and during single-lambda
// warm runs on Vercel, but each `/api/agents/.../invoke` route lives in its OWN
// serverless function instance — when the parallel scorer landed on a different
// warm Lambda than the validator, `pushStep` silently early-returned (no trail
// in this instance's memory) and the step disappeared from the downloaded JSON.
// User-observed: trail with `steps: [0, 1, 3]` and `totalCostUSDC` short by $0.05
// (the scorer's price). The buffer is removed. The audit trail is composed on the
// client from agent responses — each route returns its EIP-712 receipt and the
// frontend assembles + SHA256-roots the canonical trail in `lib/audit-trail-composer.ts`.
import { createWalletClient, http, keccak256, stringToBytes } from "viem";
import { avalancheFuji } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import {
  getValidatorHotKey,
  getFraudHotKey,
  getScorerHotKey,
  getMatcherHotKey,
} from "@/infra/env";
import type { AuditReceipt, AuditReceiptDomain } from "@/types/audit-trail";

const DOMAIN: AuditReceiptDomain = { name: "Cobraya", version: "1", chainId: 43113 } as const;

const TYPES = {
  Receipt: [
    { name: "agentSlug", type: "string" },
    { name: "stepIndex", type: "uint256" },
    { name: "inputHash", type: "bytes32" },
    { name: "outputHash", type: "bytes32" },
    { name: "startedAt", type: "uint256" },
    { name: "priceUsdc", type: "uint256" },
  ],
} as const;

function getHotKeyFor(agentSlug: string): `0x${string}` {
  const map: Record<string, string> = {
    "cobraya-cfdi-validator": getValidatorHotKey(),
    "cobraya-fraud-detector": getFraudHotKey(),
    "cobraya-credit-scorer": getScorerHotKey(),
    "cobraya-lender-matcher": getMatcherHotKey(),
  };
  const key = map[agentSlug];
  if (!key) throw new Error(`No hot key configured for ${agentSlug}`);
  return key as `0x${string}`;
}

export async function signReceipt(args: {
  agentSlug: string;
  stepIndex: number;
  input: unknown;
  output: unknown;
  startedAt: number;
  priceUsdc: number;
}): Promise<AuditReceipt> {
  const account = privateKeyToAccount(getHotKeyFor(args.agentSlug));
  const client = createWalletClient({ account, chain: avalancheFuji, transport: http() });

  const inputHash = keccak256(stringToBytes(JSON.stringify(args.input)));
  const outputHash = keccak256(stringToBytes(JSON.stringify(args.output)));

  const message = {
    agentSlug: args.agentSlug,
    stepIndex: BigInt(args.stepIndex),
    inputHash,
    outputHash,
    startedAt: BigInt(args.startedAt),
    priceUsdc: BigInt(Math.round(args.priceUsdc * 1_000_000)),
  };

  const signature = await client.signTypedData({
    account,
    domain: DOMAIN,
    types: TYPES,
    primaryType: "Receipt",
    message,
  });

  return {
    domain: DOMAIN,
    primaryType: "Receipt",
    message: {
      agentSlug: message.agentSlug,
      stepIndex: message.stepIndex.toString(),
      inputHash,
      outputHash,
      startedAt: message.startedAt.toString(),
      priceUsdc: message.priceUsdc.toString(),
    },
    signature,
  };
}

export function getAgentAddress(agentSlug: string): `0x${string}` {
  const account = privateKeyToAccount(getHotKeyFor(agentSlug));
  return account.address;
}
