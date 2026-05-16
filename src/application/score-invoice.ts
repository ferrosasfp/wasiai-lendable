// src/application/score-invoice.ts — W3 wired to local credit-scorer agent.
import { isDemoMode } from "@/infra/env";
import { mockScore } from "@/infra/mock-adapter";
import type { Invoice, ScoreResult } from "@/types/invoice";

interface CreditScorerResponse {
  score: number;
  band: "A" | "B" | "C" | "D";
  advanceRatePct: number;
  aprPct: number;
  rationale: string;
  rationaleProvenance: "anthropic-claude-haiku-4-5" | "local-fallback";
}

export async function scoreInvoice(invoice: Invoice): Promise<ScoreResult> {
  if (isDemoMode()) {
    return mockScore(invoice);
  }

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3010";
  try {
    const res = await fetch(`${base}/api/agents/cobraya-credit-scorer/invoke`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amountMXN: invoice.amount,
        anchorBuyer: invoice.anchorBuyer,
        paymentTermsDays: invoice.paymentTermsDays,
        sector: invoice.sector,
      }),
    });
    if (!res.ok) throw new Error(`credit-scorer agent returned ${res.status}`);
    const data = (await res.json()) as CreditScorerResponse;
    return {
      score: data.score,
      band: data.band,
      advanceRatePct: data.advanceRatePct,
      aprPct: data.aprPct,
      rationale: data.rationale,
      rationaleProvenance: data.rationaleProvenance,
    };
  } catch {
    // Fallback to deterministic mock — keeps demo flow alive.
    return mockScore(invoice);
  }
}
