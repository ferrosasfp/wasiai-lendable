// tests/unit/components/InvoicePicker.test.tsx — W6
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { InvoicePicker } from "@/components/InvoicePicker";
import { MOCK_INVOICES } from "@/lib/mock-data";

describe("InvoicePicker (T-UI-PICKER-1)", () => {
  it("renders one button per mock invoice", () => {
    const { container } = render(
      <InvoicePicker selected={null} onSelect={vi.fn()} />,
    );
    const buttons = container.querySelectorAll("button");
    expect(buttons).toHaveLength(MOCK_INVOICES.length);
    expect(MOCK_INVOICES.length).toBe(3);
  });
});
