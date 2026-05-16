// src/app/api/settle/route.ts — W5 REPLACE
// EIP-3009 server-side signer + cap enforcement + facilitator delegation.
// CD-5 (cap honored), CD-9 (no key leak), CD-21 (no env dump).
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseUnits } from "viem";
import { signTransferAuthorization } from "@/infra/eip3009-signer";
import { settleOnFacilitator } from "@/infra/facilitator-client";
import { ONCHAIN_AMOUNT_CAP_USDC, OWNER_ADDRESS } from "@/infra/env";
import { mockSettle } from "@/infra/mock-adapter";

const MatchSchema = z.object({
  lenderId: z.string(),
  lenderName: z.string(),
  netAmountUSDC: z.number().nonnegative(),
});

const InputSchema = z.object({
  match: MatchSchema,
  smeWalletOverride: z.string().optional(),
});

function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}

export async function POST(req: NextRequest) {
  const parsed = InputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { match, smeWalletOverride } = parsed.data;
  const amountUSDC = match.netAmountUSDC;

  // CD-5 + AC-7: server-side cap enforcement (NOT only UI).
  if (amountUSDC > ONCHAIN_AMOUNT_CAP_USDC) {
    return NextResponse.json(
      {
        error: "cap_exceeded",
        testnetCapUSDC: ONCHAIN_AMOUNT_CAP_USDC,
        requestedUSDC: amountUSDC,
        message: `testnet cap — mainnet would settle full $${amountUSDC}`,
      },
      { status: 422 },
    );
  }

  if (isDemoMode()) {
    const to = (smeWalletOverride ?? OWNER_ADDRESS) as `0x${string}`;
    const fake = mockSettle(
      {
        lenderId: match.lenderId,
        lenderName: match.lenderName,
        advanceRate: 0,
        rateAPR: 0,
        estimatedSettlement: { grossUSDC: 0, feeUSDC: 0, netUSDC: amountUSDC },
      },
      to,
      to,
    );
    return NextResponse.json({
      receipt: {
        txHash: fake.txHash,
        snowtraceUrl: `https://testnet.snowtrace.io/tx/${fake.txHash}`,
        deliveredAmountUSDC: amountUSDC,
        blockNumber: fake.blockNumber,
      },
      traces: [],
    });
  }

  try {
    const to = (smeWalletOverride ?? OWNER_ADDRESS) as `0x${string}`;
    const valueOnchain = parseUnits(amountUSDC.toString(), 6);
    const auth = await signTransferAuthorization({ to, valueOnchain });
    const settlement = await settleOnFacilitator({
      authorization: auth,
      lenderId: match.lenderId,
    });
    return NextResponse.json({
      receipt: {
        txHash: settlement.txHash,
        snowtraceUrl: settlement.snowtraceUrl,
        deliveredAmountUSDC: settlement.deliveredAmountUSDC,
        blockNumber: settlement.blockNumber,
      },
      traces: [],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    // CD-9: sanitize — never leak hex addrs/keys
    const safe = message.replace(/0x[0-9a-fA-F]{40,}/g, "<redacted-hex>");
    return NextResponse.json({ error: "settle_failed", message: safe }, { status: 502 });
  }
}
