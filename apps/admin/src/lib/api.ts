function getDefaultApiBase() {
  if (typeof window === "undefined") {
    return "http://localhost:3000";
  }

  return "";
}

export const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? getDefaultApiBase();

export async function request<T>(path: string, options?: RequestInit, token?: string): Promise<T> {
  const headers = new Headers(options?.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (options?.body !== undefined && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "请求失败" }));
    throw new Error(error.message ?? "请求失败");
  }
  return response.json() as Promise<T>;
}

export function formatDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}
