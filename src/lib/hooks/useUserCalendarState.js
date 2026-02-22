import { useCallback, useEffect, useMemo, useState } from "react";
import {
  bootstrapBackendUser,
  getBackendUserState,
  linkBackendGoogleCalendar,
  updateBackendUserPreferences,
} from "../api/backend";

const DEFAULT_TIMEZONE = "America/Los_Angeles";

const DEFAULT_PREFERENCES = {
  price_max: "$$$",
  distance_max_m: 3500,
  diet_tags: [],
  event_tags: [],
  favorite_categories: [],
};

const EMPTY_STATE = {
  user: null,
  preferences: { ...DEFAULT_PREFERENCES },
  connections: null,
  availability: [],
  calendarStatus: {
    status: "disconnected",
    provider: null,
    last_sync_at: null,
  },
  syncedAt: null,
  eventsCount: 0,
  lastAction: null,
};

function normalizeContext(userContext) {
  return {
    user_id: String(userContext?.user_id || userContext?.id || "").trim(),
    email: String(userContext?.email || "").trim().toLowerCase(),
    name: String(userContext?.name || userContext?.display_name || userContext?.username || "").trim(),
    timezone: String(userContext?.timezone || DEFAULT_TIMEZONE).trim() || DEFAULT_TIMEZONE,
  };
}

function mapAvailability(rows) {
  return (Array.isArray(rows) ? rows : [])
    .map((row) => ({
      window_id: String(row.window_id || row.id || crypto.randomUUID()),
      user_id: String(row.user_id || ""),
      start_ts: String(row.start_ts || row.start_at || ""),
      end_ts: String(row.end_ts || row.end_at || ""),
      source: String(row.source || "manual"),
    }))
    .filter((row) => row.user_id && row.start_ts && row.end_ts)
    .sort((a, b) => new Date(a.start_ts).getTime() - new Date(b.start_ts).getTime());
}

function mapState(payload, fallbackContext) {
  const user = payload?.user
    ? {
      user_id: String(payload.user.user_id || payload.user.id || ""),
      email: String(payload.user.email || fallbackContext?.email || ""),
      name: String(payload.user.name || payload.user.display_name || fallbackContext?.name || ""),
      timezone: String(payload.user.timezone || fallbackContext?.timezone || DEFAULT_TIMEZONE),
    }
    : null;

  const preferences = {
    ...DEFAULT_PREFERENCES,
    ...(payload?.preferences || {}),
    diet_tags: Array.isArray(payload?.preferences?.diet_tags) ? payload.preferences.diet_tags : [],
    event_tags: Array.isArray(payload?.preferences?.event_tags) ? payload.preferences.event_tags : [],
    favorite_categories: Array.isArray(payload?.preferences?.favorite_categories)
      ? payload.preferences.favorite_categories
      : [],
  };

  const connections = payload?.connections || null;
  const inferredCalendarStatus = {
    status:
      connections && (connections.calendar_google_connected || connections.calendar_ics_connected)
        ? "connected"
        : "disconnected",
    provider: connections?.calendar_google_connected ? "google" : null,
    last_sync_at: connections?.last_calendar_sync_at || null,
  };

  return {
    user,
    preferences,
    connections,
    availability: mapAvailability(payload?.availability),
    calendarStatus: payload?.calendarStatus || inferredCalendarStatus,
    syncedAt: payload?.syncedAt || payload?.calendarStatus?.last_sync_at || inferredCalendarStatus.last_sync_at || null,
    eventsCount: Number(payload?.eventsCount || payload?.events_count || 0),
    lastAction: payload?.lastAction || null,
  };
}

export async function syncMockGoogleCalendarForUser(userContext) {
  const normalized = normalizeContext(userContext);
  if (!normalized.email && !normalized.user_id) {
    throw new Error("Missing user identity (email or user_id).");
  }

  const bootstrap = await bootstrapBackendUser(normalized, {
    syncCalendar: true,
    syncSupabase: true,
  });

  const userId = String(bootstrap?.user_id || bootstrap?.state?.user?.user_id || normalized.user_id || "").trim();
  if (!userId) {
    throw new Error("Could not resolve backend user.");
  }

  await linkBackendGoogleCalendar(userId, { timezone: normalized.timezone });
  const state = await getBackendUserState(userId);

  return {
    profile_id: userId,
    connected: state?.calendarStatus?.status === "connected",
    synced_at: state?.syncedAt || state?.calendarStatus?.last_sync_at || new Date().toISOString(),
  };
}

export function useUserCalendarState(userContext) {
  const [data, setData] = useState(EMPTY_STATE);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [refreshNonce, setRefreshNonce] = useState(0);

  const normalizedContext = useMemo(() => normalizeContext(userContext), [userContext]);

  const load = useCallback(async () => {
    if (!normalizedContext.email && !normalizedContext.user_id) {
      setData(EMPTY_STATE);
      setError("");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const bootstrap = await bootstrapBackendUser(normalizedContext, {
        syncCalendar: false,
        syncSupabase: true,
      });
      const resolvedUserId = String(
        bootstrap?.user_id || bootstrap?.state?.user?.user_id || normalizedContext.user_id || "",
      ).trim();

      if (!resolvedUserId) {
        throw new Error("Could not resolve backend user.");
      }

      const statePayload = bootstrap?.state || (await getBackendUserState(resolvedUserId));
      setData(mapState(statePayload, normalizedContext));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load calendar state.");
      setData(EMPTY_STATE);
    } finally {
      setIsLoading(false);
    }
  }, [normalizedContext]);

  useEffect(() => {
    load();
  }, [load, refreshNonce]);

  const refresh = useCallback(() => {
    setRefreshNonce((count) => count + 1);
  }, []);

  const savePreferences = useCallback(
    async (payload) => {
      const userId = data?.user?.user_id || normalizedContext.user_id;
      if (!userId) {
        throw new Error("Cannot save preferences without a user.");
      }
      await updateBackendUserPreferences(userId, payload || {});
      refresh();
    },
    [data?.user?.user_id, normalizedContext.user_id, refresh],
  );

  const linkGoogleCalendar = useCallback(async () => {
    const userId = data?.user?.user_id || normalizedContext.user_id;
    if (!userId) {
      throw new Error("Cannot link calendar without a user.");
    }

    await linkBackendGoogleCalendar(userId, { timezone: normalizedContext.timezone });
    refresh();
  }, [data?.user?.user_id, normalizedContext.user_id, normalizedContext.timezone, refresh]);

  return {
    data,
    isLoading,
    error,
    refresh,
    savePreferences,
    linkGoogleCalendar,
  };
}
