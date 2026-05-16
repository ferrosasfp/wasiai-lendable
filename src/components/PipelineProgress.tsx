// src/components/PipelineProgress.tsx — W6 REPLACE
// Vertical stepper with 4 steps (no Oracle GenAI mentions).
// State per step: WAITING | RUNNING | DONE | REJECTED.
"use client";

import type { ScoreResult, AuctionResult } from "@/types/invoice";

type StepState = "WAITING" | "RUNNING" | "DONE" | "REJECTED";

interface Props {
  validator: unknown;
  fraud: unknown;
  score: ScoreResult | null;
  auction: AuctionResult | null;
  isRunning: boolean;
}

interface StepDef {
  label: string;
  agentSlug: string;
  hint: string;
  tag: string;
}

const STEPS: StepDef[] = [
  {
    label: "Validar CFDI",
    agentSlug: "cobraya-cfdi-validator",
    hint: "Validando CFDI + anchor buyer",
    tag: "$0.001 USDC",
  },
  {
    label: "Anti-fraude onchain",
    agentSlug: "cobraya-fraud-detector",
    hint: "Anti-doble-cesión onchain (Fuji)",
    tag: "$0.005 USDC",
  },
  {
    label: "Score de crédito",
    agentSlug: "cobraya-credit-scorer",
    hint: "Scoring + Claude Haiku rationale",
    tag: "$0.050 USDC",
  },
  {
    label: "Subasta de lenders",
    agentSlug: "cobraya-lender-matcher",
    hint: "Auction de lenders",
    tag: "$0.010 USDC",
  },
];

function deriveState(value: unknown, isRunning: boolean): StepState {
  if (value == null) return isRunning ? "RUNNING" : "WAITING";
  if (typeof value === "object" && value !== null) {
    const obj = value as Record<string, unknown>;
    // CFDI validator rejection: isCompliant === false.
    if ("isCompliant" in obj && obj.isCompliant === false) return "REJECTED";
    // Fraud detector rejection: isUnique === false.
    if ("isUnique" in obj && obj.isUnique === false) return "REJECTED";
    // Matcher: no qualifying lender means no recommendedLender.
    if ("recommendedLender" in obj && obj.recommendedLender === null) return "REJECTED";
  }
  return "DONE";
}

export function PipelineProgress({ validator, fraud, score, auction, isRunning }: Props) {
  const states: StepState[] = [
    deriveState(validator, isRunning && validator == null),
    deriveState(
      fraud,
      isRunning && validator != null && fraud == null,
    ),
    deriveState(score, isRunning && validator != null && score == null),
    deriveState(auction, isRunning && score != null && auction == null),
  ];

  return (
    <div>
      <div className="text-xs mono uppercase tracking-widest text-muted mb-4">
        02 · Pipeline agéntico
      </div>
      <ol className="space-y-3">
        {STEPS.map((s, i) => (
          <StepCard
            key={s.agentSlug}
            label={s.label}
            agentSlug={s.agentSlug}
            hint={s.hint}
            tag={s.tag}
            state={states[i]}
          />
        ))}
      </ol>

      {score && (
        <div className="mt-6 border border-ink/30 p-4 text-sm">
          <div className="text-xs mono uppercase tracking-widest text-muted mb-2">
            Score · provenance {score.rationaleProvenance}
          </div>
          <div className="flex items-baseline gap-3 mb-3">
            <div className="serif text-4xl">{score.score}</div>
            <div className="mono text-base">Band {score.band}</div>
          </div>
          <div className="text-xs leading-relaxed text-muted">{score.rationale}</div>
        </div>
      )}
    </div>
  );
}

function StepCard({
  label,
  agentSlug,
  hint,
  tag,
  state,
}: {
  label: string;
  agentSlug: string;
  hint: string;
  tag: string;
  state: StepState;
}) {
  const dotClass =
    state === "DONE"
      ? "bg-emerald-500"
      : state === "RUNNING"
        ? "bg-amber-500 animate-pulse"
        : state === "REJECTED"
          ? "bg-red-500"
          : "bg-ink/20";

  const stateLabelClass =
    state === "DONE"
      ? "text-emerald-600 font-semibold"
      : state === "RUNNING"
        ? "text-amber-600 font-semibold animate-pulse"
        : state === "REJECTED"
          ? "text-red-600 font-semibold"
          : "text-muted";

  return (
    <li className="border border-ink/30 p-4">
      <div className="flex items-center gap-3">
        <span className={`w-3 h-3 rounded-full flex-shrink-0 ${dotClass}`} />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm">{label}</div>
          <div className="mono text-[11px] text-muted truncate">
            {agentSlug} · {tag}
          </div>
        </div>
        <span className={`mono text-xs ${stateLabelClass}`}>{state}</span>
      </div>
      <div className="text-xs text-muted mt-2 ml-6">{hint}</div>
    </li>
  );
}
