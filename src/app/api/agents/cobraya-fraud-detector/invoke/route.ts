// src/app/api/agents/cobraya-fraud-detector/invoke/route.ts — W2.5 + W5.5 wiring
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createPublicClient, createWalletClient, http, keccak256, encodePacked } from "viem";
import { avalancheFuji } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { COMMITMENTS_ABI } from "@/lib/abis/cobraya-invoice-commitments";
import { mockFraudCheck } from "@/infra/mock-adapter";
import { signReceipt, getAgentAddress, pushStep } from "@/infra/agent-signer";

const InputSchema = z.object({
  uuidCfdi: z.string().min(1),
  rfcEmisor: z.string().min(1),
  amountMXN: z.number().positive(),
});

const SLUG = "cobraya-fraud-detector";
const PRICE_USDC = 0.005;
const ZERO_BYTES32 = "0x0000000000000000000000000000000000000000000000000000000000000000" as const;

function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}

interface FraudOutput {
  isUnique: boolean;
  commitmentHash: `0x${string}`;
  commitTxHash?: `0x${string}`;
  snowtraceUrl?: string;
  blockNumber?: number;
  timestamp?: number;
  originalCommitTimestamp?: number;
  originalCommitter?: `0x${string}`;
  rejectReason?: string;
}

async function maybePushAuditStep(
  requestId: string | null,
  input: Record<string, unknown>,
  output: FraudOutput,
  t0: number,
  success: boolean,
): Promise<Awaited<ReturnType<typeof signReceipt>> | null> {
  let receipt: Awaited<ReturnType<typeof signReceipt>> | null = null;
  const outputForReceipt = output as unknown as Record<string, unknown>;
  try {
    receipt = await signReceipt({
      agentSlug: SLUG,
      stepIndex: 1,
      input,
      output: outputForReceipt,
      startedAt: t0,
      priceUsdc: PRICE_USDC,
    });
    if (requestId) {
      pushStep(requestId, {
        stepIndex: 1,
        agentSlug: SLUG,
        agentName: "Cobraya Fraud Detector",
        priceUsdc: PRICE_USDC,
        agentSigner: getAgentAddress(SLUG),
        input,
        output: outputForReceipt,
        success,
        latencyMs: Date.now() - t0,
        receipt,
        onchain: output.commitTxHash
          ? {
              txHash: output.commitTxHash,
              blockNumber: output.blockNumber ?? 0,
              snowtraceUrl: output.snowtraceUrl ?? "",
            }
          : null,
      });
    }
  } catch {
    receipt = null;
  }
  return receipt;
}

export async function POST(req: NextRequest) {
  const t0 = Date.now();
  const parsed = InputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { uuidCfdi, rfcEmisor, amountMXN } = parsed.data;
  const requestId = req.headers.get("x-cobraya-request-id");

  const commitmentHash = keccak256(
    encodePacked(["string", "string", "uint256"], [uuidCfdi, rfcEmisor, BigInt(amountMXN)]),
  ) as `0x${string}`;

  const inputForReceipt = { uuidCfdi, rfcEmisor, amountMXN };

  if (isDemoMode()) {
    const mock = mockFraudCheck({ uuidCfdi, rfcEmisor, amountMXN });
    const output: FraudOutput = {
      isUnique: mock.isUnique,
      commitmentHash: mock.commitmentHash as `0x${string}`,
      commitTxHash: mock.commitTxHash,
      snowtraceUrl: mock.snowtraceUrl,
      blockNumber: mock.blockNumber,
      timestamp: mock.timestamp,
    };
    const receipt = await maybePushAuditStep(requestId, inputForReceipt, output, t0, mock.isUnique);
    return NextResponse.json({ ...output, receipt });
  }

  const rpcUrl = process.env.AVALANCHE_RPC_URL;
  const contractAddress = process.env.COBRAYA_COMMITMENTS_ADDRESS as `0x${string}` | undefined;
  const privateKey = process.env.FRAUD_DETECTOR_PRIVATE_KEY as `0x${string}` | undefined;

  if (!rpcUrl || !contractAddress || !privateKey) {
    return NextResponse.json(
      { error: "fraud_detector_not_configured", commitmentHash, receipt: null },
      { status: 503 },
    );
  }

  try {
    const publicClient = createPublicClient({ chain: avalancheFuji, transport: http(rpcUrl) });

    const [active, ts, committer] = (await publicClient.readContract({
      address: contractAddress,
      abi: COMMITMENTS_ABI,
      functionName: "isCommitted",
      args: [commitmentHash],
    })) as [boolean, bigint, `0x${string}`];

    if (active) {
      const output: FraudOutput = {
        isUnique: false,
        commitmentHash,
        originalCommitTimestamp: Number(ts),
        originalCommitter: committer,
        rejectReason: "INVOICE_ALREADY_COMMITTED",
      };
      const receipt = await maybePushAuditStep(requestId, inputForReceipt, output, t0, false);
      return NextResponse.json({ ...output, receipt });
    }

    const account = privateKeyToAccount(privateKey);
    const walletClient = createWalletClient({
      account,
      chain: avalancheFuji,
      transport: http(rpcUrl),
    });

    const txHash = await walletClient.writeContract({
      address: contractAddress,
      abi: COMMITMENTS_ABI,
      functionName: "commitInvoice",
      args: [commitmentHash, ZERO_BYTES32],
    });

    const receiptOnchain = await publicClient.waitForTransactionReceipt({
      hash: txHash,
      confirmations: 1,
    });

    const output: FraudOutput = {
      isUnique: true,
      commitmentHash,
      commitTxHash: txHash,
      snowtraceUrl: `https://testnet.snowtrace.io/tx/${txHash}`,
      blockNumber: Number(receiptOnchain.blockNumber),
      timestamp: Math.floor(Date.now() / 1000),
    };
    const receipt = await maybePushAuditStep(requestId, inputForReceipt, output, t0, true);
    return NextResponse.json({ ...output, receipt });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    const safe = message.replace(/0x[0-9a-fA-F]{40,}/g, "<redacted-hex>");
    return NextResponse.json(
      {
        isUnique: false,
        commitmentHash,
        rejectReason: "NETWORK_ERROR",
        error: safe,
        receipt: null,
      },
      { status: 502 },
    );
  }
}
