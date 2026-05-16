// src/types/audit-trail.ts — W5.5
// Source of truth: doc/AUDIT-TRAIL-SCHEMA.md §2 + story file §12.2.

export interface AuditReceiptDomain {
  name: "Cobraya";
  version: "1";
  chainId: 43113;
}

export interface AuditReceiptMessage {
  agentSlug: string;
  stepIndex: string;     // bigint serialized
  inputHash: `0x${string}`;
  outputHash: `0x${string}`;
  startedAt: string;     // bigint serialized
  priceUsdc: string;     // bigint serialized (micro-USDC)
}

export interface AuditReceipt {
  domain: AuditReceiptDomain;
  primaryType: "Receipt";
  message: AuditReceiptMessage;
  signature: `0x${string}`;
}

export interface AuditStep {
  stepIndex: number;
  agentSlug: string;
  agentName: string;
  priceUsdc: number;
  agentSigner: `0x${string}`;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  success: boolean;
  error?: string;
  latencyMs: number;
  receipt: AuditReceipt;
  onchain: { txHash: `0x${string}`; blockNumber: number; snowtraceUrl: string } | null;
}

export interface AuditSettlement {
  authorization: {
    domain: { name: string; version: string; chainId: 43113; verifyingContract: `0x${string}` };
    primaryType: "TransferWithAuthorization";
    message: Record<string, string>;
  };
  signature: `0x${string}`;
  txHash: `0x${string}`;
  blockNumber: number;
  snowtraceUrl: string;
  deliveredAmountUSDC: number;
  facilitatorUrl: string;
}

export interface AuditInvoiceMeta {
  uuid: string;
  rfcEmisorMasked: string;     // CD-23
  amountMXN: number;
  anchorBuyer: string;
  paymentTermsDays: number;
  sector: string;
}

export interface AuditTrail {
  schemaVersion: "1.0.0";
  requestId: string;
  startedAt: string;       // ISO-8601
  completedAt: string;
  totalLatencyMs: number;
  invoice: AuditInvoiceMeta;
  steps: AuditStep[];
  settlement: AuditSettlement | null;
  totalCostUSDC: number;
  trailHashSHA256: `0x${string}`;
}
