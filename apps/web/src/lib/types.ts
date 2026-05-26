export type UserRole = "ADMIN" | "MEMBER" | "RECRUITER";
export type UserStatus = "ACTIVE" | "INVITED" | "SUSPENDED";
export type TenantStatus = "ACTIVE" | "ONBOARDING" | "SUSPENDED";
export type TenantTaxRegime =
  | "SIMPLES_NACIONAL"
  | "LUCRO_PRESUMIDO"
  | "LUCRO_REAL"
  | "MEI";
export type TenantTitularRole =
  | "OWNER"
  | "PARTNER"
  | "ACCOUNTANT"
  | "FINANCIAL_MANAGER";
export type FiscalProvider = "MOCK" | "NFE_IO";
export type TenantFiscalCredentialStatus = "ACTIVE" | "DISABLED";
export type ServiceInvoiceStatus =
  | "DRAFT"
  | "QUEUED"
  | "PROCESSING"
  | "AUTHORIZED"
  | "REJECTED"
  | "FAILED_RETRYING"
  | "FAILED_FINAL"
  | "CANCELLED";
export type ClientType = "INDIVIDUAL" | "COMPANY";
export type ClientStatus = "ACTIVE" | "INACTIVE";

export type TalentProfile = {
  id: string;
  headline: string;
  bio: string;
  location: string;
  seniority: string;
  skills: string;
  availability: string;
  website?: string | null;
  github?: string | null;
  linkedin?: string | null;
  userId: string;
};

export type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
  profile?: TalentProfile | null;
};

export type TenantTitular = {
  id: string;
  tenantId: string;
  userId: string;
  role: TenantTitularRole;
  title?: string | null;
  ownershipPercentage?: number | null;
  isLegalRepresentative: boolean;
  canIssueInvoices: boolean;
  joinedAt: string;
  user: User;
};

export type TenantFiscalCredential = {
  id: string;
  tenantId: string;
  provider: FiscalProvider;
  status: TenantFiscalCredentialStatus;
  providerCompanyId: string;
  apiKeyLast4?: string | null;
  hasApiKey: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Client = {
  id: string;
  tenantId: string;
  createdByUserId?: string | null;
  type: ClientType;
  status: ClientStatus;
  name: string;
  tradeName?: string | null;
  document: string;
  email?: string | null;
  phone?: string | null;
  municipalRegistration?: string | null;
  stateRegistration?: string | null;
  addressStreet?: string | null;
  addressNumber?: string | null;
  addressComplement?: string | null;
  addressNeighborhood?: string | null;
  addressCity?: string | null;
  addressState?: string | null;
  addressZipCode?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: User | null;
};

export type ServiceInvoice = {
  id: string;
  tenantId: string;
  clientId?: string | null;
  issuedByUserId?: string | null;
  status: ServiceInvoiceStatus;
  provider: FiscalProvider;
  providerExternalId?: string | null;
  verificationCode?: string | null;
  rpsNumber?: string | null;
  serviceDescription: string;
  serviceCode?: string | null;
  cnaeCode?: string | null;
  municipalTaxCode?: string | null;
  borrowerName: string;
  borrowerDocument: string;
  borrowerEmail?: string | null;
  amount: number;
  deductions: number;
  issRate?: number | null;
  notes?: string | null;
  processingAttempts: number;
  lastAttemptAt?: string | null;
  lastFailureReason?: string | null;
  queuedAt?: string | null;
  issuedAt?: string | null;
  createdAt: string;
  tenant?: Tenant;
  client?: Client | null;
};

export type Tenant = {
  id: string;
  legalName: string;
  tradeName?: string | null;
  cnpj: string;
  status: TenantStatus;
  taxRegime: TenantTaxRegime;
  municipalRegistration?: string | null;
  stateRegistration?: string | null;
  cnae?: string | null;
  serviceTaxCode?: string | null;
  municipalServiceCode?: string | null;
  fiscalProvider: FiscalProvider;
  fiscalProviderCompanyId?: string | null;
  contactEmail: string;
  contactPhone?: string | null;
  addressStreet: string;
  addressNumber: string;
  addressComplement?: string | null;
  addressNeighborhood: string;
  addressCity: string;
  addressState: string;
  addressCityIbgeCode: string;
  addressZipCode: string;
  titulares: TenantTitular[];
  fiscalCredentials?: TenantFiscalCredential[];
  clients?: Client[];
  serviceInvoices: ServiceInvoice[];
  createdAt: string;
  updatedAt: string;
};

export type SessionUser = Pick<
  User,
  "id" | "name" | "email" | "role" | "status"
>;

export type SessionData = {
  user?: SessionUser;
};
