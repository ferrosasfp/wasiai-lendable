import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("/api/marketplace (W1)", () => {
  beforeEach(() => {
    vi.resetModules();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("T-MARKETPLACE-1 fetch OK → returns 4 cobraya-* slugs", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            agents: [
              { slug: "cobraya-cfdi-validator", name: "Cobraya CFDI Validator", priceUsdc: 0.001 },
              { slug: "cobraya-fraud-detector", name: "Cobraya Fraud Detector", priceUsdc: 0.005 },
              { slug: "cobraya-credit-scorer", name: "Cobraya Credit Scorer", priceUsdc: 0.05 },
              { slug: "cobraya-lender-matcher", name: "Cobraya Lender Matcher", priceUsdc: 0.01 },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    const { GET } = await import("@/app/api/marketplace/route");
    const res = await GET();
    const json = (await res.json()) as {
      agents: Array<{ slug: string }>;
      totalEstimatedFee: number;
      source: "live" | "static-fallback";
    };
    expect(json.agents).toHaveLength(4);
    expect(json.agents.map((a) => a.slug)).toEqual([
      "cobraya-cfdi-validator",
      "cobraya-fraud-detector",
      "cobraya-credit-scorer",
      "cobraya-lender-matcher",
    ]);
    expect(Math.abs(json.totalEstimatedFee - 0.066)).toBeLessThan(1e-9);
    expect(json.source).toBe("live");
  });

  it("T-MARKETPLACE-2 fetch error → static-fallback with 4 entries", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network error");
      }),
    );

    const { GET } = await import("@/app/api/marketplace/route");
    const res = await GET();
    const json = (await res.json()) as {
      agents: Array<{ slug: string }>;
      source: "live" | "static-fallback";
    };
    expect(json.agents).toHaveLength(4);
    expect(json.source).toBe("static-fallback");
  });
});
