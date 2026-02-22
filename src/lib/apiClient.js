const API_BASE = "";

export async function apiFetch(path, { method = "GET", body, headers = {}, withAuth = true } = {}) {
  const mergedHeaders = {
    "Content-Type": "application/json",
    ...headers
  };

  if (withAuth) {
    const token = localStorage.getItem("slo_session_token");
    if (token) mergedHeaders["x-session-token"] = token;

    const appSessionRaw = localStorage.getItem("slo_day_session_v1");
    if (appSessionRaw) {
      try {
        const appSession = JSON.parse(appSessionRaw);
        if (appSession?.user_id) mergedHeaders["x-app-user-id"] = String(appSession.user_id);
        if (appSession?.email) mergedHeaders["x-app-user-email"] = String(appSession.email);
        if (appSession?.name) mergedHeaders["x-app-user-name"] = String(appSession.name);
        if (appSession?.timezone) mergedHeaders["x-app-user-timezone"] = String(appSession.timezone);
      } catch {
        // Ignore malformed local app session.
      }
    }
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: mergedHeaders,
    body: body ? JSON.stringify(body) : undefined
  });

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json().catch(() => ({}))
    : await response.text().catch(() => "");

  if (!response.ok) {
    const message = typeof data === "string"
      ? data
      : data?.error || data?.message || "Request failed";
    throw new Error(message);
  }

  return data;
}
