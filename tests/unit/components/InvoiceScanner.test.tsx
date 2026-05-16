// tests/unit/components/InvoiceScanner.test.tsx
// T-INVOICE-SCANNER-1 — initial idle render exposes the scan CTA so the demo
// flow always has a discoverable entry point.
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { InvoiceScanner } from "@/components/InvoiceScanner";

describe("InvoiceScanner", () => {
  it("T-INVOICE-SCANNER-1 renders the idle scan CTA on mount", () => {
    const { container } = render(<InvoiceScanner onConfirm={vi.fn()} />);
    const btn = container.querySelector(
      'button[data-stage="idle"]',
    ) as HTMLButtonElement | null;
    expect(btn).not.toBeNull();
    expect(btn?.textContent ?? "").toContain("Escanear factura");
    // CTA primary unified class — min-height ≥48px enforced inside the
    // `.cta-primary` selector in globals.css (CD-23 still satisfied).
    expect(btn?.className ?? "").toContain("cta-primary");
  });

  it("renders a custom CTA label when provided", () => {
    const { container } = render(
      <InvoiceScanner onConfirm={vi.fn()} ctaLabel="Escanear otra factura" />,
    );
    const btn = container.querySelector('button[data-stage="idle"]');
    expect(btn?.textContent ?? "").toContain("Escanear otra factura");
  });
});
