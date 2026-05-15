type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

async function request<T>(url: string, method: HttpMethod, body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      Array.isArray(payload?.message)
        ? payload.message.join(", ")
        : payload?.message ?? "Request failed",
    );
  }

  return payload as T;
}

export const apiClient = {
  get: <T>(url: string) => request<T>(url, "GET"),
  post: <T>(url: string, body?: unknown) => request<T>(url, "POST", body),
  patch: <T>(url: string, body?: unknown) => request<T>(url, "PATCH", body),
  put: <T>(url: string, body?: unknown) => request<T>(url, "PUT", body),
  delete: <T>(url: string) => request<T>(url, "DELETE"),
};
