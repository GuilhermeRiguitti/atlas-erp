import { proxyToApi } from "@/lib/api-proxy";
import { requireSession } from "@/lib/require-session";

export async function GET(request: Request) {
  const { response } = await requireSession();
  if (response) return response;

  const url = new URL(request.url);
  const params = new URLSearchParams();
  const tenantId = url.searchParams.get("tenantId");
  const query = url.searchParams.get("q");

  if (tenantId) params.set("tenantId", tenantId);
  if (query) params.set("q", query);

  const search = params.toString();
  return proxyToApi(`/clients${search ? `?${search}` : ""}`);
}

export async function POST(request: Request) {
  const { response, session } = await requireSession();
  if (response) return response;

  return proxyToApi("/clients", {
    method: "POST",
    body: JSON.stringify({
      ...(await request.json()),
      createdByUserId: session.user?.id,
    }),
  });
}
