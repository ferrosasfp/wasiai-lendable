// tests/unit/components/AuditPanel.test.tsx — W6
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { AuditPanel } from "@/components/AuditPanel";

describe("AuditPanel (T-UI-AUDIT-1)", () => {
  it("renders '1 step' + download anchor with href=/api/audit-trail/{requestId}", () => {
    const { container } = render(
      <AuditPanel
        steps={[
          {
            stepIndex: 1,
            agentSlug: "cobraya-cfdi-validator",
            success: true,
            latencyMs: 120,
          },
        ]}
        requestId="abc"
      />,
    );
    expect(container.textContent).toContain("1 step");
    const anchor = container.querySelector("a[download]");
    expect(anchor).not.toBeNull();
    expect(anchor?.getAttribute("href")).toBe("/api/audit-trail/abc");
  });

  it("uses plural 'steps' when more than one step is present", () => {
    const { container } = render(
      <AuditPanel
        steps={[
          { stepIndex: 0, agentSlug: "a", success: true, latencyMs: 10 },
          { stepIndex: 1, agentSlug: "b", success: false, latencyMs: 20 },
        ]}
        requestId="xyz"
      />,
    );
    expect(container.textContent).toContain("2 steps");
  });
});
