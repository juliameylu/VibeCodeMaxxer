import { MOCK_USERS } from "./mockUsers";

const SESSION_KEY = "slo_day_session_v1";

export function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);

    if (!parsed) return null;

    const match =
      MOCK_USERS.find((user) => user.username === parsed.username)
      || MOCK_USERS.find((user) => user.email === parsed.email);

    // Backward compatibility for older sessions that used username as user_id.
    if (match && (!parsed.user_id || parsed.user_id === match.username)) {
      const upgraded = {
        ...parsed,
        user_id: match.user_id,
        user_name: parsed.user_name || match.username,
        name: parsed.name || match.name,
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(upgraded));
      return upgraded;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function setSession(user) {
  const session = {
    user_id: user.user_id,
    user_name: user.username,
    username: user.username,
    name: user.name,
    email: user.email,
    timezone: user.timezone,
    logged_in_at: new Date().toISOString(),
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}
