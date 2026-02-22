const API_BASE = "";

function getSessionToken() {
  return localStorage.getItem("slo_session_token") || "";
}

export async function apiFetch(path, { method = "GET", body, headers = {}, withAuth = true } = {}) {
  const mergedHeaders = {
    "Content-Type": "application/json",
    ...headers
  };

  if (withAuth) {
    const token = getSessionToken();
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

export function saveSessionToken(token) {
  if (!token) return;
  localStorage.setItem("slo_session_token", token);
}

export function clearSessionToken() {
  localStorage.removeItem("slo_session_token");
}

export function setPendingRedirect(path) {
  if (!path) return;
  localStorage.setItem("slo_pending_redirect", path);
}

export function getPendingRedirect() {
  return localStorage.getItem("slo_pending_redirect");
}

export function clearPendingRedirect() {
  localStorage.removeItem("slo_pending_redirect");
}
