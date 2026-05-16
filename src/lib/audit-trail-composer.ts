// src/lib/audit-trail-composer.ts
// Builds the AuditTrail JSON on the CLIENT from the agent responses + settlement.
//
// Background: the previous implementation kept a `globalThis.__cobrayaAuditBuffer`
// Map populated by each `/api/agents/.../invoke` route via `pushStep`. On Vercel
// each route is a SEPARATE serverless function, so the buffer is per-instance.
// When the parallel scorer/fraud pair landed on different warm instances the
// scorer's step was silently dropped (the `pushStep` early-returns on missing
// trail). User-observed symptom: audit JSON had `steps: [0, 1, 3]` — step 2
// gone, `totalCostUSDC` short by $0.05.
//
// The cryptographic root of trust is the per-step EIP-712 receipt signed by
// each agent's hot key — those are returned in each agent's HTTP response and
// are independently verifiable offline against the published agent address.
// We therefore compose the trail on the client where ALL responses are visible,
// compute SHA256 over the canonical JSON, and let the browser download the
// resulting blob. Zero shared server state, zero serverless race conditions.
import type {
  AuditInvoiceMeta,
  AuditReceipt,
  AuditSettlement,
  AuditStep,
  AuditTrail,
} from "@/types/audit-trail";

const SCHEMA_VERSION = "1.0.0" as const;
const STEP_INDEX_VALIDATOR = 0;
const STEP_INDEX_FRAUD = 1;
const STEP_INDEX_SCORER = 2;
const STEP_INDEX_MATCHER = 3;

const AGENT_NAMES = {
  "cobraya-cfdi-validator": "Cobraya CFDI Validator",
  "cobraya-fraud-detector": "Cobraya Fraud Detector",
  "cobraya-credit-scorer": "Cobraya Credit Scorer",
  "cobraya-lender-matcher": "Cobraya Lender Matcher",
} as const;

const PRICES_USDC = {
  "cobraya-cfdi-validator": 0.001,
  "cobraya-fraud-detector": 0.005,
  "cobraya-credit-scorer": 0.05,
  "cobraya-lender-matcher": 0.01,
} as const;

export interface ValidatorStepInput {
  raw: { uuidCfdi: string; rfcEmisor: string; amountMXN: number; anchorBuyer: string };
  output: {
    isCompliant: boolean;
    anchorBuyerTier: 1 | "unknown";
    policyId: string;
    duplicateCheckInstance: "clean" | "duplicate";
    rfcEmisorMasked: string;
    signedAt: string;
  };
  receipt: AuditReceipt | null;
  agentSigner: `0x${string}`;
  latencyMs: number;
}

export interface FraudStepInput {
  raw: { uuidCfdi: string; rfcEmisor: string; amountMXN: number };
  output: {
    isUnique: boolean;
    commitmentHash: `0x${string}`;
    commitTxHash?: `0x${string}`;
    snowtraceUrl?: string;
    blockNumber?: number;
    timestamp?: number;
    metadataPointer?: `0x${string}`;
    rejectReason?: string;
  };
  receipt: AuditReceipt | null;
  agentSigner: `0x${string}`;
  latencyMs: number;
}

export interface ScorerStepInput {
  raw: { amountMXN: number; anchorBuyer: string; paymentTermsDays: number; sector: string };
  output: {
    score: number;
    band: "A" | "B" | "C" | "D";
    advanceRatePct: number;
    aprPct: number;
    rationale: string;
    rationaleProvenance: "anthropic-claude-haiku-4-5" | "local-fallback";
  };
  receipt: AuditReceipt | null;
  agentSigner: `0x${string}`;
  latencyMs: number;
}

export interface MatcherStepInput {
  raw: { band: "A" | "B" | "C" | "D"; amountMXN: number; anchorBuyer: string; sector: string };
  output: unknown;
  receipt: AuditReceipt | null;
  agentSigner: `0x${string}`;
  latencyMs: number;
}

export interface ComposeArgs {
  requestId: string;
  startedAt: string;
  invoice: AuditInvoiceMeta;
  validator: ValidatorStepInput;
  fraud: FraudStepInput;
  scorer: ScorerStepInput;
  matcher: MatcherStepInput;
  settlement: AuditSettlement | null;
}

function maskRfc(rfc: string): string {
  return rfc.length >= 6 ? `${rfc.slice(0, 4)}***` : "***";
}

function validatorStep(s: ValidatorStepInput): AuditStep {
  return {
    stepIndex: STEP_INDEX_VALIDATOR,
    agentSlug: "cobraya-cfdi-validator",
    agentName: AGENT_NAMES["cobraya-cfdi-validator"],
    priceUsdc: PRICES_USDC["cobraya-cfdi-validator"],
    agentSigner: s.agentSigner,
    input: {
      uuidCfdi: s.raw.uuidCfdi,
      rfcEmisorMasked: maskRfc(s.raw.rfcEmisor),
      amountMXN: s.raw.amountMXN,
      anchorBuyer: s.raw.anchorBuyer,
    },
    output: s.output,
    success: s.output.isCompliant,
    latencyMs: s.latencyMs,
    receipt: s.receipt,
    onchain: null,
  };
}

function fraudStep(s: FraudStepInput): AuditStep {
  return {
    stepIndex: STEP_INDEX_FRAUD,
    agentSlug: "cobraya-fraud-detector",
    agentName: AGENT_NAMES["cobraya-fraud-detector"],
    priceUsdc: PRICES_USDC["cobraya-fraud-detector"],
    agentSigner: s.agentSigner,
    input: {
      uuidCfdi: s.raw.uuidCfdi,
      rfcEmisorMasked: maskRfc(s.raw.rfcEmisor),
      amountMXN: s.raw.amountMXN,
    },
    output: s.output,
    success: s.output.isUnique,
    latencyMs: s.latencyMs,
    receipt: s.receipt,
    onchain: s.output.commitTxHash
      ? {
          txHash: s.output.commitTxHash,
          blockNumber: s.output.blockNumber ?? 0,
          snowtraceUrl:
            s.output.snowtraceUrl ?? `https://testnet.snowtrace.io/tx/${s.output.commitTxHash}`,
        }
      : null,
  };
}

function scorerStep(s: ScorerStepInput): AuditStep {
  return {
    stepIndex: STEP_INDEX_SCORER,
    agentSlug: "cobraya-credit-scorer",
    agentName: AGENT_NAMES["cobraya-credit-scorer"],
    priceUsdc: PRICES_USDC["cobraya-credit-scorer"],
    agentSigner: s.agentSigner,
    input: s.raw,
    output: s.output,
    success: true,
    latencyMs: s.latencyMs,
    receipt: s.receipt,
    onchain: null,
  };
}

function matcherStep(s: MatcherStepInput): AuditStep {
  const out = s.output as { recommendedLender?: string | null };
  return {
    stepIndex: STEP_INDEX_MATCHER,
    agentSlug: "cobraya-lender-matcher",
    agentName: AGENT_NAMES["cobraya-lender-matcher"],
    priceUsdc: PRICES_USDC["cobraya-lender-matcher"],
    agentSigner: s.agentSigner,
    input: s.raw,
    output: s.output,
    success: typeof out.recommendedLender === "string" && out.recommendedLender.length > 0,
    latencyMs: s.latencyMs,
    receipt: s.receipt,
    onchain: null,
  };
}

// Web Crypto SHA-256 — works in modern browsers (and edge runtime, jsdom, vitest's
// happy-dom). The trailHashSHA256 field is included in the schema for self-containment
// but zeroed during hashing so the digest is deterministic.
async function sha256Hex(input: string): Promise<`0x${string}`> {
  const enc = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", enc);
  const bytes = new Uint8Array(digest);
  let hex = "";
  for (const b of bytes) hex += b.toString(16).padStart(2, "0");
  return `0x${hex}` as `0x${string}`;
}

export async function composeAuditTrail(args: ComposeArgs): Promise<AuditTrail> {
  const steps: AuditStep[] = [
    validatorStep(args.validator),
    fraudStep(args.fraud),
    scorerStep(args.scorer),
    matcherStep(args.matcher),
  ];

  const totalCostUSDC =
    Math.round(steps.reduce((acc, s) => acc + s.priceUsdc, 0) * 1_000_000) / 1_000_000;

  const completedAt = args.settlement ? new Date().toISOString() : "";
  const totalLatencyMs = completedAt
    ? Date.now() - new Date(args.startedAt).getTime()
    : 0;

  const draft: AuditTrail = {
    schemaVersion: SCHEMA_VERSION,
    requestId: args.requestId,
    startedAt: args.startedAt,
    completedAt,
    totalLatencyMs,
    invoice: args.invoice,
    steps,
    settlement: args.settlement,
    totalCostUSDC,
    trailHashSHA256: ("0x" + "0".repeat(64)) as `0x${string}`,
  };

  const canonical = JSON.stringify({ ...draft, trailHashSHA256: "" });
  const trailHashSHA256 = await sha256Hex(canonical);
  return { ...draft, trailHashSHA256 };
}

// Verifier helper — recomputes the hash and compares. Used by the offline
// verification script in scripts/verify-audit-trail.js (kept symmetric).
export async function verifyTrailHash(trail: AuditTrail): Promise<boolean> {
  const canonical = JSON.stringify({ ...trail, trailHashSHA256: "" });
  const expected = await sha256Hex(canonical);
  return expected === trail.trailHashSHA256;
}
