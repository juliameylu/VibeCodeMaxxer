import { useCallback, useEffect, useState } from "react";
import {
  callbackCalendar,
  connectCalendar,
  createOrGetUser,
  getCalendarEvents,
  getAvailability,
  getCalendarStatus,
  getPreferences,
  syncCalendar,
  updatePreferences,
} from "../api/backend";

function nextSevenDayWindow() {
  const start = new Date();
  const end = new Date();
  end.setDate(end.getDate() + 7);
  return {
    startTs: start.toISOString(),
    endTs: end.toISOString(),
  };
}

export function useUserCalendarState(selectedUser) {
  const userEmail = selectedUser?.email || "";
  const userTimezone = selectedUser?.timezone || "";

  const [data, setData] = useState({
    user: null,
    preferences: null,
    calendarStatus: null,
    availability: [],
    syncedAt: null,
    eventsCount: 0,
    lastAction: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const runLinkFlow = useCallback(async (user) => {
    setData((prev) => ({ ...prev, lastAction: "Connecting calendar..." }));
    const connect = await connectCalendar(user.user_id, "google");
    setData((prev) => ({ ...prev, lastAction: "Running callback..." }));
    await callbackCalendar(connect.state);
    setData((prev) => ({ ...prev, lastAction: "Syncing calendar..." }));
    const sync = await syncCalendar(user.user_id);
    return sync;
  }, []);

  const load = useCallback(async () => {
    if (!userEmail || !userTimezone) {
      setData({
        user: null,
        preferences: null,
        calendarStatus: null,
        availability: [],
        syncedAt: null,
        eventsCount: 0,
        lastAction: "",
      });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const user = await createOrGetUser({
        email: userEmail,
        timezone: userTimezone,
      });

      const prefs = await getPreferences(user.user_id);
      let status = await getCalendarStatus(user.user_id);
      let syncedAt = status?.last_sync_at || null;

      if (status?.status !== "connected") {
        const sync = await runLinkFlow(user);
        status = await getCalendarStatus(user.user_id);
        syncedAt = sync.last_sync_at || status?.last_sync_at || null;
      }

      let availability = { windows: [] };
      let eventsCount = 0;
      if (status?.status === "connected") {
        const { startTs, endTs } = nextSevenDayWindow();
        availability = await getAvailability(user.user_id, startTs, endTs);
        const events = await getCalendarEvents(user.user_id);
        eventsCount = Array.isArray(events?.items) ? events.items.length : 0;
      }

      setData({
        user,
        preferences: prefs,
        calendarStatus: status,
        availability: availability.windows || [],
        syncedAt,
        eventsCount,
        lastAction: "Loaded user state",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load user state.");
      setData({
        user: null,
        preferences: null,
        calendarStatus: null,
        availability: [],
        syncedAt: null,
        eventsCount: 0,
        lastAction: "",
      });
    } finally {
      setIsLoading(false);
    }
  }, [userEmail, userTimezone, runLinkFlow]);

  const linkGoogleCalendar = useCallback(async () => {
    if (!userEmail || !userTimezone) return;

    setIsLoading(true);
    setError("");

    try {
      setData((prev) => ({ ...prev, lastAction: "Creating user..." }));
      const user = data.user || (await createOrGetUser({
        email: userEmail,
        timezone: userTimezone,
      }));

      const sync = await runLinkFlow(user);
      setData((prev) => ({ ...prev, lastAction: "Fetching status + windows..." }));
      const status = await getCalendarStatus(user.user_id);
      const { startTs, endTs } = nextSevenDayWindow();
      const availability = await getAvailability(user.user_id, startTs, endTs);
      const events = await getCalendarEvents(user.user_id);
      const eventsCount = Array.isArray(events?.items) ? events.items.length : 0;

      setData((prev) => ({
        ...prev,
        user,
        calendarStatus: status,
        availability: availability.windows || [],
        syncedAt: sync.last_sync_at,
        eventsCount,
        lastAction: "Calendar linked and synced",
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to link calendar.");
    } finally {
      setIsLoading(false);
    }
  }, [userEmail, userTimezone, data.user, runLinkFlow]);

  const savePreferences = useCallback(async (payload) => {
    if (!userEmail || !userTimezone) {
      throw new Error("User context is missing.");
    }

    setError("");
    const user =
      data.user ||
      (await createOrGetUser({
        email: userEmail,
        timezone: userTimezone,
      }));

    const next = await updatePreferences(user.user_id, payload);
    setData((prev) => ({
      ...prev,
      user,
      preferences: next,
      lastAction: "Updated preferences",
    }));
    return next;
  }, [userEmail, userTimezone, data.user]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    data,
    isLoading,
    error,
    refresh: load,
    linkGoogleCalendar,
    savePreferences,
  };
}
