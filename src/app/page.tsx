// src/app/page.tsx — W6 REPLACE
// Mobile-first hero. Narrativa Lupita / Walmart. Sin Oracle GenAI.
import Link from "next/link";
import { BrandIcon } from "@/components/BrandIcon";

export default function Home() {
  return (
    <main className="min-h-screen px-4 pt-6 pb-16 max-w-3xl mx-auto">
      <header className="flex items-center gap-3 mb-8">
        <BrandIcon />
        <span className="mono text-[11px] uppercase tracking-widest text-muted">
          Cobraya · SmartFactoring agéntico
        </span>
      </header>

      <section className="mb-10">
        <h1 className="serif text-4xl md:text-6xl leading-tight">
          Tu factura,
          <br />
          líquida en 30 segundos.
        </h1>
        <p className="text-base text-muted mt-4 leading-relaxed">
          Lupita le factura a Walmart México por $48,500 MXN a 60 días. Cobraya orquesta
          4 agentes autónomos — validador, anti-fraude onchain, scoring, subasta de
          lenders — y deposita USDC en su wallet en segundos. Sin gas, sin trámites.
        </p>
      </section>

      <section className="mb-10">
        <Link
          href="/demo"
          className="block w-full text-center bg-ink text-paper px-6 py-4 mono text-xs uppercase tracking-widest min-h-[48px]"
        >
          Probar el demo
        </Link>
        <Link
          href="https://github.com/ferrosasfp/wasiai-lendable"
          className="block w-full text-center mt-3 border border-ink text-ink px-6 py-4 mono text-xs uppercase tracking-widest min-h-[48px]"
        >
          Ver código
        </Link>
      </section>

      <section className="space-y-5 mb-10">
        <div>
          <div className="mono text-[11px] uppercase tracking-widest text-muted mb-1">
            01 · Validación CFDI
          </div>
          <p className="text-sm leading-relaxed">
            <span className="mono">cobraya-cfdi-validator</span> verifica shape +
            anchor buyer + duplicates en milisegundos.
          </p>
        </div>
        <div>
          <div className="mono text-[11px] uppercase tracking-widest text-muted mb-1">
            02 · Anti-fraude onchain
          </div>
          <p className="text-sm leading-relaxed">
            <span className="mono">cobraya-fraud-detector</span> commitea el hash de la
            factura en Avalanche Fuji. Imposible doble-cesión.
          </p>
        </div>
        <div>
          <div className="mono text-[11px] uppercase tracking-widest text-muted mb-1">
            03 · Scoring de crédito
          </div>
          <p className="text-sm leading-relaxed">
            <span className="mono">cobraya-credit-scorer</span> puntúa por sector +
            anchor + términos de pago. Rationale con Claude Haiku.
          </p>
        </div>
        <div>
          <div className="mono text-[11px] uppercase tracking-widest text-muted mb-1">
            04 · Subasta de lenders
          </div>
          <p className="text-sm leading-relaxed">
            <span className="mono">cobraya-lender-matcher</span> corre auction entre 4
            lenders y devuelve el ranking por APR + advance + speed.
          </p>
        </div>
      </section>

      <footer className="border-t border-ink/10 pt-6">
        <div className="mono text-[11px] uppercase tracking-widest text-muted mb-3">
          Built on WasiAI · ya en producción
        </div>
        <ul className="grid grid-cols-1 gap-3 text-sm">
          <li>
            <div className="font-medium">wasiai-a2a</div>
            <div className="text-muted text-xs">A2A protocol gateway</div>
          </li>
          <li>
            <div className="font-medium">wasiai-v2</div>
            <div className="text-muted text-xs">Marketplace de agentes</div>
          </li>
          <li>
            <div className="font-medium">wasiai-facilitator</div>
            <div className="text-muted text-xs">Self-hosted x402</div>
          </li>
        </ul>
      </footer>
    </main>
  );
}
