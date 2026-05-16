import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { recoverTypedDataAddress } from "viem";

describe("agent-signer (W5.5)", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  const HOT_KEY = "0x2222222222222222222222222222222222222222222222222222222222222222";

  it("T-AUDIT-1 signReceipt → recoverTypedDataAddress returns the hot-key signer", async () => {
    vi.stubEnv("VALIDATOR_HOT_KEY", HOT_KEY);
    const { signReceipt, getAgentAddress } = await import("@/infra/agent-signer");

    const receipt = await signReceipt({
      agentSlug: "cobraya-cfdi-validator",
      stepIndex: 0,
      input: { uuidCfdi: "abc" },
      output: { ok: true },
      startedAt: 1715800000,
      priceUsdc: 0.001,
    });

    const message = {
      agentSlug: receipt.message.agentSlug,
      stepIndex: BigInt(receipt.message.stepIndex),
      inputHash: receipt.message.inputHash,
      outputHash: receipt.message.outputHash,
      startedAt: BigInt(receipt.message.startedAt),
      priceUsdc: BigInt(receipt.message.priceUsdc),
    };

    const recovered = await recoverTypedDataAddress({
      domain: receipt.domain,
      types: {
        Receipt: [
          { name: "agentSlug", type: "string" },
          { name: "stepIndex", type: "uint256" },
          { name: "inputHash", type: "bytes32" },
          { name: "outputHash", type: "bytes32" },
          { name: "startedAt", type: "uint256" },
          { name: "priceUsdc", type: "uint256" },
        ],
      },
      primaryType: "Receipt",
      message,
      signature: receipt.signature,
    });

    expect(recovered.toLowerCase()).toBe(
      getAgentAddress("cobraya-cfdi-validator").toLowerCase(),
    );
  });

  it("T-AUDIT-2 domain has chainId 43113 (CD-12)", async () => {
    vi.stubEnv("VALIDATOR_HOT_KEY", HOT_KEY);
    const { signReceipt } = await import("@/infra/agent-signer");
    const receipt = await signReceipt({
      agentSlug: "cobraya-cfdi-validator",
      stepIndex: 0,
      input: {},
      output: {},
      startedAt: 0,
      priceUsdc: 0.001,
    });
    expect(receipt.domain.chainId).toBe(43113);
    expect(receipt.domain.name).toBe("Cobraya");
    expect(receipt.domain.version).toBe("1");
  });

  it("signReceipt throws if hot key not configured", async () => {
    vi.stubEnv("VALIDATOR_HOT_KEY", "");
    const { signReceipt } = await import("@/infra/agent-signer");
    await expect(
      signReceipt({
        agentSlug: "cobraya-cfdi-validator",
        stepIndex: 0,
        input: {},
        output: {},
        startedAt: 0,
        priceUsdc: 0.001,
      }),
    ).rejects.toThrow(/No hot key/);
  });
});
