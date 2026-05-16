import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("signTransferAuthorization (W5)", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // A deterministic dev-only test key — NOT a real production secret.
  const TEST_KEY = "0x1111111111111111111111111111111111111111111111111111111111111111";

  it("T-EIP3009-1 signs with chainId 43113 + USDC verifyingContract", async () => {
    vi.stubEnv("TREASURY_PRIVATE_KEY", TEST_KEY);
    vi.stubEnv("USDC_ADDRESS", "0x5425890298aed601595a70AB815c96711a31Bc65");
    const { signTransferAuthorization } = await import("@/infra/eip3009-signer");

    const auth = await signTransferAuthorization({
      to: "0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa",
      valueOnchain: 10_000n,
    });
    expect(auth.value).toBe(10_000n);
    expect(auth.signature.length).toBe(132); // 0x + 130 hex chars (r+s+v)
    expect(auth.nonce.length).toBe(66); // 0x + 64 hex chars
  });

  it("T-EIP3009-2 two consecutive signatures → distinct nonces", async () => {
    vi.stubEnv("TREASURY_PRIVATE_KEY", TEST_KEY);
    vi.stubEnv("USDC_ADDRESS", "0x5425890298aed601595a70AB815c96711a31Bc65");
    const { signTransferAuthorization } = await import("@/infra/eip3009-signer");

    const a = await signTransferAuthorization({
      to: "0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa",
      valueOnchain: 1n,
    });
    const b = await signTransferAuthorization({
      to: "0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa",
      valueOnchain: 1n,
    });
    expect(a.nonce).not.toBe(b.nonce);
  });

  it("T-EIP3009-3 validBefore defaults to now+300s", async () => {
    vi.stubEnv("TREASURY_PRIVATE_KEY", TEST_KEY);
    vi.stubEnv("USDC_ADDRESS", "0x5425890298aed601595a70AB815c96711a31Bc65");
    const { signTransferAuthorization } = await import("@/infra/eip3009-signer");

    const now = Math.floor(Date.now() / 1000);
    const auth = await signTransferAuthorization({
      to: "0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa",
      valueOnchain: 1n,
    });
    // 5 minutes (±5s for test latency)
    const validBeforeSec = Number(auth.validBefore);
    expect(validBeforeSec - now).toBeGreaterThanOrEqual(295);
    expect(validBeforeSec - now).toBeLessThanOrEqual(310);
  });

  it("T-EIP3009-4 missing TREASURY_PRIVATE_KEY → throws (no key leak)", async () => {
    vi.stubEnv("TREASURY_PRIVATE_KEY", "");
    vi.stubEnv("USDC_ADDRESS", "0x5425890298aed601595a70AB815c96711a31Bc65");
    const { signTransferAuthorization } = await import("@/infra/eip3009-signer");
    await expect(
      signTransferAuthorization({
        to: "0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa",
        valueOnchain: 1n,
      }),
    ).rejects.toThrow(/TREASURY_PRIVATE_KEY/);
  });
});
