import { proxyToApi } from "@/lib/api-proxy";
import { getSession } from "@/lib/require-session";

export async function POST(request: Request) {
  const response = await proxyToApi("/onboarding/tenant", {
    method: "POST",
    body: JSON.stringify(await request.json()),
  });

  if (response.ok) {
    const payload = await response.clone().json();
    const session = await getSession();
    session.user = {
      id: payload.user.id,
      name: payload.user.name,
      email: payload.user.email,
      role: payload.user.role,
      status: payload.user.status,
    };
    await session.save();
  }

  return response;
}
