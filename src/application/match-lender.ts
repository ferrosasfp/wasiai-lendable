import { composeOnA2A } from "@/infra/a2a-client";
import { isDemoMode } from "@/infra/env";
import { mockMatch } from "@/infra/mock-adapter";
import type { Invoice, LenderMatch, ScoreResult } from "@/types/invoice";

export async function matchLender(invoice: Invoice, score: ScoreResult): Promise<LenderMatch> {
  if (isDemoMode()) {
    return mockMatch(invoice, score);
  }
  const response = await composeOnA2A([
    {
      agent: "lender-matcher",
      capability: "lender.match",
      input: { amount: invoice.amount, currency: invoice.currency, band: score.band },
    },
  ]);
  return response.results[0].output as unknown as LenderMatch;
}
