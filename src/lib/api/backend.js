import { HttpError } from "./http";

const BACKEND_BASE_URL =
  import.meta.env.VITE_BACKEND_BASE_URL || "http://localhost:3001";

async function backendRequest(path, options = {}) {
  let response;

  try {
    response = await fetch(`${BACKEND_BASE_URL}${path}`, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(options.headers || {}),
      },
      ...options,
    });
  } catch (error) {
    throw new HttpError(
      "Could not reach backend. Start server at http://localhost:3001.",
      0,
      error,
    );
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new HttpError(
      payload?.error || `Backend request failed (${response.status})`,
      response.status,
      payload,
    );
  }

  return payload;
}

export async function createOrGetUser({ email, timezone }) {
  return backendRequest("/api/users", {
    method: "POST",
    body: JSON.stringify({ email, timezone }),
  });
}

export async function getPreferences(userId) {
  return backendRequest(`/api/preferences/${userId}`);
}

export async function updatePreferences(userId, payload) {
  return backendRequest(`/api/preferences/${userId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function connectCalendar(userId, provider = "google") {
  return backendRequest("/api/calendar/connect", {
    method: "POST",
    body: JSON.stringify({ user_id: userId, provider }),
  });
}

export async function callbackCalendar(state) {
  return backendRequest("/api/calendar/callback", {
    method: "POST",
    body: JSON.stringify({ state, code: "mock_oauth_code" }),
  });
}

export async function syncCalendar(userId) {
  return backendRequest("/api/calendar/sync", {
    method: "POST",
    body: JSON.stringify({ user_id: userId }),
  });
}

export async function getCalendarStatus(userId) {
  return backendRequest(`/api/calendar/status/${userId}`);
}

export async function getAvailability(userId, startTs, endTs) {
  const search = new URLSearchParams();
  if (startTs) search.set("start_ts", startTs);
  if (endTs) search.set("end_ts", endTs);
  const query = search.toString();
  const suffix = query ? `?${query}` : "";
  return backendRequest(`/api/availability/${userId}${suffix}`);
}

export async function getCalendarEvents(userId) {
  return backendRequest(`/api/calendar/events/${userId}`);
}

export async function getMockReservationAvailability({
  userId,
  restaurantId,
  restaurantName,
  date,
}) {
  const search = new URLSearchParams();
  if (userId) search.set("user_id", userId);
  search.set("restaurant_id", restaurantId);
  if (restaurantName) search.set("restaurant_name", restaurantName);
  if (date) search.set("date", date);
  return backendRequest(`/api/mock-reservations/availability?${search.toString()}`);
}

export async function bookMockReservation(payload) {
  return backendRequest("/api/mock-reservations/book", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getMockReservations(userId) {
  return backendRequest(`/api/mock-reservations/${userId}`);
}
