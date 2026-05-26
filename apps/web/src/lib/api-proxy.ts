import { NextResponse } from "next/server";

const apiUrl = process.env.API_URL ?? "http://localhost:3333";
const apiInternalKey = process.env.API_INTERNAL_KEY;

export async function proxyToApi(path: string, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");

  if (apiInternalKey) {
    headers.set("x-internal-api-key", apiInternalKey);
  }

  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  const payload = await response.json().catch(() => null);
  return NextResponse.json(payload, { status: response.status });
}
