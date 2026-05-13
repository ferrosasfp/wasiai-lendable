import { NextResponse } from "next/server";
import { scoreInvoice } from "@/application/score-invoice";
import type { Invoice } from "@/types/invoice";

export async function POST(req: Request) {
  const body = (await req.json()) as { invoice: Invoice };
  if (!body?.invoice) {
    return NextResponse.json({ error: "invoice required" }, { status: 400 });
  }
  const result = await scoreInvoice(body.invoice);
  return NextResponse.json({ result });
}
