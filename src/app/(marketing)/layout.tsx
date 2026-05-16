// src/app/(marketing)/layout.tsx — Cobraya pitch v3 (2026-05-16)
//
// Route-group layout. Loads Inter + JetBrains Mono + Instrument Serif via
// next/font so they only ship for /pitch (not for /demo, /(app) or /(auth)).
// The CSS variables get attached to a wrapper <div> so .pitch-root in
// pitch.css can reference them by family name.
//
// Why not @font-face / <link>? next/font already self-hosts the fonts,
// avoids the FOIT/FOUT round-trip to fonts.googleapis.com, and keeps the
// font-display strategy aligned across SSR + hydration.

import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Instrument_Serif } from "next/font/google";

export const metadata: Metadata = {
  title: "Cobraya · Pitch — Tu factura, líquida en 30 segundos",
  description:
    "Factoraje agéntico para PyMEs mexicanas. 4 agentes de IA + smart contract en Avalanche. Sin esperar 60 días.",
};

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--pitch-font-inter",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--pitch-font-mono",
});

const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--pitch-font-serif",
});

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${inter.variable} ${mono.variable} ${serif.variable}`}>
      {children}
    </div>
  );
}
