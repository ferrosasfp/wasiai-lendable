// src/app/(marketing)/pitch/page.tsx — Hackathon pitch landing (A6, 2026-05-16)
// One-page anchor for the 3-min video pitch. 5 sections, mobile-first, static
// server component. Animations are pure CSS keyframes (see globals.css) — we
// deliberately avoid pulling framer-motion since it's not in deps.
//
// Decisions captured here:
// - Palette: project palette (ink/paper/accent/muted/line). Spec mentioned
//   "luma-*" tokens but those don't exist in this repo, so we mapped to the
//   existing Cobraya green (#0F8B4A) + tailwind ink/paper/muted/line.
// - Contract address: read from env at request time on the server, fallback
//   to the known Fuji deployment so the badge always renders a live link.
// - "/negociar" route does not exist in this codebase. We point the auction
//   badge to "/demo" (the live agentic demo) which is the closest live page.
// - Audit example: there's no /public/audit-example.json yet → placeholder
//   anchor "#audit-example" + TODO. Snowtrace + GitHub badges are live.
import Link from "next/link";
import { BrandIcon } from "@/components/BrandIcon";

// Fuji testnet deployment of CobrayaInvoiceCommitments (public on-chain data).
// Mirrors src/infra/env.ts → COBRAYA_COMMITMENTS_ADDRESS.
const FUJI_COMMITMENTS_FALLBACK = "0x5F8F8a31e51d8B2FEe0E0C2f1AffC3B4c6B12506";

function getCommitmentsUrl(): string {
  const addr = process.env.COBRAYA_COMMITMENTS_ADDRESS || FUJI_COMMITMENTS_FALLBACK;
  return `https://testnet.snowtrace.io/address/${addr}`;
}

const GITHUB_URL = "https://github.com/ferrosasfp/wasiai-cobraya";
const A2A_GITHUB_URL = "https://github.com/ferrosasfp/wasiai-a2a";
// TODO(audit): wire to /public/audit-example.json or /api/audit/example once
// we have a stable signed sample. Today the audit-trail route is dynamic per
// requestId so we can't deep-link from a static landing.
const AUDIT_EXAMPLE_URL = "#audit-example";

export default function PitchPage() {
  const snowtraceUrl = getCommitmentsUrl();

  return (
    <main className="min-h-screen bg-paper text-ink">
      {/* ═══════════════════════════════════════════════════════════════════
        * SECTION 1 — HERO
        * ═══════════════════════════════════════════════════════════════════ */}
      <section
        className="relative overflow-hidden py-16 sm:py-20 lg:py-24"
        style={{
          backgroundImage:
            "radial-gradient(120% 80% at 50% 0%, rgba(15,139,74,0.10) 0%, rgba(15,139,74,0.0) 60%), linear-gradient(180deg, #FAFAF8 0%, #F4F2EC 100%)",
        }}
      >
        <div className="max-w-6xl mx-auto px-6">
          <header className="flex items-center gap-3 mb-10">
            <BrandIcon />
            <span className="mono text-[11px] uppercase tracking-widest text-muted">
              Cobraya · Pitch
            </span>
          </header>

          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <h1 className="serif text-5xl sm:text-6xl lg:text-7xl leading-[1.05] tracking-tight">
                Tu factura, líquida en 30 segundos.
              </h1>

              <p className="text-lg text-muted mt-6 leading-relaxed max-w-xl">
                Factoraje agéntico para PyMEs mexicanas. 4 agentes de IA +
                smart contract en Avalanche. Sin esperar 60 días.
              </p>

              <ul className="mt-6 flex flex-wrap gap-2">
                <li className="mono text-xs px-3 py-1.5 rounded-full bg-ink/5 border border-line text-ink">
                  $24B TAM MX
                </li>
                <li className="mono text-xs px-3 py-1.5 rounded-full bg-ink/5 border border-line text-ink">
                  Avalanche Fuji ✓
                </li>
                <li className="mono text-xs px-3 py-1.5 rounded-full bg-ink/5 border border-line text-ink">
                  CNBV-ready
                </li>
              </ul>

              <div className="mt-10 flex flex-col sm:flex-row gap-3">
                <Link href="/" className="pill-btn-primary">
                  Ver demo
                </Link>
              </div>
            </div>

            {/* Phone mockup — pure CSS loop, 4s. */}
            <div className="flex justify-center lg:justify-end">
              <div
                role="img"
                aria-label="Demo animado: factura entra, 4 agentes la validan, USDC llega al wallet"
                className="relative w-[280px] sm:w-[320px] h-[560px] sm:h-[640px] rounded-[40px] border border-ink/15 bg-white shadow-[0_30px_80px_-30px_rgba(0,0,0,0.25)] overflow-hidden"
              >
                {/* Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-ink rounded-b-2xl" />

                <div className="p-5 pt-10 flex flex-col gap-3 h-full">
                  <div className="mono text-[10px] uppercase tracking-widest text-muted">
                    Cobraya · demo
                  </div>

                  {/* Invoice card */}
                  <div className="pitch-anim-invoice rounded-2xl border border-line p-4 bg-paper">
                    <div className="mono text-[10px] uppercase tracking-widest text-muted">
                      Factura CFDI
                    </div>
                    <div className="serif text-2xl mt-1">$48,500 MXN</div>
                    <div className="mono text-[11px] text-muted mt-1">
                      Walmart México · 60 días
                    </div>
                  </div>

                  {/* 4 agent checks */}
                  <AgentCheck
                    className="pitch-anim-check-1"
                    label="CFDI Validator"
                  />
                  <AgentCheck
                    className="pitch-anim-check-2"
                    label="Fraud Detector"
                  />
                  <AgentCheck
                    className="pitch-anim-check-3"
                    label="Credit Scorer"
                  />
                  <AgentCheck
                    className="pitch-anim-check-4"
                    label="Lender Matcher"
                  />

                  {/* USDC arrives */}
                  <div className="pitch-anim-usdc mt-auto rounded-2xl bg-ink text-paper p-4">
                    <div className="mono text-[10px] uppercase tracking-widest opacity-70">
                      USDC en wallet
                    </div>
                    <div className="serif text-3xl mt-1">$940 USDC</div>
                    <div className="mono text-[11px] opacity-70 mt-1">
                      Avalanche Fuji · 30s
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
        * SECTION 2 — PROBLEMA EN 3 NÚMEROS
        * ═══════════════════════════════════════════════════════════════════ */}
      <section className="py-16 lg:py-24 border-t border-line">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex items-start gap-4 mb-12">
            <LupitaAvatar />
            <p className="serif italic text-2xl sm:text-3xl leading-snug text-ink">
              “Lupita vendió $48,500 a Walmart. El pago llega en 60 días.”
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-8 sm:gap-6">
            <StatBlock big="60 días" label="Lo que Walmart tarda en pagarle" />
            <StatBlock big="$24B USD" label="Mercado factoring MX" />
            <StatBlock big="78%" label="PyMEs MX que cierran por flujo de caja" />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
        * SECTION 3 — 4 AGENTES, 30 SEGUNDOS
        * ═══════════════════════════════════════════════════════════════════ */}
      <section className="py-16 lg:py-24 border-t border-line bg-ink/[0.02]">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="serif text-4xl sm:text-5xl tracking-tight">
            4 agentes. 30 segundos. On-chain.
          </h2>
          <p className="text-muted mt-3 max-w-2xl">
            Cada agente tiene precio en USDC, evidencia verificable y un
            commit on-chain o firma EIP-712. Nada es opaco.
          </p>

          <ul className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <AgentCard
              icon={<DocIcon />}
              name="CFDI Validator"
              desc="valida factura SAT"
              cost="$0.001 USDC"
              proof="on-chain commit"
            />
            <AgentCard
              icon={<ShieldIcon />}
              name="Fraud Detector"
              desc="anti doble-cesión"
              cost="$0.005 USDC"
              proof="Avalanche Fuji ✓"
            />
            <AgentCard
              icon={<ChartIcon />}
              name="Credit Scorer"
              desc="score + rationale IA"
              cost="$0.05 USDC"
              proof="EIP-712 firmado"
            />
            <AgentCard
              icon={<HandshakeIcon />}
              name="Lender Matcher"
              desc="subasta 4 lenders"
              cost="$0.01 USDC"
              proof="auction transparente"
            />
          </ul>

          {/* Timeline */}
          <div className="mt-14">
            <div className="mono text-[11px] uppercase tracking-widest text-muted mb-4">
              Timeline · 30 segundos total
            </div>
            <div className="relative">
              <div className="absolute top-1/2 left-0 right-0 h-px bg-line" />
              <ol className="relative flex justify-between">
                {[
                  { label: "CFDI", t: "~3s" },
                  { label: "Fraud", t: "~8s" },
                  { label: "Score", t: "~15s" },
                  { label: "Match", t: "~25s" },
                  { label: "Settle", t: "~30s" },
                ].map((step, i) => (
                  <li key={step.label} className="flex flex-col items-center">
                    <span
                      className={`pitch-dot-${i + 1} block w-3.5 h-3.5 rounded-full bg-line border border-ink/10`}
                      aria-hidden="true"
                    />
                    <span className="mono text-[10px] uppercase tracking-widest text-muted mt-2">
                      {step.label}
                    </span>
                    <span className="mono text-[10px] text-ink/70 mt-0.5">
                      {step.t}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
        * SECTION 4 — POR QUÉ ES REAL (la prueba)
        * ═══════════════════════════════════════════════════════════════════ */}
      <section className="py-16 lg:py-24 border-t border-line">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="serif text-4xl sm:text-5xl tracking-tight">
            Esto no es un mockup.
          </h2>
          <p className="text-muted mt-3 max-w-2xl">
            Contrato verificado, eventos on-chain, subasta en vivo y 1660+
            tests automatizados sosteniendo la infra.
          </p>

          <ul className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ProofBadge
              title="Snowtrace"
              subtitle="contract verified"
              href={snowtraceUrl}
              external
            />
            <ProofBadge
              title="JSON audit"
              subtitle="EIP-712 signed"
              href={AUDIT_EXAMPLE_URL}
              arrow="↓"
            />
            <ProofBadge
              title="Auction live"
              subtitle="4 lenders compiten"
              href="/demo"
            />
            <ProofBadge
              title="1660+ tests ✓"
              subtitle="wasiai-a2a infra"
              href={A2A_GITHUB_URL}
              external
            />
          </ul>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
        * SECTION 5 — CTA FINAL
        * ═══════════════════════════════════════════════════════════════════ */}
      <section className="py-20 lg:py-28 border-t border-line bg-ink/[0.02]">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="serif text-5xl sm:text-6xl leading-[1.05] tracking-tight">
            ¿Ya cobraste? Cobraya.
          </h2>

          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/" className="pill-btn-primary">
              Probá Cobraya
            </Link>
            <a href="#video" className="pill-btn">
              Ver video (3 min)
            </a>
          </div>

          <ul className="mt-12 flex flex-wrap justify-center gap-x-3 gap-y-2 text-sm text-muted">
            <li>
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-ink"
              >
                GitHub
              </a>
            </li>
            <li aria-hidden="true">·</li>
            <li>
              <a
                href={snowtraceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-ink"
              >
                Snowtrace contract
              </a>
            </li>
            <li aria-hidden="true">·</li>
            <li>
              <a href={AUDIT_EXAMPLE_URL} className="hover:text-ink">
                Audit example
              </a>
            </li>
          </ul>

          <div className="mt-16 flex items-center justify-center gap-3">
            <BrandIcon />
            <span className="serif text-2xl text-ink">Cobraya</span>
          </div>
          <div className="mono text-[10px] uppercase tracking-widest text-muted mt-2">
            Avalanche LATAM Fintech Build · 2026
          </div>
        </div>
      </section>
    </main>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
 * Sub-components — kept local; this is the only consumer.
 * ─────────────────────────────────────────────────────────────────────── */

function AgentCheck({ className, label }: { className: string; label: string }) {
  return (
    <div
      className={`${className} flex items-center justify-between rounded-xl border border-line bg-white px-3 py-2`}
    >
      <span className="mono text-[11px] text-ink">{label}</span>
      <CheckCircle />
    </div>
  );
}

function CheckCircle() {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className="w-5 h-5"
      fill="none"
    >
      <circle cx="10" cy="10" r="9" fill="#0F8B4A" />
      <path
        d="M5.5 10.5l3 3 6-6.5"
        stroke="#FCF7F3"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LupitaAvatar() {
  return (
    <svg
      viewBox="0 0 56 56"
      aria-label="Lupita"
      className="w-14 h-14 shrink-0"
    >
      <circle cx="28" cy="28" r="28" fill="rgba(15,139,74,0.12)" />
      <text
        x="50%"
        y="55%"
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily="'JetBrains Mono', monospace"
        fontSize="20"
        fontWeight="600"
        fill="#0F8B4A"
      >
        LR
      </text>
    </svg>
  );
}

function StatBlock({ big, label }: { big: string; label: string }) {
  return (
    <div>
      <div className="mono text-5xl sm:text-6xl font-bold leading-none text-ink">
        {big}
      </div>
      <div className="text-sm text-muted mt-3 leading-snug">{label}</div>
    </div>
  );
}

function AgentCard({
  icon,
  name,
  desc,
  cost,
  proof,
}: {
  icon: React.ReactNode;
  name: string;
  desc: string;
  cost: string;
  proof: string;
}) {
  return (
    <li className="rounded-2xl border border-line bg-white p-5 flex flex-col gap-3 min-h-[200px]">
      <div className="w-10 h-10 rounded-xl bg-ink/[0.04] flex items-center justify-center">
        {icon}
      </div>
      <div>
        <div className="font-semibold text-ink leading-tight">{name}</div>
        <div className="text-sm text-muted mt-1">{desc}</div>
      </div>
      <div className="mt-auto flex flex-wrap gap-2">
        <span className="mono text-[10px] px-2 py-1 rounded-full bg-ink/5 border border-line">
          {cost}
        </span>
        <span className="mono text-[10px] px-2 py-1 rounded-full bg-ink/5 border border-line">
          {proof}
        </span>
      </div>
    </li>
  );
}

function ProofBadge({
  title,
  subtitle,
  href,
  external = false,
  arrow = "↗",
}: {
  title: string;
  subtitle: string;
  href: string;
  external?: boolean;
  arrow?: string;
}) {
  const isExternal = external || /^https?:\/\//.test(href);
  const commonProps = isExternal
    ? { target: "_blank", rel: "noopener noreferrer" }
    : {};

  return (
    <li>
      <a
        href={href}
        {...commonProps}
        className="group flex items-center justify-between rounded-2xl border border-line bg-white p-5 min-h-[88px] hover:border-ink/40 transition-colors"
      >
        <div>
          <div className="font-semibold text-ink">{title}</div>
          <div className="mono text-xs text-muted mt-1">{subtitle}</div>
        </div>
        <span
          aria-hidden="true"
          className="serif text-2xl text-ink/60 group-hover:text-ink transition-colors"
        >
          {arrow}
        </span>
      </a>
    </li>
  );
}

/* ─── inline icons (SVG, no emoji) ─────────────────────────────────────── */

function DocIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" aria-hidden="true">
      <path
        d="M6 3h8l4 4v14H6z"
        stroke="#0F8B4A"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M14 3v4h4" stroke="#0F8B4A" strokeWidth="1.5" />
      <path d="M9 13h6M9 17h6" stroke="#0F8B4A" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" aria-hidden="true">
      <path
        d="M12 3l8 3v6c0 4.5-3.2 8.3-8 9-4.8-.7-8-4.5-8-9V6l8-3z"
        stroke="#0F8B4A"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M9 12l2 2 4-4"
        stroke="#0F8B4A"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" aria-hidden="true">
      <path d="M4 20h16" stroke="#0F8B4A" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="6" y="11" width="3" height="7" stroke="#0F8B4A" strokeWidth="1.5" />
      <rect x="11" y="7" width="3" height="11" stroke="#0F8B4A" strokeWidth="1.5" />
      <rect x="16" y="4" width="3" height="14" stroke="#0F8B4A" strokeWidth="1.5" />
    </svg>
  );
}

function HandshakeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" aria-hidden="true">
      <path
        d="M3 13l4-4 3 2 4-4 7 6-3 3-4-3-3 3-3-2-2 2z"
        stroke="#0F8B4A"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
