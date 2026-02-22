import { HttpError, httpGetJson } from "./http";

async function postJson(path, body) {
  let response;
  try {
    response = await fetch(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body || {}),
    });
  } catch (error) {
    throw new HttpError("Network request failed. Please try again.", 0, error);
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new HttpError(
      payload?.error || payload?.message || `Request failed with status ${response.status}`,
      response.status,
      payload,
    );
  }

  return payload;
}

async function putJson(path, body) {
  let response;
  try {
    response = await fetch(path, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body || {}),
    });
  } catch (error) {
    throw new HttpError("Network request failed. Please try again.", 0, error);
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new HttpError(
      payload?.error || payload?.message || `Request failed with status ${response.status}`,
      response.status,
      payload,
    );
  }

  return payload;
}

export function getMockReservationAvailability({
  restaurantId,
  restaurantName = "Restaurant",
  date,
}) {
  const query = new URLSearchParams({
    restaurant_id: String(restaurantId || ""),
    restaurant_name: String(restaurantName || "Restaurant"),
  });

  if (date) {
    query.set("date", String(date));
  }

  return httpGetJson(`/api/mock-reservations/availability?${query.toString()}`);
}

export function bookMockReservation(payload) {
  return postJson("/api/mock-reservations/book", payload);
}

export function listMockReservations(userId) {
  return httpGetJson(`/api/mock-reservations/${encodeURIComponent(String(userId || ""))}`);
}

export function bootstrapBackendUser(userContext, options = {}) {
  return postJson("/api/users/bootstrap", {
    user_id: userContext?.user_id || userContext?.id || "",
    email: userContext?.email || "",
    name: userContext?.name || userContext?.display_name || userContext?.username || "",
    timezone: userContext?.timezone || "America/Los_Angeles",
    sync_calendar: Boolean(options.syncCalendar),
    sync_supabase: options.syncSupabase !== false,
    preferences: options.preferences || undefined,
  });
}

export function getBackendUserState(userId) {
  return httpGetJson(`/api/users/${encodeURIComponent(String(userId || ""))}/state`);
}

export function listBackendUsers() {
  return httpGetJson("/api/users");
}

export function updateBackendUserPreferences(userId, payload) {
  return putJson(`/api/users/${encodeURIComponent(String(userId || ""))}/preferences`, payload || {});
}

export function linkBackendGoogleCalendar(userId, payload = {}) {
  return postJson(`/api/users/${encodeURIComponent(String(userId || ""))}/calendar/link-google`, payload);
}

export function getUserAvailabilityOverlap(userId, otherUserId, params = {}) {
  const query = new URLSearchParams();
  if (params.start_ts) query.set("start_ts", String(params.start_ts));
  if (params.end_ts) query.set("end_ts", String(params.end_ts));
  if (params.min_duration_min) query.set("min_duration_min", String(params.min_duration_min));
  if (params.limit) query.set("limit", String(params.limit));

  const suffix = query.toString() ? `?${query.toString()}` : "";
  return httpGetJson(
    `/api/users/${encodeURIComponent(String(userId || ""))}/overlap/${encodeURIComponent(String(otherUserId || ""))}${suffix}`,
  );
}

export function getBackendSystemState() {
  return httpGetJson("/api/backend/state");
}

export function listBackendEndpoints() {
  return httpGetJson("/api/backend/endpoints");
}

export function resetSupabaseAndSeed({ seed = true } = {}) {
  return postJson("/api/admin/supabase/reset", {
    confirm: "RESET_SUPABASE",
    seed,
  });
}
