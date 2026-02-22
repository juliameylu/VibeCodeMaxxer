import { Router } from "express";
import { nextCalendarAccountId, nextOauthState, nextWindowId, shortStableSuffix } from "../store/ids.js";
import { memoryStore } from "../store/memoryStore.js";
import { isIsoUtc, nowIsoUtc } from "../store/time.js";
import type { AvailabilityWindow, CalendarProvider, GoogleCalendarEvent } from "../store/types.js";

const router = Router();
const VALID_PROVIDERS = new Set<CalendarProvider>(["google", "apple", "microsoft"]);

function ensureUser(userId: string) {
  return memoryStore.users.has(userId);
}

function userSeed(userId: string) {
  return userId.split("").reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
}

function generateDeterministicGoogleEvents(userId: string, timezone: string): GoogleCalendarEvent[] {
  const seed = userSeed(userId);
  const now = new Date();
  const events: GoogleCalendarEvent[] = [];

  const templates = [
    { summary: "CS Study Group", location: "Kennedy Library", startHour: 18, durationMinutes: 90 },
    { summary: "Gym Session", location: "Rec Center", startHour: 20, durationMinutes: 60 },
    { summary: "Club Meeting", location: "UU Plaza", startHour: 17, durationMinutes: 75 },
    { summary: "Project Work Block", location: "Engineering East", startHour: 19, durationMinutes: 120 },
  ];

  for (let dayOffset = 0; dayOffset < 7; dayOffset += 1) {
    const eventCount = 2 + ((seed + dayOffset) % 2);
    for (let i = 0; i < eventCount; i += 1) {
      const template = templates[(seed + dayOffset + i) % templates.length];
      const start = new Date(now);
      start.setUTCDate(now.getUTCDate() + dayOffset);
      start.setUTCHours(template.startHour + ((seed + i) % 2), (i % 2) * 15, 0, 0);

      const end = new Date(start);
      end.setUTCMinutes(end.getUTCMinutes() + template.durationMinutes);

      const id = `evt_${shortStableSuffix(`${userId}_${dayOffset}_${i}_${template.summary}`)}`;
      const createdAt = nowIsoUtc();

      events.push({
        kind: "calendar#event",
        etag: `"${shortStableSuffix(`${id}_etag`)}"`,
        id,
        status: "confirmed",
        htmlLink: `https://calendar.google.com/calendar/event?eid=${id}`,
        created: createdAt,
        updated: createdAt,
        summary: template.summary,
        description: `Mock synced event for ${userId}`,
        location: template.location,
        creator: {
          email: `${userId}@example.local`,
          self: true,
        },
        organizer: {
          email: `${userId}@example.local`,
          self: true,
        },
        start: {
          dateTime: start.toISOString(),
          timeZone: timezone,
        },
        end: {
          dateTime: end.toISOString(),
          timeZone: timezone,
        },
        iCalUID: `${id}@mock.calendar`,
        sequence: 0,
        reminders: {
          useDefault: true,
        },
        eventType: "default",
      });
    }
  }

  return events.sort(
    (a, b) => new Date(a.start.dateTime).getTime() - new Date(b.start.dateTime).getTime(),
  );
}

function deriveAvailabilityWindowsFromEvents(userId: string, events: GoogleCalendarEvent[]): AvailabilityWindow[] {
  const windows: AvailabilityWindow[] = [];
  const now = new Date();

  for (let dayOffset = 0; dayOffset < 7; dayOffset += 1) {
    const dayStart = new Date(now);
    dayStart.setUTCDate(now.getUTCDate() + dayOffset);
    dayStart.setUTCHours(17, 0, 0, 0);

    const dayEnd = new Date(dayStart);
    dayEnd.setUTCHours(23, 0, 0, 0);

    const dayBusy = events
      .map((event) => ({
        start: new Date(event.start.dateTime),
        end: new Date(event.end.dateTime),
      }))
      .filter((block) => block.end > dayStart && block.start < dayEnd)
      .sort((a, b) => a.start.getTime() - b.start.getTime());

    let cursor = new Date(dayStart);

    dayBusy.forEach((block) => {
      if (block.start > cursor) {
        windows.push({
          window_id: nextWindowId(),
          user_id: userId,
          start_ts: cursor.toISOString(),
          end_ts: block.start.toISOString(),
          source: "calendar_sync",
        });
      }
      if (block.end > cursor) {
        cursor = new Date(block.end);
      }
    });

    if (cursor < dayEnd) {
      windows.push({
        window_id: nextWindowId(),
        user_id: userId,
        start_ts: cursor.toISOString(),
        end_ts: dayEnd.toISOString(),
        source: "calendar_sync",
      });
    }
  }

  return windows;
}

router.post("/api/calendar/connect", (req, res) => {
  const { user_id: userId, provider } = req.body ?? {};

  if (!userId || typeof userId !== "string" || !userId.startsWith("u_")) {
    res.status(400).json({ error: "Valid user_id is required" });
    return;
  }

  if (!ensureUser(userId)) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (!provider || typeof provider !== "string" || !VALID_PROVIDERS.has(provider as CalendarProvider)) {
    res.status(400).json({ error: "provider must be one of google, apple, microsoft" });
    return;
  }

  const state = nextOauthState();
  memoryStore.oauthStates.set(state, {
    user_id: userId,
    provider: provider as CalendarProvider,
    created_at: nowIsoUtc(),
  });

  res.json({
    auth_url: `http://localhost:3001/mock-oauth/${provider}?state=${state}`,
    state,
  });
});

router.post("/api/calendar/callback", (req, res) => {
  const { state, code } = req.body ?? {};
  if (!state || typeof state !== "string") {
    res.status(400).json({ error: "state is required" });
    return;
  }

  if (!code || typeof code !== "string") {
    res.status(400).json({ error: "code is required" });
    return;
  }

  const oauthState = memoryStore.oauthStates.get(state);
  if (!oauthState) {
    res.status(400).json({ error: "Invalid oauth state" });
    return;
  }

  const existing = memoryStore.calendarAccounts.get(oauthState.user_id);
  const now = nowIsoUtc();

  const account = {
    calendar_account_id: existing?.calendar_account_id ?? nextCalendarAccountId(),
    user_id: oauthState.user_id,
    provider: oauthState.provider,
    provider_user_ref: `mock_${oauthState.provider}_user_${shortStableSuffix(oauthState.user_id)}`,
    status: "connected" as const,
    scopes: ["calendar.readonly"],
    last_sync_at: existing?.last_sync_at ?? null,
    created_at: existing?.created_at ?? now,
  };

  memoryStore.calendarAccounts.set(oauthState.user_id, account);
  memoryStore.oauthStates.delete(state);

  res.json({
    user_id: oauthState.user_id,
    provider: oauthState.provider,
    status: "connected",
  });
});

router.post("/api/calendar/sync", (req, res) => {
  const { user_id: userId } = req.body ?? {};
  if (!userId || typeof userId !== "string" || !userId.startsWith("u_")) {
    res.status(400).json({ error: "Valid user_id is required" });
    return;
  }

  const account = memoryStore.calendarAccounts.get(userId);
  if (!account || account.status !== "connected") {
    res.status(400).json({ error: "Calendar account is not connected" });
    return;
  }

  const user = memoryStore.users.get(userId);
  const timezone = user?.timezone || "America/Los_Angeles";
  const events = generateDeterministicGoogleEvents(userId, timezone);
  const windows = deriveAvailabilityWindowsFromEvents(userId, events);

  memoryStore.googleCalendarEvents.set(userId, events);
  memoryStore.availabilityWindows.set(userId, windows);

  const now = nowIsoUtc();
  memoryStore.calendarAccounts.set(userId, {
    ...account,
    last_sync_at: now,
  });

  res.json({
    user_id: userId,
    synced_events: events.length,
    last_sync_at: now,
  });
});

router.get("/api/calendar/events/:user_id", (req, res) => {
  const { user_id: userId } = req.params;
  if (!userId.startsWith("u_")) {
    res.status(400).json({ error: "Invalid user_id format" });
    return;
  }

  const events = memoryStore.googleCalendarEvents.get(userId) ?? [];
  res.json({
    kind: "calendar#events",
    summary: "Mock Google Calendar",
    updated: nowIsoUtc(),
    items: events,
  });
});

router.get("/api/calendar/status/:user_id", (req, res) => {
  const { user_id: userId } = req.params;
  if (!userId.startsWith("u_")) {
    res.status(400).json({ error: "Invalid user_id format" });
    return;
  }

  const account = memoryStore.calendarAccounts.get(userId);
  if (!account) {
    res.json({
      user_id: userId,
      provider: null,
      status: "disconnected",
      last_sync_at: null,
    });
    return;
  }

  res.json({
    user_id: userId,
    provider: account.provider,
    status: account.status,
    last_sync_at: account.last_sync_at,
  });
});

router.get("/api/availability/:user_id", (req, res) => {
  const { user_id: userId } = req.params;
  const { start_ts: startTs, end_ts: endTs } = req.query;

  if (!userId.startsWith("u_")) {
    res.status(400).json({ error: "Invalid user_id format" });
    return;
  }

  if (startTs && (typeof startTs !== "string" || !isIsoUtc(startTs))) {
    res.status(400).json({ error: "start_ts must be UTC ISO-8601" });
    return;
  }

  if (endTs && (typeof endTs !== "string" || !isIsoUtc(endTs))) {
    res.status(400).json({ error: "end_ts must be UTC ISO-8601" });
    return;
  }

  const windows = memoryStore.availabilityWindows.get(userId) ?? [];

  const filtered = windows.filter((window) => {
    const start = new Date(window.start_ts).getTime();
    const end = new Date(window.end_ts).getTime();

    if (startTs && end < new Date(startTs).getTime()) return false;
    if (endTs && start > new Date(endTs).getTime()) return false;

    return true;
  });

  res.json({
    user_id: userId,
    windows: filtered,
  });
});

export default router;
