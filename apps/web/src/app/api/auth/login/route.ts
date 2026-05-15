import { getSession } from "@/lib/require-session";
import { proxyToApi } from "@/lib/api-proxy";

export async function POST(request: Request) {
  const body = await request.json();
  const response = await proxyToApi("/auth/login", {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (response.ok) {
    const user = await response.clone().json();
    const session = await getSession();
    session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
    };
    await session.save();
  }

  return response;
}
