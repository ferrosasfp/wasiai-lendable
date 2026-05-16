import { describe, it, expect } from "vitest";
import * as React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { Input } from "@/components/ui/input";

describe("<Input /> — WKH-COBRAYA-DAPP-SHELL W2", () => {
  it("applies auth-input + min-h-[48px] by default and accepts custom className", () => {
    render(<Input placeholder="correo" className="extra" />);
    const el = screen.getByPlaceholderText("correo");
    expect(el.className).toContain("auth-input");
    expect(el.className).toContain("min-h-[48px]");
    expect(el.className).toContain("extra");
    expect(el).toHaveAttribute("type", "text");
  });

  it("forwards refs and respects type='password'", () => {
    const ref = React.createRef<HTMLInputElement>();
    render(<Input type="password" ref={ref} aria-label="pwd" />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(screen.getByLabelText("pwd")).toHaveAttribute("type", "password");
  });
});
