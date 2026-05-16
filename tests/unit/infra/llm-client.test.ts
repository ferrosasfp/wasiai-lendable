import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { generateRationale } from "@/infra/llm-client";

describe("generateRationale (W3)", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  const baseInput = {
    band: "A" as const,
    score: 80,
    amountMXN: 48500,
    anchorBuyer: "Walmart México",
    paymentTermsDays: 60,
    sector: "food retail",
  };

  it("T-LLM-1 missing key → local-fallback", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const r = await generateRationale(baseInput);
    expect(r.provenance).toBe("local-fallback");
    expect(r.rationale).toMatch(/Banda A/);
  });

  it("T-LLM-1b placeholder key COPY_FROM_* → local-fallback", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "COPY_FROM_WASIAI_A2A_DOTENV_AT_18:00");
    const r = await generateRationale(baseInput);
    expect(r.provenance).toBe("local-fallback");
  });

  it("T-LLM-2 200 response with content → anthropic provenance", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({ content: [{ text: "Texto OK desde Claude." }] }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );
    const r = await generateRationale(baseInput);
    expect(r.provenance).toBe("anthropic-claude-haiku-4-5");
    expect(r.rationale).toBe("Texto OK desde Claude.");
  });

  it("T-LLM-3 fetch returns 500 → fallback (no throw)", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("oops", { status: 500 })),
    );
    const r = await generateRationale(baseInput);
    expect(r.provenance).toBe("local-fallback");
  });

  it("T-LLM-4 fetch AbortError → fallback (no throw)", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        const err = new Error("aborted");
        err.name = "AbortError";
        throw err;
      }),
    );
    const r = await generateRationale(baseInput);
    expect(r.provenance).toBe("local-fallback");
  });
});
