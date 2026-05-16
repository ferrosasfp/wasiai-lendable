// tests/unit/app/marketing/pitch/page.test.tsx — A6 hackathon landing
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import PitchPage from "@/app/(marketing)/pitch/page";

describe("PitchPage (A6)", () => {
  it("renders the hero headline", () => {
    render(<PitchPage />);
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /Tu factura, líquida en 30 segundos\./,
      }),
    ).toBeDefined();
  });

  it("renders the 4 agent names", () => {
    render(<PitchPage />);
    expect(screen.getAllByText(/CFDI Validator/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Fraud Detector/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Credit Scorer/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Lender Matcher/).length).toBeGreaterThan(0);
  });

  it("section-4 external proof badges open in a new tab", () => {
    const { container } = render(<PitchPage />);

    const snowtrace = container.querySelector(
      'a[href^="https://testnet.snowtrace.io/address/"]',
    );
    expect(snowtrace).not.toBeNull();
    expect(snowtrace?.getAttribute("target")).toBe("_blank");
    expect(snowtrace?.getAttribute("rel")).toContain("noopener");

    const a2aRepo = container.querySelector(
      'a[href="https://github.com/ferrosasfp/wasiai-a2a"]',
    );
    expect(a2aRepo).not.toBeNull();
    expect(a2aRepo?.getAttribute("target")).toBe("_blank");
    expect(a2aRepo?.getAttribute("rel")).toContain("noopener");
  });

  it('"Probá Cobraya" CTA points to "/"', () => {
    render(<PitchPage />);
    const cta = screen.getByRole("link", { name: /Probá Cobraya/ });
    expect(cta.getAttribute("href")).toBe("/");
  });
});
