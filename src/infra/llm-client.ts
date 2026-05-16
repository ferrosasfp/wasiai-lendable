// src/infra/llm-client.ts — W3
// DT-E: fetch directo a api.anthropic.com (NO @anthropic-ai/sdk).
// Fallback determinista por banda si key missing/invalid/timeout/error.

const FALLBACK_TEMPLATES: Record<"A" | "B" | "C" | "D", string> = {
  A: "Factura emitida a anchor buyer tier-1 con plazo corto y sector de bajo riesgo. Banda A indica perfil crediticio sólido y riesgo de default mínimo.",
  B: "Anchor buyer tier-1 con plazo medio y sector estable. Banda B refleja buen perfil con consideraciones de plazo de pago.",
  C: "Anchor buyer aceptable pero con plazos largos o sector de mayor riesgo. Banda C amerita spread adicional.",
  D: "Perfil con varios factores de riesgo. Banda D requiere análisis caso por caso.",
};

export interface RationaleInput {
  band: "A" | "B" | "C" | "D";
  score: number;
  amountMXN: number;
  anchorBuyer: string;
  paymentTermsDays: number;
  sector: string;
}

export interface RationaleResult {
  rationale: string;
  provenance: "anthropic-claude-haiku-4-5" | "local-fallback";
}

function isUsableKey(key: string): boolean {
  if (!key) return false;
  if (key.startsWith("COPY_FROM_")) return false;
  if (key.startsWith("set-me")) return false;
  return true;
}

export async function generateRationale(input: RationaleInput): Promise<RationaleResult> {
  const key = process.env.ANTHROPIC_API_KEY ?? "";
  if (!isUsableKey(key)) {
    return { rationale: FALLBACK_TEMPLATES[input.band], provenance: "local-fallback" };
  }

  try {
    const prompt = `You are a credit analyst at a Mexican factoring fintech. Given:
- Amount: ${input.amountMXN.toLocaleString("es-MX")} MXN
- Anchor buyer: ${input.anchorBuyer}
- Payment terms: ${input.paymentTermsDays} days
- Sector: ${input.sector}
- Deterministic credit band: ${input.band} (score ${input.score})

Write ONE concise paragraph in Spanish (≤80 words) explaining why this invoice qualifies for band ${input.band}. Focus on anchor buyer strength, term, and sector dynamics. Plain text, no markdown, no list.`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 200,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) throw new Error(`anthropic-status-${res.status}`);
    const data = (await res.json()) as { content?: Array<{ text?: string }> };
    const text = data?.content?.[0]?.text ?? FALLBACK_TEMPLATES[input.band];
    return { rationale: text, provenance: "anthropic-claude-haiku-4-5" };
  } catch {
    return { rationale: FALLBACK_TEMPLATES[input.band], provenance: "local-fallback" };
  }
}
