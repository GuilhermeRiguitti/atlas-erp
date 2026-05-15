import { proxyToApi } from "@/lib/api-proxy";
import { requireSession } from "@/lib/require-session";

export async function GET(request: Request) {
  const { response } = await requireSession();
  if (response) return response;

  const url = new URL(request.url);
  const query = url.searchParams.get("q");
  return proxyToApi(`/tenants${query ? `?q=${encodeURIComponent(query)}` : ""}`);
}
