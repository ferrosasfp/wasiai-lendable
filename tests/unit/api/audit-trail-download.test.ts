import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

const TEST_SECRET = "test-audit-secret-fix-pack-only";

// Valid v4-shape UUIDs (lowercase hex + correct dash pattern).
const VALID_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const OTHER_VALID_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

describe("/api/audit-trail/[requestId] (W5.5 + fix-pack BLQ-ALTO-2 / BLQ-MED-1)", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv("AUDIT_AUTH_SECRET", TEST_SECRET);
    vi.stubEnv(
      "VALIDATOR_HOT_KEY",
      "0x3333333333333333333333333333333333333333333333333333333333333333",
    );
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  async function populateTrail(id: string) {
    const { getOrInitTrail, pushStep, __resetAuditBuffer, signReceipt, getAgentAddress } =
      await import("@/infra/agent-signer");
    __resetAuditBuffer();
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
  }

  it("T-AUDIT-3 GET populated trail w/ valid cookie → 200 with Content-Disposition", async () => {
    await populateTrail(VALID_ID);
    const { auditCookieName, signAuditToken } = await import("@/lib/audit-auth");
    const { GET } = await import("@/app/api/audit-trail/[requestId]/route");
    const cookieValue = signAuditToken(VALID_ID);
    const req = new NextRequest(`http://localhost/api/audit-trail/${VALID_ID}`, {
      headers: { cookie: `${auditCookieName(VALID_ID)}=${cookieValue}` },
    });
    const res = await GET(req, { params: { requestId: VALID_ID } });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-disposition")).toMatch(/attachment/);
    const json = await res.json();
    expect(json.requestId).toBe(VALID_ID);
    expect(json.steps.length).toBe(1);
    expect(json.trailHashSHA256).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it("T-AUDIT-IDOR-FORBIDDEN GET without audit cookie → 403 (BLQ-ALTO-2)", async () => {
    await populateTrail(VALID_ID);
    const { GET } = await import("@/app/api/audit-trail/[requestId]/route");
    const req = new NextRequest(`http://localhost/api/audit-trail/${VALID_ID}`);
    const res = await GET(req, { params: { requestId: VALID_ID } });
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBe("forbidden");
  });

  it("T-AUDIT-IDOR-WRONG-TOKEN GET with tampered cookie → 403", async () => {
    await populateTrail(VALID_ID);
    const { auditCookieName } = await import("@/lib/audit-auth");
    const { GET } = await import("@/app/api/audit-trail/[requestId]/route");
    const req = new NextRequest(`http://localhost/api/audit-trail/${VALID_ID}`, {
      headers: { cookie: `${auditCookieName(VALID_ID)}=00deadbeef` },
    });
    const res = await GET(req, { params: { requestId: VALID_ID } });
    expect(res.status).toBe(403);
  });

  it("T-AUDIT-IDOR-OTHER-ID cookie for VALID_ID cannot read OTHER_VALID_ID → 403", async () => {
    await populateTrail(OTHER_VALID_ID);
    const { auditCookieName, signAuditToken } = await import("@/lib/audit-auth");
    const { GET } = await import("@/app/api/audit-trail/[requestId]/route");
    // Cookie signs VALID_ID but the URL points to OTHER_VALID_ID.
    const req = new NextRequest(`http://localhost/api/audit-trail/${OTHER_VALID_ID}`, {
      headers: {
        cookie: `${auditCookieName(OTHER_VALID_ID)}=${signAuditToken(VALID_ID)}`,
      },
    });
    const res = await GET(req, { params: { requestId: OTHER_VALID_ID } });
    expect(res.status).toBe(403);
  });

  it("T-REQID-INVALID malformed requestId (CRLF) → 400 (BLQ-MED-1)", async () => {
    const { GET } = await import("@/app/api/audit-trail/[requestId]/route");
    const malformed = "poison\r\nSet-Cookie:%20a=b";
    const req = new NextRequest(`http://localhost/api/audit-trail/${encodeURIComponent(malformed)}`);
    const res = await GET(req, { params: { requestId: malformed } });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("invalid_request_id");
  });

  it("T-AUDIT-4 unknown valid-shape id with cookie → 404", async () => {
    const { auditCookieName, signAuditToken } = await import("@/lib/audit-auth");
    const { GET } = await import("@/app/api/audit-trail/[requestId]/route");
    const id = "cccccccc-cccc-cccc-cccc-cccccccccccc";
    const req = new NextRequest(`http://localhost/api/audit-trail/${id}`, {
      headers: { cookie: `${auditCookieName(id)}=${signAuditToken(id)}` },
    });
    const res = await GET(req, { params: { requestId: id } });
    expect(res.status).toBe(404);
  });
});
