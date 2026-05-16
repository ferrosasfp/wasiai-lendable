export type InvoiceStatus =
  | "issued"
  | "factored"
  | "paid"
  | "expired"
  // legacy values kept for backwards compat with existing code paths
  | "pending"
  | "validating"
  | "scoring"
  | "matching"
  | "ready"
  | "settled"
  | "rejected";

export interface Invoice {
  id: string;
  uuid: string;
  uuidSat?: string;
  issuer: {
    rfc: string;
    name: string;
  };
  receiver: {
    rfc: string;
    name: string;
  };
  amount: number;
  currency: "MXN" | "USD";
  issueDate: string;            // ISO yyyy-mm-dd
  dueDate: string;
  status: InvoiceStatus;
  // NEW W1
  anchorBuyer: string;
  paymentTermsDays: number;
  sector: "food retail" | "apparel" | "construction" | "services" | "retail";
}

export interface ValidatorResult {
  isValid: boolean;
  cfdiUuid: string;
  satMatch: boolean;
  duplicateCheck: "clean" | "duplicate";
  reason?: string;
}

export interface ScoreResult {
  score: number;
  band: "A" | "B" | "C" | "D";
  advanceRatePct: number;        // 80 | 88 | 92 | 95
  aprPct: number;                // 12 | 14.5 | 18 | 25
  rationale: string;
  rationaleProvenance: "anthropic-claude-haiku-4-5" | "local-fallback";
  /** @deprecated use rationaleProvenance — kept for backwards compat */
  oraclePromptId?: string;
}

export interface LenderMatch {
  lenderId: string;
  lenderName: string;
  advanceRate: number;
  rateAPR: number;
  estimatedSettlement: {
    grossUSDC: number;
    feeUSDC: number;
    netUSDC: number;
  };
}

export interface SettlementReceipt {
  txHash: `0x${string}`;
  chainId: number;
  blockNumber: number;
  from: `0x${string}`;
  to: `0x${string}`;
  amountUSDC: number;
  facilitator: string;
}

export interface Lender {
  id: string;
  name: string;
  acceptedBands: Array<"A" | "B" | "C" | "D">;
  minAmountUSDC: number;
  maxAmountUSDC: number;
  rateAPR: number;
  advanceRate: number;
  wallet: `0x${string}`;
}

// NEW W1 — auction types
export interface AuctionLender {
  lenderId: string;
  lenderName: string;
  aprPct: number;
  advanceRatePct: number;
  estimatedSettleMinutes: number;
  netAmountUSDC: number;
  rank: number;
  qualifies: boolean;
  rejectionReason?: string;
}

export interface AuctionResult {
  auction: AuctionLender[];
  recommendedLender: string | null;
  recommendationReason: string;
}
