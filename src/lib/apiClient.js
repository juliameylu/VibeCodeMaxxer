const API_BASE = "";

export async function apiFetch(path, { method = "GET", body, headers = {}, withAuth = true } = {}) {
  const mergedHeaders = {
    "Content-Type": "application/json",
    ...headers
  };

  if (withAuth) {
    const token = localStorage.getItem("slo_session_token");
    if (token) mergedHeaders["x-session-token"] = token;
  }

  const response = await fetch(`${API_BASE}${path}`, {
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
