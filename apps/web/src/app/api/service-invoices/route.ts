import { proxyToApi } from "@/lib/api-proxy";
import { requireSession } from "@/lib/require-session";

export async function GET(request: Request) {
  const { response } = await requireSession();
  if (response) return response;

  const url = new URL(request.url);
  const tenantId = url.searchParams.get("tenantId");
  return proxyToApi(`/service-invoices${tenantId ? `?tenantId=${tenantId}` : ""}`);
}

export async function POST(request: Request) {
  const { response, session } = await requireSession();
  if (response) return response;

  const body = await request.json();
  return proxyToApi("/service-invoices", {
    method: "POST",
    body: JSON.stringify({
      ...body,
      issuedByUserId: body.issuedByUserId ?? session.user?.id,
    }),
  });
}
