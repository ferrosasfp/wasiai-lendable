// src/application/score-invoice.ts — W1 stub (oracle path removed).
// W3 will wire the cobraya-credit-scorer agent endpoint here.
import { mockScore } from "@/infra/mock-adapter";
import type { Invoice, ScoreResult } from "@/types/invoice";

export async function scoreInvoice(invoice: Invoice): Promise<ScoreResult> {
  // Until W3 wires the local agent endpoint, fall back to the deterministic
  // mock scorer in all modes — keeps CD-3 (demo paracaídas) and avoids the
  // dropped Oracle GenAI dependency (story §16 PROHIBIDO).
  return mockScore(invoice);
}
