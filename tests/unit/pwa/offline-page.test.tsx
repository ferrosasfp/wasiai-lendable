import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import OfflinePage from "@/app/~offline/page";

describe("OfflinePage (T-PWA-2)", () => {
  it("renders 'Sin conexión' heading", () => {
    render(<OfflinePage />);
    expect(screen.getByText(/Sin conexi/i)).toBeDefined();
  });
});
