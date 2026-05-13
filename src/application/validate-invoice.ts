import { composeOnA2A } from "@/infra/a2a-client";
import { isDemoMode } from "@/infra/env";
import { mockValidate } from "@/infra/mock-adapter";
import type { Invoice, ValidatorResult } from "@/types/invoice";

export async function validateInvoice(invoice: Invoice): Promise<ValidatorResult> {
  if (isDemoMode()) {
    return mockValidate(invoice);
  }
  const response = await composeOnA2A([
    {
      agent: "invoice-validator",
      capability: "cfdi.validate",
      input: { uuid: invoice.uuid, issuerRfc: invoice.issuer.rfc, amount: invoice.amount },
    },
  ]);
  return response.results[0].output as unknown as ValidatorResult;
}
