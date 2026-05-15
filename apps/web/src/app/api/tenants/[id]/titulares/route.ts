import { proxyToApi } from "@/lib/api-proxy";
import { requireSession } from "@/lib/require-session";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { response } = await requireSession();
  if (response) return response;

  const { id } = await context.params;
  return proxyToApi(`/tenants/${id}/titulares`, {
    method: "POST",
    body: JSON.stringify(await request.json()),
  });
}
