import { proxyToApi } from "@/lib/api-proxy";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  return proxyToApi(`/onboarding/token?token=${encodeURIComponent(token ?? "")}`);
}
