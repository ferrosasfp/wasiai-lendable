import { describe, it, expect } from "vitest";
import { runAuction } from "@/core/matching";

describe("runAuction (W1)", () => {
  it("T-MATCHING-1 band B food retail $48.5K → at least 3 qualify, BBVA rejected by band", () => {
    const r = runAuction({
      band: "B",
      amountMXN: 48_500,
      anchorBuyer: "Walmart México",
      sector: "food retail",
    });
    expect(r.auction.length).toBe(4);
    const qualifying = r.auction.filter((a) => a.qualifies);
    expect(qualifying.length).toBeGreaterThanOrEqual(3);
    // rank 1 must be qualifying
    expect(r.auction[0].qualifies).toBe(true);
    expect(r.auction[0].rank).toBe(1);
    const bbva = r.auction.find((a) => a.lenderId === "lender-bbva-bridge");
    expect(bbva).toBeDefined();
    expect(bbva!.qualifies).toBe(false);
    expect(bbva!.rejectionReason).toMatch(/only bands/);
  });

  it("T-MATCHING-2 band A apparel $28.2K → BBVA disqualified by amount", () => {
    const r = runAuction({
      band: "A",
      amountMXN: 28_200,
      anchorBuyer: "Bimbo",
      sector: "apparel",
    });
    const bbva = r.auction.find((a) => a.lenderId === "lender-bbva-bridge");
    expect(bbva).toBeDefined();
    expect(bbva!.qualifies).toBe(false);
    expect(bbva!.rejectionReason).toMatch(/amount out of range/);
    // rank 1 qualifies
    expect(r.auction[0].qualifies).toBe(true);
  });

  it("T-MATCHING-3 band C construction → only Konfío qualifies, Arkangeles rejected by sector", () => {
    const r = runAuction({
      band: "C",
      amountMXN: 156_800,
      anchorBuyer: "Cemex",
      sector: "construction",
    });
    const qualifying = r.auction.filter((a) => a.qualifies);
    expect(qualifying.length).toBe(1);
    expect(r.recommendedLender).toBe("lender-konfio");
    const arkangeles = r.auction.find((a) => a.lenderId === "lender-arkangeles-i");
    expect(arkangeles).toBeDefined();
    expect(arkangeles!.qualifies).toBe(false);
    expect(arkangeles!.rejectionReason).toBe("sector not in allowlist");
  });

  it("T-MATCHING-DETERMINISM same input → same ordering twice", () => {
    const input = { band: "B" as const, amountMXN: 48_500, anchorBuyer: "Walmart México", sector: "food retail" };
    const a = runAuction(input);
    const b = runAuction(input);
    expect(a.auction.map((x) => x.lenderId)).toEqual(b.auction.map((x) => x.lenderId));
    expect(a.recommendedLender).toBe(b.recommendedLender);
  });

  it("T-AUCTION-SHAPE ranks monotonic 1..N with all required fields", () => {
    const r = runAuction({ band: "A", amountMXN: 100_000, anchorBuyer: "Walmart México", sector: "retail" });
    r.auction.forEach((a, i) => {
      expect(a.rank).toBe(i + 1);
      expect(typeof a.lenderId).toBe("string");
      expect(typeof a.lenderName).toBe("string");
      expect(typeof a.aprPct).toBe("number");
      expect(typeof a.advanceRatePct).toBe("number");
      expect(typeof a.estimatedSettleMinutes).toBe("number");
      expect(typeof a.netAmountUSDC).toBe("number");
      expect(typeof a.qualifies).toBe("boolean");
    });
  });
});
