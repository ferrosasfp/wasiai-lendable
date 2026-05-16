// src/app/api/agents/cobraya-credit-scorer/invoke/route.ts — W3
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { computeScore } from "@/core/scoring";
import { generateRationale } from "@/infra/llm-client";

const InputSchema = z.object({
  amountMXN: z.number().positive(),
  anchorBuyer: z.string().min(1),
  paymentTermsDays: z.number().int().positive(),
  sector: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const parsed = InputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const input = parsed.data;
  const scored = computeScore(input);
  const { rationale, provenance } = await generateRationale({
    ...input,
    band: scored.band,
    score: scored.score,
  });

  return NextResponse.json({
    score: scored.score,
    band: scored.band,
    advanceRatePct: scored.advanceRatePct,
    aprPct: scored.aprPct,
    rationale,
    rationaleProvenance: provenance,
    receipt: null,
  });
}
