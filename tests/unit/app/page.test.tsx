import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import SplashPage from "@/app/page";

describe("Splash page (/) — WKH-COBRAYA-DAPP-SHELL W4 (DD-J)", () => {
  it("renders the wordmark 'Cobraya'", () => {
    render(<SplashPage />);
    expect(screen.getByText("Cobraya")).toBeInTheDocument();
  });

  it("renders 'Comenzar' CTA linking to /signup with min-h-[48px]", () => {
    render(<SplashPage />);
    const cta = screen.getByRole("link", { name: /comenzar/i });
    expect(cta).toHaveAttribute("href", "/signup");
    expect(cta.className).toContain("pill-btn-primary");
    expect(cta.className).toContain("min-h-[48px]");
  });

  it("renders 'Ya tengo cuenta' link to /login", () => {
    render(<SplashPage />);
    const link = screen.getByRole("link", { name: /ya tengo cuenta/i });
    expect(link).toHaveAttribute("href", "/login");
  });
});
