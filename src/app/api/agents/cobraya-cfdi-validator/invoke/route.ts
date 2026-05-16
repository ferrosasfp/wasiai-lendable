// src/app/api/agents/cobraya-cfdi-validator/invoke/route.ts — W2 + W5.5 wiring
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { BUYERS_TIER_1 } from "@/lib/mock-data";
import { isUuidSeen, markUuidSeen } from "@/lib/agent-state/validator-store";
import {
  signReceipt,
  getAgentAddress,
  getOrInitTrail,
  pushStep,
} from "@/infra/agent-signer";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
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

  if (!UUID_REGEX.test(uuidCfdi)) {
    return NextResponse.json(
      { error: "invalid_input", details: { uuidCfdi: ["invalid UUID format"] } },
      { status: 400 },
    );
  }

  const buyer = BUYERS_TIER_1.find((b) => b.name === anchorBuyer);
  const anchorBuyerTier: 1 | "unknown" = buyer ? 1 : "unknown";
  const isDuplicate = isUuidSeen(uuidCfdi);
  if (!isDuplicate) markUuidSeen(uuidCfdi);
  const duplicateCheck: "clean" | "duplicate" = isDuplicate ? "duplicate" : "clean";

  const isCompliant =
    amountMXN > 0 && anchorBuyerTier === 1 && duplicateCheck === "clean";
  const sector = buyer?.sector ?? "any";
  const policyId = `cobraya-tier-${anchorBuyerTier === 1 ? "1" : "unknown"}-${sector}-2026`;

  const output = {
    isCompliant,
    anchorBuyerTier,
    policyId,
    duplicateCheck,
    rfcEmisorMasked: rfcEmisor.length >= 6 ? `${rfcEmisor.slice(0, 4)}***` : "***",
    signedAt: new Date().toISOString(),
  };

  // W5.5 — sign EIP-712 receipt + push to audit trail (best-effort, never blocks
  // the response on signer failures: caller wants the agent answer, audit
  // trail is a bonus).
  let receipt: Awaited<ReturnType<typeof signReceipt>> | null = null;
  const requestId = req.headers.get("x-cobraya-request-id");
  try {
    const inputForReceipt = { uuidCfdi, rfcEmisor, amountMXN, anchorBuyer };
    receipt = await signReceipt({
      agentSlug: SLUG,
      stepIndex: 0,
      input: inputForReceipt,
      output,
      startedAt: t0,
      priceUsdc: PRICE_USDC,
    });
    if (requestId) {
      getOrInitTrail(requestId, {
        uuid: uuidCfdi,
        rfcEmisorMasked: output.rfcEmisorMasked,
        amountMXN,
        anchorBuyer,
        paymentTermsDays: 60,
        sector,
      });
      pushStep(requestId, {
        stepIndex: 0,
        agentSlug: SLUG,
        agentName: "Cobraya CFDI Validator",
        priceUsdc: PRICE_USDC,
        agentSigner: getAgentAddress(SLUG),
        input: inputForReceipt,
        output,
        success: isCompliant,
        latencyMs: Date.now() - t0,
        receipt,
        onchain: null,
      });
    }
  } catch {
    // Hot key missing/invalid → omit receipt; do not fail the agent response.
    receipt = null;
  }

  return NextResponse.json({ ...output, receipt });
}
