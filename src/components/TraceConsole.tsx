// src/components/TraceConsole.tsx — W6
// Adapted from wasiai-agentshop/src/components/TraceConsole.tsx.
// Cobraya sections: 00 marketplace · 02 agents × 4 · 03 sign · 04 settle.
// Mobile: rendered as bottom-sheet <details> below md breakpoint; sticky aside above.
"use client";

import type { TraceEvent, TraceSection } from "@/types/trace";
import { InfoTooltip } from "@/components/InfoTooltip";
import { CopyButton } from "@/components/CopyButton";

interface Props {
  traces: TraceEvent[];
  activeSections?: Set<TraceSection>;
  inFlightSections?: Set<TraceSection>;
}

const SECTIONS: Array<{
  id: TraceSection;
  title: string;
  subtitle: string;
  tooltip: string;
}> = [
  {
    id: "00",
    title: "Marketplace · WasiAI A2A",
    subtitle: "GET /api/marketplace · agent lookup",
    tooltip:
      "Lookup-only. Returns the 4 cobraya-* agents registered in the wasiai-v2 marketplace with slug + price + chain + asset. Real HTTP GET. No payment, no compose, no transaction.",
  },
  {
    id: "02",
    title: "Agents working the invoice",
    subtitle: "POST /invoke × 4 · debits A2A_KEY budget",
    tooltip:
      "Four invocations against the cobraya-* agents (validator, fraud-detector, scorer, matcher). The wasiai-a2a gateway routes each /compose call to its agent endpoint and debits the A2A_KEY budget. Each agent returns a structured response (CFDI shape, onchain commit, score band, lender auction). No USDC to the SME moves yet — that happens in sección 04.",
  },
  {
    id: "03",
    title: "Authorize the payout",
    subtitle: "EIP-3009 signature built server-side",
    tooltip:
      "Local cryptographic operation. The server constructs the EIP-712 TransferWithAuthorization typed data (domain: USDC on Avalanche Fuji, message: from/to/value/nonce) and signs it with TREASURY_PRIVATE_KEY. Zero network. ~8ms. The 65-byte signature is the input for sección 04.",
  },
  {
    id: "04",
    title: "Settled onchain",
    subtitle: "POST facilitator/settle · Snowtrace tx",
    tooltip:
      "The facilitator receives the signed authorization, pays the gas (gasless UX for the SME), and submits transferWithAuthorization to the USDC token contract on Avalanche Fuji. USDC tokens move onchain from treasury to SME wallet. Returns the tx hash inspectable on testnet.snowtrace.io.",
  },
];

const SOURCE_COLOR: Record<string, string> = {
  "a2a-compose": "text-emerald-400",
  "mock-fallback": "text-amber-400",
  "demo-mode": "text-sky-400",
  facilitator: "text-fuchsia-400",
  discovery: "text-indigo-400",
};

function sourceClass(source?: string): string {
  return SOURCE_COLOR[source ?? ""] ?? "text-slate-300";
}

function extractUrl(endpoint: string): string {
  const match = endpoint.match(/https?:\/\/\S+/);
  return match ? match[0] : endpoint;
}

function prettyJSON(value: unknown): string {
  if (value === undefined || value === null) return "null";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function TraceConsole({ traces, activeSections, inFlightSections }: Props) {
  const grouped = SECTIONS.map((s) => ({
    ...s,
    events: traces.filter((t) => t.section === s.id),
    isInFlight: inFlightSections?.has(s.id) ?? false,
  })).filter(
    (g) => g.events.length > 0 || activeSections?.has(g.id) || g.isInFlight,
  );

  return (
    <details className="md:open mt-6 border-t border-ink/20 md:border-0 md:sticky md:top-6 md:self-start">
      <summary className="px-1 py-3 mono text-xs uppercase tracking-widest cursor-pointer md:hidden">
        ⌗ Inside the call · live trace ({grouped.length})
      </summary>
      <div className="hidden md:block text-xs mono uppercase tracking-widest text-muted mb-4">
        ⌗ Inside the call · live trace
      </div>
      {grouped.length === 0 ? (
        <div className="bg-slate-950 text-slate-100 rounded-sm border border-slate-800 p-6 text-slate-500 text-xs mono">
          Press <span className="text-slate-300">▶ Probar el demo</span> to see real
          marketplace, /invoke and /settle calls stream here in real time.
        </div>
      ) : (
        <div className="space-y-3">
          {grouped.map((g) => (
            <SectionBlock key={g.id} {...g} />
          ))}
        </div>
      )}
    </details>
  );
}

function SectionBlock({
  id,
  title,
  subtitle,
  tooltip,
  events,
  isInFlight,
}: {
  id: TraceSection;
  title: string;
  subtitle: string;
  tooltip: string;
  events: TraceEvent[];
  isInFlight: boolean;
}) {
  return (
    <div className="bg-slate-950 text-slate-100 rounded-sm border border-slate-800 overflow-visible animate-in fade-in">
      <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/50 overflow-visible">
        <div className="flex items-baseline gap-2">
          <span className="mono text-[10px] uppercase tracking-widest text-slate-400">
            {id}
          </span>
          <span className="font-medium text-sm text-slate-100">{title}</span>
          <span className="ml-1">
            <InfoTooltip dark>{tooltip}</InfoTooltip>
          </span>
        </div>
        <div className="mono text-[10px] text-slate-500 mt-1">{subtitle}</div>
      </div>

      {events.length === 0 ? (
        <div className="p-4 text-[10px] mono">
          {isInFlight ? (
            <span className="text-amber-400 inline-flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              running...
            </span>
          ) : (
            <span className="text-slate-500 italic">waiting...</span>
          )}
        </div>
      ) : (
        <div className="divide-y divide-slate-800">
          {events.map((t, i) => (
            <TraceItem key={`${id}-${i}-${t.timestamp}`} t={t} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

function TraceItem({ t, index }: { t: TraceEvent; index: number }) {
  const time = new Date(t.timestamp).toLocaleTimeString("en-US", { hour12: false });
  return (
    <div className="p-4">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-slate-500 mono text-[10px]">#{index + 1}</span>
        <span className="text-slate-400 mono text-[10px]">{time}</span>
        <span className="ml-auto text-[10px] mono">
          {t.metadata?.latencyMs ? (
            <span className="text-slate-300">{t.metadata.latencyMs}ms</span>
          ) : null}
          {t.metadata?.costUsdc !== undefined ? (
            <span className="ml-2 text-amber-400">
              ${t.metadata.costUsdc.toFixed(3)} {t.metadata.asset ?? "USDC"}
            </span>
          ) : null}
        </span>
      </div>
      <div className="flex items-baseline gap-3 mb-1">
        <span className="text-slate-200 mono text-xs font-medium">{t.step}</span>
        <span className={`mono text-[10px] ${sourceClass(t.metadata?.source)}`}>
          {t.metadata?.source ?? "live"}
        </span>
      </div>
      <div className="flex items-start gap-2 mb-3">
        <span className="text-slate-500 mono text-[10px] break-all flex-1">
          {t.endpoint}
        </span>
        <CopyButton dark text={extractUrl(t.endpoint)} label="Copy URL" />
      </div>

      {t.request?.body !== undefined && (
        <details className="mb-2" open={index === 0}>
          <summary className="text-slate-400 mono text-[10px] cursor-pointer hover:text-slate-200 inline-flex items-center gap-1">
            → request
          </summary>
          {t.request.headers && (
            <pre className="bg-black/40 mt-1 p-2 text-[10px] text-slate-400 overflow-x-auto mono">
              {Object.entries(t.request.headers)
                .map(([k, v]) => `${k}: ${v}`)
                .join("\n")}
            </pre>
          )}
          <div className="relative">
            <pre className="bg-black/40 mt-1 p-2 pr-8 text-[10px] text-slate-200 overflow-auto mono max-h-64">
              {prettyJSON(t.request.body)}
            </pre>
            <span className="absolute top-2 right-2">
              <CopyButton dark text={prettyJSON(t.request.body)} label="Copy request JSON" />
            </span>
          </div>
        </details>
      )}

      {(t.response?.body !== undefined || t.response?.summary) && (
        <details open={index === 0}>
          <summary className="text-slate-400 mono text-[10px] cursor-pointer hover:text-slate-200">
            ← response{t.response?.status ? ` ${t.response.status}` : ""}
          </summary>
          {t.response.summary && (
            <div className="bg-black/40 mt-1 p-2 text-[10px] text-emerald-300 mono">
              {t.response.summary}
            </div>
          )}
          {t.response.body !== undefined && (
            <div className="relative">
              <pre className="bg-black/40 mt-1 p-2 pr-8 text-[10px] text-slate-200 overflow-auto mono max-h-80">
                {prettyJSON(t.response.body)}
              </pre>
              <span className="absolute top-2 right-2">
                <CopyButton dark text={prettyJSON(t.response.body)} label="Copy response JSON" />
              </span>
            </div>
          )}
        </details>
      )}

      {t.metadata?.downstreamTxHash && (
        <div className="mt-2 text-[10px] mono flex items-start gap-2">
          <span className="text-slate-500 flex-shrink-0">downstream tx · </span>
          <a
            href={`https://testnet.snowtrace.io/tx/${t.metadata.downstreamTxHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-fuchsia-400 underline hover:text-fuchsia-300 break-all flex-1"
          >
            {t.metadata.downstreamTxHash.slice(0, 14)}...
            {t.metadata.downstreamTxHash.slice(-8)}
          </a>
          <CopyButton dark text={t.metadata.downstreamTxHash} label="Copy tx hash" />
          {t.metadata.downstreamBlockNumber ? (
            <span className="text-slate-500 flex-shrink-0">
              block {t.metadata.downstreamBlockNumber.toLocaleString()}
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}
