import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("PWA manifest", () => {
  // theme_color updated to burgundy #651332 by WKH-COBRAYA-DAPP-SHELL W11 (AC-17).
  it("manifest.json parses + 3 icons + burgundy theme + maskable purpose (T-PWA-1 + AC-17)", () => {
    const file = path.resolve(__dirname, "../../../public/manifest.json");
    const raw = fs.readFileSync(file, "utf8");
    const m = JSON.parse(raw) as {
      name: string;
      theme_color: string;
      background_color: string;
      icons: Array<{ src: string; sizes: string; purpose?: string }>;
    };
    expect(m.name).toBe("Cobraya");
    // AC-17: burgundy theme color (was #0F8B4A green pre-W11).
    expect(m.theme_color).toBe("#651332");
    expect(m.background_color).toBe("#5B0426");
    expect(m.icons.length).toBe(3);
    const purposes = m.icons.map((i) => i.purpose ?? "any");
    expect(purposes).toContain("maskable");
  });
});
