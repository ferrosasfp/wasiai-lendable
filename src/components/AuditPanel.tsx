"use client";

import { useState } from "react";

export interface AuditStepDisplay {
  stepIndex: number;
  agentSlug: string;
  success: boolean;
  latencyMs: number;
}

export function AuditPanel({
  steps,
  requestId,
}: {
  steps: AuditStepDisplay[];
  requestId: string | null;
}) {
  const [open, setOpen] = useState(false);
  return (
    <details
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
      className="fixed bottom-0 left-0 right-0 bg-paper border-t border-ink z-30"
    >
      <summary className="px-4 py-3 mono text-xs uppercase tracking-widest cursor-pointer">
        Audit trail · {steps.length} step{steps.length === 1 ? "" : "s"}
      </summary>
      <ul className="px-4 py-3 max-h-[60vh] overflow-y-auto">
        {steps.map((s) => (
          <li key={s.stepIndex} className="py-2 border-b border-ink/10 text-sm">
            <span className="mono">{s.agentSlug}</span> · {s.success ? "OK" : "FAIL"} · {s.latencyMs}ms
          </li>
        ))}
      </ul>
      {requestId && (
        <a
          href={`/api/audit-trail/${requestId}`}
          download
          className="block px-4 py-3 bg-ink text-paper text-center mono text-xs uppercase tracking-widest"
        >
          Descargar audit trail JSON
        </a>
      )}
    </details>
  );
}
