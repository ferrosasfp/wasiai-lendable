// src/lib/audit-auth.ts — fix-pack BLQ-ALTO-2 (audit-trail IDOR fix).
//
// The audit trail contains commercial PII (RFC prefix, anchor buyer, amount,
// payment terms, sector) keyed by an unguessable but enumerable `requestId`
// UUID. Without auth, any party who acquires a `requestId` (logs, referrer
// header, browser history) can pull the full trail.
//
// We bind every audit trail to the browser session that started it:
//   1. The first agent route in the pipeline emits a httpOnly cookie
//      `cobraya_audit_token_<requestId>` = HMAC(requestId, AUDIT_AUTH_SECRET)
//   2. `GET /api/audit-trail/[requestId]` reads that cookie and verifies the
//      HMAC; mismatch → 403.
//
// Defence in depth: this is app-layer only. A formal solution would tie the
// trail to an authenticated user_id row; this fixes the IDOR for the demo
// without inventing user accounts.
import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE_PREFIX = "cobraya_audit_token_";

function getSecret(): string {
  const s = process.env.AUDIT_AUTH_SECRET ?? "";
  if (!s) {
    // We deliberately throw instead of falling back to a hardcoded dev secret:
    // CD-9 (no secrets in code) and we want the deployment to fail loudly if
    // the env var is missing rather than silently allowing token bypass.
    throw new Error("AUDIT_AUTH_SECRET not configured");
  }
  return s;
}

export function signAuditToken(requestId: string): string {
  return createHmac("sha256", getSecret()).update(requestId).digest("hex");
}

export function verifyAuditToken(requestId: string, candidate: string | undefined): boolean {
  if (!candidate) return false;
  let expected: string;
  try {
    expected = signAuditToken(requestId);
  } catch {
    // Missing secret → fail closed.
    return false;
  }
  // timingSafeEqual requires equal-length buffers; tolerate hex length mismatch.
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(candidate, "hex");
  if (a.length !== b.length || a.length === 0) return false;
  return timingSafeEqual(a, b);
}

export function auditCookieName(requestId: string): string {
  return `${COOKIE_PREFIX}${requestId}`;
}

// Build the Set-Cookie header value for a request-scoped audit token. Path is
// constrained to the matching audit-trail endpoint to minimize cookie scope.
// Max-Age 1h is enough for the demo flow + immediate download.
export function buildAuditCookieHeader(requestId: string): string {
  const value = signAuditToken(requestId);
  const name = auditCookieName(requestId);
  const path = `/api/audit-trail/${requestId}`;
  return `${name}=${value}; Path=${path}; HttpOnly; SameSite=Strict; Max-Age=3600`;
}
