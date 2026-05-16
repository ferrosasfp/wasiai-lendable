// tests/unit/components/LenderAuctionPanel.test.tsx — W6
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { LenderAuctionPanel } from "@/components/LenderAuctionPanel";
import type { AuctionResult } from "@/types/invoice";

function makeAuction(): AuctionResult {
  return {
    auction: [
      {
        lenderId: "lender-bbva",
        lenderName: "BBVA SME Bridge",
        aprPct: 12.5,
        advanceRatePct: 95,
        estimatedSettleMinutes: 60,
        netAmountUSDC: 2300.5,
        rank: 1,
        qualifies: true,
      },
      {
        lenderId: "lender-arkangeles",
        lenderName: "Arkangeles Fund I",
        aprPct: 13,
        advanceRatePct: 90,
        estimatedSettleMinutes: 30,
        netAmountUSDC: 2200.0,
        rank: 2,
        qualifies: true,
      },
      {
        lenderId: "lender-bankaool",
        lenderName: "Bankaool Pool A",
        aprPct: 14,
        advanceRatePct: 92,
        estimatedSettleMinutes: 45,
        netAmountUSDC: 2150.0,
        rank: 3,
        qualifies: true,
      },
      {
        lenderId: "lender-konfio",
        lenderName: "Konfío Express",
        aprPct: 22,
        advanceRatePct: 85,
        estimatedSettleMinutes: 15,
        netAmountUSDC: 0,
        rank: 4,
        qualifies: false,
        rejectionReason: "band not in allowlist",
      },
    ],
    recommendedLender: "lender-bbva",
    recommendationReason: "highest combined score",
  };
}

describe("LenderAuctionPanel", () => {
  it("T-UI-AUCTION-1: renders all 4 lender cards (3 qualifying + 1 disabled)", () => {
    const auction = makeAuction();
    const { container } = render(
      <LenderAuctionPanel auction={auction} onSelect={vi.fn()} selectedId={null} />,
    );
    const buttons = container.querySelectorAll("button");
    expect(buttons).toHaveLength(4);
    const enabled = container.querySelectorAll("button:not([disabled])");
    expect(enabled).toHaveLength(3);
  });

  it("T-UI-AUCTION-2: rank 1 winner card contains the ★ marker", () => {
    const auction = makeAuction();
    const { container } = render(
      <LenderAuctionPanel auction={auction} onSelect={vi.fn()} selectedId={null} />,
    );
    const winnerBtn = container.querySelector("button");
    expect(winnerBtn?.textContent).toContain("★");
    expect(winnerBtn?.textContent).toContain("BBVA SME Bridge");
  });

  it("T-UI-AUCTION-3: qualifies:false card is disabled and has opacity-40", () => {
    const auction = makeAuction();
    const { container } = render(
      <LenderAuctionPanel auction={auction} onSelect={vi.fn()} selectedId={null} />,
    );
    const buttons = Array.from(container.querySelectorAll("button"));
    const konfio = buttons.find((b) => b.textContent?.includes("Konfío"));
    expect(konfio).toBeDefined();
    expect(konfio?.hasAttribute("disabled")).toBe(true);
    expect(konfio?.className).toContain("opacity-40");
  });
});
