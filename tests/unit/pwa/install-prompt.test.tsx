import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { InstallPrompt } from "@/components/pwa/install-prompt";

describe("InstallPrompt (T-PWA-3)", () => {
  it("renders without crash even without beforeinstallprompt event", () => {
    const { container } = render(<InstallPrompt />);
    // On jsdom without BIP event + non-iOS + non-standalone → component returns null
    // Test passes if no exception thrown during render.
    expect(container).toBeDefined();
  });
});
