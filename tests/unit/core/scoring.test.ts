import { describe, it, expect } from "vitest";
import { computeScore, computeBand } from "@/core/scoring";

describe("computeScore (W1)", () => {
  it("T-SCORING-1 Tortillería (Walmart, $48,500, 60d, food retail) → 80 / band A", () => {
    const r = computeScore({
      amountMXN: 48_500,
      anchorBuyer: "Walmart México",
      paymentTermsDays: 60,
      sector: "food retail",
    });
    expect(r.score).toBe(80);
    expect(r.band).toBe("A");
    expect(r.advanceRatePct).toBe(95);
    expect(r.aprPct).toBe(12);
  });

  it("T-SCORING-2 Confecciones (Bimbo, $28,200, 30d, apparel) → 88 / band A", () => {
    const r = computeScore({
      amountMXN: 28_200,
      anchorBuyer: "Bimbo",
      paymentTermsDays: 30,
      sector: "apparel",
    });
    expect(r.score).toBe(88);
    expect(r.band).toBe("A");
  });

  it("T-SCORING-3 Construcciones (Cemex, $156,800, 90d, construction) → 54 / band C", () => {
    const r = computeScore({
      amountMXN: 156_800,
      anchorBuyer: "Cemex",
      paymentTermsDays: 90,
      sector: "construction",
    });
    expect(r.score).toBe(54);
    expect(r.band).toBe("C");
    expect(r.advanceRatePct).toBe(88);
    expect(r.aprPct).toBe(18);
  });

  it("T-SCORING-4 unknown buyer 'AcmeCorp' → band D", () => {
    const r = computeScore({
      amountMXN: 100_000,
      anchorBuyer: "AcmeCorp",
      paymentTermsDays: 90,
      sector: "services",
    });
    // 30 base + 0 amount + -8 terms + -3 services = 19 → D
    expect(r.score).toBeLessThan(40);
    expect(r.band).toBe("D");
  });

  it("T-SCORING-DETERMINISM same input → same score & band twice", () => {
    const input = {
      amountMXN: 48_500,
      anchorBuyer: "Walmart México",
      paymentTermsDays: 60,
      sector: "food retail",
    };
    const a = computeScore(input);
    const b = computeScore(input);
    expect(a).toEqual(b);
  });

  it("computeBand threshold", () => {
    expect(computeBand(80)).toBe("A");
    expect(computeBand(79)).toBe("B");
    expect(computeBand(60)).toBe("B");
    expect(computeBand(59)).toBe("C");
    expect(computeBand(40)).toBe("C");
    expect(computeBand(39)).toBe("D");
  });
});
