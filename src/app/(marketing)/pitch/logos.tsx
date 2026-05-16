// src/app/(marketing)/pitch/logos.tsx — Real brand logos for pitch v3 (2026-05-16)
//
// Inline SVG components used by the pitch landing v3 (page.tsx) to replace
// the previous mono-letter placeholders ("▲", "$", "FD", …) in:
//   - .brand-mark (nav + footer)  → <LogoCobraya />
//   - .stack-grid .scard .ico (9 cards) → 1 component per card
//
// Design rules:
//   1. All SVGs render inline. No <img>, no next/image, no fetch.
//   2. Each component accepts { size?: number; className?: string }.
//   3. SVGs that should adapt to surrounding palette use currentColor;
//      brand SVGs that need their exact brand color hardcode it (Avalanche
//      red, USDC blue, Supabase green).
//   4. The Avalanche + Next.js SVGs are inlined from /public/logos/*.svg
//      (the .svg files stay in /public for direct asset references; the
//      JSX copies preserve the original viewBox + paths).
//   5. CNBV / A2A / Facilitator are custom marks (no real brand to use).

import React from "react";

type LogoProps = {
  size?: number;
  className?: string;
};

/**
 * Cobraya brand mark — two interlocking C-arcs.
 * Same geometry as /public/brand/cobraya-mark.svg, but with stroke colors
 * set to currentColor + a lighter accent so the mark can sit on the wine
 * gradient of the .brand-mark wrapper (nav / footer) and still read.
 */
export function LogoCobraya({ size = 28, className }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      fill="none"
      role="img"
      aria-label="Cobraya"
      width={size}
      height={size}
      className={className}
    >
      <title>Cobraya</title>
      <path
        d="M 38 24 A 14 14 0 1 0 24 38"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M 26 40 A 14 14 0 1 0 40 26"
        stroke="currentColor"
        strokeOpacity="0.55"
        strokeWidth="6"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Avalanche official mark — served from /public/logos/avalanche.svg.
 * Original asset is the official Avalanche brand SVG with the white inner
 * "A" rect (so the red circle reads correctly on any background).
 */
export function LogoAvalanche({ size = 22, className }: LogoProps) {
  return (
    <img
      src="/logos/avalanche.svg"
      alt="Avalanche"
      width={size}
      height={size}
      className={className}
      style={{ display: "block", objectFit: "contain" }}
    />
  );
}

/**
 * USDC — official Circle USDC logo, served from /public/logos/usdc.png.
 * Original asset is a high-res PNG (Circle brand kit).
 */
export function LogoUSDC({ size = 22, className }: LogoProps) {
  return (
    <img
      src="/logos/usdc.png"
      alt="USDC"
      width={size}
      height={size}
      className={className}
      style={{ display: "block" }}
    />
  );
}

/**
 * Foundry — rounded dark square with mono "fd" wordmark.
 * Foundry doesn't ship an official SVG widely; we use a discreet typographic
 * mark that pairs cleanly with the wine palette.
 */
export function LogoFoundry({ size = 22, className }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      role="img"
      aria-label="Foundry"
      width={size}
      height={size}
      className={className}
    >
      <title>Foundry</title>
      <rect x="1" y="1" width="22" height="22" rx="5" fill="#1a1a1a" />
      <text
        x="12"
        y="16"
        textAnchor="middle"
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        fontSize="10"
        fontWeight="700"
        fill="#F5C76A"
        letterSpacing="-0.5"
      >
        fd
      </text>
    </svg>
  );
}

/**
 * OpenZeppelin — shield outline.
 * Kept as a fallback for future combined Foundry+OZ use; not currently
 * mounted in page.tsx but exported per Story File.
 */
export function LogoOpenZeppelin({ size = 22, className }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      role="img"
      aria-label="OpenZeppelin"
      width={size}
      height={size}
      className={className}
    >
      <title>OpenZeppelin</title>
      <path
        d="M12 2 L20 5 V12 C20 16.5 16.5 20.5 12 22 C7.5 20.5 4 16.5 4 12 V5 Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M9 11.5 L11.2 13.7 L15 9.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

/**
 * Anthropic — official Claude icon, served from /public/logos/anthropic.webp.
 * Original asset is the Anthropic brand mark in WebP.
 */
export function LogoAnthropic({ size = 22, className }: LogoProps) {
  return (
    <img
      src="/logos/anthropic.webp"
      alt="Anthropic Claude"
      width={size}
      height={size}
      className={className}
      style={{ display: "block" }}
    />
  );
}

/**
 * Next.js square icon — served from /public/logos/nextjs-icon.svg.
 * The canonical Next.js mark: black circle with the stylized white "N".
 * Square aspect ratio so it sits cleanly in the 38×38 .ico container.
 */
export function LogoNextjs({ size = 22, className }: LogoProps) {
  return (
    <img
      src="/logos/nextjs-icon.svg"
      alt="Next.js"
      width={size}
      height={size}
      className={className}
      style={{ display: "block", objectFit: "contain" }}
    />
  );
}

/**
 * Supabase — official logo, served from /public/logos/supabase.webp.
 * Original asset is the Supabase brand mark in WebP.
 */
export function LogoSupabase({ size = 22, className }: LogoProps) {
  return (
    <img
      src="/logos/supabase.webp"
      alt="Supabase"
      width={size}
      height={size}
      className={className}
      style={{ display: "block" }}
    />
  );
}

/**
 * CNBV — custom mark (no public CNBV brand asset usable).
 * Rounded wine outline square with mono "CNBV" inside.
 */
export function LogoCNBV({ size = 22, className }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      role="img"
      aria-label="CNBV"
      width={size}
      height={size}
      className={className}
    >
      <title>CNBV</title>
      <rect
        x="1"
        y="4.5"
        width="22"
        height="15"
        rx="3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <text
        x="12"
        y="15"
        textAnchor="middle"
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        fontSize="7"
        fontWeight="800"
        fill="currentColor"
        letterSpacing="0.3"
      >
        CNBV
      </text>
    </svg>
  );
}

/**
 * wasiai-a2a — uses the real wasiai brand mark (from wasiai-v2).
 * Same logo file for both a2a and facilitator since both are wasiai products;
 * the card title under each disambiguates.
 */
export function LogoA2A({ size = 22, className }: LogoProps) {
  return (
    <img
      src="/logos/wasiai.svg"
      alt="wasiai-a2a"
      width={size}
      height={size}
      className={className}
      style={{ display: "block", objectFit: "contain" }}
    />
  );
}

/**
 * wasiai-facilitator — uses the real wasiai brand mark (from wasiai-v2).
 */
export function LogoFacilitator({ size = 22, className }: LogoProps) {
  return (
    <img
      src="/logos/wasiai.svg"
      alt="wasiai-facilitator"
      width={size}
      height={size}
      className={className}
      style={{ display: "block", objectFit: "contain" }}
    />
  );
}
