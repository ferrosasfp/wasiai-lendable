import { termDays } from "@/core/invoice";
import type { Invoice, ScoreResult } from "@/types/invoice";
import { ORACLE_API_KEY, ORACLE_ENDPOINT } from "./env";

interface OracleGenAIRequest {
  prompt: string;
  context: {
    rfc: string;
    issuerName: string;
    receiverName: string;
    amountMXN: number;
    invoiceTermDays: number;
  };
}

interface OracleGenAIResponse {
  score: number;
  band: "A" | "B" | "C" | "D";
  rationale: string;
  promptId: string;
}

export async function callOracleGenAI(invoice: Invoice): Promise<ScoreResult> {
  const body: OracleGenAIRequest = {
    prompt:
      "Score the creditworthiness of the invoice issuer for invoice factoring. " +
      "Return band A (lowest risk) to D (highest risk).",
    context: {
      rfc: invoice.issuer.rfc,
      issuerName: invoice.issuer.name,
      receiverName: invoice.receiver.name,
      amountMXN: invoice.amount,
      invoiceTermDays: termDays(invoice),
    },
  };

  const res = await fetch(ORACLE_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ORACLE_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Oracle GenAI failed: ${res.status}`);
  }

  const data = (await res.json()) as OracleGenAIResponse;
  return {
    score: data.score,
    band: data.band,
    rationale: data.rationale,
    oraclePromptId: data.promptId,
  };
}
