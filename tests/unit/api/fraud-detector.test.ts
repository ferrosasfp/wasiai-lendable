import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

function makeReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/agents/cobraya-fraud-detector/invoke", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

interface FraudResponse {
  isUnique?: boolean;
  commitTxHash?: string;
  rejectReason?: string;
  error?: string;
}

describe("/api/agents/cobraya-fraud-detector/invoke (W2.5)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.stubEnv("AUDIT_AUTH_SECRET", "test-audit-secret-fix-pack");
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("T-FRAUD-DEMO demo mode → returns mockFraudCheck output", async () => {
    vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "true");
    const { POST } = await import("@/app/api/agents/cobraya-fraud-detector/invoke/route");
    const res = await POST(
      makeReq({ uuidCfdi: "abc", rfcEmisor: "TLE850120ABC", amountMXN: 48500 }),
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as FraudResponse;
    expect(json.isUnique).toBe(true);
    expect(json.commitTxHash).toBe("0xMOCK_FRAUD_TX_HASH_DEMO_MODE");
  });

  it("T-FRAUD-3 invalid body (missing uuidCfdi) → 400", async () => {
    vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "false");
    const { POST } = await import("@/app/api/agents/cobraya-fraud-detector/invoke/route");
    const res = await POST(makeReq({ rfcEmisor: "TLE850120ABC", amountMXN: 48500 }));
    expect(res.status).toBe(400);
  });

  it("T-FRAUD-1 not configured (missing env) → 503 (defensive)", async () => {
    vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "false");
    vi.stubEnv("AVALANCHE_RPC_URL", "");
    vi.stubEnv("COBRAYA_COMMITMENTS_ADDRESS", "");
    vi.stubEnv("FRAUD_DETECTOR_PRIVATE_KEY", "");
    const { POST } = await import("@/app/api/agents/cobraya-fraud-detector/invoke/route");
    const res = await POST(
      makeReq({ uuidCfdi: "abc", rfcEmisor: "TLE850120ABC", amountMXN: 48500 }),
    );
    expect(res.status).toBe(503);
    const json = (await res.json()) as FraudResponse;
    expect(json.error).toBe("fraud_detector_not_configured");
  });

  it("T-FRAUD-2 viem readContract returns active=true → isUnique:false, no writeContract", async () => {
    vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "false");
    vi.stubEnv("AVALANCHE_RPC_URL", "https://api.avax-test.network/ext/bc/C/rpc");
    vi.stubEnv("COBRAYA_COMMITMENTS_ADDRESS", "0x5F8F8a31e51d8B2FEe0E0C2f1AffC3B4c6B12506");
    vi.stubEnv(
      "FRAUD_DETECTOR_PRIVATE_KEY",
      "0x1111111111111111111111111111111111111111111111111111111111111111",
    );

    const readContract = vi.fn(async () => [true, 12345n, "0xABCDEF1234567890123456789012345678901234"]);
    const writeContract = vi.fn(async () => "0xfeedbeef");
    const waitForTransactionReceipt = vi.fn(async () => ({ blockNumber: 99n }));

    vi.doMock("viem", async (orig) => {
      const real = await (orig() as Promise<Record<string, unknown>>);
      return {
        ...real,
        createPublicClient: () => ({ readContract, waitForTransactionReceipt }),
        createWalletClient: () => ({ writeContract }),
      };
    });

    const { POST } = await import("@/app/api/agents/cobraya-fraud-detector/invoke/route");
    const res = await POST(
      makeReq({ uuidCfdi: "abc", rfcEmisor: "TLE850120ABC", amountMXN: 48500 }),
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as FraudResponse;
    expect(json.isUnique).toBe(false);
    expect(json.rejectReason).toBe("INVOICE_ALREADY_COMMITTED");
    expect(writeContract).not.toHaveBeenCalled();
  });

  it("T-AGENT-MASK-RFC-FRAUD demo mode response NEVER echoes raw rfcEmisor (BLQ-ALTO-2B)", async () => {
    // BLQ-ALTO-2B remix: the audit trail is composed client-side, so the
    // server-side guarantee is now that NO field of the response body echoes
    // the raw RFC. The receipt's inputHash still commits to the raw payload
    // (verifiable offline against the EIP-712 signer address) — but the raw
    // value itself never leaves the server.
    vi.doUnmock("viem");
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "true");
    vi.stubEnv(
      "FRAUD_HOT_KEY",
      "0x4444444444444444444444444444444444444444444444444444444444444444",
    );
    const id = "55555555-5555-5555-5555-555555555555";
    const { POST } = await import("@/app/api/agents/cobraya-fraud-detector/invoke/route");
    const req = new NextRequest(
      "http://localhost/api/agents/cobraya-fraud-detector/invoke",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-cobraya-request-id": id,
        },
        body: JSON.stringify({
          uuidCfdi: "abc",
          rfcEmisor: "TLE850120ABC",
          amountMXN: 48500,
        }),
      },
    );
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    const raw = JSON.stringify(json);
    // Raw RFC must NOT appear anywhere in the response body — receipt.inputHash
    // commits to it, but the value itself stays server-side.
    expect(raw).not.toContain("TLE850120ABC");
    // The receipt is still returned and signed.
    expect(json.receipt?.signature).toMatch(/^0x[0-9a-fA-F]+$/);
    expect(json.agentSigner).toMatch(/^0x[a-fA-F0-9]{40}$/);
  });

  it("T-FRAUD-METADATA-BOUND writeContract receives metadataPointer = keccak(requestId:commitmentHash) (BLQ-MED-2)", async () => {
    vi.doUnmock("viem");
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "false");
    vi.stubEnv("AVALANCHE_RPC_URL", "https://api.avax-test.network/ext/bc/C/rpc");
    vi.stubEnv("COBRAYA_COMMITMENTS_ADDRESS", "0x5F8F8a31e51d8B2FEe0E0C2f1AffC3B4c6B12506");
    vi.stubEnv(
      "FRAUD_DETECTOR_PRIVATE_KEY",
      "0x1111111111111111111111111111111111111111111111111111111111111111",
    );

    const writeCalls: Array<{ args: unknown }> = [];
    const readContract = vi.fn(async () => [false, 0n, "0x0000000000000000000000000000000000000000"]);
    const writeContract = vi.fn(async (cfg: { args: unknown }) => {
      writeCalls.push({ args: cfg.args });
      return "0xfeedbeef";
    });
    const waitForTransactionReceipt = vi.fn(async () => ({ blockNumber: 99n }));

    vi.doMock("viem", async (orig) => {
      const real = await (orig() as Promise<Record<string, unknown>>);
      return {
        ...real,
        createPublicClient: () => ({ readContract, waitForTransactionReceipt }),
        createWalletClient: () => ({ writeContract }),
      };
    });

    const reqId = "abcdef12-3456-4789-89ab-cdef12345678";
    const { POST } = await import("@/app/api/agents/cobraya-fraud-detector/invoke/route");
    const res = await POST(
      new NextRequest("http://localhost/api/agents/cobraya-fraud-detector/invoke", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-cobraya-request-id": reqId,
        },
        body: JSON.stringify({ uuidCfdi: "abc", rfcEmisor: "TLE850120ABC", amountMXN: 48500 }),
      }),
    );
    expect(res.status).toBe(200);
    expect(writeCalls.length).toBe(1);
    const args = writeCalls[0]!.args as [string, string];
    // metadataPointer is the 2nd arg of commitInvoice(commitmentHash, metadataPointer).
    expect(args[1]).toMatch(/^0x[0-9a-f]{64}$/);
    expect(args[1]).not.toBe(
      "0x0000000000000000000000000000000000000000000000000000000000000000",
    );
    // Also verify the route surfaces metadataPointer in its JSON response.
    const json = (await res.json()) as { metadataPointer?: string };
    expect(json.metadataPointer).toBe(args[1]);
  });

  it("T-REQID-INVALID-FRAUD malformed x-cobraya-request-id → 400 (BLQ-MED-1)", async () => {
    vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "true");
    const { POST } = await import("@/app/api/agents/cobraya-fraud-detector/invoke/route");
    const req = new NextRequest(
      "http://localhost/api/agents/cobraya-fraud-detector/invoke",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-cobraya-request-id": "not-a-valid-uuid",
        },
        body: JSON.stringify({
          uuidCfdi: "abc",
          rfcEmisor: "TLE850120ABC",
          amountMXN: 48500,
        }),
      },
    );
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("T-FRAUD-4 readContract throws → 502 NETWORK_ERROR (no crash)", async () => {
    vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "false");
    vi.stubEnv("AVALANCHE_RPC_URL", "https://api.avax-test.network/ext/bc/C/rpc");
    vi.stubEnv("COBRAYA_COMMITMENTS_ADDRESS", "0x5F8F8a31e51d8B2FEe0E0C2f1AffC3B4c6B12506");
    vi.stubEnv(
      "FRAUD_DETECTOR_PRIVATE_KEY",
      "0x1111111111111111111111111111111111111111111111111111111111111111",
    );
    const readContract = vi.fn(async () => {
      throw new Error("network down");
    });
    vi.doMock("viem", async (orig) => {
      const real = await (orig() as Promise<Record<string, unknown>>);
      return {
        ...real,
        createPublicClient: () => ({
          readContract,
          waitForTransactionReceipt: async () => ({ blockNumber: 0n }),
        }),
        createWalletClient: () => ({ writeContract: async () => "0x" }),
      };
    });
    const { POST } = await import("@/app/api/agents/cobraya-fraud-detector/invoke/route");
    const res = await POST(
      makeReq({ uuidCfdi: "abc", rfcEmisor: "TLE850120ABC", amountMXN: 48500 }),
    );
    expect(res.status).toBe(502);
    const json = (await res.json()) as FraudResponse;
    expect(json.rejectReason).toBe("NETWORK_ERROR");
    // CD-9: must not contain the private key
    const raw = JSON.stringify(json);
    expect(raw).not.toContain("1111111111111111111111111111111111111111111111111111111111111111");
  });
});
