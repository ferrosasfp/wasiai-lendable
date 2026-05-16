// src/app/api/agents/cobraya-credit-scorer/invoke/route.ts — W3 + W5.5 wiring
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { computeScore } from "@/core/scoring";
import { generateRationale } from "@/infra/llm-client";
import { signReceipt, getAgentAddress } from "@/infra/agent-signer";
import { isValidUuidV4 } from "@/lib/uuid-validator";

const SLUG = "cobraya-credit-scorer";
const PRICE_USDC = 0.05;

const InputSchema = z.object({
  amountMXN: z.number().positive(),
  anchorBuyer: z.string().min(1),
  paymentTermsDays: z.number().int().positive(),
  sector: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const t0 = Date.now();
  const parsed = InputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const input = parsed.data;

  // BLQ-MED-1: validate request id header shape before any downstream use.
  const requestIdHeader = req.headers.get("x-cobraya-request-id");
  if (requestIdHeader && !isValidUuidV4(requestIdHeader)) {
    return NextResponse.json({ error: "invalid_request_id" }, { status: 400 });
  }
  const requestId = requestIdHeader;

  const scored = computeScore(input);
  const { rationale, provenance } = await generateRationale({
    ...input,
    band: scored.band,
    score: scored.score,
  });

  const output = {
    score: scored.score,
    band: scored.band,
    advanceRatePct: scored.advanceRatePct,
    aprPct: scored.aprPct,
    rationale,
    rationaleProvenance: provenance,
  };

  let receipt: Awaited<ReturnType<typeof signReceipt>> | null = null;
  try {
    receipt = await signReceipt({
      agentSlug: SLUG,
      stepIndex: 2,
      input,
      output,
      startedAt: t0,
      priceUsdc: PRICE_USDC,
    });
  } catch (err) {
    // BLQ-BAJO-3: structured warn (no stack/message) on signer failure.
    console.warn("[cobraya-agent-receipt] signing failed:", {
      agentSlug: SLUG,
      requestId,
      errorName: err instanceof Error ? err.name : "unknown",
    });
    receipt = null;
  }

  return NextResponse.json({
    ...output,
    agentSigner: receipt ? getAgentAddress(SLUG) : null,
    receipt,
  });
}
