// src/app/api/marketplace/route.ts — W1
// Adapted from wasiai-agentshop pattern (CD-4: consume-only, no upstream mods).
import { NextResponse } from "next/server";
import { A2A_KEY, A2A_URL } from "@/infra/env";

interface RawDiscoveredAgent {
  slug: string;
  name: string;
  priceUsdc: number;
  payment?: {
    chain?: string;
    asset?: string;
    method?: string;
    contract?: string;
  };
}

interface DiscoveredAgent {
  slug: string;
  name: string;
  priceUsdc: number;
  payment?: {
    chain?: string;
    asset?: string;
    method?: string;
    identityContract?: string;
  };
}

function renameContract(a: RawDiscoveredAgent): DiscoveredAgent {
  if (!a.payment) return a as DiscoveredAgent;
  const { contract, ...rest } = a.payment;
  return {
    ...a,
    payment: {
      ...rest,
      identityContract: contract,
    },
  };
}

interface DiscoveryResponse {
  agents: DiscoveredAgent[];
  totalEstimatedFee: number;
  discoveryEndpoint: string;
  composeEndpoint: string;
  facilitatorEndpoint: string;
  latencyMs: number;
  registry: string;
  source: "live" | "static-fallback";
}

const COBRAYA_SLUGS = [
  "cobraya-cfdi-validator",
  "cobraya-fraud-detector",
  "cobraya-credit-scorer",
  "cobraya-lender-matcher",
] as const;

const STATIC_FALLBACK: DiscoveredAgent[] = [
  {
    slug: "cobraya-cfdi-validator",
    name: "Cobraya CFDI Validator",
    priceUsdc: 0.001,
    payment: { chain: "avalanche-fuji", asset: "USDC", method: "x402" },
  },
  {
    slug: "cobraya-fraud-detector",
    name: "Cobraya Fraud Detector",
    priceUsdc: 0.005,
    payment: { chain: "avalanche-fuji", asset: "USDC", method: "x402" },
  },
  {
    slug: "cobraya-credit-scorer",
    name: "Cobraya Credit Scorer",
    priceUsdc: 0.05,
    payment: { chain: "avalanche-fuji", asset: "USDC", method: "x402" },
  },
  {
    slug: "cobraya-lender-matcher",
    name: "Cobraya Lender Matcher",
    priceUsdc: 0.01,
    payment: { chain: "avalanche-fuji", asset: "USDC", method: "x402" },
  },
];

export async function GET() {
  const started = Date.now();
  let agents: DiscoveredAgent[];
  let registry = "WasiAI · live";
  let source: "live" | "static-fallback" = "live";

  try {
    // CD-22: x-a2a-key header ONLY outbound from server-side.
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (A2A_KEY) headers["x-a2a-key"] = A2A_KEY;

    const res = await fetch(`${A2A_URL}/discover?capabilities=invoice-factoring&limit=10`, {
      headers,
      next: { revalidate: 30 },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) throw new Error(`a2a /discover HTTP ${res.status}`);
    const data = (await res.json()) as { agents: RawDiscoveredAgent[] };
    const live = (data.agents ?? [])
      .filter((a) => COBRAYA_SLUGS.includes(a.slug as (typeof COBRAYA_SLUGS)[number]))
      .map(renameContract);
    if (live.length === COBRAYA_SLUGS.length) {
      agents = live;
    } else {
      agents = STATIC_FALLBACK;
      registry = "WasiAI · static fallback";
      source = "static-fallback";
    }
  } catch {
    agents = STATIC_FALLBACK;
    registry = "WasiAI · static fallback";
    source = "static-fallback";
  }

  const ordered = COBRAYA_SLUGS.map(
    (slug) => agents.find((a) => a.slug === slug) ?? STATIC_FALLBACK.find((a) => a.slug === slug)!,
  );

  const latencyMs = Date.now() - started;
  const totalEstimatedFee = ordered.reduce((sum, a) => sum + (a.priceUsdc ?? 0), 0);

  const body: DiscoveryResponse = {
    agents: ordered,
    totalEstimatedFee,
    discoveryEndpoint: `${A2A_URL}/discover`,
    composeEndpoint: `${A2A_URL}/compose`,
    facilitatorEndpoint: "https://wasiai-facilitator-production.up.railway.app",
    latencyMs,
    registry,
    source,
  };

  return NextResponse.json({
    ...body,
    trace: {
      section: "00",
      step: "marketplace · discover agents",
      endpoint: `GET ${A2A_URL}/discover?capabilities=invoice-factoring&limit=10`,
      request: {
        method: "GET",
        url: `${A2A_URL}/discover?capabilities=invoice-factoring&limit=10`,
      },
      response: {
        status: 200,
        body: {
          agents: ordered.map((a) => ({
            slug: a.slug,
            priceUsdc: a.priceUsdc,
            payment: a.payment,
          })),
        },
        summary: `${ordered.length} agents · registry ${registry}`,
      },
      metadata: {
        source,
        latencyMs,
        chain: "avalanche-fuji",
        asset: "USDC",
      },
      timestamp: new Date().toISOString(),
    },
  });
}
