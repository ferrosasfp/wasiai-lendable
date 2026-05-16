// src/components/LenderAuctionPanel.tsx — W6
// Mobile-first vertical auction panel — 4 lenders ranked by combined APR+advance+speed.
// AC-15 (auction visual) + CD-18 (touch targets ≥48px) + anti-double-trigger via disabled.
"use client";

import type { AuctionResult, AuctionLender } from "@/types/invoice";

interface Props {
  auction: AuctionResult;
  onSelect: (lender: AuctionLender) => void;
  selectedId: string | null;
}

export function LenderAuctionPanel({ auction, onSelect, selectedId }: Props) {
  return (
    <div className="grid grid-cols-1 gap-3">
      {auction.auction.map((l) => {
        const isSelected = selectedId === l.lenderId;
        const isWinner = l.rank === 1 && l.qualifies;
        const disabled = !l.qualifies;
        return (
          <button
            key={l.lenderId}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(l)}
            className={`text-left p-4 border min-h-[48px] transition-colors ${
              disabled ? "opacity-40" : ""
            } ${isSelected ? "border-ink bg-ink/5" : "border-ink/30"} ${
              isWinner ? "border-2 border-ink" : ""
            }`}
            aria-pressed={isSelected}
            title={l.rejectionReason}
          >
            <div className="flex items-baseline justify-between">
              <span className="font-semibold">
                {isWinner && <span aria-hidden>★ </span>}
                {l.lenderName}
              </span>
              <span className="mono text-xs">#{l.rank}</span>
            </div>
            <div className="mt-1 mono text-sm">
              {l.aprPct}% APR · {l.advanceRatePct}% · ~{l.estimatedSettleMinutes}min
            </div>
            <div className="mt-1 text-sm">USDC {l.netAmountUSDC.toFixed(4)}</div>
            {disabled && l.rejectionReason && (
              <div className="text-xs text-muted mt-1">{l.rejectionReason}</div>
            )}
          </button>
        );
      })}
    </div>
  );
}
