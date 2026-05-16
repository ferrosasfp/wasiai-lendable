// src/app/api/audit-trail/[requestId]/route.ts — W5.5
import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { getTrail } from "@/infra/agent-signer";

export async function GET(_req: NextRequest, ctx: { params: { requestId: string } }) {
  const trail = getTrail(ctx.params.requestId);
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
