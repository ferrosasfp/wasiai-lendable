// src/app/api/audit-trail/[requestId]/route.ts — W5.5 + fix-pack BLQ-ALTO-2.
import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { getTrail } from "@/infra/agent-signer";
import { auditCookieName, verifyAuditToken } from "@/lib/audit-auth";
import { isValidUuidV4 } from "@/lib/uuid-validator";

export async function GET(req: NextRequest, ctx: { params: { requestId: string } }) {
  const { requestId } = ctx.params;

  // BLQ-MED-1: reject malformed requestIds before any lookup or cookie work.
  if (!isValidUuidV4(requestId)) {
    return NextResponse.json({ error: "invalid_request_id" }, { status: 400 });
  }

  // BLQ-ALTO-2: app-layer auth — only the browser session that started this
  // pipeline can pull the trail. Returns 403 (not 404) when the trail exists
  // but the cookie is missing/mismatched, so callers can distinguish auth
  // failure from a typo'd id.
  const cookie = req.cookies.get(auditCookieName(requestId))?.value;
  if (!verifyAuditToken(requestId, cookie)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const trail = getTrail(requestId);
  if (!trail) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Compute sha256 over the trail with an empty trailHashSHA256 (the field is
  // included to make the schema self-contained; we zero it before hashing).
  const serializable = { ...trail, trailHashSHA256: "" };
  const hex = createHash("sha256")
    .update(JSON.stringify(serializable))
    .digest("hex");
  const stamped = { ...trail, trailHashSHA256: `0x${hex}` };

  return new NextResponse(JSON.stringify(stamped, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="cobraya-audit-${trail.requestId}.json"`,
    },
  });
}
