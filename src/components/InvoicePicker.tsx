// src/components/InvoicePicker.tsx — W6
// Mobile-first vertical stack (no md:grid-cols-3, only grid-cols-1).
// Exemplar: wasiai-agentshop/src/components/RemittancePicker.tsx — adapted to invoices.
"use client";

import type { Invoice } from "@/types/invoice";
import { MOCK_INVOICES } from "@/lib/mock-data";

interface Props {
  selected: Invoice | null;
  onSelect: (invoice: Invoice) => void;
}

export function InvoicePicker({ selected, onSelect }: Props) {
  return (
    <div className="grid grid-cols-1 gap-3">
      {MOCK_INVOICES.map((inv) => {
        const isActive = selected?.id === inv.id;
        return (
          <button
            key={inv.id}
            type="button"
            onClick={() => onSelect(inv)}
            className={`text-left p-4 border ${
              isActive ? "border-ink bg-ink/5" : "border-ink/30"
            } min-h-[44px] transition-colors`}
            aria-pressed={isActive}
          >
            <div className="font-semibold">{inv.issuer.name}</div>
            <div className="text-xs text-muted">→ {inv.anchorBuyer}</div>
            <div className="mono text-sm mt-2">
              ${inv.amount.toLocaleString("es-MX")} MXN · {inv.paymentTermsDays}d
            </div>
          </button>
        );
      })}
    </div>
  );
}
