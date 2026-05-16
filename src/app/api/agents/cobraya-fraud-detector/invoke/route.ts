// src/app/api/agents/cobraya-fraud-detector/invoke/route.ts — W2.5 + W5.5 wiring
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createPublicClient, createWalletClient, http, keccak256, encodePacked, stringToBytes } from "viem";
import { avalancheFuji } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { COMMITMENTS_ABI } from "@/lib/abis/cobraya-invoice-commitments";
import { mockFraudCheck } from "@/application/mock-adapter";
import { signReceipt, getAgentAddress } from "@/infra/agent-signer";
import { isValidUuidV4 } from "@/lib/uuid-validator";

const InputSchema = z.object({
  uuidCfdi: z.string().min(1),
  rfcEmisor: z.string().min(1),
  amountMXN: z.number().positive(),
});

const SLUG = "cobraya-fraud-detector";
const PRICE_USDC = 0.005;

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
  // BLQ-MED-2: keccak256(`${requestId}:${commitmentHash}`) — recorded in the
  // onchain `metadataPointer` arg of `commitInvoice` so the audit trail JSON is
  // cross-verifiable against the on-chain log. ZERO_BYTES32 had been a
  // missed-opportunity attack vector (no audit anchor).
  metadataPointer?: `0x${string}`;
}

async function signFraudReceipt(
  requestId: string | null,
  inputRaw: { uuidCfdi: string; rfcEmisor: string; amountMXN: number },
  output: FraudOutput,
  t0: number,
): Promise<Awaited<ReturnType<typeof signReceipt>> | null> {
  try {
    // BLQ-ALTO-2B: hash over RAW input so EIP-712 verifies against original
    // canonical payload; the audit trail JSON (composed client-side) only
    // stores a masked copy.
    return await signReceipt({
      agentSlug: SLUG,
      stepIndex: 1,
      input: inputRaw,
      output,
      startedAt: t0,
      priceUsdc: PRICE_USDC,
    });
  } catch (err) {
    // BLQ-BAJO-3: structured warn (no stack, no err.message — could include privkey).
    console.warn("[cobraya-agent-receipt] signing failed:", {
      agentSlug: SLUG,
      requestId,
      errorName: err instanceof Error ? err.name : "unknown",
    });
    return null;
  }
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

  // BLQ-MED-1: validate header before threading it anywhere downstream.
  const requestIdHeader = req.headers.get("x-cobraya-request-id");
  if (requestIdHeader && !isValidUuidV4(requestIdHeader)) {
    return NextResponse.json({ error: "invalid_request_id" }, { status: 400 });
  }
  const requestId = requestIdHeader;

  const commitmentHash = keccak256(
    encodePacked(["string", "string", "uint256"], [uuidCfdi, rfcEmisor, BigInt(amountMXN)]),
  ) as `0x${string}`;

  // BLQ-MED-2: bind onchain commit ↔ off-chain audit trail via metadataPointer.
  // The commit's primary key is `commitmentHash` (already unique); this field
  // is the audit anchor: keccak256(`${requestId}:${commitmentHash}`) so a
  // verifier holding the audit JSON can pull the onchain event and assert
  // metadataPointer == keccak256(`${trail.requestId}:${step.commitmentHash}`).
  // When no requestId is supplied (e.g., direct API consumers without audit
  // tracking), we still emit a non-zero pointer (`anon:` prefix) — purely a
  // defensive choice so the field never reverts to ZERO_BYTES32 (which would
  // be indistinguishable from "audit anchor missing").
  const metadataPointer = (requestId
    ? keccak256(stringToBytes(`${requestId}:${commitmentHash}`))
    : keccak256(stringToBytes(`anon:${commitmentHash}`))) as `0x${string}`;

  // Raw input is what the receipt's inputHash commits to. The audit trail JSON
  // (composed client-side) re-masks for PII hygiene.
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
    const receipt = await signFraudReceipt(requestId, inputForReceipt, output, t0);
    return NextResponse.json({
      ...output,
      agentSigner: receipt ? getAgentAddress(SLUG) : null,
      receipt,
    });
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
      const receipt = await signFraudReceipt(requestId, inputForReceipt, output, t0);
      return NextResponse.json({
        ...output,
        agentSigner: receipt ? getAgentAddress(SLUG) : null,
        receipt,
      });
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
      args: [commitmentHash, metadataPointer],
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
      metadataPointer,
    };
    const receipt = await signFraudReceipt(requestId, inputForReceipt, output, t0);
    return NextResponse.json({
      ...output,
      agentSigner: receipt ? getAgentAddress(SLUG) : null,
      receipt,
    });
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
