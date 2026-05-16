// src/components/BrandIcon.tsx — Cobraya brand icon (W6)
// Adapted from wasiai-agentshop/src/components/BrandIcon.tsx — recoloured to
// Cobraya green (#0F8B4A) with a "C" glyph.
export function BrandIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 56 56"
      fill="none"
      aria-hidden="true"
      className="w-10 h-10"
    >
      <rect width="56" height="56" rx="13" fill="#0F8B4A" />
      <path
        d="M40 18 Q28 12 19 21 Q12 28 19 38 Q28 47 40 41 L40 35 Q32 39 25 34 Q21 28 25 23 Q32 17 40 23 Z"
        fill="#FCF7F3"
      />
    </svg>
  );
}
