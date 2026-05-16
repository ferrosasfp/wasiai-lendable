// src/app/(marketing)/layout.tsx — A6 pitch landing (hackathon)
// Route-group layout: minimal passthrough. Inherits <html>/<body> + global
// metadata from src/app/layout.tsx so we avoid duplicating chrome.
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cobraya · Pitch — Tu factura, líquida en 30 segundos",
  description:
    "Factoraje agéntico para PyMEs mexicanas. 4 agentes de IA + smart contract en Avalanche. Sin esperar 60 días.",
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
