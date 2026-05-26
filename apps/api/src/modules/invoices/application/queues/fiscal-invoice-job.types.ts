export type FiscalInvoiceIssueJob = {
  invoiceId: string;
  tenantId: string;
};

export type FiscalInvoiceAttemptContext = {
  attempt: number;
  maxAttempts: number;
};
