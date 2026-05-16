// src/infra/eip3009-signer.ts — W5
// CD-1: no any. CD-9: no leak de private key en errores/logs.
// Exemplar pattern: wasiai-agentshop/src/infra/eip3009-signer.ts.
import { createWalletClient, http, getAddress, bytesToHex } from "viem";
import { avalancheFuji } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { randomBytes } from "node:crypto";

// USDC EIP-712 domain — Fuji pre-flight checked: name "USD Coin", version "2".
const USDC_DOMAIN_NAME = process.env.USDC_DOMAIN_NAME ?? "USD Coin";
const USDC_DOMAIN_VERSION = process.env.USDC_DOMAIN_VERSION ?? "2";

export interface SignedAuthorization {
  from: `0x${string}`;
  to: `0x${string}`;
  value: bigint;
  validAfter: bigint;
  validBefore: bigint;
  nonce: `0x${string}`;
  signature: `0x${string}`;
}

const TYPES = {
  TransferWithAuthorization: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "validAfter", type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "nonce", type: "bytes32" },
  ],
} as const;

export interface SignTransferArgs {
  to: `0x${string}`;
  valueOnchain: bigint;
  timeoutSeconds?: number;
}

export async function signTransferAuthorization(
  args: SignTransferArgs,
): Promise<SignedAuthorization> {
  const pk = process.env.TREASURY_PRIVATE_KEY;
  if (!pk) throw new Error("TREASURY_PRIVATE_KEY not configured");
  const usdcAddress = process.env.USDC_ADDRESS;
  if (!usdcAddress) throw new Error("USDC_ADDRESS not configured");

  const account = privateKeyToAccount(pk as `0x${string}`);
  const verifyingContract = getAddress(usdcAddress);
  const chainId = 43113;

  const now = Math.floor(Date.now() / 1000);
  const validAfter = BigInt(0);
  const validBefore = BigInt(now + (args.timeoutSeconds ?? 300));
  const nonce = bytesToHex(randomBytes(32));

  const message = {
    from: account.address,
    to: args.to,
    value: args.valueOnchain,
    validAfter,
    validBefore,
    nonce,
  };

  const client = createWalletClient({ account, chain: avalancheFuji, transport: http() });
  const signature = await client.signTypedData({
    account,
    domain: {
      name: USDC_DOMAIN_NAME,
      version: USDC_DOMAIN_VERSION,
      chainId,
      verifyingContract,
    },
    types: TYPES,
    primaryType: "TransferWithAuthorization",
    message,
  });

  return { ...message, signature };
}
