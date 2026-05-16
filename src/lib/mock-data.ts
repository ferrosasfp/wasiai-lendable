import type { Invoice, Lender } from "@/types/invoice";

export interface BuyerTier1 {
  name: string;             // "Walmart México"
  rfc: string;              // "WAL9709244WS"
  sector: string;           // "food retail"
  sectorAdjustment: number; // delta para scoring
}

export interface LenderEntry {
  id: string;
  name: string;             // "Bankaool Pool A"
  bandAllowlist: Array<"A" | "B" | "C" | "D">;
  sectorAllowlist: "all" | string[];
  minAmountMXN: number;
  maxAmountMXN: number;
  aprPct: number;
  advanceRatePct: number;
  speedMinutes: number;
}

export const BUYERS_TIER_1: BuyerTier1[] = [
  { name: "Walmart México", rfc: "WAL9709244WS", sector: "food retail", sectorAdjustment: 5 },
  { name: "Bimbo", rfc: "BIM450316L92", sector: "apparel", sectorAdjustment: 3 },
  { name: "Cemex", rfc: "CEM880101HNB", sector: "construction", sectorAdjustment: -8 },
  { name: "OXXO", rfc: "OXX901016JA1", sector: "retail", sectorAdjustment: 0 },
];

export const LENDERS_CATALOG: LenderEntry[] = [
  { id: "lender-bankaool-a", name: "Bankaool Pool A", bandAllowlist: ["A", "B"], sectorAllowlist: "all", minAmountMXN: 10000, maxAmountMXN: 500000, aprPct: 14.0, advanceRatePct: 92, speedMinutes: 45 },
  { id: "lender-arkangeles-i", name: "Arkangeles Fund I", bandAllowlist: ["A", "B", "C"], sectorAllowlist: ["food retail", "apparel", "retail", "services"], minAmountMXN: 5000, maxAmountMXN: 300000, aprPct: 13.0, advanceRatePct: 90, speedMinutes: 30 },
  { id: "lender-bbva-bridge", name: "BBVA SME Bridge", bandAllowlist: ["A"], sectorAllowlist: "all", minAmountMXN: 50000, maxAmountMXN: 2000000, aprPct: 12.5, advanceRatePct: 95, speedMinutes: 60 },
  { id: "lender-konfio", name: "Konfío Express", bandAllowlist: ["B", "C", "D"], sectorAllowlist: "all", minAmountMXN: 1000, maxAmountMXN: 200000, aprPct: 22.0, advanceRatePct: 85, speedMinutes: 15 },
];

export const MOCK_INVOICES: Invoice[] = [
  {
    id: "inv-tortilleria-la-esperanza",
    uuid: "11111111-1111-1111-1111-111111111111",
    uuidSat: "11111111-1111-1111-1111-111111111111",
    issuer: { name: "Tortillería La Esperanza", rfc: "TLE850120ABC" },
    receiver: { name: "Walmart México", rfc: "WAL9709244WS" },
    amount: 48500,
    currency: "MXN",
    issueDate: "2026-05-01",
    dueDate: "2026-06-30",
    anchorBuyer: "Walmart México",
    paymentTermsDays: 60,
    sector: "food retail",
    status: "issued",
  },
  {
    id: "inv-confecciones-nayeli",
    uuid: "22222222-2222-2222-2222-222222222222",
    uuidSat: "22222222-2222-2222-2222-222222222222",
    issuer: { name: "Confecciones Nayeli", rfc: "CNA920315XYZ" },
    receiver: { name: "Bimbo", rfc: "BIM450316L92" },
    amount: 28200,
    currency: "MXN",
    issueDate: "2026-05-05",
    dueDate: "2026-06-04",
    anchorBuyer: "Bimbo",
    paymentTermsDays: 30,
    sector: "apparel",
    status: "issued",
  },
  {
    id: "inv-construcciones-hermanos-ruiz",
    uuid: "33333333-3333-3333-3333-333333333333",
    uuidSat: "33333333-3333-3333-3333-333333333333",
    issuer: { name: "Construcciones Hermanos Ruiz", rfc: "CHR880210QWE" },
    receiver: { name: "Cemex", rfc: "CEM880101HNB" },
    amount: 156800,
    currency: "MXN",
    issueDate: "2026-04-15",
    dueDate: "2026-07-14",
    anchorBuyer: "Cemex",
    paymentTermsDays: 90,
    sector: "construction",
    status: "issued",
  },
];

// Backwards compat — preserved for any consumer still using the legacy demo Lender shape.
// @deprecated use LENDERS_CATALOG.
export const MOCK_LENDERS: Lender[] = [
  {
    id: "lnd-arkangeles-fund-i",
    name: "Arkangeles Fund I",
    acceptedBands: ["A", "B"],
    minAmountUSDC: 500,
    maxAmountUSDC: 25000,
    rateAPR: 14.5,
    advanceRate: 0.92,
    wallet: "0xA1234567890123456789012345678901234567Ab",
  },
];
