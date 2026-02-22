const SESSION_KEY = "slo_day_session_v1";

export function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setSession(user) {
  const session = {
    user_id: user.id,
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
