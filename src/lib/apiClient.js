import { withApiBase } from "./api/baseUrl";

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

    // Fallback identity headers for new auth flow when legacy app session is absent.
    if (!mergedHeaders["x-app-user-id"]) {
      const fallbackUserId = localStorage.getItem("slo_user_id");
      if (fallbackUserId) mergedHeaders["x-app-user-id"] = String(fallbackUserId);
    }
    if (!mergedHeaders["x-app-user-email"]) {
      const fallbackEmail = localStorage.getItem("slo_user_email");
      if (fallbackEmail) mergedHeaders["x-app-user-email"] = String(fallbackEmail);
    }
    if (!mergedHeaders["x-app-user-name"]) {
      const fallbackName = localStorage.getItem("slo_user_name");
      if (fallbackName) mergedHeaders["x-app-user-name"] = String(fallbackName);
    }
  }

  const response = await fetch(withApiBase(path), {
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
