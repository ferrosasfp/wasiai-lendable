// src/infra/agent-signer.ts — W5.5
// EIP-712 receipt signer + process-scoped audit buffer.
// CD-12: domain strict { name:"Cobraya", version:"1", chainId:43113 }.
// CD-13: types/structure mirrored in scripts/verify-audit-trail.js for offline verify.
import { createWalletClient, http, keccak256, stringToBytes } from "viem";
import { avalancheFuji } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import {
  getValidatorHotKey,
  getFraudHotKey,
  getScorerHotKey,
  getMatcherHotKey,
} from "@/infra/env";
import type {
  AuditReceipt,
  AuditReceiptDomain,
  AuditSettlement,
  AuditStep,
  AuditTrail,
} from "@/types/audit-trail";

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

// MNR-3 (post-AR fix-pack): `input` / `output` typed as `unknown` instead of
// `Record<string, unknown>`. Callers that pass shaped result objects (e.g.
// `AuctionResult`, `FraudOutput`) no longer need `as unknown as Record<...>`
// casts at every call site. Internally we JSON.stringify so any JSON-safe
// value works.
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

// --- Audit buffer (DT-M) — process-scoped, demo-only --------------------

declare global {
  // eslint-disable-next-line no-var
  var __cobrayaAuditBuffer: Map<string, AuditTrail> | undefined;
}

function buffer(): Map<string, AuditTrail> {
  if (!globalThis.__cobrayaAuditBuffer) globalThis.__cobrayaAuditBuffer = new Map();
  return globalThis.__cobrayaAuditBuffer;
}

export function getOrInitTrail(
  requestId: string,
  invoiceMeta: AuditTrail["invoice"],
): AuditTrail {
  const buf = buffer();
  let trail = buf.get(requestId);
  if (!trail) {
    trail = {
      schemaVersion: "1.0.0",
      requestId,
      startedAt: new Date().toISOString(),
      completedAt: "",
      totalLatencyMs: 0,
      invoice: invoiceMeta,
      steps: [],
      settlement: null,
      totalCostUSDC: 0,
      trailHashSHA256: ("0x" + "0".repeat(64)) as `0x${string}`,
    };
    buf.set(requestId, trail);
  }
  return trail;
}

export function pushStep(requestId: string, step: AuditStep): void {
  const trail = buffer().get(requestId);
  if (!trail) return;
  trail.steps.push(step);
  trail.totalCostUSDC = Math.round((trail.totalCostUSDC + step.priceUsdc) * 1_000_000) / 1_000_000;
}

export function pushSettlement(requestId: string, settlement: AuditSettlement): void {
  const trail = buffer().get(requestId);
  if (!trail) return;
  trail.settlement = settlement;
  trail.completedAt = new Date().toISOString();
  trail.totalLatencyMs = Date.now() - new Date(trail.startedAt).getTime();
}

export function getTrail(requestId: string): AuditTrail | undefined {
  return buffer().get(requestId);
}

// Test-only — clear buffer between tests.
export function __resetAuditBuffer(): void {
  globalThis.__cobrayaAuditBuffer = new Map();
}
