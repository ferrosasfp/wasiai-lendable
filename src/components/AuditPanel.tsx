// src/components/AuditPanel.tsx — W5.5 base + W6 final integration.
// Collapsible bottom-sheet on mobile. Download CTA anchored to /api/audit-trail/{requestId}.
// AC-13: audit UI · CD-18: touch targets ≥44px.
"use client";

import { useState } from "react";

export interface AuditStepDisplay {
  stepIndex: number;
  agentSlug: string;
  success: boolean;
  latencyMs: number;
}

interface Props {
  steps: AuditStepDisplay[];
  requestId: string | null;
}

export function AuditPanel({ steps, requestId }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <details
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
      className="fixed bottom-0 left-0 right-0 bg-paper border-t border-ink z-10"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <summary className="px-4 py-3 mono text-xs uppercase tracking-widest cursor-pointer min-h-[44px] flex items-center">
        Audit trail · {steps.length} step{steps.length === 1 ? "" : "s"}
      </summary>
      <ul className="px-4 py-3 max-h-[60vh] overflow-y-auto">
        {steps.map((s) => (
          <li key={s.stepIndex} className="py-2 border-b border-ink/10 text-sm">
            <span className="mono">{s.agentSlug}</span> · {s.success ? "OK" : "FAIL"} ·{" "}
            {s.latencyMs}ms
          </li>
        ))}
      </ul>
      {requestId && (
        <a
          href={`/api/audit-trail/${requestId}`}
          download
          className="block px-4 py-3 bg-ink text-paper text-center mono text-xs uppercase tracking-widest min-h-[44px]"
        >
          Descargar audit trail JSON
        </a>
      )}
    </details>
  );
}
