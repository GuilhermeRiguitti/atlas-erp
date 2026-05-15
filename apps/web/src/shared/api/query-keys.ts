export const queryKeys = {
  clients: (tenantId?: string, query?: string) => ["clients", tenantId ?? "all", query ?? ""] as const,
  fiscalCredentials: (tenantId?: string) => ["fiscal-credentials", tenantId ?? "none"] as const,
  invoices: (tenantId?: string) => ["service-invoices", tenantId ?? "all"] as const,
  tenants: (query?: string) => ["tenants", query ?? ""] as const,
  users: (query?: string) => ["users", query ?? ""] as const,
};
