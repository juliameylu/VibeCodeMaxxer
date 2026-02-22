import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  apiFetch,
  clearPendingRedirect,
  clearSessionToken,
  getPendingRedirect,
  saveSessionToken,
  setPendingRedirect
} from "../apiClient";

const AuthContext = createContext(null);
const GUEST_CREDENTIALS_KEY = "slo_guest_credentials";
const USER_ID_KEY = "slo_user_id";

function setActiveUserId(user) {
  if (user?.id) {
    localStorage.setItem(USER_ID_KEY, user.id);
  } else {
    localStorage.removeItem(USER_ID_KEY);
  }
  window.dispatchEvent(new Event("slo-auth-changed"));
}

function getGuestCredentials() {
  const raw = localStorage.getItem(GUEST_CREDENTIALS_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveGuestCredentials(credentials) {
  localStorage.setItem(GUEST_CREDENTIALS_KEY, JSON.stringify(credentials));
}

function clearGuestCredentials() {
  localStorage.removeItem(GUEST_CREDENTIALS_KEY);
}

function createGuestCredentials() {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    email: `guest-${suffix}@guest.local`,
    password: `guest-${Math.random().toString(36).slice(2, 12)}`,
    displayName: "Guest"
  };
}

export function AuthProvider({ children }) {
  const [loading, setLoading] = useState(true);
  const [sessionToken, setSessionToken] = useState(localStorage.getItem("slo_session_token") || "");
  const [user, setUser] = useState(null);
  const [preferences, setPreferences] = useState(null);
  const [connections, setConnections] = useState(null);
  const [badges, setBadges] = useState({ calendar: false, canvas: false });

  useEffect(() => {
    let active = true;

    async function authenticateGuest() {
      const credentials = getGuestCredentials();
      if (!credentials) return false;

      try {
        let data;
        try {
          data = await apiFetch("/api/auth/signin", {
            method: "POST",
            body: { email: credentials.email, password: credentials.password },
            withAuth: false
          });
        } catch {
          data = await apiFetch("/api/auth/signup", {
            method: "POST",
            body: {
              email: credentials.email,
              password: credentials.password,
              displayName: credentials.displayName || "Guest"
            },
            withAuth: false
          });
        }

        if (!active) return false;
        saveSessionToken(data.sessionToken);
        setSessionToken(data.sessionToken);
        setUser(data.user || null);
        setActiveUserId(data.user || null);
        return true;
      } catch {
        return false;
      }
    }

    async function bootstrap() {
      try {
        if (!sessionToken) {
          await authenticateGuest();
          return;
        }
        const data = await apiFetch("/api/auth/session-bootstrap", {
          method: "POST",
          body: {
            sessionToken,
            pendingRedirect: getPendingRedirect()
          },
          withAuth: false
        });

        if (!active) return;
        if (!data.authenticated) {
          clearSessionToken();
          setSessionToken("");
          setUser(null);
          setActiveUserId(null);
          await authenticateGuest();
          return;
        }

        setUser(data.user || null);
        setActiveUserId(data.user || null);
        setPreferences(data.preferences || null);
        setConnections(data.connections || null);
        setBadges(data.badges || { calendar: false, canvas: false });
      } catch {
        clearSessionToken();
        setSessionToken("");
        setUser(null);
        setActiveUserId(null);
      } finally {
        if (active) setLoading(false);
      }
    }

    bootstrap();
    if (!sessionToken) setLoading(false);

    return () => {
      active = false;
    };
  }, [sessionToken]);

  const value = useMemo(
    () => ({
      loading,
      sessionToken,
      user,
      preferences,
      connections,
      badges,
      isAuthenticated: Boolean(user),
      isOnboardingComplete: Boolean(user?.onboarding_complete),
      async signUp({ email, password, displayName }) {
        const data = await apiFetch("/api/auth/signup", {
          method: "POST",
          body: { email, password, displayName },
          withAuth: false
        });

        saveSessionToken(data.sessionToken);
        setSessionToken(data.sessionToken);
        setUser(data.user);
        setActiveUserId(data.user);
        return data.user;
      },
      async signIn({ email, password }) {
        const data = await apiFetch("/api/auth/signin", {
          method: "POST",
          body: { email, password },
          withAuth: false
        });

        saveSessionToken(data.sessionToken);
        setSessionToken(data.sessionToken);
        setUser(data.user);
        setActiveUserId(data.user);
        return data.user;
      },
      async continueAsGuest() {
        const existing = getGuestCredentials();
        const credentials = existing || createGuestCredentials();
        if (!existing) {
          saveGuestCredentials(credentials);
        }

        try {
          const signedIn = await apiFetch("/api/auth/signin", {
            method: "POST",
            body: { email: credentials.email, password: credentials.password },
            withAuth: false
          });
          saveSessionToken(signedIn.sessionToken);
          setSessionToken(signedIn.sessionToken);
          setUser(signedIn.user);
          setActiveUserId(signedIn.user);
          return signedIn.user;
        } catch {
          const signedUp = await apiFetch("/api/auth/signup", {
            method: "POST",
            body: {
              email: credentials.email,
              password: credentials.password,
              displayName: credentials.displayName || "Guest"
            },
            withAuth: false
          });
          saveSessionToken(signedUp.sessionToken);
          setSessionToken(signedUp.sessionToken);
          setUser(signedUp.user);
          setActiveUserId(signedUp.user);
          return signedUp.user;
        }
      },
      signOut() {
        clearSessionToken();
        clearGuestCredentials();
        setSessionToken("");
        setUser(null);
        setActiveUserId(null);
        setPreferences(null);
        setConnections(null);
        setBadges({ calendar: false, canvas: false });
      },
      async savePreferences(next) {
        const data = await apiFetch("/api/preferences", {
          method: "POST",
          body: next
        });
        setPreferences(data.preferences);
        setUser((prev) => (prev ? { ...prev, onboarding_complete: data.onboarding_complete } : prev));
      },
      updateConnections(next) {
        setConnections(next);
        setBadges({
          calendar: Boolean(next?.calendar_google_connected || next?.calendar_ics_connected),
          canvas: Boolean(next?.canvas_connected)
        });
      },
      setPendingRedirect(path) {
        setPendingRedirect(path);
      },
      consumePendingRedirect() {
        const redirectPath = getPendingRedirect();
        clearPendingRedirect();
        return redirectPath;
      }
    }),
    [loading, sessionToken, user, preferences, connections, badges]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
