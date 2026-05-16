import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("PWA manifest", () => {
  it("manifest.json parses + has 3 icons + theme #0F8B4A (T-PWA-1)", () => {
    const file = path.resolve(__dirname, "../../../public/manifest.json");
    const raw = fs.readFileSync(file, "utf8");
    const m = JSON.parse(raw) as {
      name: string;
      theme_color: string;
      icons: Array<{ src: string; sizes: string; purpose?: string }>;
    };
    expect(m.name).toBe("Cobraya");
    expect(m.theme_color).toBe("#0F8B4A");
    expect(m.icons.length).toBe(3);
    const purposes = m.icons.map((i) => i.purpose ?? "any");
    expect(purposes).toContain("maskable");
  });
});
