import { isDemoMode, ORACLE_ENDPOINT } from "@/infra/env";
import { mockScore } from "@/infra/mock-adapter";
import { callOracleGenAI } from "@/infra/oracle-client";
import type { Invoice, ScoreResult } from "@/types/invoice";

export async function scoreInvoice(invoice: Invoice): Promise<ScoreResult> {
  if (isDemoMode() || !ORACLE_ENDPOINT) {
    return mockScore(invoice);
  }
  return callOracleGenAI(invoice);
}
