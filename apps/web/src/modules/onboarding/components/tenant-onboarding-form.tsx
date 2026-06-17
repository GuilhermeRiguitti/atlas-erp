"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowRight, Building2, Link2Off, Loader2, UserRoundCheck } from "lucide-react";
import { FormEvent, ReactNode, useState } from "react";
import type { FiscalProvider, Tenant, TenantTaxRegime, User } from "@/lib/types";
import { validateOnboarding } from "@/modules/onboarding/validation/schemas";
import { apiClient } from "@/shared/api/http-client";

type TenantOnboardingFormProps = {
  token: string;
};

type OnboardingTokenResponse = {
  user: User;
  expiresAt?: string | null;
};

type OnboardingResponse = {
  tenant: Tenant;
  user: User;
};

const taxRegimes: TenantTaxRegime[] = ["SIMPLES_NACIONAL", "LUCRO_PRESUMIDO", "LUCRO_REAL", "MEI"];
const fiscalProviders: FiscalProvider[] = ["NFSE_NACIONAL", "NFE_IO"];

const emptyTenant = {
  legalName: "",
  tradeName: "",
  cnpj: "",
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

const emptyTitular = {
  title: "Socio administrador",
  ownershipPercentage: "100",
};

export function TenantOnboardingForm({ token }: TenantOnboardingFormProps) {
  const [tenant, setTenant] = useState(emptyTenant);
  const [titular, setTitular] = useState(emptyTitular);
  const [error, setError] = useState<string | null>(null);

  const tokenValidation = useQuery({
    enabled: Boolean(token),
    queryFn: () =>
      apiClient.get<OnboardingTokenResponse>(
        `/api/onboarding/token?token=${encodeURIComponent(token)}`,
      ),
    queryKey: ["onboarding-token", token],
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const onboarding = useMutation({
    mutationFn: (payload: object) =>
      apiClient.post<OnboardingResponse>("/api/onboarding/tenant", payload),
    onSuccess: () => {
      window.location.href = "/";
    },
  });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const validationError = await validateOnboarding({
      token,
      tenant,
      titular: {
        ...titular,
        ownershipPercentage: Number(titular.ownershipPercentage || 0),
      },
    });

    if (validationError) {
      setError(validationError);
      return;
    }

    onboarding.mutate(
      {
        token,
        tenant: cleanTenantPayload(tenant),
        titular: {
          title: optional(titular.title),
          ownershipPercentage: Number(titular.ownershipPercentage || 0),
          isLegalRepresentative: true,
          canIssueInvoices: true,
        },
      },
      {
        onError: (caught) => {
          setError(caught instanceof Error ? caught.message : "Falha no onboarding");
        },
      },
    );
  }

  if (!token) {
    return <OnboardingState icon={<Link2Off className="size-5 text-red-700" />} title="Link de onboarding invalido" />;
  }

  if (tokenValidation.isLoading) {
    return <OnboardingState icon={<Loader2 className="size-5 animate-spin text-[#28785d]" />} title="Validando onboarding" />;
  }

  if (tokenValidation.isError || !tokenValidation.data) {
    return <OnboardingState icon={<Link2Off className="size-5 text-red-700" />} title="Link de onboarding expirado ou invalido" />;
  }

  return (
    <main className="min-h-screen bg-[#f7f7f4] px-5 py-8 text-[#1d2520]">
      <form className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_360px]" onSubmit={submit}>
        <section className="rounded-md border border-[#d9ded6] bg-white p-5 shadow-sm">
          <SectionTitle icon={<Building2 className="size-5 text-[#28785d]" />} kicker="Contratacao" title="Dados fiscais da empresa" />
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Razao social" value={tenant.legalName} onChange={(legalName) => setTenant({ ...tenant, legalName })} />
            <Input label="Nome fantasia" value={tenant.tradeName} onChange={(tradeName) => setTenant({ ...tenant, tradeName })} />
            <Input label="CNPJ" value={tenant.cnpj} onChange={(cnpj) => setTenant({ ...tenant, cnpj })} />
            <Input label="Email fiscal" type="email" value={tenant.contactEmail} onChange={(contactEmail) => setTenant({ ...tenant, contactEmail })} />
            <Select label="Regime tributario" value={tenant.taxRegime} values={taxRegimes} onChange={(taxRegime) => setTenant({ ...tenant, taxRegime: taxRegime as TenantTaxRegime })} />
            <Select label="Provider fiscal" value={tenant.fiscalProvider} values={fiscalProviders} onChange={(fiscalProvider) => setTenant({ ...tenant, fiscalProvider: fiscalProvider as FiscalProvider })} />
            <Input label="Inscricao municipal" value={tenant.municipalRegistration} onChange={(municipalRegistration) => setTenant({ ...tenant, municipalRegistration })} />
            <Input label="CNAE" value={tenant.cnae} onChange={(cnae) => setTenant({ ...tenant, cnae })} />
            <Input label="Codigo servico LC 116" value={tenant.serviceTaxCode} onChange={(serviceTaxCode) => setTenant({ ...tenant, serviceTaxCode })} />
            <Input label="Codigo municipal" value={tenant.municipalServiceCode} onChange={(municipalServiceCode) => setTenant({ ...tenant, municipalServiceCode })} />
            <Input label="ID empresa no provider" value={tenant.fiscalProviderCompanyId} onChange={(fiscalProviderCompanyId) => setTenant({ ...tenant, fiscalProviderCompanyId })} />
            <Input label="Telefone" value={tenant.contactPhone} onChange={(contactPhone) => setTenant({ ...tenant, contactPhone })} />
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <Input label="Logradouro" value={tenant.addressStreet} onChange={(addressStreet) => setTenant({ ...tenant, addressStreet })} />
            <Input label="Numero" value={tenant.addressNumber} onChange={(addressNumber) => setTenant({ ...tenant, addressNumber })} />
            <Input label="CEP" value={tenant.addressZipCode} onChange={(addressZipCode) => setTenant({ ...tenant, addressZipCode })} />
            <Input label="Bairro" value={tenant.addressNeighborhood} onChange={(addressNeighborhood) => setTenant({ ...tenant, addressNeighborhood })} />
            <Input label="Cidade" value={tenant.addressCity} onChange={(addressCity) => setTenant({ ...tenant, addressCity })} />
            <Input label="UF" value={tenant.addressState} onChange={(addressState) => setTenant({ ...tenant, addressState })} />
            <Input label="Codigo IBGE cidade" value={tenant.addressCityIbgeCode} onChange={(addressCityIbgeCode) => setTenant({ ...tenant, addressCityIbgeCode })} />
            <Input label="Complemento" value={tenant.addressComplement} onChange={(addressComplement) => setTenant({ ...tenant, addressComplement })} />
          </div>
        </section>

        <aside className="space-y-6">
          <section className="rounded-md border border-[#d9ded6] bg-white p-5 shadow-sm">
            <SectionTitle icon={<UserRoundCheck className="size-5 text-[#28785d]" />} kicker="Titular" title="Usuario confirmado" />
            <div className="rounded-md border border-[#d9ded6] bg-[#f7f7f4] p-4">
              <p className="font-medium">{tokenValidation.data.user.name}</p>
              <p className="mt-1 text-sm text-[#607568]">{tokenValidation.data.user.email}</p>
              <p className="mt-2 text-xs font-medium uppercase tracking-[0.12em] text-[#607568]">{tokenValidation.data.user.status}</p>
            </div>
            <div className="mt-4 grid gap-4">
              <Input label="Cargo societario" value={titular.title} onChange={(title) => setTitular({ ...titular, title })} />
              <Input label="Participacao (%)" type="number" value={titular.ownershipPercentage} onChange={(ownershipPercentage) => setTitular({ ...titular, ownershipPercentage })} />
            </div>
          </section>

          {error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

          <button className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#28785d] px-4 text-sm font-medium text-white disabled:opacity-60" disabled={onboarding.isPending} type="submit">
            Concluir onboarding
            <ArrowRight className="size-4" />
          </button>
        </aside>
      </form>
    </main>
  );
}

function OnboardingState({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f7f7f4] px-5 text-[#1d2520]">
      <section className="w-full max-w-md rounded-md border border-[#d9ded6] bg-white p-6 shadow-sm">
        <div className="mb-3 flex items-center gap-3">
          {icon}
          <h1 className="text-lg font-semibold">{title}</h1>
        </div>
        <p className="text-sm text-[#607568]">
          Solicite um novo link de contratacao para continuar a configuracao da empresa.
        </p>
      </section>
    </main>
  );
}

function SectionTitle({ icon, kicker, title }: { icon: ReactNode; kicker: string; title: string }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      {icon}
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#607568]">{kicker}</p>
        <h1 className="text-lg font-semibold">{title}</h1>
      </div>
    </div>
  );
}

function Input({
  label,
  onChange,
  type = "text",
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  type?: string;
  value: string;
}) {
  return (
    <label className="block text-sm font-medium text-[#4d5b52]">
      {label}
      <input className="mt-2 h-10 w-full rounded-md border border-[#d9ded6] px-3 text-sm outline-none focus:border-[#28785d]" onChange={(event) => onChange(event.target.value)} type={type} value={value} />
    </label>
  );
}

function Select({
  label,
  onChange,
  value,
  values,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
  values: string[];
}) {
  return (
    <label className="block text-sm font-medium text-[#4d5b52]">
      {label}
      <select className="mt-2 h-10 w-full rounded-md border border-[#d9ded6] bg-white px-3 text-sm outline-none focus:border-[#28785d]" onChange={(event) => onChange(event.target.value)} value={value}>
        {values.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
    </label>
  );
}

function cleanTenantPayload(form: typeof emptyTenant) {
  return {
    ...form,
    cnpj: onlyDigits(form.cnpj),
    addressZipCode: onlyDigits(form.addressZipCode),
    addressState: form.addressState.toUpperCase(),
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

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function optional(value: string) {
  return value.trim() ? value.trim() : undefined;
}
