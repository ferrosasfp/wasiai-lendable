// src/app/api/agents/cobraya-cfdi-validator/invoke/route.ts — W2 + W5.5 wiring
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { BUYERS_TIER_1 } from "@/lib/mock-data";
import { isUuidSeen, markUuidSeen } from "@/lib/agent-state/validator-store";
import { isValidUuidV4 } from "@/lib/uuid-validator";
import { signReceipt, getAgentAddress } from "@/infra/agent-signer";

const SLUG = "cobraya-cfdi-validator";
const PRICE_USDC = 0.001;

const InputSchema = z.object({
  uuidCfdi: z.string(),
  rfcEmisor: z.string().min(1),
  amountMXN: z.number().positive(),
  anchorBuyer: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const t0 = Date.now();
  const body = await req.json().catch(() => null);
  const parsed = InputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { uuidCfdi, rfcEmisor, amountMXN, anchorBuyer } = parsed.data;

  if (!isValidUuidV4(uuidCfdi)) {
    return NextResponse.json(
      { error: "invalid_input", details: { uuidCfdi: ["invalid UUID format"] } },
      { status: 400 },
    );
  }

  // BLQ-MED-1: validate x-cobraya-request-id header shape before threading it
  // into the audit buffer (defends against CRLF injection / poisoned keys).
  const requestIdHeader = req.headers.get("x-cobraya-request-id");
  if (requestIdHeader && !isValidUuidV4(requestIdHeader)) {
    return NextResponse.json(
      { error: "invalid_request_id" },
      { status: 400 },
    );
  }
  const requestId = requestIdHeader;

  const buyer = BUYERS_TIER_1.find((b) => b.name === anchorBuyer);
  const anchorBuyerTier: 1 | "unknown" = buyer ? 1 : "unknown";
  const isDuplicate = isUuidSeen(uuidCfdi);
  if (!isDuplicate) markUuidSeen(uuidCfdi);
  // BLQ-BAJO-2 rename: `duplicateCheckInstance` makes it explicit that this is
  // a process-scoped check (validator-store is in-memory). The authoritative
  // cross-instance/global dup check is performed by the fraud-detector via the
  // onchain `CobrayaInvoiceCommitments` contract — see W2.5.
  const duplicateCheckInstance: "clean" | "duplicate" = isDuplicate ? "duplicate" : "clean";

  const isCompliant =
    amountMXN > 0 && anchorBuyerTier === 1 && duplicateCheckInstance === "clean";
  const sector = buyer?.sector ?? "any";
  const policyId = `cobraya-tier-${anchorBuyerTier === 1 ? "1" : "unknown"}-${sector}-2026`;

  const output = {
    isCompliant,
    anchorBuyerTier,
    policyId,
    duplicateCheckInstance,
    rfcEmisorMasked: rfcEmisor.length >= 6 ? `${rfcEmisor.slice(0, 4)}***` : "***",
    signedAt: new Date().toISOString(),
  };

  // Sign EIP-712 receipt — the receipt's inputHash commits to the RAW input so
  // an offline verifier can validate against the original payload, even though
  // the audit trail JSON (composed client-side) only echoes a masked version.
  // BLQ-BAJO-3: signer failures degrade to receipt:null + structured warn so
  // the agent's answer still flows back to the caller.
  let receipt: Awaited<ReturnType<typeof signReceipt>> | null = null;
  try {
    receipt = await signReceipt({
      agentSlug: SLUG,
      stepIndex: 0,
      input: { uuidCfdi, rfcEmisor, amountMXN, anchorBuyer },
      output,
      startedAt: t0,
      priceUsdc: PRICE_USDC,
    });
  } catch (err) {
    console.warn("[cobraya-agent-receipt] signing failed:", {
      agentSlug: SLUG,
      requestId,
      errorName: err instanceof Error ? err.name : "unknown",
    });
    receipt = null;
  }

  return NextResponse.json({
    ...output,
    sector,
    agentSigner: receipt ? getAgentAddress(SLUG) : null,
    receipt,
  });
}
