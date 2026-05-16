import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "@/app/api/agents/cobraya-credit-scorer/invoke/route";
import { NextRequest } from "next/server";

function makeReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/agents/cobraya-credit-scorer/invoke", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

interface ScorerResponse {
  score?: number;
  band?: "A" | "B" | "C" | "D";
  advanceRatePct?: number;
  aprPct?: number;
  rationaleProvenance?: "anthropic-claude-haiku-4-5" | "local-fallback";
  error?: string;
}

describe("/api/agents/cobraya-credit-scorer/invoke (W3)", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("T-SCORER-1 determinism: 2 invocations same input → same score+band", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const body = {
      amountMXN: 48500,
      anchorBuyer: "Walmart México",
      paymentTermsDays: 60,
      sector: "food retail",
    };
    const a = (await (await POST(makeReq(body))).json()) as ScorerResponse;
    const b = (await (await POST(makeReq(body))).json()) as ScorerResponse;
    expect(a.score).toBe(b.score);
    expect(a.band).toBe(b.band);
  });

  it("T-SCORER-2 band A input → advanceRatePct 95 aprPct 12", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const res = await POST(
      makeReq({
        amountMXN: 48500,
        anchorBuyer: "Walmart México",
        paymentTermsDays: 60,
        sector: "food retail",
      }),
    );
    const json = (await res.json()) as ScorerResponse;
    expect(json.band).toBe("A");
    expect(json.advanceRatePct).toBe(95);
    expect(json.aprPct).toBe(12);
  });

  it("T-SCORER-3 band C input → advanceRatePct 88 aprPct 18", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const res = await POST(
      makeReq({
        amountMXN: 156800,
        anchorBuyer: "Cemex",
        paymentTermsDays: 90,
        sector: "construction",
      }),
    );
    const json = (await res.json()) as ScorerResponse;
    expect(json.band).toBe("C");
    expect(json.advanceRatePct).toBe(88);
    expect(json.aprPct).toBe(18);
  });

  it("T-SCORER-4 invalid body → 400", async () => {
    const res = await POST(makeReq({ amountMXN: -100 }));
    expect(res.status).toBe(400);
  });
});
