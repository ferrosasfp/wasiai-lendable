// src/app/api/agents/cobraya-lender-matcher/invoke/route.ts — W4 + W5.5 wiring
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { runAuction } from "@/core/matching";
import { signReceipt, getAgentAddress } from "@/infra/agent-signer";
import { isValidUuidV4 } from "@/lib/uuid-validator";

const SLUG = "cobraya-lender-matcher";
const PRICE_USDC = 0.01;

const BandSchema = z.enum(["A", "B", "C", "D"]);
const InputSchema = z.object({
  band: BandSchema,
  amountMXN: z.number().positive(),
  anchorBuyer: z.string().min(1),
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

  // BLQ-MED-1: validate request id header shape.
  const requestIdHeader = req.headers.get("x-cobraya-request-id");
  if (requestIdHeader && !isValidUuidV4(requestIdHeader)) {
    return NextResponse.json({ error: "invalid_request_id" }, { status: 400 });
  }
  const requestId = requestIdHeader;
  const result = runAuction(input);

  let receipt: Awaited<ReturnType<typeof signReceipt>> | null = null;
  try {
    receipt = await signReceipt({
      agentSlug: SLUG,
      stepIndex: 3,
      input,
      output: result,
      startedAt: t0,
      priceUsdc: PRICE_USDC,
    });
  } catch (err) {
    // BLQ-BAJO-3: structured warn on signer failure.
    console.warn("[cobraya-agent-receipt] signing failed:", {
      agentSlug: SLUG,
      requestId,
      errorName: err instanceof Error ? err.name : "unknown",
    });
    receipt = null;
  }

  return NextResponse.json({
    ...result,
    agentSigner: receipt ? getAgentAddress(SLUG) : null,
    receipt,
  });
}
