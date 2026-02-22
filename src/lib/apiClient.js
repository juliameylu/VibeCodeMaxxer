import { withApiBase } from "./api/baseUrl";

export async function apiFetch(path, { method = "GET", body, headers = {}, withAuth = true } = {}) {
  const mergedHeaders = {
    "Content-Type": "application/json",
    ...headers
  };

  if (withAuth) {
    const token = localStorage.getItem("slo_session_token");
    if (token) mergedHeaders["x-session-token"] = token;
  }

  const response = await fetch(withApiBase(path), {
    method,
    headers: mergedHeaders,
    body: body ? JSON.stringify(body) : undefined
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || data?.message || "Request failed");
  }

  return data;
}
