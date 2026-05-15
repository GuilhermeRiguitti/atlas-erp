import { TenantOnboardingForm } from "@/modules/onboarding/components/tenant-onboarding-form";

type OnboardingPageProps = {
  searchParams: Promise<{
    token?: string;
  }>;
};

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const { token = "" } = await searchParams;

  return <TenantOnboardingForm token={token} />;
}
