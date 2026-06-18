import { NextResponse } from "next/server";
import { getSession } from "./require-session";

const apiUrl = process.env.API_URL ?? "http://localhost:3333";
const apiInternalKey = process.env.API_INTERNAL_KEY;

export async function proxyToApi(path: string, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");

  if (apiInternalKey) {
    headers.set("x-internal-api-key", apiInternalKey);
  }

  // Propaga a identidade autenticada para a API fazer autorizacao por tenant.
  // O canal e protegido pelo internal key; a API nao deve ficar exposta.
  const session = await getSession();
  if (session.user) {
    headers.set("x-user-id", session.user.id);
    if (session.user.role) {
      headers.set("x-user-role", session.user.role);
    }
  }

  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  const payload = await response.json().catch(() => null);
  return NextResponse.json(payload, { status: response.status });
}
