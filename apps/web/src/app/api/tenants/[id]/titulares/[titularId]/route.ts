import { proxyToApi } from "@/lib/api-proxy";
import { requireSession } from "@/lib/require-session";

type RouteContext = {
  params: Promise<{ id: string; titularId: string }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  const { response } = await requireSession();
  if (response) return response;

  const { id, titularId } = await context.params;
  return proxyToApi(`/tenants/${id}/titulares/${titularId}`, {
    method: "DELETE",
  });
}
