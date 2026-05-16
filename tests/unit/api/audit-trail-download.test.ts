import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

describe("/api/audit-trail/[requestId] (W5.5)", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("T-AUDIT-3 GET populated trail → 200 with Content-Disposition attachment", async () => {
    vi.stubEnv(
      "VALIDATOR_HOT_KEY",
      "0x3333333333333333333333333333333333333333333333333333333333333333",
    );

    const { getOrInitTrail, pushStep, __resetAuditBuffer, signReceipt, getAgentAddress } =
      await import("@/infra/agent-signer");
    __resetAuditBuffer();

    const id = "test-request-id-abc";
    getOrInitTrail(id, {
      uuid: "abc",
      rfcEmisorMasked: "TLE8***",
      amountMXN: 48500,
      anchorBuyer: "Walmart México",
      paymentTermsDays: 60,
      sector: "food retail",
    });
    const receipt = await signReceipt({
      agentSlug: "cobraya-cfdi-validator",
      stepIndex: 0,
      input: { ok: true },
      output: { ok: true },
      startedAt: 1715800000,
      priceUsdc: 0.001,
    });
    pushStep(id, {
      stepIndex: 0,
      agentSlug: "cobraya-cfdi-validator",
      agentName: "Cobraya CFDI Validator",
      priceUsdc: 0.001,
      agentSigner: getAgentAddress("cobraya-cfdi-validator"),
      input: { ok: true },
      output: { ok: true },
      success: true,
      latencyMs: 12,
      receipt,
      onchain: null,
    });

    const { GET } = await import("@/app/api/audit-trail/[requestId]/route");
    const req = new NextRequest(`http://localhost/api/audit-trail/${id}`);
    const res = await GET(req, { params: { requestId: id } });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-disposition")).toMatch(/attachment/);
    const json = await res.json();
    expect(json.requestId).toBe(id);
    expect(json.steps.length).toBe(1);
    expect(json.trailHashSHA256).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it("T-AUDIT-4 unknown id → 404", async () => {
    const { GET } = await import("@/app/api/audit-trail/[requestId]/route");
    const req = new NextRequest(`http://localhost/api/audit-trail/does-not-exist`);
    const res = await GET(req, { params: { requestId: "does-not-exist" } });
    expect(res.status).toBe(404);
  });
});
