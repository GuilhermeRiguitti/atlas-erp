"use client";

import {
  BadgeCheck,
  Building2,
  FileText,
  KeyRound,
  LogOut,
  Plus,
  ReceiptText,
  Save,
  Search,
  Trash2,
  UserRoundCog,
  UsersRound,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, ReactNode, useMemo, useState } from "react";
import type {
  Client,
  ClientStatus,
  ClientType,
  FiscalProvider,
  ServiceInvoice,
  ServiceInvoiceStatus,
  SessionUser,
  Tenant,
  TenantFiscalCredential,
  TenantFiscalCredentialStatus,
  TenantStatus,
  TenantTaxRegime,
  TenantTitularRole,
  User,
  UserRole,
  UserStatus,
} from "@/lib/types";
import {
  clientSchema,
  fiscalCredentialSchema,
  invoiceSchema,
  tenantSchema,
  userSchema,
  validateForm,
} from "@/modules/erp/validation/schemas";
import { apiClient } from "@/shared/api/http-client";
import { queryKeys } from "@/shared/api/query-keys";

type DashboardProps = {
  sessionUser: SessionUser;
};

type Tab = "tenants" | "clients" | "invoices" | "users";

const roles: UserRole[] = ["ADMIN", "MEMBER"];
const statuses: UserStatus[] = ["ACTIVE", "INVITED", "SUSPENDED"];
const tenantStatuses: TenantStatus[] = ["ACTIVE", "ONBOARDING", "SUSPENDED"];
const taxRegimes: TenantTaxRegime[] = [
  "SIMPLES_NACIONAL",
  "LUCRO_PRESUMIDO",
  "LUCRO_REAL",
  "MEI",
];
const fiscalProviders: FiscalProvider[] = ["NFSE_NACIONAL", "NFE_IO"];
const fiscalCredentialStatuses: TenantFiscalCredentialStatus[] = [
  "ACTIVE",
  "DISABLED",
];
const titularRoles: TenantTitularRole[] = [
  "OWNER",
  "PARTNER",
  "ACCOUNTANT",
  "FINANCIAL_MANAGER",
];
const clientTypes: ClientType[] = ["COMPANY", "INDIVIDUAL"];
const clientStatuses: ClientStatus[] = ["ACTIVE", "INACTIVE"];
const activeInvoiceStatuses = new Set<ServiceInvoiceStatus>([
  "QUEUED",
  "PROCESSING",
  "FAILED_RETRYING",
]);
const invoiceStatusLabels: Record<ServiceInvoiceStatus, string> = {
  DRAFT: "Rascunho",
  QUEUED: "Na fila",
  PROCESSING: "Processando",
  AUTHORIZED: "Autorizada",
  REJECTED: "Rejeitada",
  FAILED_RETRYING: "Tentando novamente",
  FAILED_FINAL: "Falha final",
  CANCELLED: "Cancelada",
};

const emptyUser = {
  name: "",
  email: "",
  password: "",
  role: "MEMBER" as UserRole,
  status: "ACTIVE" as UserStatus,
};

const emptyTenant = {
  legalName: "",
  tradeName: "",
  cnpj: "",
  status: "ONBOARDING" as TenantStatus,
  taxRegime: "SIMPLES_NACIONAL" as TenantTaxRegime,
  municipalRegistration: "",
  stateRegistration: "",
  cnae: "",
  serviceTaxCode: "",
  municipalServiceCode: "",
  fiscalProvider: "NFSE_NACIONAL" as FiscalProvider,
  fiscalProviderCompanyId: "",
  contactEmail: "",
  contactPhone: "",
  addressStreet: "",
  addressNumber: "",
  addressComplement: "",
  addressNeighborhood: "",
  addressCity: "",
  addressState: "SP",
  addressCityIbgeCode: "",
  addressZipCode: "",
};

const emptyInvoice = {
  clientId: "",
  borrowerName: "",
  borrowerDocument: "",
  borrowerEmail: "",
  borrowerStreet: "",
  borrowerNumber: "",
  borrowerNeighborhood: "",
  borrowerCity: "",
  borrowerState: "",
  borrowerZipCode: "",
  serviceDescription: "",
  serviceCode: "",
  cnaeCode: "",
  municipalTaxCode: "",
  amount: "",
  deductions: "0",
  issRate: "",
  notes: "",
};

const emptyClient = {
  type: "COMPANY" as ClientType,
  status: "ACTIVE" as ClientStatus,
  name: "",
  tradeName: "",
  document: "",
  email: "",
  phone: "",
  municipalRegistration: "",
  stateRegistration: "",
  addressStreet: "",
  addressNumber: "",
  addressComplement: "",
  addressNeighborhood: "",
  addressCity: "",
  addressState: "SP",
  addressZipCode: "",
  notes: "",
};

const emptyFiscalCredential = {
  provider: "NFE_IO" as FiscalProvider,
  status: "ACTIVE" as TenantFiscalCredentialStatus,
  providerCompanyId: "",
  apiKey: "",
};

export function Dashboard({ sessionUser }: DashboardProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>("tenants");
  const [query, setQuery] = useState("");
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(
    sessionUser.id,
  );
  const [tenantForm, setTenantForm] = useState(emptyTenant);
  const [tenantFormTenantId, setTenantFormTenantId] = useState<string | null>(
    null,
  );
  const [newUserForm, setNewUserForm] = useState(emptyUser);
  const [editUserForm, setEditUserForm] = useState(emptyUser);
  const [editUserFormUserId, setEditUserFormUserId] = useState<string | null>(
    null,
  );
  const [clientForm, setClientForm] = useState(emptyClient);
  const [clientFormClientId, setClientFormClientId] = useState<string | null>(
    null,
  );
  const [invoiceForm, setInvoiceForm] = useState(emptyInvoice);
  const [fiscalCredentialForm, setFiscalCredentialForm] = useState(
    emptyFiscalCredential,
  );
  const [fiscalCredentialFormTenantId, setFiscalCredentialFormTenantId] =
    useState<string | null>(null);
  const [titularUserId, setTitularUserId] = useState("");
  const [titularRole, setTitularRole] = useState<TenantTitularRole>("OWNER");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const tenantsUrl = query.trim()
    ? `/api/tenants?q=${encodeURIComponent(query.trim())}`
    : "/api/tenants";
  const usersUrl = query.trim()
    ? `/api/users?q=${encodeURIComponent(query.trim())}`
    : "/api/users";
  const { data: tenants = [], isLoading: tenantsLoading } = useQuery({
    queryKey: queryKeys.tenants(query),
    queryFn: () => apiClient.get<Tenant[]>(tenantsUrl),
  });
  const { data: users = [] } = useQuery({
    queryKey: queryKeys.users(query),
    queryFn: () => apiClient.get<User[]>(usersUrl),
  });
  const selectedTenant = useMemo(
    () => tenants.find((tenant) => tenant.id === selectedTenantId),
    [selectedTenantId, tenants],
  );
  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId) ?? users[0],
    [selectedUserId, users],
  );
  const clientsUrl = buildClientsUrl(selectedTenant?.id, query);
  const { data: clients = [] } = useQuery({
    queryKey: queryKeys.clients(selectedTenant?.id, query),
    queryFn: () => apiClient.get<Client[]>(clientsUrl),
  });
  const selectedClient = useMemo(
    () => clients.find((client) => client.id === selectedClientId),
    [selectedClientId, clients],
  );
  const selectedTenantForm =
    selectedTenant && tenantFormTenantId !== selectedTenant.id
      ? tenantToForm(selectedTenant)
      : tenantForm;
  const selectedClientForm =
    selectedClient && clientFormClientId !== selectedClient.id
      ? clientToForm(selectedClient)
      : clientForm;
  const selectedEditUserForm =
    selectedUser && editUserFormUserId !== selectedUser.id
      ? userToForm(selectedUser)
      : editUserForm;
  const selectedTitularUserId = titularUserId || users[0]?.id || "";
  const { data: fiscalCredentials = [] } = useQuery({
    enabled: Boolean(selectedTenant),
    queryKey: queryKeys.fiscalCredentials(selectedTenant?.id),
    queryFn: () =>
      apiClient.get<TenantFiscalCredential[]>(
        `/api/tenants/${selectedTenant?.id}/fiscal-credentials`,
      ),
  });
  const selectedFiscalCredential = useMemo(
    () =>
      fiscalCredentials.find(
        (credential) => credential.provider === fiscalCredentialForm.provider,
      ),
    [fiscalCredentialForm.provider, fiscalCredentials],
  );
  const selectedFiscalCredentialForm =
    selectedTenant && fiscalCredentialFormTenantId !== selectedTenant.id
      ? fiscalCredentialToForm(
          fiscalCredentials.find(
            (credential) => credential.provider === "NFE_IO",
          ),
          selectedTenant,
        )
      : fiscalCredentialForm;
  const invoicesUrl = selectedTenant
    ? `/api/service-invoices?tenantId=${selectedTenant.id}`
    : "/api/service-invoices";
  const { data: invoices = [] } = useQuery({
    queryKey: queryKeys.invoices(selectedTenant?.id),
    queryFn: () => apiClient.get<ServiceInvoice[]>(invoicesUrl),
    refetchInterval: (query) =>
      hasActiveInvoiceJobs(query.state.data as ServiceInvoice[] | undefined)
        ? 5000
        : false,
  });

  async function logout() {
    await apiClient.post("/api/auth/logout");
    window.location.reload();
  }

  async function run(action: () => Promise<void>) {
    setError(null);
    setIsSaving(true);
    try {
      await action();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unexpected error");
    } finally {
      setIsSaving(false);
    }
  }

  async function updateTenant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTenant) return;
    const validationError = await validateForm(
      tenantSchema,
      selectedTenantForm,
    );
    if (validationError) {
      setError(validationError);
      return;
    }

    await run(async () => {
      await apiClient.patch<Tenant>(
        `/api/tenants/${selectedTenant.id}`,
        cleanTenantPayload(selectedTenantForm),
      );
      await invalidateTenantData();
    });
  }

  async function addTitular() {
    if (!selectedTenant || !selectedTitularUserId) return;

    await run(async () => {
      await apiClient.post(`/api/tenants/${selectedTenant.id}/titulares`, {
        userId: selectedTitularUserId,
        role: titularRole,
        isLegalRepresentative: titularRole === "OWNER",
        canIssueInvoices: true,
      });
      await invalidateTenantData();
    });
  }

  async function saveFiscalCredential(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTenant) return;
    const validationError = await validateForm(
      fiscalCredentialSchema,
      selectedFiscalCredentialForm,
    );
    if (validationError) {
      setError(validationError);
      return;
    }

    await run(async () => {
      await apiClient.put(
        `/api/tenants/${selectedTenant.id}/fiscal-credentials`,
        cleanFiscalCredentialPayload(selectedFiscalCredentialForm),
      );
      setFiscalCredentialForm((current) => ({ ...current, apiKey: "" }));
      setFiscalCredentialFormTenantId(selectedTenant.id);
      await invalidateFiscalCredentialData(selectedTenant.id);
    });
  }

  async function removeTitular(titularId: string) {
    if (!selectedTenant) return;

    await run(async () => {
      await apiClient.delete(
        `/api/tenants/${selectedTenant.id}/titulares/${titularId}`,
      );
      await invalidateTenantData();
    });
  }

  async function createClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTenant) return;
    const validationError = await validateForm(
      clientSchema,
      selectedClientForm,
    );
    if (validationError) {
      setError(validationError);
      return;
    }

    await run(async () => {
      const client = await apiClient.post<Client>("/api/clients", {
        tenantId: selectedTenant.id,
        ...cleanClientPayload(selectedClientForm),
      });
      setSelectedClientId(client.id);
      setClientFormClientId(client.id);
      await invalidateClientData(selectedTenant.id);
    });
  }

  async function updateClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedClient) return;
    const validationError = await validateForm(
      clientSchema,
      selectedClientForm,
    );
    if (validationError) {
      setError(validationError);
      return;
    }

    await run(async () => {
      await apiClient.patch<Client>(
        `/api/clients/${selectedClient.id}`,
        cleanClientPayload(selectedClientForm),
      );
      await invalidateClientData(selectedClient.tenantId);
    });
  }

  async function deleteClient(client: Client) {
    await run(async () => {
      await apiClient.delete(`/api/clients/${client.id}`);
      setSelectedClientId(null);
      setClientForm(emptyClient);
      setClientFormClientId(null);
      await invalidateClientData(client.tenantId);
    });
  }

  function selectClientForInvoice(clientId: string) {
    const client = clients.find((item) => item.id === clientId);
    if (client) {
      setSelectedTenantId(client.tenantId);
    }
    setInvoiceForm((current) => ({
      ...current,
      clientId,
      borrowerName: client?.name ?? "",
      borrowerDocument: client?.document ?? "",
      borrowerEmail: client?.email ?? "",
      borrowerStreet: client?.addressStreet ?? "",
      borrowerNumber: client?.addressNumber ?? "",
      borrowerNeighborhood: client?.addressNeighborhood ?? "",
      borrowerCity: client?.addressCity ?? "",
      borrowerState: client?.addressState ?? "",
      borrowerZipCode: client?.addressZipCode ?? "",
    }));
  }

  async function issueInvoice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTenant) return;
    const validationError = await validateForm(invoiceSchema, invoiceForm);
    if (validationError) {
      setError(validationError);
      return;
    }

    await run(async () => {
      await apiClient.post<ServiceInvoice>("/api/service-invoices", {
        tenantId: selectedTenant.id,
        clientId: optional(invoiceForm.clientId),
        provider: selectedTenant.fiscalProvider,
        borrowerName: invoiceForm.borrowerName,
        borrowerDocument: onlyDigits(invoiceForm.borrowerDocument),
        borrowerEmail: optional(invoiceForm.borrowerEmail),
        borrowerStreet: optional(invoiceForm.borrowerStreet),
        borrowerNumber: optional(invoiceForm.borrowerNumber),
        borrowerNeighborhood: optional(invoiceForm.borrowerNeighborhood),
        borrowerCity: optional(invoiceForm.borrowerCity),
        borrowerState: optional(invoiceForm.borrowerState),
        borrowerZipCode: optional(onlyDigits(invoiceForm.borrowerZipCode)),
        serviceDescription: invoiceForm.serviceDescription,
        serviceCode: optional(invoiceForm.serviceCode),
        cnaeCode: optional(invoiceForm.cnaeCode),
        municipalTaxCode: optional(invoiceForm.municipalTaxCode),
        amount: Number(invoiceForm.amount),
        deductions: Number(invoiceForm.deductions || 0),
        issRate: invoiceForm.issRate ? Number(invoiceForm.issRate) : undefined,
        notes: optional(invoiceForm.notes),
      });
      setInvoiceForm(emptyInvoice);
      await invalidateInvoiceData(selectedTenant.id);
    });
  }

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = await validateForm(userSchema, newUserForm);
    if (validationError) {
      setError(validationError);
      return;
    }

    await run(async () => {
      const created = await apiClient.post<User>("/api/users", newUserForm);
      setSelectedUserId(created.id);
      setNewUserForm(emptyUser);
      await invalidateUserData();
    });
  }

  async function updateSelectedUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedUser) return;
    const validationError = await validateForm(userSchema, {
      ...selectedEditUserForm,
      password: selectedEditUserForm.password || undefined,
    });
    if (validationError) {
      setError(validationError);
      return;
    }

    await run(async () => {
      await apiClient.patch<User>(`/api/users/${selectedUser.id}`, {
        ...selectedEditUserForm,
        password: selectedEditUserForm.password || undefined,
      });
      await invalidateUserData();
    });
  }

  async function deleteUser(user: User) {
    await run(async () => {
      await apiClient.delete(`/api/users/${user.id}`);
      setSelectedUserId(null);
      await invalidateUserData();
    });
  }

  async function invalidateTenantData() {
    await queryClient.invalidateQueries({ queryKey: ["tenants"] });
  }

  async function invalidateFiscalCredentialData(tenantId?: string) {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["fiscal-credentials"] }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.fiscalCredentials(tenantId),
      }),
      queryClient.invalidateQueries({ queryKey: ["tenants"] }),
    ]);
  }

  async function invalidateClientData(tenantId?: string) {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["clients"] }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.clients(tenantId, query),
      }),
    ]);
  }

  async function invalidateInvoiceData(tenantId?: string) {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["service-invoices"] }),
      queryClient.invalidateQueries({ queryKey: ["tenants"] }),
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices(tenantId) }),
    ]);
  }

  async function invalidateUserData() {
    await queryClient.invalidateQueries({ queryKey: ["users"] });
  }

  return (
    <main className="min-h-screen bg-[#f7f7f4] text-[#1d2520]">
      <header className="border-b border-[#d9ded6] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.16em] text-[#607568]">
              ERP Fiscal
            </p>
            <h1 className="mt-1 text-2xl font-semibold">
              Empresas, titulares e NFS-e
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-md border border-[#d9ded6] bg-[#f7f7f4] px-3 py-2 text-sm">
              <BadgeCheck className="size-4 text-[#28785d]" />
              {sessionUser.name}
            </span>
            <button
              className="inline-flex h-10 items-center gap-2 rounded-md bg-[#1d2520] px-4 text-sm font-medium text-white"
              onClick={logout}
              type="button"
            >
              <LogOut className="size-4" />
              Sair
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-6">
        <nav className="mb-6 flex flex-wrap gap-2">
          <TabButton
            active={activeTab === "tenants"}
            icon={<Building2 className="size-4" />}
            label="Empresas"
            onClick={() => setActiveTab("tenants")}
          />
          <TabButton
            active={activeTab === "clients"}
            icon={<UsersRound className="size-4" />}
            label="Clientes"
            onClick={() => setActiveTab("clients")}
          />
          <TabButton
            active={activeTab === "invoices"}
            icon={<ReceiptText className="size-4" />}
            label="Notas fiscais"
            onClick={() => setActiveTab("invoices")}
          />
          <TabButton
            active={activeTab === "users"}
            icon={<UserRoundCog className="size-4" />}
            label="Usuarios"
            onClick={() => setActiveTab("users")}
          />
        </nav>

        {error ? (
          <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {activeTab === "tenants" ? (
          <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
            <aside className="space-y-4">
              <SearchBox
                query={query}
                setQuery={setQuery}
                placeholder="Buscar por razao social ou CNPJ"
              />
              {tenantsLoading ? (
                <p className="text-sm text-[#607568]">Carregando empresas...</p>
              ) : null}
              {tenants.map((tenant) => (
                <button
                  className="w-full rounded-md border border-[#d9ded6] bg-white p-4 text-left shadow-sm transition hover:border-[#8ca895]"
                  key={tenant.id}
                  onClick={() => setSelectedTenantId(tenant.id)}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">
                        {tenant.tradeName || tenant.legalName}
                      </p>
                      <p className="mt-1 text-sm text-[#607568]">
                        {formatCnpj(tenant.cnpj)}
                      </p>
                    </div>
                    <span className="rounded-md bg-[#e6f0e9] px-2 py-1 text-xs font-medium text-[#28785d]">
                      {tenant.status}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-[#4d5b52]">
                    {tenant.addressCity}/{tenant.addressState} ·{" "}
                    {tenant.taxRegime}
                  </p>
                </button>
              ))}
            </aside>

            <section className="space-y-6">
              {selectedTenant ? (
                <>
                  <TenantForm
                    form={selectedTenantForm}
                    isSaving={isSaving}
                    onChange={(form) => {
                      setTenantForm(form);
                      setTenantFormTenantId(selectedTenant.id);
                    }}
                    onUpdate={updateTenant}
                  />
                  <FiscalCredentialsPanel
                    credential={selectedFiscalCredential}
                    form={selectedFiscalCredentialForm}
                    isSaving={isSaving}
                    onChange={(form) => {
                      setFiscalCredentialForm(form);
                      setFiscalCredentialFormTenantId(selectedTenant.id);
                    }}
                    onSubmit={saveFiscalCredential}
                  />
                  <TitularesPanel
                    addTitular={addTitular}
                    removeTitular={removeTitular}
                    selectedTenant={selectedTenant}
                    setTitularRole={setTitularRole}
                    setTitularUserId={setTitularUserId}
                    titularRole={titularRole}
                    titularUserId={selectedTitularUserId}
                    users={users}
                  />
                </>
              ) : (
                <TenantEmptyState />
              )}
            </section>
          </div>
        ) : null}

        {activeTab === "clients" ? (
          <ClientsPanel
            clients={clients}
            createClient={createClient}
            deleteClient={deleteClient}
            form={selectedClientForm}
            isSaving={isSaving}
            onFormChange={(form) => {
              setClientForm(form);
              setClientFormClientId(selectedClient?.id ?? null);
            }}
            selectedClient={selectedClient}
            selectedTenant={selectedTenant}
            setClientForm={setClientForm}
            setClientFormClientId={setClientFormClientId}
            setSelectedClientId={setSelectedClientId}
            setSelectedTenantId={setSelectedTenantId}
            tenants={tenants}
            updateClient={updateClient}
          />
        ) : null}

        {activeTab === "invoices" ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
            <InvoiceHistory invoices={invoices} tenants={tenants} />
            <InvoiceForm
              clients={clients}
              form={invoiceForm}
              isSaving={isSaving}
              onChange={setInvoiceForm}
              onClientSelect={selectClientForInvoice}
              onSubmit={issueInvoice}
              selectedTenant={selectedTenant}
              setSelectedTenantId={(id) => {
                setSelectedTenantId(id);
                setInvoiceForm((current) => ({ ...current, clientId: "" }));
              }}
              tenants={tenants}
            />
          </div>
        ) : null}

        {activeTab === "users" ? (
          <UsersPanel
            createUser={createUser}
            deleteUser={deleteUser}
            editUserForm={selectedEditUserForm}
            isSaving={isSaving}
            newUserForm={newUserForm}
            selectedUser={selectedUser}
            setEditUserForm={(form) => {
              setEditUserForm(form);
              setEditUserFormUserId(selectedUser?.id ?? null);
            }}
            setNewUserForm={setNewUserForm}
            setSelectedUserId={setSelectedUserId}
            updateSelectedUser={updateSelectedUser}
            users={users}
          />
        ) : null}
      </div>
    </main>
  );
}

function TenantForm({
  form,
  isSaving,
  onChange,
  onUpdate,
}: {
  form: typeof emptyTenant;
  isSaving: boolean;
  onChange: (form: typeof emptyTenant) => void;
  onUpdate: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form
      className="rounded-md border border-[#d9ded6] bg-white p-5 shadow-sm"
      onSubmit={onUpdate}
    >
      <div className="mb-5 flex items-center gap-3">
        <Building2 className="size-5 text-[#28785d]" />
        <h2 className="text-lg font-semibold">Dados da empresa</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Input
          label="Razao social"
          value={form.legalName}
          onChange={(legalName) => onChange({ ...form, legalName })}
        />
        <Input
          label="Nome fantasia"
          value={form.tradeName}
          onChange={(tradeName) => onChange({ ...form, tradeName })}
        />
        <Input
          label="CNPJ"
          value={form.cnpj}
          onChange={(cnpj) => onChange({ ...form, cnpj })}
        />
        <Input
          label="Email fiscal"
          type="email"
          value={form.contactEmail}
          onChange={(contactEmail) => onChange({ ...form, contactEmail })}
        />
        <Select
          label="Status"
          value={form.status}
          values={tenantStatuses}
          onChange={(status) =>
            onChange({ ...form, status: status as TenantStatus })
          }
        />
        <Select
          label="Regime tributario"
          value={form.taxRegime}
          values={taxRegimes}
          onChange={(taxRegime) =>
            onChange({ ...form, taxRegime: taxRegime as TenantTaxRegime })
          }
        />
        <Input
          label="Inscricao municipal"
          value={form.municipalRegistration}
          onChange={(municipalRegistration) =>
            onChange({ ...form, municipalRegistration })
          }
        />
        <Input
          label="CNAE"
          value={form.cnae}
          onChange={(cnae) => onChange({ ...form, cnae })}
        />
        <Input
          label="Codigo servico LC 116"
          value={form.serviceTaxCode}
          onChange={(serviceTaxCode) => onChange({ ...form, serviceTaxCode })}
        />
        <Input
          label="Codigo municipal"
          value={form.municipalServiceCode}
          onChange={(municipalServiceCode) =>
            onChange({ ...form, municipalServiceCode })
          }
        />
        <Select
          label="Provider fiscal"
          value={form.fiscalProvider}
          values={fiscalProviders}
          onChange={(fiscalProvider) =>
            onChange({
              ...form,
              fiscalProvider: fiscalProvider as FiscalProvider,
            })
          }
        />
        <Input
          label="ID empresa no provider"
          value={form.fiscalProviderCompanyId}
          onChange={(fiscalProviderCompanyId) =>
            onChange({ ...form, fiscalProviderCompanyId })
          }
        />
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <Input
          label="Logradouro"
          value={form.addressStreet}
          onChange={(addressStreet) => onChange({ ...form, addressStreet })}
        />
        <Input
          label="Numero"
          value={form.addressNumber}
          onChange={(addressNumber) => onChange({ ...form, addressNumber })}
        />
        <Input
          label="CEP"
          value={form.addressZipCode}
          onChange={(addressZipCode) => onChange({ ...form, addressZipCode })}
        />
        <Input
          label="Bairro"
          value={form.addressNeighborhood}
          onChange={(addressNeighborhood) =>
            onChange({ ...form, addressNeighborhood })
          }
        />
        <Input
          label="Cidade"
          value={form.addressCity}
          onChange={(addressCity) => onChange({ ...form, addressCity })}
        />
        <Input
          label="UF"
          value={form.addressState}
          onChange={(addressState) => onChange({ ...form, addressState })}
        />
        <Input
          label="Codigo IBGE cidade"
          value={form.addressCityIbgeCode}
          onChange={(addressCityIbgeCode) =>
            onChange({ ...form, addressCityIbgeCode })
          }
        />
        <Input
          label="Telefone"
          value={form.contactPhone}
          onChange={(contactPhone) => onChange({ ...form, contactPhone })}
        />
        <Input
          label="Complemento"
          value={form.addressComplement}
          onChange={(addressComplement) =>
            onChange({ ...form, addressComplement })
          }
        />
      </div>
      <div className="mt-5 flex gap-3">
        <button
          className="inline-flex h-10 items-center gap-2 rounded-md bg-[#28785d] px-4 text-sm font-medium text-white disabled:opacity-60"
          disabled={isSaving}
          type="submit"
        >
          <Save className="size-4" />
          Salvar empresa
        </button>
      </div>
    </form>
  );
}

function FiscalCredentialsPanel({
  credential,
  form,
  isSaving,
  onChange,
  onSubmit,
}: {
  credential?: TenantFiscalCredential;
  form: typeof emptyFiscalCredential;
  isSaving: boolean;
  onChange: (form: typeof emptyFiscalCredential) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form
      className="rounded-md border border-[#d9ded6] bg-white p-5 shadow-sm"
      onSubmit={onSubmit}
    >
      <div className="mb-5 flex items-center gap-3">
        <KeyRound className="size-5 text-[#28785d]" />
        <h2 className="text-lg font-semibold">Credenciais fiscais</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Select
          label="Provider"
          value={form.provider}
          values={fiscalProviders}
          onChange={(provider) =>
            onChange({ ...form, provider: provider as FiscalProvider })
          }
        />
        <Select
          label="Status"
          value={form.status}
          values={fiscalCredentialStatuses}
          onChange={(status) =>
            onChange({
              ...form,
              status: status as TenantFiscalCredentialStatus,
            })
          }
        />
        <Input
          label="ID empresa no provider"
          value={form.providerCompanyId}
          onChange={(providerCompanyId) =>
            onChange({ ...form, providerCompanyId })
          }
        />
        <Input
          label={
            credential?.hasApiKey
              ? `Nova chave API (${credential.apiKeyLast4 ? `atual termina em ${credential.apiKeyLast4}` : "ja cadastrada"})`
              : "Chave API"
          }
          type="password"
          value={form.apiKey}
          onChange={(apiKey) => onChange({ ...form, apiKey })}
        />
      </div>
      <button
        className="mt-5 inline-flex h-10 items-center gap-2 rounded-md bg-[#28785d] px-4 text-sm font-medium text-white disabled:opacity-60"
        disabled={isSaving}
        type="submit"
      >
        <Save className="size-4" />
        Salvar credencial
      </button>
    </form>
  );
}

function TenantEmptyState() {
  return (
    <section className="rounded-md border border-[#d9ded6] bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-3">
        <Building2 className="size-5 text-[#28785d]" />
        <h2 className="text-lg font-semibold">Selecione uma empresa</h2>
      </div>
      <p className="text-sm text-[#607568]">
        Novas empresas entram pelo onboarding de contratacao para criar tenant,
        usuario titular e vinculo em uma unica operacao.
      </p>
    </section>
  );
}

function TitularesPanel({
  addTitular,
  removeTitular,
  selectedTenant,
  setTitularRole,
  setTitularUserId,
  titularRole,
  titularUserId,
  users,
}: {
  addTitular: () => void;
  removeTitular: (titularId: string) => void;
  selectedTenant?: Tenant;
  setTitularRole: (role: TenantTitularRole) => void;
  setTitularUserId: (id: string) => void;
  titularRole: TenantTitularRole;
  titularUserId: string;
  users: User[];
}) {
  return (
    <section className="rounded-md border border-[#d9ded6] bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <UsersRound className="size-5 text-[#28785d]" />
        <h2 className="text-lg font-semibold">Titulares do tenant</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-[1fr_220px_auto]">
        <Select
          label="Usuario"
          value={titularUserId}
          values={users.map((user) => user.id)}
          labels={Object.fromEntries(
            users.map((user) => [user.id, `${user.name} · ${user.email}`]),
          )}
          onChange={setTitularUserId}
        />
        <Select
          label="Papel"
          value={titularRole}
          values={titularRoles}
          onChange={(role) => setTitularRole(role as TenantTitularRole)}
        />
        <button
          className="mt-7 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#1d2520] px-4 text-sm font-medium text-white disabled:opacity-60"
          disabled={!selectedTenant || !titularUserId}
          onClick={addTitular}
          type="button"
        >
          <Plus className="size-4" />
          Vincular
        </button>
      </div>
      <div className="mt-5 divide-y divide-[#edf0eb]">
        {selectedTenant?.titulares.map((titular) => (
          <div
            className="flex flex-wrap items-center justify-between gap-3 py-3"
            key={titular.id}
          >
            <div>
              <p className="font-medium">{titular.user.name}</p>
              <p className="text-sm text-[#607568]">
                {titular.role} · {titular.user.email}
              </p>
            </div>
            <button
              className="inline-flex h-9 items-center gap-2 rounded-md border border-red-200 px-3 text-sm font-medium text-red-700"
              onClick={() => removeTitular(titular.id)}
              type="button"
            >
              <Trash2 className="size-4" />
              Remover
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function ClientsPanel({
  clients,
  createClient,
  deleteClient,
  form,
  isSaving,
  onFormChange,
  selectedClient,
  selectedTenant,
  setClientForm,
  setClientFormClientId,
  setSelectedClientId,
  setSelectedTenantId,
  tenants,
  updateClient,
}: {
  clients: Client[];
  createClient: (event: FormEvent<HTMLFormElement>) => void;
  deleteClient: (client: Client) => void;
  form: typeof emptyClient;
  isSaving: boolean;
  onFormChange: (form: typeof emptyClient) => void;
  selectedClient?: Client;
  selectedTenant?: Tenant;
  setClientForm: (form: typeof emptyClient) => void;
  setClientFormClientId: (id: string | null) => void;
  setSelectedClientId: (id: string | null) => void;
  setSelectedTenantId: (id: string) => void;
  tenants: Tenant[];
  updateClient: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <aside className="space-y-4">
        <Select
          label="Empresa"
          labels={{
            "": "Selecione uma empresa",
            ...Object.fromEntries(
              tenants.map((tenant) => [
                tenant.id,
                tenant.tradeName || tenant.legalName,
              ]),
            ),
          }}
          onChange={setSelectedTenantId}
          value={selectedTenant?.id ?? ""}
          values={["", ...tenants.map((tenant) => tenant.id)]}
        />
        <button
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[#1d2520] px-4 text-sm font-medium text-white"
          disabled={!selectedTenant}
          onClick={() => {
            setSelectedClientId(null);
            setClientForm(emptyClient);
            setClientFormClientId(null);
          }}
          type="button"
        >
          <Plus className="size-4" />
          Novo cliente
        </button>
        {clients.map((client) => (
          <button
            className="w-full rounded-md border border-[#d9ded6] bg-white p-4 text-left shadow-sm transition hover:border-[#8ca895]"
            key={client.id}
            onClick={() => setSelectedClientId(client.id)}
            type="button"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">
                  {client.tradeName || client.name}
                </p>
                <p className="mt-1 text-sm text-[#607568]">
                  {formatDocument(client.document)}
                </p>
              </div>
              <span className="rounded-md bg-[#e6f0e9] px-2 py-1 text-xs font-medium text-[#28785d]">
                {client.type}
              </span>
            </div>
            <p className="mt-3 text-sm text-[#4d5b52]">
              {client.email || "Sem email cadastrado"}
            </p>
          </button>
        ))}
      </aside>

      <form
        className="rounded-md border border-[#d9ded6] bg-white p-5 shadow-sm"
        onSubmit={selectedClient ? updateClient : createClient}
      >
        <div className="mb-5 flex items-center gap-3">
          <UsersRound className="size-5 text-[#28785d]" />
          <h2 className="text-lg font-semibold">
            {selectedClient ? "Editar cliente" : "Novo cliente"}
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Select
            label="Tipo"
            value={form.type}
            values={clientTypes}
            onChange={(type) =>
              onFormChange({ ...form, type: type as ClientType })
            }
          />
          <Select
            label="Status"
            value={form.status}
            values={clientStatuses}
            onChange={(status) =>
              onFormChange({ ...form, status: status as ClientStatus })
            }
          />
          <Input
            label="Nome/Razao social"
            value={form.name}
            onChange={(name) => onFormChange({ ...form, name })}
          />
          <Input
            label="Nome fantasia"
            value={form.tradeName}
            onChange={(tradeName) => onFormChange({ ...form, tradeName })}
          />
          <Input
            label="CPF/CNPJ"
            value={form.document}
            onChange={(document) => onFormChange({ ...form, document })}
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(email) => onFormChange({ ...form, email })}
          />
          <Input
            label="Telefone"
            value={form.phone}
            onChange={(phone) => onFormChange({ ...form, phone })}
          />
          <Input
            label="Inscricao municipal"
            value={form.municipalRegistration}
            onChange={(municipalRegistration) =>
              onFormChange({ ...form, municipalRegistration })
            }
          />
          <Input
            label="Inscricao estadual"
            value={form.stateRegistration}
            onChange={(stateRegistration) =>
              onFormChange({ ...form, stateRegistration })
            }
          />
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <Input
            label="Logradouro"
            value={form.addressStreet}
            onChange={(addressStreet) =>
              onFormChange({ ...form, addressStreet })
            }
          />
          <Input
            label="Numero"
            value={form.addressNumber}
            onChange={(addressNumber) =>
              onFormChange({ ...form, addressNumber })
            }
          />
          <Input
            label="CEP"
            value={form.addressZipCode}
            onChange={(addressZipCode) =>
              onFormChange({ ...form, addressZipCode })
            }
          />
          <Input
            label="Bairro"
            value={form.addressNeighborhood}
            onChange={(addressNeighborhood) =>
              onFormChange({ ...form, addressNeighborhood })
            }
          />
          <Input
            label="Cidade"
            value={form.addressCity}
            onChange={(addressCity) => onFormChange({ ...form, addressCity })}
          />
          <Input
            label="UF"
            value={form.addressState}
            onChange={(addressState) => onFormChange({ ...form, addressState })}
          />
        </div>
        <div className="mt-4">
          <Textarea
            label="Observacoes internas"
            value={form.notes}
            onChange={(notes) => onFormChange({ ...form, notes })}
          />
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            className="inline-flex h-10 items-center gap-2 rounded-md bg-[#28785d] px-4 text-sm font-medium text-white disabled:opacity-60"
            disabled={isSaving || !selectedTenant}
            type="submit"
          >
            <Save className="size-4" />
            {selectedClient ? "Salvar cliente" : "Criar cliente"}
          </button>
          {selectedClient ? (
            <button
              className="inline-flex h-10 items-center gap-2 rounded-md border border-red-200 px-4 text-sm font-medium text-red-700 disabled:opacity-50"
              disabled={isSaving}
              onClick={() => deleteClient(selectedClient)}
              type="button"
            >
              <Trash2 className="size-4" />
              Excluir
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}

function InvoiceForm({
  clients,
  form,
  isSaving,
  onChange,
  onClientSelect,
  onSubmit,
  selectedTenant,
  setSelectedTenantId,
  tenants,
}: {
  clients: Client[];
  form: typeof emptyInvoice;
  isSaving: boolean;
  onChange: (form: typeof emptyInvoice) => void;
  onClientSelect: (clientId: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  selectedTenant?: Tenant;
  setSelectedTenantId: (id: string) => void;
  tenants: Tenant[];
}) {
  return (
    <form
      className="rounded-md border border-[#d9ded6] bg-white p-5 shadow-sm"
      onSubmit={onSubmit}
    >
      <div className="mb-5 flex items-center gap-3">
        <ReceiptText className="size-5 text-[#28785d]" />
        <h2 className="text-lg font-semibold">Emitir NFS-e</h2>
      </div>
      <div className="grid gap-4">
        <Select
          label="Empresa emissora"
          value={selectedTenant?.id ?? ""}
          values={["", ...tenants.map((tenant) => tenant.id)]}
          labels={{
            "": "Selecione uma empresa",
            ...Object.fromEntries(
              tenants.map((tenant) => [
                tenant.id,
                tenant.tradeName || tenant.legalName,
              ]),
            ),
          }}
          onChange={setSelectedTenantId}
        />
        <Select
          label="Cliente cadastrado"
          value={form.clientId}
          values={["", ...clients.map((client) => client.id)]}
          labels={{
            "": "Preencher manualmente",
            ...Object.fromEntries(
              clients.map((client) => [
                client.id,
                `${client.tradeName || client.name} - ${formatDocument(client.document)}`,
              ]),
            ),
          }}
          onChange={onClientSelect}
        />
        <Input
          label="Tomador"
          value={form.borrowerName}
          onChange={(borrowerName) => onChange({ ...form, borrowerName })}
        />
        <Input
          label="CPF/CNPJ tomador"
          value={form.borrowerDocument}
          onChange={(borrowerDocument) =>
            onChange({ ...form, borrowerDocument })
          }
        />
        <Input
          label="Email tomador"
          type="email"
          value={form.borrowerEmail}
          onChange={(borrowerEmail) => onChange({ ...form, borrowerEmail })}
        />
        <div className="grid gap-4 md:grid-cols-3">
          <Input
            label="Logradouro tomador"
            value={form.borrowerStreet}
            onChange={(borrowerStreet) => onChange({ ...form, borrowerStreet })}
          />
          <Input
            label="Numero"
            value={form.borrowerNumber}
            onChange={(borrowerNumber) => onChange({ ...form, borrowerNumber })}
          />
          <Input
            label="CEP"
            value={form.borrowerZipCode}
            onChange={(borrowerZipCode) =>
              onChange({ ...form, borrowerZipCode })
            }
          />
          <Input
            label="Bairro"
            value={form.borrowerNeighborhood}
            onChange={(borrowerNeighborhood) =>
              onChange({ ...form, borrowerNeighborhood })
            }
          />
          <Input
            label="Cidade"
            value={form.borrowerCity}
            onChange={(borrowerCity) => onChange({ ...form, borrowerCity })}
          />
          <Input
            label="UF"
            value={form.borrowerState}
            onChange={(borrowerState) => onChange({ ...form, borrowerState })}
          />
        </div>
        <Textarea
          label="Descricao do servico"
          value={form.serviceDescription}
          onChange={(serviceDescription) =>
            onChange({ ...form, serviceDescription })
          }
        />
        <div className="grid gap-4 md:grid-cols-3">
          <Input
            label="Valor"
            type="number"
            value={form.amount}
            onChange={(amount) => onChange({ ...form, amount })}
          />
          <Input
            label="Deducoes"
            type="number"
            value={form.deductions}
            onChange={(deductions) => onChange({ ...form, deductions })}
          />
          <Input
            label="Aliquota ISS"
            type="number"
            value={form.issRate}
            onChange={(issRate) => onChange({ ...form, issRate })}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Input
            label="Codigo servico"
            value={form.serviceCode}
            onChange={(serviceCode) => onChange({ ...form, serviceCode })}
          />
          <Input
            label="CNAE"
            value={form.cnaeCode}
            onChange={(cnaeCode) => onChange({ ...form, cnaeCode })}
          />
          <Input
            label="Codigo municipal"
            value={form.municipalTaxCode}
            onChange={(municipalTaxCode) =>
              onChange({ ...form, municipalTaxCode })
            }
          />
        </div>
        <Textarea
          label="Observacoes"
          value={form.notes}
          onChange={(notes) => onChange({ ...form, notes })}
        />
      </div>
      <button
        className="mt-5 inline-flex h-10 items-center gap-2 rounded-md bg-[#28785d] px-4 text-sm font-medium text-white disabled:opacity-60"
        disabled={isSaving || !selectedTenant}
        type="submit"
      >
        <FileText className="size-4" />
        Emitir nota
      </button>
    </form>
  );
}

function InvoiceHistory({
  invoices,
  tenants,
}: {
  invoices: ServiceInvoice[];
  tenants: Tenant[];
}) {
  return (
    <section className="rounded-md border border-[#d9ded6] bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <FileText className="size-5 text-[#28785d]" />
        <h2 className="text-lg font-semibold">Historico fiscal</h2>
      </div>
      <div className="divide-y divide-[#edf0eb]">
        {invoices.map((invoice) => {
          const tenant = tenants.find((item) => item.id === invoice.tenantId);
          return (
            <div
              className="grid gap-2 py-4 md:grid-cols-[1fr_120px_140px]"
              key={invoice.id}
            >
              <div>
                <p className="font-medium">{invoice.borrowerName}</p>
                <p className="text-sm text-[#607568]">
                  {tenant?.tradeName || tenant?.legalName} ·{" "}
                  {invoice.serviceDescription}
                </p>
              </div>
              <p className="font-semibold">{formatCurrency(invoice.amount)}</p>
              <span
                className={`w-fit rounded-md px-2 py-1 text-xs font-medium ${invoiceStatusClass(invoice.status)}`}
              >
                {invoiceStatusLabels[invoice.status]}
              </span>
            </div>
          );
        })}
        {invoices.length === 0 ? (
          <p className="text-sm text-[#607568]">Nenhuma nota emitida ainda.</p>
        ) : null}
      </div>
    </section>
  );
}

function UsersPanel({
  createUser,
  deleteUser,
  isSaving,
  selectedUser,
  setSelectedUserId,
  editUserForm,
  newUserForm,
  setEditUserForm,
  setNewUserForm,
  updateSelectedUser,
  users,
}: {
  createUser: (event: FormEvent<HTMLFormElement>) => void;
  deleteUser: (user: User) => void;
  editUserForm: typeof emptyUser;
  isSaving: boolean;
  newUserForm: typeof emptyUser;
  selectedUser?: User;
  setEditUserForm: (form: typeof emptyUser) => void;
  setNewUserForm: (form: typeof emptyUser) => void;
  setSelectedUserId: (id: string | null) => void;
  updateSelectedUser: (event: FormEvent<HTMLFormElement>) => void;
  users: User[];
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <aside className="space-y-3">
        {users.map((user) => (
          <button
            className="w-full rounded-md border border-[#d9ded6] bg-white p-4 text-left shadow-sm"
            key={user.id}
            onClick={() => setSelectedUserId(user.id)}
            type="button"
          >
            <p className="font-semibold">{user.name}</p>
            <p className="mt-1 text-sm text-[#607568]">{user.email}</p>
          </button>
        ))}
      </aside>
      <section className="grid gap-6 xl:grid-cols-2">
        <form
          className="rounded-md border border-[#d9ded6] bg-white p-5 shadow-sm"
          onSubmit={createUser}
        >
          <div className="mb-5 flex items-center gap-3">
            <Plus className="size-5 text-[#28785d]" />
            <h2 className="text-lg font-semibold">Novo usuario</h2>
          </div>
          <UserFields form={newUserForm} setForm={setNewUserForm} />
          <button
            className="mt-5 inline-flex h-10 items-center gap-2 rounded-md bg-[#28785d] px-4 text-sm font-medium text-white disabled:opacity-60"
            disabled={isSaving}
            type="submit"
          >
            <Plus className="size-4" />
            Criar
          </button>
        </form>
        <form
          className="rounded-md border border-[#d9ded6] bg-white p-5 shadow-sm"
          onSubmit={updateSelectedUser}
        >
          <div className="mb-5 flex items-center gap-3">
            <UserRoundCog className="size-5 text-[#28785d]" />
            <h2 className="text-lg font-semibold">Editar usuario</h2>
          </div>
          <UserFields
            form={editUserForm}
            passwordPlaceholder="Nova senha opcional"
            setForm={setEditUserForm}
          />
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              className="inline-flex h-10 items-center gap-2 rounded-md bg-[#1d2520] px-4 text-sm font-medium text-white disabled:opacity-60"
              disabled={isSaving || !selectedUser}
              type="submit"
            >
              <Save className="size-4" />
              Salvar
            </button>
            {selectedUser ? (
              <button
                className="inline-flex h-10 items-center gap-2 rounded-md border border-red-200 px-4 text-sm font-medium text-red-700 disabled:opacity-50"
                disabled={isSaving}
                onClick={() => deleteUser(selectedUser)}
                type="button"
              >
                <Trash2 className="size-4" />
                Excluir
              </button>
            ) : null}
          </div>
        </form>
      </section>
    </div>
  );
}

function UserFields({
  form,
  passwordPlaceholder = "Senha inicial",
  setForm,
}: {
  form: typeof emptyUser;
  passwordPlaceholder?: string;
  setForm: (form: typeof emptyUser) => void;
}) {
  return (
    <div className="grid gap-4">
      <Input
        label="Nome"
        value={form.name}
        onChange={(name) => setForm({ ...form, name })}
      />
      <Input
        label="Email"
        type="email"
        value={form.email}
        onChange={(email) => setForm({ ...form, email })}
      />
      <Input
        label="Senha"
        placeholder={passwordPlaceholder}
        type="password"
        value={form.password}
        onChange={(password) => setForm({ ...form, password })}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="Role"
          value={form.role}
          values={roles}
          onChange={(role) => setForm({ ...form, role: role as UserRole })}
        />
        <Select
          label="Status"
          value={form.status}
          values={statuses}
          onChange={(status) =>
            setForm({ ...form, status: status as UserStatus })
          }
        />
      </div>
    </div>
  );
}

function SearchBox({
  placeholder,
  query,
  setQuery,
}: {
  placeholder: string;
  query: string;
  setQuery: (query: string) => void;
}) {
  return (
    <div className="flex h-11 items-center gap-2 rounded-md border border-[#d9ded6] bg-white px-3">
      <Search className="size-4 text-[#607568]" />
      <input
        className="w-full bg-transparent text-sm outline-none"
        onChange={(event) => setQuery(event.target.value)}
        placeholder={placeholder}
        value={query}
      />
    </div>
  );
}

function TabButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-medium ${active ? "bg-[#1d2520] text-white" : "border border-[#d9ded6] bg-white text-[#4d5b52]"}`}
      onClick={onClick}
      type="button"
    >
      {icon}
      {label}
    </button>
  );
}

function Input({
  label,
  onChange,
  placeholder,
  type = "text",
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  value: string;
}) {
  return (
    <label className="block text-sm font-medium text-[#4d5b52]">
      {label}
      <input
        className="mt-2 h-10 w-full rounded-md border border-[#d9ded6] px-3 text-sm outline-none focus:border-[#28785d]"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        value={value}
      />
    </label>
  );
}

function Textarea({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="block text-sm font-medium text-[#4d5b52]">
      {label}
      <textarea
        className="mt-2 min-h-24 w-full rounded-md border border-[#d9ded6] px-3 py-2 text-sm outline-none focus:border-[#28785d]"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  );
}

function Select({
  label,
  labels,
  onChange,
  value,
  values,
}: {
  label: string;
  labels?: Record<string, string>;
  onChange: (value: string) => void;
  value: string;
  values: string[];
}) {
  return (
    <label className="block text-sm font-medium text-[#4d5b52]">
      {label}
      <select
        className="mt-2 h-10 w-full rounded-md border border-[#d9ded6] bg-white px-3 text-sm outline-none focus:border-[#28785d]"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {values.map((item) => (
          <option key={item} value={item}>
            {labels?.[item] ?? item}
          </option>
        ))}
      </select>
    </label>
  );
}

function tenantToForm(tenant: Tenant): typeof emptyTenant {
  return {
    legalName: tenant.legalName,
    tradeName: tenant.tradeName ?? "",
    cnpj: tenant.cnpj,
    status: tenant.status,
    taxRegime: tenant.taxRegime,
    municipalRegistration: tenant.municipalRegistration ?? "",
    stateRegistration: tenant.stateRegistration ?? "",
    cnae: tenant.cnae ?? "",
    serviceTaxCode: tenant.serviceTaxCode ?? "",
    municipalServiceCode: tenant.municipalServiceCode ?? "",
    fiscalProvider: tenant.fiscalProvider,
    fiscalProviderCompanyId: tenant.fiscalProviderCompanyId ?? "",
    contactEmail: tenant.contactEmail,
    contactPhone: tenant.contactPhone ?? "",
    addressStreet: tenant.addressStreet,
    addressNumber: tenant.addressNumber,
    addressComplement: tenant.addressComplement ?? "",
    addressNeighborhood: tenant.addressNeighborhood,
    addressCity: tenant.addressCity,
    addressState: tenant.addressState,
    addressCityIbgeCode: tenant.addressCityIbgeCode,
    addressZipCode: tenant.addressZipCode,
  };
}

function userToForm(user: User): typeof emptyUser {
  return {
    name: user.name,
    email: user.email,
    password: "",
    role: user.role,
    status: user.status,
  };
}

function clientToForm(client: Client): typeof emptyClient {
  return {
    type: client.type,
    status: client.status,
    name: client.name,
    tradeName: client.tradeName ?? "",
    document: client.document,
    email: client.email ?? "",
    phone: client.phone ?? "",
    municipalRegistration: client.municipalRegistration ?? "",
    stateRegistration: client.stateRegistration ?? "",
    addressStreet: client.addressStreet ?? "",
    addressNumber: client.addressNumber ?? "",
    addressComplement: client.addressComplement ?? "",
    addressNeighborhood: client.addressNeighborhood ?? "",
    addressCity: client.addressCity ?? "",
    addressState: client.addressState ?? "SP",
    addressZipCode: client.addressZipCode ?? "",
    notes: client.notes ?? "",
  };
}

function fiscalCredentialToForm(
  credential: TenantFiscalCredential | undefined,
  tenant: Tenant,
): typeof emptyFiscalCredential {
  return {
    provider: credential?.provider ?? tenant.fiscalProvider,
    status: credential?.status ?? "ACTIVE",
    providerCompanyId:
      credential?.providerCompanyId ?? tenant.fiscalProviderCompanyId ?? "",
    apiKey: "",
  };
}

function cleanTenantPayload(form: typeof emptyTenant) {
  return {
    ...form,
    cnpj: onlyDigits(form.cnpj),
    addressZipCode: onlyDigits(form.addressZipCode),
    tradeName: optional(form.tradeName),
    municipalRegistration: optional(form.municipalRegistration),
    stateRegistration: optional(form.stateRegistration),
    cnae: optional(form.cnae),
    serviceTaxCode: optional(form.serviceTaxCode),
    municipalServiceCode: optional(form.municipalServiceCode),
    fiscalProviderCompanyId: optional(form.fiscalProviderCompanyId),
    contactPhone: optional(form.contactPhone),
    addressComplement: optional(form.addressComplement),
  };
}

function cleanFiscalCredentialPayload(form: typeof emptyFiscalCredential) {
  return {
    provider: form.provider,
    status: form.status,
    providerCompanyId: form.providerCompanyId.trim(),
    apiKey: optional(form.apiKey),
  };
}

function cleanClientPayload(form: typeof emptyClient) {
  return {
    ...form,
    document: onlyDigits(form.document),
    phone: optional(onlyDigits(form.phone)),
    tradeName: optional(form.tradeName),
    email: optional(form.email),
    municipalRegistration: optional(form.municipalRegistration),
    stateRegistration: optional(form.stateRegistration),
    addressStreet: optional(form.addressStreet),
    addressNumber: optional(form.addressNumber),
    addressComplement: optional(form.addressComplement),
    addressNeighborhood: optional(form.addressNeighborhood),
    addressCity: optional(form.addressCity),
    addressState: optional(form.addressState),
    addressZipCode: optional(onlyDigits(form.addressZipCode)),
    notes: optional(form.notes),
  };
}

function buildClientsUrl(tenantId?: string, query?: string) {
  const params = new URLSearchParams();
  if (tenantId) params.set("tenantId", tenantId);
  if (query?.trim()) params.set("q", query.trim());
  const search = params.toString();

  return `/api/clients${search ? `?${search}` : ""}`;
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function optional(value: string) {
  return value.trim() ? value.trim() : undefined;
}

function hasActiveInvoiceJobs(invoices?: ServiceInvoice[]) {
  return (
    invoices?.some((invoice) => activeInvoiceStatuses.has(invoice.status)) ??
    false
  );
}

function invoiceStatusClass(status: ServiceInvoiceStatus) {
  if (status === "AUTHORIZED") return "bg-[#e6f0e9] text-[#28785d]";
  if (status === "REJECTED" || status === "FAILED_FINAL")
    return "bg-red-50 text-red-700";
  if (status === "FAILED_RETRYING") return "bg-amber-50 text-amber-700";
  if (status === "CANCELLED") return "bg-[#edf0eb] text-[#4d5b52]";

  return "bg-blue-50 text-blue-700";
}

function formatCnpj(value: string) {
  const digits = onlyDigits(value);
  return digits.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    "$1.$2.$3/$4-$5",
  );
}

function formatDocument(value: string) {
  const digits = onlyDigits(value);
  if (digits.length === 11) {
    return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
  }

  return formatCnpj(digits);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(value);
}
