import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { Button } from "@/components/ui/button";

describe("<Button /> — WKH-COBRAYA-DAPP-SHELL W2", () => {
  it("renders 'primary' variant with pill-btn primary classes by default", () => {
    render(<Button>Comenzar</Button>);
    const btn = screen.getByRole("button", { name: "Comenzar" });
    expect(btn.className).toContain("pill-btn");
    expect(btn.className).toContain("pill-btn-primary");
    expect(btn.className).toContain("min-h-[48px]");
  });

  it("renders 'ghost' variant with text-luma-700", () => {
    render(<Button variant="ghost">Cancelar</Button>);
    const btn = screen.getByRole("button", { name: "Cancelar" });
    expect(btn.className).toContain("text-luma-700");
    expect(btn.className).not.toContain("pill-btn-primary");
  });

  it("renders 'link' variant with underline-offset-2", () => {
    render(<Button variant="link">Más info</Button>);
    const btn = screen.getByRole("button", { name: "Más info" });
    expect(btn.className).toContain("underline-offset-2");
  });

  it("propagates disabled (HTML attribute) and forwards extra classes", () => {
    render(
      <Button disabled className="custom-flag">
        Esperar
      </Button>,
    );
    const btn = screen.getByRole("button", { name: "Esperar" });
    expect(btn).toBeDisabled();
    expect(btn.className).toContain("custom-flag");
  });
});
