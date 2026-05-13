import type { Invoice } from "@/types/invoice";

export function termDays(invoice: Pick<Invoice, "issueDate" | "dueDate">): number {
  const issue = new Date(invoice.issueDate);
  const due = new Date(invoice.dueDate);
  return Math.round((due.getTime() - issue.getTime()) / 86400000);
}
