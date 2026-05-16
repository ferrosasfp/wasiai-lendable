// src/components/AuditPanel.tsx
// Collapsible bottom-sheet on mobile. Download CTA points to a blob URL that
// the demo page composes (and owns the lifecycle of) once the pipeline has
// settled — the trail itself is built entirely on the client from the agents'
// EIP-712 receipts (see lib/audit-trail-composer.ts).
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
  auditDownloadHref?: string | null;
  auditDownloadFilename?: string;
}

export function AuditPanel({ steps, auditDownloadHref, auditDownloadFilename }: Props) {
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
      {auditDownloadHref && (
        <a
          href={auditDownloadHref}
          download={auditDownloadFilename ?? "cobraya-audit.json"}
          className="block px-4 py-3 bg-ink text-paper text-center mono text-xs uppercase tracking-widest min-h-[44px]"
        >
          Descargar audit trail JSON
        </a>
      )}
    </details>
  );
}
