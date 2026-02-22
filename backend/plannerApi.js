import OpenAI from "openai";
import { randomUUID } from "crypto";

let openai = null;
const AI_CACHE_TTL_MS = 1000 * 60 * 2;
const AI_TIMEOUT_MS = 3200;
const aiResponseCache = new Map();

const NOW = () => new Date();

const store = {
  users: new Map(),
  sessions: new Map(),
  preferences: new Map(),
  connections: new Map(),
  calendarEvents: new Map(),
  userEventStates: [],
  groups: [],
  groupMembers: [],
  invites: [],
  plans: [],
  planParticipants: [],
  jams: [],
  jamMembers: [],
  notifications: [],
  studyTasks: [],
  availabilities: [],
  reservations: [],
  aiActionLogs: [],
  pendingActions: new Map(),
  reservationIntents: [],
  eventsCatalog: [
    {
      id: "event-brew-quiet",
      title: "The Brew Coffeehouse",
      category: "food",
      vibe: "chill",
      budget: "low",
      transport: "walk",
      when: "tonight",
      free: false,
      rating: 4.7,
      distanceMiles: 0.3,
      reasonTags: ["quiet", "study-break"],
      description: "Quiet indoor seating and late-afternoon coffee specials.",
      link: "/item/event-brew-quiet"
    },
    {
      id: "event-bishop-peak",
      title: "Bishop Peak Sunset Hike",
      category: "outdoor",
      vibe: "active",
      budget: "free",
      transport: "car",
      when: "weekend",
      free: true,
      rating: 4.8,
      distanceMiles: 2.1,
      reasonTags: ["outdoor", "reset"],
      description: "Moderate hike with sunset views over SLO.",
      link: "/item/event-bishop-peak"
    },
    {
      id: "event-mission-plaza",
      title: "Mission Plaza Walk",
      category: "indoor",
      vibe: "chill",
      budget: "free",
      transport: "walk",
      when: "today",
      free: true,
      rating: 4.5,
      distanceMiles: 0.8,
      reasonTags: ["quick", "decompress"],
      description: "Easy 25-minute walk to reset between study blocks.",
      link: "/item/event-mission-plaza"
    },
    {
      id: "event-fremont-show",
      title: "Fremont Theater Show",
      category: "concerts",
      vibe: "active",
      budget: "medium",
      transport: "car",
      when: "tonight",
      free: false,
      rating: 4.6,
      distanceMiles: 1.6,
      reasonTags: ["music", "social"],
      description: "Live show at Fremont Theater in downtown SLO.",
      link: "/item/event-fremont-show"
    },
    {
      id: "event-campus-talk",
      title: "Cal Poly Innovation Talk",
      category: "campus",
      vibe: "chill",
      budget: "free",
      transport: "walk",
      when: "today",
      free: true,
      rating: 4.2,
      distanceMiles: 0.2,
      reasonTags: ["campus", "networking"],
      description: "Campus guest speaker event in the evening.",
      link: "/item/event-campus-talk"
    }
  ]
};

const VALID_RESERVATION_TRANSITIONS = {
  pending: new Set(["confirmed", "cancelled"]),
  confirmed: new Set(),
  cancelled: new Set()
};

const DEFAULT_TIMEZONE = "America/Los_Angeles";

const DUMMY_USER_SEEDS = [
  {
    id: "6f0f8e72-8717-4b8d-a2ea-e2dca4e5f111",
    email: "faith@calpoly.edu",
    display_name: "Faith Johnson",
    password: "faith123",
    preferences: {
      categories: ["food", "outdoor", "campus"],
      vibe: "chill",
      budget: "medium",
      transport: "walk",
      price_max: "$$$",
      distance_max_m: 3600,
      diet_tags: ["dairy-free"],
      event_tags: ["music", "talks", "networking"],
      favorite_categories: ["coffee", "live-music", "late-night-study"],
    },
  },
  {
    id: "61fbbf57-b7c6-4ddd-aa9f-caf3afba2222",
    email: "maria@calpoly.edu",
    display_name: "Maria Lopez",
    password: "maria123",
    preferences: {
      categories: ["food", "community", "events"],
      vibe: "active",
      budget: "medium",
      transport: "bike",
      price_max: "$$",
      distance_max_m: 5200,
      diet_tags: ["vegetarian"],
      event_tags: ["community", "sports", "music"],
      favorite_categories: ["group-dinners", "markets", "campus-events"],
    },
  },
  {
    id: "3f1b578d-51e6-4f84-b0f5-9cf6d4dc3333",
    email: "devin@calpoly.edu",
    display_name: "Devin Patel",
    password: "devin123",
    preferences: {
      categories: ["events", "indoor", "campus"],
      vibe: "chill",
      budget: "low",
      transport: "walk",
      price_max: "$$",
      distance_max_m: 2800,
      diet_tags: [],
      event_tags: ["study", "talks", "hackathon"],
      favorite_categories: ["quiet-cafe", "study-late", "tech-events"],
    },
  },
];

function normalizePartySize(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 20) return null;
  return parsed;
}

function findReservationIntentById(id) {
  return store.reservationIntents.find((intent) => intent.id === id) || null;
}

function findReservationIntentByIdempotency({ userId, idempotencyKey }) {
  return (
    store.reservationIntents.find(
      (intent) => intent.userId === userId && intent.idempotencyKey === idempotencyKey
    ) || null
  );
}

function createNotification({ userId, type, title, message, entityType = null, entityId = null }) {
  const notification = {
    id: randomUUID(),
    user_id: userId,
    type,
    title,
    message,
    entity_type: entityType,
    entity_id: entityId,
    read: false,
    created_at: NOW().toISOString()
  };
  store.notifications.push(notification);
  return notification;
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeTimezone(value) {
  const tz = String(value || "").trim();
  return tz || DEFAULT_TIMEZONE;
}

function normalizeDisplayName(value, fallbackEmail = "") {
  const direct = String(value || "").trim();
  if (direct) return direct.slice(0, 80);

  const local = normalizeEmail(fallbackEmail).split("@")[0] || "Student";
  return local
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (ch) => ch.toUpperCase())
    .slice(0, 80);
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || "").trim(),
  );
}

function hashString(value) {
  const text = String(value || "");
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function toIsoOrNull(value) {
  const text = String(value || "").trim();
  if (!text) return null;
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function toIsoDate(value = NOW()) {
  return new Date(value).toISOString().slice(0, 10);
}

function getSupabaseConfig() {
  const url = String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "")
    .trim()
    .replace(/\/+$/g, "");
  const serviceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  const anonKey = String(process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "").trim();

  if (url && serviceRoleKey) {
    return { url, key: serviceRoleKey, source: "service_role" };
  }

  if (url && anonKey) {
    return { url, key: anonKey, source: "anon" };
  }

  return { url: "", key: "", source: "none" };
}

function hasSupabaseConfig(config) {
  return Boolean(config.url && config.key);
}

async function callSupabaseRest(config, pathWithQuery, init = {}) {
  const response = await fetch(`${config.url}/rest/v1/${pathWithQuery}`, {
    ...init,
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });

  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    const message =
      typeof payload === "object" && payload && "message" in payload
        ? String(payload.message || "Supabase REST request failed.")
        : typeof payload === "object" && payload && "error" in payload
          ? String(payload.error || "Supabase REST request failed.")
          : `Supabase REST request failed (${response.status})`;
    throw new Error(message);
  }

  return payload;
}

function findStoreUserByEmail(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  return [...store.users.values()].find((candidate) => normalizeEmail(candidate.email) === normalized) || null;
}

function ensureStoreUserFromContext({
  userId,
  email,
  displayName,
  timezone = DEFAULT_TIMEZONE,
  password = "",
  onboardingComplete = true,
}) {
  const normalizedEmail = normalizeEmail(email);
  const requestedUserId = String(userId || "").trim();

  let user = requestedUserId ? store.users.get(requestedUserId) : null;
  if (!user && normalizedEmail) {
    user = findStoreUserByEmail(normalizedEmail);
  }

  if (user) {
    user.email = normalizedEmail || user.email;
    user.display_name = normalizeDisplayName(displayName || user.display_name, user.email);
    user.cal_poly_email = user.email.endsWith("@calpoly.edu") ? user.email : "";
    user.onboarding_complete = Boolean(user.onboarding_complete || onboardingComplete);
    if (!user.password && password) user.password = String(password);
    if (!user.created_at) user.created_at = NOW().toISOString();
    return user;
  }

  if (!requestedUserId && !normalizedEmail) return null;

  const resolvedUserId = requestedUserId || (isUuid(normalizedEmail) ? normalizedEmail : randomUUID());
  const next = {
    id: resolvedUserId,
    email: normalizedEmail || `${resolvedUserId.slice(0, 8)}@local.mock`,
    display_name: normalizeDisplayName(displayName, normalizedEmail),
    cal_poly_email: normalizedEmail.endsWith("@calpoly.edu") ? normalizedEmail : "",
    onboarding_complete: Boolean(onboardingComplete),
    created_at: NOW().toISOString(),
    password: String(password || `mock-${resolvedUserId}`),
    timezone: normalizeTimezone(timezone),
  };

  store.users.set(next.id, next);
  getOrInitPreferences(next.id);
  getOrInitConnections(next.id);
  return next;
}

function getAppContextFromRequest(req) {
  const headerUserId = String(req.header("x-app-user-id") || "").trim();
  const headerEmail = normalizeEmail(req.header("x-app-user-email") || "");
  const headerName = String(req.header("x-app-user-name") || "").trim();
  const headerTimezone = String(req.header("x-app-user-timezone") || "").trim();

  const bodyUserId = String(req.body?.user_id || req.body?.userId || "").trim();
  const bodyEmail = normalizeEmail(req.body?.email || "");
  const bodyName = String(req.body?.name || req.body?.displayName || "").trim();
  const bodyTimezone = String(req.body?.timezone || "").trim();

  return {
    userId: headerUserId || bodyUserId,
    email: headerEmail || bodyEmail,
    displayName: headerName || bodyName,
    timezone: headerTimezone || bodyTimezone || DEFAULT_TIMEZONE,
  };
}

function requireSession(req, res) {
  const token = req.header("x-session-token") || req.body?.sessionToken || req.query?.sessionToken;
  if (token) {
    const userId = store.sessions.get(token);
    if (!userId) {
      res.status(401).json({ error: "Invalid session token" });
      return null;
    }

    const user = store.users.get(userId);
    if (!user) {
      res.status(401).json({ error: "Session user not found" });
      return null;
    }

    return { token, userId, user };
  }

  const context = getAppContextFromRequest(req);
  if (context.userId || context.email) {
    const user = ensureStoreUserFromContext({
      userId: context.userId,
      email: context.email,
      displayName: context.displayName,
      timezone: context.timezone,
      onboardingComplete: true,
    });

    if (user) {
      return { token: null, userId: user.id, user };
    }
  }

  const fingerprint = `${req.ip || "local"}|${req.header("user-agent") || "browser"}`;
  const hash = hashString(fingerprint).toString(16).padStart(12, "0").slice(-12);
  const guestUserId = `00000000-0000-4000-8000-${hash}`;
  const guest = ensureStoreUserFromContext({
    userId: guestUserId,
    email: `guest-${hash}@guest.local`,
    displayName: "Guest",
    timezone: DEFAULT_TIMEZONE,
    onboardingComplete: false,
  });

  if (guest) {
    return { token: null, userId: guest.id, user: guest };
  }

  res.status(401).json({ error: "Missing session token" });
  return null;
}

function getOrInitConnections(userId) {
  const existing = store.connections.get(userId);
  if (existing) return existing;
  const next = {
    user_id: userId,
    calendar_google_connected: false,
    calendar_ics_connected: false,
    canvas_connected: false,
    canvas_mode: null,
    last_calendar_sync_at: null,
    updated_at: NOW().toISOString()
  };
  store.connections.set(userId, next);
  return next;
}

function getOrInitPreferences(userId) {
  const existing = store.preferences.get(userId);
  if (existing) return existing;
  const next = {
    user_id: userId,
    categories: ["food", "outdoor", "campus"],
    vibe: "chill",
    budget: "medium",
    transport: "walk",
    price_max: "$$$",
    distance_max_m: 3500,
    diet_tags: [],
    event_tags: [],
    favorite_categories: [],
    updated_at: NOW().toISOString()
  };
  store.preferences.set(userId, next);
  return next;
}

function clampDistance(value, fallback = 3500) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isInteger(parsed) || parsed < 0) return fallback;
  return Math.min(30000, parsed);
}

function normalizePriceMax(value, fallback = "$$$") {
  const text = String(value || "").trim();
  if (["$", "$$", "$$$", "$$$$"].includes(text)) return text;
  return fallback;
}

function normalizeStringArray(value, limit = 24) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item || "").trim().toLowerCase())
    .filter(Boolean)
    .slice(0, limit);
}

function mergePreferencePayload(userId, payload = {}) {
  const current = getOrInitPreferences(userId);
  const next = {
    ...current,
    categories: Array.isArray(payload.categories)
      ? normalizeStringArray(payload.categories)
      : current.categories,
    vibe: payload.vibe ? String(payload.vibe).trim().toLowerCase() : current.vibe,
    budget: payload.budget ? String(payload.budget).trim().toLowerCase() : current.budget,
    transport: payload.transport ? String(payload.transport).trim().toLowerCase() : current.transport,
    price_max: normalizePriceMax(payload.price_max, current.price_max || "$$$"),
    distance_max_m:
      payload.distance_max_m !== undefined
        ? clampDistance(payload.distance_max_m, current.distance_max_m || 3500)
        : current.distance_max_m || 3500,
    diet_tags: Array.isArray(payload.diet_tags)
      ? normalizeStringArray(payload.diet_tags)
      : current.diet_tags || [],
    event_tags: Array.isArray(payload.event_tags)
      ? normalizeStringArray(payload.event_tags)
      : current.event_tags || [],
    favorite_categories: Array.isArray(payload.favorite_categories)
      ? normalizeStringArray(payload.favorite_categories)
      : current.favorite_categories || [],
    updated_at: NOW().toISOString(),
  };

  store.preferences.set(userId, next);
  return next;
}

function generateMockCalendarEventsForUser(userId, timezone = DEFAULT_TIMEZONE) {
  const seed = hashString(`${userId}_${timezone}`);
  const now = NOW();
  const templates = [
    { title: "CS Study Group", location: "Kennedy Library", hour: 18, durationMin: 90 },
    { title: "Rec Center Workout", location: "Rec Center", hour: 20, durationMin: 60 },
    { title: "Club Planning Meeting", location: "UU Plaza", hour: 17, durationMin: 75 },
    { title: "Project Work Session", location: "Engineering East", hour: 19, durationMin: 120 },
    { title: "Dinner with Friends", location: "Downtown SLO", hour: 21, durationMin: 75 },
  ];

  const events = [];
  for (let dayOffset = 0; dayOffset < 7; dayOffset += 1) {
    const eventCount = 2 + ((seed + dayOffset) % 2);
    for (let index = 0; index < eventCount; index += 1) {
      const template = templates[(seed + dayOffset + index) % templates.length];
      const start = new Date(now);
      start.setUTCDate(now.getUTCDate() + dayOffset);
      start.setUTCHours(template.hour + ((seed + index) % 2), ((seed + index * 3) % 2) * 15, 0, 0);

      const end = new Date(start);
      end.setUTCMinutes(end.getUTCMinutes() + template.durationMin);

      events.push({
        id: `cal_evt_${Math.abs(hashString(`${userId}_${dayOffset}_${index}_${template.title}`))
          .toString(36)
          .slice(0, 10)}`,
        user_id: userId,
        title: template.title,
        location: template.location,
        start_at: start.toISOString(),
        end_at: end.toISOString(),
        source: "google_calendar",
        timezone,
      });
    }
  }

  return events.sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
}

function deriveAvailabilityFromEvents(userId, events, source = "google_calendar") {
  const windows = [];
  const now = NOW();

  for (let dayOffset = 0; dayOffset < 7; dayOffset += 1) {
    const dayStart = new Date(now);
    dayStart.setUTCDate(now.getUTCDate() + dayOffset);
    dayStart.setUTCHours(17, 0, 0, 0);

    const dayEnd = new Date(dayStart);
    dayEnd.setUTCHours(23, 0, 0, 0);

    const busyBlocks = events
      .map((event) => ({
        start: new Date(event.start_at),
        end: new Date(event.end_at),
      }))
      .filter((event) => event.end > dayStart && event.start < dayEnd)
      .sort((a, b) => a.start.getTime() - b.start.getTime());

    let cursor = new Date(dayStart);
    busyBlocks.forEach((block) => {
      if (block.start > cursor) {
        windows.push({
          id: randomUUID(),
          user_id: userId,
          start_at: cursor.toISOString(),
          end_at: block.start.toISOString(),
          source,
          created_at: NOW().toISOString(),
        });
      }

      if (block.end > cursor) {
        cursor = new Date(block.end);
      }
    });

    if (cursor < dayEnd) {
      windows.push({
        id: randomUUID(),
        user_id: userId,
        start_at: cursor.toISOString(),
        end_at: dayEnd.toISOString(),
        source,
        created_at: NOW().toISOString(),
      });
    }
  }

  return windows;
}

function syncMockCalendarForUser(userId, timezone = DEFAULT_TIMEZONE) {
  const events = generateMockCalendarEventsForUser(userId, timezone);
  const windows = deriveAvailabilityFromEvents(userId, events, "google_calendar");
  const nowIso = NOW().toISOString();

  store.availabilities = store.availabilities.filter(
    (row) => !(row.user_id === userId && ["google_calendar", "calendar_sync", "mock_calendar"].includes(row.source)),
  );
  store.availabilities.push(...windows);
  store.calendarEvents.set(userId, events);

  const connections = getOrInitConnections(userId);
  connections.calendar_google_connected = true;
  connections.last_calendar_sync_at = nowIso;
  connections.updated_at = nowIso;
  store.connections.set(userId, connections);

  return {
    synced_at: nowIso,
    events_count: events.length,
    windows_count: windows.length,
  };
}

function getUserAvailability(userId, { startAt = null, endAt = null } = {}) {
  if (!store.users.get(userId)) {
    ensureStoreUserFromContext({
      userId,
      email: `${String(userId).replace(/[^a-z0-9._-]/gi, "").slice(0, 24) || "user"}@local.mock`,
      displayName: "Local User",
      timezone: DEFAULT_TIMEZONE,
      onboardingComplete: true,
    });
  }

  const normalizedStart = toIsoOrNull(startAt);
  const normalizedEnd = toIsoOrNull(endAt);

  const direct = store.availabilities
    .filter((row) => row.user_id === userId)
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());

  const rows = direct.length > 0 ? direct : (syncMockCalendarForUser(userId), store.availabilities.filter((row) => row.user_id === userId));

  return rows.filter((row) => {
    const start = new Date(row.start_at).getTime();
    const end = new Date(row.end_at).getTime();
    if (normalizedStart && end < new Date(normalizedStart).getTime()) return false;
    if (normalizedEnd && start > new Date(normalizedEnd).getTime()) return false;
    return true;
  });
}

function intersectWindowSets(left, right) {
  const intersections = [];

  left.forEach((a) => {
    const aStart = new Date(a.start_at).getTime();
    const aEnd = new Date(a.end_at).getTime();

    right.forEach((b) => {
      const bStart = new Date(b.start_at).getTime();
      const bEnd = new Date(b.end_at).getTime();

      const start = Math.max(aStart, bStart);
      const end = Math.min(aEnd, bEnd);

      if (start < end) {
        intersections.push({
          id: `ov_${Math.abs(hashString(`${a.id}_${b.id}_${start}_${end}`))
            .toString(36)
            .slice(0, 10)}`,
          start_at: new Date(start).toISOString(),
          end_at: new Date(end).toISOString(),
        });
      }
    });
  });

  return intersections.sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
}

function findOverlapSlots(userIds = [], { startAt = null, endAt = null, minDurationMin = 20, limit = 10 } = {}) {
  const uniqueUserIds = [...new Set((Array.isArray(userIds) ? userIds : []).map((id) => String(id || "").trim()).filter(Boolean))];
  if (uniqueUserIds.length === 0) return [];

  const availabilityByUser = uniqueUserIds.map((userId) => ({
    userId,
    windows: getUserAvailability(userId, { startAt, endAt }),
  }));

  if (availabilityByUser.some((row) => row.windows.length === 0)) {
    return [];
  }

  let running = availabilityByUser[0].windows.map((window) => ({
    id: window.id,
    start_at: window.start_at,
    end_at: window.end_at,
  }));

  for (let index = 1; index < availabilityByUser.length; index += 1) {
    running = intersectWindowSets(running, availabilityByUser[index].windows);
    if (running.length === 0) break;
  }

  return running
    .map((slot) => ({
      ...slot,
      duration_min: Math.round((new Date(slot.end_at).getTime() - new Date(slot.start_at).getTime()) / 60000),
      user_ids: uniqueUserIds,
    }))
    .filter((slot) => slot.duration_min >= minDurationMin)
    .slice(0, limit);
}

function listCandidateParticipantUserIds(userId, includeGroup = false) {
  if (!includeGroup) return [userId];
  const others = [...store.users.keys()].filter((candidate) => candidate !== userId).slice(0, 2);
  return [userId, ...others];
}

function bookingProviderForItem(item = {}) {
  const category = String(item.category || "").toLowerCase();
  if (["food", "coffee", "restaurant"].includes(category)) return "yelp";
  if (category.includes("concert") || category.includes("music") || category.includes("sports")) return "ticketmaster";
  return "calpoly_now";
}

function bookingOptions({ userId, item, includeGroup }) {
  const participants = listCandidateParticipantUserIds(userId, includeGroup);
  const overlapSlots = findOverlapSlots(participants, {
    startAt: NOW().toISOString(),
    endAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5).toISOString(),
    minDurationMin: 45,
    limit: 8,
  });

  const provider = bookingProviderForItem(item);
  let slots = overlapSlots.slice(0, 6).map((slot, index) => ({
    id: `book_${Math.abs(hashString(`${slot.id}_${index}`))
      .toString(36)
      .slice(0, 9)}`,
    start_at: slot.start_at,
    end_at: slot.end_at,
    overlap_user_count: slot.user_ids.length,
    provider,
  }));

  if (slots.length === 0) {
    const base = NOW();
    base.setUTCHours(18, 0, 0, 0);
    slots = Array.from({ length: 4 }).map((_, index) => {
      const start = new Date(base);
      start.setUTCDate(base.getUTCDate() + index);
      start.setUTCHours(18 + (index % 2), index % 2 ? 30 : 0, 0, 0);
      const end = new Date(start);
      end.setUTCMinutes(end.getUTCMinutes() + 90);
      return {
        id: `book_fallback_${index + 1}`,
        start_at: start.toISOString(),
        end_at: end.toISOString(),
        overlap_user_count: participants.length,
        provider,
      };
    });
  }

  return { slots, provider, participants };
}

function buildUserState(userId) {
  const user = store.users.get(userId);
  if (!user) return null;

  const preferences = getOrInitPreferences(userId);
  const connections = getOrInitConnections(userId);
  const availabilityRows = getUserAvailability(userId);
  const availability = availabilityRows.map((row) => ({
    window_id: row.id,
    user_id: row.user_id,
    start_ts: row.start_at,
    end_ts: row.end_at,
    source: row.source,
  }));
  const events = store.calendarEvents.get(userId) || [];
  const calendarConnected = Boolean(connections.calendar_google_connected || connections.calendar_ics_connected);

  return {
    user: {
      user_id: user.id,
      email: user.email,
      name: user.display_name || "",
      timezone: user.timezone || DEFAULT_TIMEZONE,
    },
    preferences,
    connections,
    availability,
    calendarStatus: {
      status: calendarConnected ? "connected" : "disconnected",
      provider: calendarConnected ? "google" : null,
      last_sync_at: connections.last_calendar_sync_at || null,
    },
    syncedAt: connections.last_calendar_sync_at || null,
    eventsCount: events.length,
    lastAction: null,
  };
}

async function upsertSupabaseUserState(userId) {
  const config = getSupabaseConfig();
  if (!hasSupabaseConfig(config)) {
    return { ok: false, reason: "supabase_not_configured" };
  }

  const user = store.users.get(userId);
  if (!user || !isUuid(user.id)) {
    return { ok: false, reason: "user_not_uuid" };
  }

  const preferences = getOrInitPreferences(userId);
  const connections = getOrInitConnections(userId);
  const availabilityRows = getUserAvailability(userId);
  const nowIso = NOW().toISOString();

  await callSupabaseRest(config, "profiles?on_conflict=id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify([
      {
        id: user.id,
        email: normalizeEmail(user.email),
        display_name: user.display_name || null,
        cal_poly_email: normalizeEmail(user.email).endsWith("@calpoly.edu")
          ? normalizeEmail(user.email)
          : null,
        onboarding_complete: Boolean(user.onboarding_complete),
        created_at: user.created_at || nowIso,
        updated_at: nowIso,
      },
    ]),
  });

  await callSupabaseRest(config, "preferences?on_conflict=user_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify([
      {
        user_id: user.id,
        categories: preferences.categories || [],
        vibe: preferences.vibe || "chill",
        budget: preferences.budget || "medium",
        transport: preferences.transport || "walk",
        price_max: preferences.price_max || "$$$",
        distance_max_m: preferences.distance_max_m || 3500,
        diet_tags: preferences.diet_tags || [],
        event_tags: preferences.event_tags || [],
        favorite_categories: preferences.favorite_categories || [],
        updated_at: nowIso,
      },
    ]),
  });

  await callSupabaseRest(config, "connections?on_conflict=user_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify([
      {
        user_id: user.id,
        calendar_google_connected: Boolean(connections.calendar_google_connected),
        calendar_ics_connected: Boolean(connections.calendar_ics_connected),
        canvas_connected: Boolean(connections.canvas_connected),
        canvas_mode: connections.canvas_mode || null,
        last_calendar_sync_at: connections.last_calendar_sync_at || null,
        updated_at: nowIso,
      },
    ]),
  });

  const deleteFromTimestamp = encodeURIComponent(`${toIsoDate()}T00:00:00.000Z`);
  await callSupabaseRest(
    config,
    `user_availabilities?user_id=eq.${encodeURIComponent(user.id)}&start_at=gte.${deleteFromTimestamp}`,
    {
      method: "DELETE",
      headers: { Prefer: "return=minimal" },
    },
  );

  if (availabilityRows.length > 0) {
    await callSupabaseRest(config, "user_availabilities", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(
        availabilityRows.map((row) => ({
          id: row.id,
          user_id: row.user_id,
          start_at: row.start_at,
          end_at: row.end_at,
          source: row.source || "manual",
          created_at: row.created_at || nowIso,
        })),
      ),
    });
  }

  return { ok: true };
}

async function clearSupabaseAppTables() {
  const config = getSupabaseConfig();
  if (!hasSupabaseConfig(config)) {
    throw new Error("Supabase is not configured.");
  }

  const tablePredicates = [
    ["restaurant_reservations", "id"],
    ["user_availabilities", "id"],
    ["calendar_tokens", "user_id"],
    ["ai_action_logs", "id"],
    ["study_tasks", "id"],
    ["jam_members", "id"],
    ["jams", "id"],
    ["invites", "id"],
    ["plan_participants", "id"],
    ["plan_options", "id"],
    ["plans", "id"],
    ["group_members", "id"],
    ["groups", "id"],
    ["user_event_states", "id"],
    ["events_catalog", "id"],
    ["connections", "user_id"],
    ["preferences", "user_id"],
    ["profiles", "id"],
  ];

  const cleared = [];
  const errors = [];
  for (const [table, key] of tablePredicates) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await callSupabaseRest(config, `${table}?${key}=not.is.null`, {
        method: "DELETE",
        headers: { Prefer: "return=minimal" },
      });
      cleared.push(table);
    } catch (error) {
      errors.push({
        table,
        error: error instanceof Error ? error.message : "unknown_error",
      });
    }
  }

  return { cleared, errors };
}

async function seedSupabaseDummyUsers() {
  for (const seed of DUMMY_USER_SEEDS) {
    const user = ensureStoreUserFromContext({
      userId: seed.id,
      email: seed.email,
      displayName: seed.display_name,
      timezone: DEFAULT_TIMEZONE,
      password: seed.password,
      onboardingComplete: true,
    });
    mergePreferencePayload(user.id, seed.preferences);
    syncMockCalendarForUser(user.id, DEFAULT_TIMEZONE);
    // eslint-disable-next-line no-await-in-loop
    await upsertSupabaseUserState(user.id).catch(() => null);
  }

  const config = getSupabaseConfig();
  if (hasSupabaseConfig(config)) {
    await callSupabaseRest(config, "events_catalog?on_conflict=id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(
        store.eventsCatalog.map((event) => ({
          id: event.id,
          title: event.title,
          category: event.category,
          description: event.description,
          payload: {
            source: "planner_api_seed",
            rating: event.rating,
            distanceMiles: event.distanceMiles,
            reasonTags: event.reasonTags,
          },
          created_at: NOW().toISOString(),
        })),
      ),
    }).catch(() => null);
  }
}

function seedDummyUsersInMemory() {
  DUMMY_USER_SEEDS.forEach((seed) => {
    const user = ensureStoreUserFromContext({
      userId: seed.id,
      email: seed.email,
      displayName: seed.display_name,
      timezone: DEFAULT_TIMEZONE,
      password: seed.password,
      onboardingComplete: true,
    });
    mergePreferencePayload(user.id, seed.preferences);
    syncMockCalendarForUser(user.id, DEFAULT_TIMEZONE);
  });
}

seedDummyUsersInMemory();

function userBadges(userId) {
  const connections = getOrInitConnections(userId);
  return {
    calendar: Boolean(connections.calendar_google_connected || connections.calendar_ics_connected),
    canvas: Boolean(connections.canvas_connected)
  };
}

function computeStudyLoad(userId) {
  const now = NOW().getTime();
  const tasks = store.studyTasks.filter((task) => task.user_id === userId && !task.done);
  const unfinishedCount = tasks.length;
  const dueSoonCount = tasks.filter((task) => {
    const due = Date.parse(task.due_at);
    if (Number.isNaN(due)) return false;
    return due - now <= 1000 * 60 * 60 * 24;
  }).length;
  const urgencyWindow = tasks.some((task) => {
    const due = Date.parse(task.due_at);
    if (Number.isNaN(due)) return false;
    return due - now <= 1000 * 60 * 60 * 6;
  })
    ? 1
    : 0;

  return {
    due_soon_count: dueSoonCount,
    unfinished_count: unfinishedCount,
    urgency_window: urgencyWindow,
    study_load_score: dueSoonCount * 3 + unfinishedCount * 2 + urgencyWindow * 4
  };
}

function scoreEvent({ event, prefs, studyLoad, weather = "clear", timeOfDay = "evening" }) {
  let score = 0;
  if (prefs.categories?.includes(event.category)) score += 4;
  if (prefs.vibe === event.vibe) score += 3;
  if (prefs.budget === event.budget || (prefs.budget === "low" && event.free)) score += 2;
  if (prefs.transport && prefs.transport === event.transport) score += 2;
  if (weather === "rain" && event.category === "outdoor") score -= 4;
  if (timeOfDay === "night" && event.when === "tonight") score += 2;

  if (studyLoad.study_load_score >= 8 && event.category === "outdoor") score -= 2;
  if (studyLoad.study_load_score >= 8 && event.reasonTags.includes("quick")) score += 3;
  if (studyLoad.study_load_score < 5 && event.category === "concerts") score += 2;

  return score + Math.max(0, 5 - event.distanceMiles);
}

function rankedRecommendations(
  userId,
  { weather = "clear", timeOfDay = "evening", requestedCategories = [], strictCategoryMatch = false } = {}
) {
  const prefs = getOrInitPreferences(userId);
  const studyLoad = computeStudyLoad(userId);
  const categorySet = new Set(requestedCategories);

  return store.eventsCatalog
    .map((event) => ({
      ...event,
      score:
        scoreEvent({ event, prefs, studyLoad, weather, timeOfDay }) +
        (categorySet.size > 0
          ? categorySet.has(event.category)
            ? 12
            : strictCategoryMatch
              ? -30
              : -8
          : 0),
      study_load_score: studyLoad.study_load_score,
      reason_tags: [...event.reasonTags, `study-score-${studyLoad.study_load_score}`]
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
}

function parseMessageIntent(message) {
  const text = String(message || "").toLowerCase();
  const matches = [];

  const rules = [
    { category: "outdoor", keywords: ["hike", "hiking", "trail", "mountain", "peak", "beach", "surf", "sunset"] },
    { category: "food", keywords: ["food", "eat", "dinner", "lunch", "breakfast", "coffee", "cafe", "restaurant", "taco"] },
    { category: "concerts", keywords: ["concert", "music", "live show", "show", "band"] },
    { category: "campus", keywords: ["campus", "cal poly", "club", "student event"] },
    { category: "indoor", keywords: ["indoor", "museum", "walk", "study spot", "library", "quiet"] }
  ];

  rules.forEach((rule) => {
    if (rule.keywords.some((keyword) => text.includes(keyword))) {
      matches.push(rule.category);
    }
  });

  const unique = [...new Set(matches)];
  const strict = unique.length > 0;
  return { requestedCategories: unique, strictCategoryMatch: strict };
}

function sanitizeCardsForIntent(candidateCards, fallbackCards, intent) {
  if (!intent.strictCategoryMatch || intent.requestedCategories.length === 0) {
    return Array.isArray(candidateCards) && candidateCards.length > 0 ? candidateCards : fallbackCards;
  }

  const allowed = new Set(intent.requestedCategories);
  const input = Array.isArray(candidateCards) ? candidateCards : [];
  const filtered = input.filter((card) => allowed.has(card.category));

  if (filtered.length > 0) return filtered;

  const fallbackFiltered = fallbackCards.filter((card) => allowed.has(card.category));
  return fallbackFiltered.length > 0 ? fallbackFiltered : fallbackCards;
}

function parseIcsSummary(content) {
  const lines = String(content || "").split(/\r?\n/);
  const events = [];
  let current = null;

  lines.forEach((line) => {
    if (line.startsWith("BEGIN:VEVENT")) {
      current = { title: "Untitled Event", start: null };
      return;
    }
    if (!current) return;
    if (line.startsWith("SUMMARY:")) current.title = line.replace("SUMMARY:", "").trim();
    if (line.startsWith("DTSTART")) {
      const value = line.split(":")[1];
      current.start = value || null;
    }
    if (line.startsWith("END:VEVENT")) {
      events.push(current);
      current = null;
    }
  });

  return events;
}

function generatePlanOptions({ constraints, recommendations }) {
  const now = NOW();
  const baseHour = Math.max(now.getHours() + 1, 16);
  const options = recommendations.slice(0, 3).map((item, index) => {
    const startHour = baseHour + index;
    return {
      id: randomUUID(),
      title: `${item.title} + focused block`,
      start_iso: new Date(now.getFullYear(), now.getMonth(), now.getDate(), startHour, 0, 0).toISOString(),
      duration_min: constraints.durationMin || 120,
      location: item.title,
      estimated_cost: item.free ? 0 : constraints.maxBudget === "low" ? 15 : 30,
      score: Math.round(item.score * 10) / 10
    };
  });

  return options;
}

async function generateAssistantReply(payload) {
  if (!process.env.OPENAI_API_KEY) {
    return "Here are options ranked from your study load, vibe, and budget. I can draft a plan or create invite links if you confirm.";
  }

  try {
    if (!openai) {
      openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content:
            "You are OpenJarvis for SLO Planner. Be concise. Recommend activities and plans based on workload. Never claim writes are done before explicit confirmation."
        },
        {
          role: "user",
          content: JSON.stringify(payload)
        }
      ]
    });

    return response.output_text || "I have a few recommendations ready.";
  } catch {
    return "I can still recommend options right now, but the AI model is temporarily unavailable.";
  }
}

function safeString(value, fallback = "") {
  if (typeof value === "string") return value;
  if (value == null) return fallback;
  return String(value);
}

function normalizeChatContext(context, userId) {
  const prefs = getOrInitPreferences(userId);
  const study = computeStudyLoad(userId);
  const raw = context && typeof context === "object" ? context : {};
  const weather = typeof raw.weather === "string" ? raw.weather : raw.weather?.summary || "clear";

  return {
    screen: safeString(raw.activeScreen || raw.screen || "unknown"),
    weather: safeString(weather, "clear"),
    time_of_day: safeString(raw.timeOfDay || "evening"),
    study_load_score: study.study_load_score,
    due_soon_count: study.due_soon_count,
    unfinished_count: study.unfinished_count,
    preferences: {
      categories: Array.isArray(prefs.categories) ? prefs.categories : [],
      vibe: safeString(prefs.vibe || "chill"),
      budget: safeString(prefs.budget || "medium"),
      transport: safeString(prefs.transport || "walk")
    },
    upcoming_plan_count: store.plans.filter((plan) => plan.host_user_id === userId).length
  };
}

function parseJsonObject(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) return null;
    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

function buildAiCacheKey({ message, context, cards, proposedActions }) {
  return JSON.stringify({
    message: String(message || "").trim().toLowerCase(),
    context,
    cards: Array.isArray(cards) ? cards.map((card) => ({ id: card.id, category: card.category, title: card.title })) : [],
    proposed_actions: Array.isArray(proposedActions) ? proposedActions.map((action) => action.type) : []
  });
}

function getCachedAiReply(key) {
  const row = aiResponseCache.get(key);
  if (!row) return null;
  if (Date.now() - row.at > AI_CACHE_TTL_MS) {
    aiResponseCache.delete(key);
    return null;
  }
  return row.value;
}

function setCachedAiReply(key, value) {
  aiResponseCache.set(key, { at: Date.now(), value });
  if (aiResponseCache.size > 200) {
    const oldest = aiResponseCache.keys().next().value;
    if (oldest) aiResponseCache.delete(oldest);
  }
}

async function generateStructuredAssistantReply({ message, context, cards, proposedActions }) {
  const cacheKey = buildAiCacheKey({ message, context, cards, proposedActions });
  const cached = getCachedAiReply(cacheKey);
  if (cached) return cached;

  if (!process.env.OPENAI_API_KEY) {
    const fallback = {
      assistant_text:
        "Here are options ranked from your study load, vibe, and budget. I can draft a plan or create invite links if you confirm."
    };
    setCachedAiReply(cacheKey, fallback);
    return fallback;
  }

  try {
    if (!openai) {
      openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }

    const requestPromise = openai.responses.create({
      model: "gpt-4.1-mini",
      temperature: 0.3,
      max_output_tokens: 220,
      input: [
        {
          role: "system",
          content:
            "You are Jarvis, the SLO student planner assistant.\n" +
            "Goals:\n" +
            "- Help Cal Poly students plan around study load, budget, vibe, transport, and time.\n" +
            "- Prefer options from app data first; if missing, say so.\n" +
            "Rules:\n" +
            "- Never claim any write action is completed.\n" +
            "- For writes (RSVP, join jam, create plan, save event), only suggest confirmation.\n" +
            "- Keep answers concise and practical.\n" +
            "- If study load is high, prioritize low-friction options.\n" +
            "- Never relabel categories. A hike/outdoor request must return outdoor cards only.\n" +
            "- If no matching cards exist for requested intent, explicitly say no exact match.\n" +
            "Return strict JSON only with shape:\n" +
            "{ \"assistant_text\": string, \"cards\": [{\"id\": string, \"title\": string, \"subtitle\": string, \"deep_link\": string, \"reason_tags\": string[], \"category\": string}], \"proposed_actions\": [{\"action_id\": string, \"type\": string, \"payload\": object, \"requires_confirmation\": true}] }"
        },
        {
          role: "user",
          content: JSON.stringify({
            message,
            context,
            cards,
            proposed_actions: proposedActions
          })
        }
      ]
    });
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("openai_timeout")), AI_TIMEOUT_MS);
    });

    const response = await Promise.race([requestPromise, timeoutPromise]);

    const parsed = parseJsonObject(response.output_text || "");
    if (parsed && typeof parsed.assistant_text === "string") {
      const value = {
        assistant_text: parsed.assistant_text,
        cards: Array.isArray(parsed.cards) ? parsed.cards : cards,
        proposed_actions: Array.isArray(parsed.proposed_actions) ? parsed.proposed_actions : proposedActions
      };
      setCachedAiReply(cacheKey, value);
      return value;
    }

    const fallback = {
      assistant_text: response.output_text || "I have a few recommendations ready.",
      cards,
      proposed_actions: proposedActions
    };
    setCachedAiReply(cacheKey, fallback);
    return fallback;
  } catch {
    const fallback = {
      assistant_text:
        "I can still recommend options right now, but the AI model is temporarily unavailable.",
      cards,
      proposed_actions: proposedActions
    };
    setCachedAiReply(cacheKey, fallback);
    return fallback;
  }
}

function collectApiEndpoints(app) {
  const endpoints = [];
  const seen = new Set();

  function pushEndpoint(method, routePath) {
    const upperMethod = String(method || "").toUpperCase();
    const normalizedPath = String(routePath || "").trim();
    if (!upperMethod || !normalizedPath.startsWith("/api/")) return;
    const key = `${upperMethod} ${normalizedPath}`;
    if (seen.has(key)) return;
    seen.add(key);
    endpoints.push({ method: upperMethod, path: normalizedPath });
  }

  function walkStack(stack) {
    if (!Array.isArray(stack)) return;

    for (const layer of stack) {
      if (!layer) continue;

      if (layer.route && layer.route.path) {
        const methods = Object.keys(layer.route.methods || {}).filter(
          (method) => layer.route.methods?.[method],
        );
        const paths = Array.isArray(layer.route.path) ? layer.route.path : [layer.route.path];
        for (const routePath of paths) {
          methods.forEach((method) => pushEndpoint(method, routePath));
        }
        continue;
      }

      if (layer.handle && Array.isArray(layer.handle.stack)) {
        walkStack(layer.handle.stack);
      }
    }
  }

  walkStack(app?._router?.stack || []);

  return endpoints.sort((a, b) => {
    if (a.path === b.path) return a.method.localeCompare(b.method);
    return a.path.localeCompare(b.path);
  });
}

export function registerPlannerApi(app) {
  app.post("/api/auth/signup", (req, res) => {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");
    const displayName = String(req.body?.displayName || "").trim() || "SLO Student";

    if (!email || !password) {
      res.status(400).json({ error: "email and password are required" });
      return;
    }

    const existing = [...store.users.values()].find((user) => user.email === email);
    if (existing) {
      res.status(409).json({ error: "User already exists" });
      return;
    }

    const userId = randomUUID();
    const user = {
      id: userId,
      email,
      display_name: displayName,
      cal_poly_email: email.endsWith("@calpoly.edu") ? email : "",
      onboarding_complete: false,
      created_at: NOW().toISOString(),
      password,
      timezone: normalizeTimezone(req.body?.timezone),
    };

    store.users.set(userId, user);
    getOrInitPreferences(userId);
    getOrInitConnections(userId);

    const sessionToken = randomUUID();
    store.sessions.set(sessionToken, userId);

    res.json({
      sessionToken,
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        onboarding_complete: user.onboarding_complete,
        timezone: user.timezone || DEFAULT_TIMEZONE,
      }
    });
  });

  app.post("/api/auth/signin", (req, res) => {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");
    if (!email || !password) {
      res.status(400).json({ error: "email and password are required" });
      return;
    }

    const user = [...store.users.values()].find((candidate) => candidate.email === email && candidate.password === password);
    if (!user) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const sessionToken = randomUUID();
    store.sessions.set(sessionToken, user.id);
    res.json({
      sessionToken,
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        onboarding_complete: user.onboarding_complete,
        timezone: user.timezone || DEFAULT_TIMEZONE,
      }
    });
  });

  app.post("/api/auth/google/mock", (req, res) => {
    const googleEmail = normalizeEmail(req.body?.email || "student@calpoly.edu");
    let user = [...store.users.values()].find((candidate) => candidate.email === googleEmail);

    if (!user) {
      const userId = randomUUID();
      user = {
        id: userId,
        email: googleEmail,
        display_name: String(req.body?.displayName || "Google User").trim(),
        cal_poly_email: googleEmail.endsWith("@calpoly.edu") ? googleEmail : "",
        onboarding_complete: false,
        created_at: NOW().toISOString(),
        password: `google-oauth-${randomUUID()}`,
        timezone: normalizeTimezone(req.body?.timezone),
      };
      store.users.set(userId, user);
      getOrInitPreferences(userId);
      getOrInitConnections(userId);
    }

    const sessionToken = randomUUID();
    store.sessions.set(sessionToken, user.id);

    res.json({
      sessionToken,
      provider: "google_mock",
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        onboarding_complete: user.onboarding_complete,
        timezone: user.timezone || DEFAULT_TIMEZONE,
      }
    });
  });

  app.post("/api/auth/session-bootstrap", (req, res) => {
    const token = req.header("x-session-token") || req.body?.sessionToken;
    if (!token) {
      res.json({ authenticated: false, pending_redirect: req.body?.pendingRedirect || null });
      return;
    }

    const userId = store.sessions.get(token);
    const user = userId ? store.users.get(userId) : null;
    if (!user) {
      res.json({ authenticated: false, pending_redirect: req.body?.pendingRedirect || null });
      return;
    }

    res.json({
      authenticated: true,
      sessionToken: token,
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        onboarding_complete: Boolean(user.onboarding_complete),
        timezone: user.timezone || DEFAULT_TIMEZONE,
      },
      preferences: getOrInitPreferences(user.id),
      connections: getOrInitConnections(user.id),
      badges: userBadges(user.id),
      pending_redirect: req.body?.pendingRedirect || null
    });
  });

  app.get("/api/backend/endpoints", (_req, res) => {
    const endpoints = collectApiEndpoints(app);
    res.json({
      endpoints,
      total: endpoints.length,
      generated_at: NOW().toISOString(),
    });
  });

  app.get("/api/backend/state", (_req, res) => {
    const users = [...store.users.values()].map((user) => {
      const prefs = getOrInitPreferences(user.id);
      const conn = getOrInitConnections(user.id);
      const windows = getUserAvailability(user.id);
      return {
        user_id: user.id,
        email: user.email,
        name: user.display_name || "",
        calendar_connected: Boolean(conn.calendar_google_connected || conn.calendar_ics_connected),
        last_calendar_sync_at: conn.last_calendar_sync_at || null,
        windows_count: windows.length,
        events_count: (store.calendarEvents.get(user.id) || []).length,
        preference_preview: {
          price_max: prefs.price_max || "$$$",
          distance_max_m: prefs.distance_max_m || 3500,
          favorite_categories: prefs.favorite_categories || [],
          event_tags: prefs.event_tags || [],
          diet_tags: prefs.diet_tags || [],
        },
      };
    });

    res.json({
      generated_at: NOW().toISOString(),
      counts: {
        users: users.length,
        preferences: store.preferences.size,
        connections: store.connections.size,
        calendar_events: [...store.calendarEvents.values()].reduce((sum, rows) => sum + rows.length, 0),
        availabilities: store.availabilities.length,
        reservations: store.reservationIntents.length + store.reservations.length,
        notifications: store.notifications.length,
      },
      users,
      recent_reservation_intents: store.reservationIntents.slice(-10),
      recent_notifications: store.notifications.slice(-10),
    });
  });

  app.post("/api/admin/supabase/seed-dummy-users", async (_req, res) => {
    try {
      await seedSupabaseDummyUsers();
      res.json({
        ok: true,
        seeded_users: DUMMY_USER_SEEDS.map((user) => ({
          user_id: user.id,
          email: user.email,
          display_name: user.display_name,
        })),
      });
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : "Could not seed Supabase dummy users.",
      });
    }
  });

  app.post("/api/admin/supabase/reset", async (req, res) => {
    const confirm = String(req.body?.confirm || "").trim();
    if (confirm !== "RESET_SUPABASE") {
      res.status(400).json({
        ok: false,
        error: "Set { confirm: \"RESET_SUPABASE\" } to run this destructive operation.",
      });
      return;
    }

    const shouldSeed = req.body?.seed !== false;
    try {
      const { cleared: cleared_tables, errors: clear_errors } = await clearSupabaseAppTables();
      if (shouldSeed) {
        await seedSupabaseDummyUsers();
      }

      res.json({
        ok: true,
        cleared_tables,
        clear_errors,
        seeded_dummy_users: shouldSeed ? DUMMY_USER_SEEDS.length : 0,
      });
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : "Could not reset Supabase.",
      });
    }
  });

  app.get("/api/users", (_req, res) => {
    const items = [...store.users.values()]
      .map((user) => {
        const state = buildUserState(user.id);
        return {
          user_id: user.id,
          email: user.email,
          name: user.display_name || "",
          timezone: user.timezone || DEFAULT_TIMEZONE,
          windows_count: state?.availability?.length || 0,
          events_count: state?.eventsCount || 0,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    res.json({ items, total: items.length });
  });

  app.post("/api/users/bootstrap", async (req, res) => {
    const context = getAppContextFromRequest(req);
    const payload = req.body || {};

    const user = ensureStoreUserFromContext({
      userId: context.userId || payload.user_id || payload.userId,
      email: context.email || payload.email,
      displayName: context.displayName || payload.name || payload.display_name,
      timezone: context.timezone || payload.timezone,
      password: payload.password || "",
      onboardingComplete: true,
    });

    if (!user) {
      res.status(400).json({ error: "user_id or email is required" });
      return;
    }

    if (payload.preferences && typeof payload.preferences === "object") {
      mergePreferencePayload(user.id, payload.preferences);
    }

    if (payload.sync_calendar || payload.syncCalendar) {
      syncMockCalendarForUser(user.id, user.timezone || DEFAULT_TIMEZONE);
    } else {
      getUserAvailability(user.id);
    }

    if (payload.sync_supabase !== false) {
      await upsertSupabaseUserState(user.id).catch(() => null);
    }

    const state = buildUserState(user.id);
    res.json({
      user_id: user.id,
      state,
    });
  });

  app.get("/api/users/:user_id/state", (req, res) => {
    const userId = String(req.params.user_id || "").trim();
    const user = store.users.get(userId);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const state = buildUserState(userId);
    res.json(state);
  });

  app.put("/api/users/:user_id/preferences", async (req, res) => {
    const userId = String(req.params.user_id || "").trim();
    const user = store.users.get(userId);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const preferences = mergePreferencePayload(userId, req.body || {});
    await upsertSupabaseUserState(userId).catch(() => null);

    res.json({
      user_id: userId,
      preferences,
    });
  });

  app.post("/api/users/:user_id/calendar/link-google", async (req, res) => {
    const userId = String(req.params.user_id || "").trim();
    const user = store.users.get(userId);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const timezone = normalizeTimezone(req.body?.timezone || user.timezone || DEFAULT_TIMEZONE);
    user.timezone = timezone;
    const sync = syncMockCalendarForUser(userId, timezone);
    await upsertSupabaseUserState(userId).catch(() => null);

    res.json({
      user_id: userId,
      provider: "google",
      status: "connected",
      ...sync,
    });
  });

  app.get("/api/users/:user_id/overlap/:other_user_id", (req, res) => {
    const userId = String(req.params.user_id || "").trim();
    const otherUserId = String(req.params.other_user_id || "").trim();
    if (!store.users.get(userId) || !store.users.get(otherUserId)) {
      res.status(404).json({ error: "One or more users not found" });
      return;
    }

    const slots = findOverlapSlots([userId, otherUserId], {
      startAt: req.query.start_at || req.query.start_ts || null,
      endAt: req.query.end_at || req.query.end_ts || null,
      minDurationMin: Number.parseInt(String(req.query.min_duration_min || "20"), 10) || 20,
      limit: Number.parseInt(String(req.query.limit || "20"), 10) || 20,
    }).map((slot) => ({
      overlap_id: slot.id,
      start_ts: slot.start_at,
      end_ts: slot.end_at,
      duration_min: slot.duration_min,
      user_ids: slot.user_ids,
    }));

    res.json({
      user_ids: [userId, otherUserId],
      overlap_slots: slots,
      total: slots.length,
    });
  });

  app.post("/api/preferences", (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;

    const next = mergePreferencePayload(auth.userId, req.body || {});
    auth.user.onboarding_complete = true;
    upsertSupabaseUserState(auth.userId).catch(() => null);

    res.json({
      preferences: next,
      onboarding_complete: true,
    });
  });

  app.post("/api/calendar/google/connect-start", (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;

    res.json({
      auth_url: "https://accounts.google.com/o/oauth2/v2/auth",
      state: randomUUID(),
      message: "Use this URL to start Google OAuth in production."
    });
  });

  app.post("/api/calendar/google/connect-complete", (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;

    const sync = syncMockCalendarForUser(auth.userId, auth.user?.timezone || DEFAULT_TIMEZONE);
    upsertSupabaseUserState(auth.userId).catch(() => null);

    res.json({
      connected: true,
      provider: "google",
      connections: getOrInitConnections(auth.userId),
      synced_at: sync.synced_at,
      events_count: sync.events_count,
      windows_count: sync.windows_count,
    });
  });

  app.get("/api/availability", (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;
    res.json({ availabilities: getUserAvailability(auth.userId) });
  });

  app.post("/api/availability", (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;

    const startAt = toIsoOrNull(req.body?.start_at);
    const endAt = toIsoOrNull(req.body?.end_at);
    if (!startAt || !endAt || new Date(endAt).getTime() <= new Date(startAt).getTime()) {
      res.status(400).json({ error: "Valid start_at and end_at are required" });
      return;
    }

    const slot = {
      id: randomUUID(),
      user_id: auth.userId,
      start_at: startAt,
      end_at: endAt,
      source: String(req.body?.source || "manual"),
      created_at: NOW().toISOString()
    };
    store.availabilities.push(slot);
    upsertSupabaseUserState(auth.userId).catch(() => null);
    res.json({ availability: slot, availabilities: getUserAvailability(auth.userId) });
  });

  app.get("/api/availability/overlap", (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;
    const withIds = String(req.query.with || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    const userIds = [...new Set([auth.userId, ...withIds])];
    const slots = findOverlapSlots(userIds, {
      startAt: req.query.start_at || req.query.start_ts || null,
      endAt: req.query.end_at || req.query.end_ts || null,
      minDurationMin: Number.parseInt(String(req.query.min_duration_min || "20"), 10) || 20,
      limit: 8,
    }).map((slot) => ({
      ...slot,
      start_ts: slot.start_at,
      end_ts: slot.end_at,
    }));
    res.json({ user_ids: userIds, overlap_slots: slots });
  });

  app.post("/api/calendar/ics/import", (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;

    const events = parseIcsSummary(req.body?.icsContent || "");
    const connections = getOrInitConnections(auth.userId);
    connections.calendar_ics_connected = true;
    connections.updated_at = NOW().toISOString();
    store.connections.set(auth.userId, connections);

    if (events.length > 0) {
      const mappedEvents = events
        .map((event, index) => {
          const start = event.start ? toIsoOrNull(event.start) : null;
          if (!start) return null;
          const end = new Date(start);
          end.setUTCMinutes(end.getUTCMinutes() + 75);
          return {
            id: `ics_evt_${Math.abs(hashString(`${auth.userId}_${event.title}_${index}`))
              .toString(36)
              .slice(0, 9)}`,
            user_id: auth.userId,
            title: event.title || "ICS Event",
            location: "Imported Calendar",
            start_at: start,
            end_at: end.toISOString(),
            source: "ics_import",
            timezone: auth.user?.timezone || DEFAULT_TIMEZONE,
          };
        })
        .filter(Boolean);

      const availability = deriveAvailabilityFromEvents(auth.userId, mappedEvents, "ics_import");
      store.availabilities = store.availabilities.filter(
        (row) => !(row.user_id === auth.userId && row.source === "ics_import"),
      );
      store.availabilities.push(...availability);
    }

    upsertSupabaseUserState(auth.userId).catch(() => null);

    res.json({ imported_count: events.length, sample: events.slice(0, 5), connections });
  });

  app.post("/api/canvas/connect/oauth-start", (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;

    res.json({
      auth_url: "https://canvas.instructure.com/login/oauth2/auth",
      message: "Canvas OAuth setup placeholder for v1."
    });
  });

  app.post("/api/canvas/connect/oauth-complete", (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;

    const connections = getOrInitConnections(auth.userId);
    connections.canvas_connected = true;
    connections.canvas_mode = "oauth";
    connections.updated_at = NOW().toISOString();
    store.connections.set(auth.userId, connections);

    if (!store.studyTasks.some((task) => task.user_id === auth.userId)) {
      store.studyTasks.push(
        {
          id: randomUUID(),
          user_id: auth.userId,
          source: "canvas",
          title: "Physics Problem Set 4",
          due_at: new Date(Date.now() + 1000 * 60 * 60 * 8).toISOString(),
          course: "PHYS 141",
          duration_min: 120,
          done: false
        },
        {
          id: randomUUID(),
          user_id: auth.userId,
          source: "canvas",
          title: "BIO 161 Discussion Post",
          due_at: new Date(Date.now() + 1000 * 60 * 60 * 30).toISOString(),
          course: "BIO 161",
          duration_min: 45,
          done: false
        }
      );
    }

    upsertSupabaseUserState(auth.userId).catch(() => null);
    res.json({ connected: true, mode: "oauth", connections });
  });

  app.post("/api/canvas/connect/token", (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;

    const token = String(req.body?.token || "").trim();
    if (!token) {
      res.status(400).json({ error: "token is required" });
      return;
    }

    const connections = getOrInitConnections(auth.userId);
    connections.canvas_connected = true;
    connections.canvas_mode = "manual";
    connections.updated_at = NOW().toISOString();
    store.connections.set(auth.userId, connections);

    upsertSupabaseUserState(auth.userId).catch(() => null);
    res.json({ connected: true, mode: "manual", connections });
  });

  app.get("/api/home/recommendations", (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;

    const weather = String(req.query.weather || "clear");
    const timeOfDay = String(req.query.timeOfDay || "evening");
    const recommendations = rankedRecommendations(auth.userId, { weather, timeOfDay });
    const studyLoad = computeStudyLoad(auth.userId);

    res.json({
      recommendations,
      study_load: studyLoad,
      due_today: studyLoad.due_soon_count > 0,
      badges: userBadges(auth.userId)
    });
  });

  app.get("/api/explore", (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;

    const category = String(req.query.category || "all");
    const search = String(req.query.search || "").toLowerCase();
    const sort = String(req.query.sort || "trending");
    const savedOnly = String(req.query.savedOnly || "0") === "1";

    const saved = new Set(
      store.userEventStates
        .filter((state) => state.user_id === auth.userId && state.state === "saved")
        .map((state) => state.event_id)
    );

    let list = store.eventsCatalog.filter((item) => (category === "all" ? true : item.category === category));
    if (search) {
      list = list.filter((item) => item.title.toLowerCase().includes(search) || item.description.toLowerCase().includes(search));
    }
    if (savedOnly) {
      list = list.filter((item) => saved.has(item.id));
    }

    if (sort === "free") list = list.sort((a, b) => Number(b.free) - Number(a.free));
    if (sort === "distance") list = list.sort((a, b) => a.distanceMiles - b.distanceMiles);
    if (sort === "trending") list = list.sort((a, b) => b.rating - a.rating);

    res.json({ items: list.map((item) => ({ ...item, saved: saved.has(item.id) })) });
  });

  app.get("/api/items/:itemId", (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;

    const item = store.eventsCatalog.find((candidate) => candidate.id === req.params.itemId);
    if (!item) {
      res.status(404).json({ error: "Item not found" });
      return;
    }

    const states = store.userEventStates.filter((state) => state.user_id === auth.userId && state.event_id === item.id);
    res.json({ item, states });
  });

  app.post("/api/items/:itemId/state", (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;

    const item = store.eventsCatalog.find((candidate) => candidate.id === req.params.itemId);
    if (!item) {
      res.status(404).json({ error: "Item not found" });
      return;
    }

    const state = String(req.body?.state || "");
    if (!["confirmed", "maybe", "saved"].includes(state)) {
      res.status(400).json({ error: "state must be confirmed, maybe, or saved" });
      return;
    }

    const expiresAt = state === "maybe" ? new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString() : null;

    store.userEventStates = store.userEventStates.filter(
      (row) => !(row.user_id === auth.userId && row.event_id === item.id && row.state === state)
    );

    const next = {
      id: randomUUID(),
      user_id: auth.userId,
      event_id: item.id,
      state,
      expires_at: expiresAt,
      created_at: NOW().toISOString()
    };
    store.userEventStates.push(next);

    res.json({ state: next });
  });

  app.get("/api/my-events", (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;

    const now = NOW();
    const rows = store.userEventStates.filter((row) => row.user_id === auth.userId && ["confirmed", "maybe"].includes(row.state));
    const activeRows = rows.filter((row) => !(row.state === "maybe" && row.expires_at && new Date(row.expires_at) < now));

    res.json({
      confirmed: activeRows
        .filter((row) => row.state === "confirmed")
        .map((row) => ({ ...row, item: store.eventsCatalog.find((item) => item.id === row.event_id) })),
      maybe: activeRows
        .filter((row) => row.state === "maybe")
        .map((row) => ({ ...row, item: store.eventsCatalog.find((item) => item.id === row.event_id) }))
    });
  });

  app.post("/api/groups", (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;

    const name = String(req.body?.name || "").trim();
    if (!name) {
      res.status(400).json({ error: "name is required" });
      return;
    }

    const group = {
      id: randomUUID(),
      owner_user_id: auth.userId,
      name,
      created_at: NOW().toISOString()
    };
    store.groups.push(group);

    res.json({ group });
  });

  app.get("/api/groups", (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;

    const groups = store.groups
      .filter((group) => group.owner_user_id === auth.userId)
      .map((group) => ({ ...group, members: store.groupMembers.filter((member) => member.group_id === group.id) }));

    res.json({ groups });
  });

  app.post("/api/groups/:groupId/members", (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;

    const group = store.groups.find((candidate) => candidate.id === req.params.groupId && candidate.owner_user_id === auth.userId);
    if (!group) {
      res.status(404).json({ error: "Group not found" });
      return;
    }

    const member = {
      id: randomUUID(),
      group_id: group.id,
      member_type: req.body?.user_id ? "user" : "external_contact",
      user_id: req.body?.user_id || null,
      phone: req.body?.phone || null,
      email: req.body?.email || null,
      display_name: req.body?.display_name || "New member"
    };

    store.groupMembers.push(member);
    res.json({ member });
  });

  app.post("/api/invites/generate", (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;

    const entityType = String(req.body?.entity_type || "");
    const entityId = String(req.body?.entity_id || "");
    if (!entityType || !entityId) {
      res.status(400).json({ error: "entity_type and entity_id are required" });
      return;
    }

    const token = randomUUID().replace(/-/g, "").slice(0, 20);
    const invite = {
      id: randomUUID(),
      token,
      entity_type: entityType,
      entity_id: entityId,
      created_by: auth.userId,
      expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString()
    };
    store.invites.push(invite);

    if (entityType === "jam") {
      const jam = store.jams.find((candidate) => candidate.id === entityId);
      if (jam) {
        createNotification({
          userId: auth.userId,
          type: "jam_invite_link_created",
          title: "Jam invite link created",
          message: `Your invite link for ${jam.name} is ready to share.`,
          entityType: "jam",
          entityId: jam.id
        });
      }
    }

    res.json({ invite, link: `/join/${token}` });
  });

  app.get("/api/join/:token", (req, res) => {
    const invite = store.invites.find((candidate) => candidate.token === req.params.token);
    if (!invite) {
      res.status(404).json({ error: "Invite not found" });
      return;
    }

    res.json({ invite });
  });

  app.post("/api/join/:token/respond", (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;

    const invite = store.invites.find((candidate) => candidate.token === req.params.token);
    if (!invite) {
      res.status(404).json({ error: "Invite not found" });
      return;
    }

    const response = {
      id: randomUUID(),
      invite_token: invite.token,
      user_id: auth.userId,
      rsvp: req.body?.rsvp || "maybe",
      comment: req.body?.comment || "",
      availability_blocks: req.body?.availability_blocks || []
    };

    if (invite.entity_type === "plan") {
      store.planParticipants.push({
        id: randomUUID(),
        plan_id: invite.entity_id,
        user_id: auth.userId,
        rsvp: response.rsvp,
        availability_blocks: response.availability_blocks,
        comment: response.comment
      });
    }

    if (invite.entity_type === "jam") {
      const jam = store.jams.find((candidate) => candidate.id === invite.entity_id);
      if (jam && !store.jamMembers.some((member) => member.jam_id === jam.id && member.user_id === auth.userId)) {
        store.jamMembers.push({
          id: randomUUID(),
          jam_id: jam.id,
          user_id: auth.userId,
          role: "member",
          joined_at: NOW().toISOString()
        });

        createNotification({
          userId: jam.host_user_id,
          type: "jam_member_joined",
          title: "New jam member",
          message: `${auth.user.display_name || auth.user.email} joined ${jam.name}.`,
          entityType: "jam",
          entityId: jam.id
        });
      }
    }

    res.json({ response });
  });

  app.post("/api/plans", (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;

    const constraints = req.body?.constraints || {};
    const recommendations = rankedRecommendations(auth.userId, {
      weather: constraints.weather || "clear",
      timeOfDay: constraints.timeOfDay || "evening"
    });

    const plan = {
      id: randomUUID(),
      host_user_id: auth.userId,
      title: req.body?.title || "New SLO plan",
      constraints_json: constraints,
      status: "draft",
      finalized_option_json: null,
      created_at: NOW().toISOString(),
      options: generatePlanOptions({ constraints, recommendations })
    };

    store.plans.push(plan);
    res.json({ plan_id: plan.id, request_id: plan.id, options: plan.options });
  });

  app.get("/api/plans/:id/results", (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;

    const plan = store.plans.find((candidate) => candidate.id === req.params.id);
    if (!plan) {
      res.status(404).json({ error: "Plan not found" });
      return;
    }

    res.json({ plan });
  });

  app.post("/api/plans/:id/reschedule", (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;

    const plan = store.plans.find((candidate) => candidate.id === req.params.id && candidate.host_user_id === auth.userId);
    if (!plan) {
      res.status(404).json({ error: "Plan not found" });
      return;
    }

    const recommendations = rankedRecommendations(auth.userId, { weather: "clear", timeOfDay: "evening" });
    plan.options = generatePlanOptions({ constraints: plan.constraints_json || {}, recommendations });

    res.json({ plan });
  });

  app.post("/api/plans/:id/rsvp", (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;

    const plan = store.plans.find((candidate) => candidate.id === req.params.id);
    if (!plan) {
      res.status(404).json({ error: "Plan not found" });
      return;
    }

    const participant = {
      id: randomUUID(),
      plan_id: plan.id,
      user_id: auth.userId,
      rsvp: req.body?.rsvp || "maybe",
      availability_blocks: req.body?.availability_blocks || [],
      comment: req.body?.comment || ""
    };
    store.planParticipants.push(participant);

    if (req.body?.finalize_option_id && plan.host_user_id === auth.userId) {
      const chosen = (plan.options || []).find((option) => option.id === req.body.finalize_option_id);
      if (chosen) {
        plan.finalized_option_json = chosen;
        plan.status = "finalized";
      }
    }

    res.json({ participant, plan });
  });

  app.post("/api/jams", (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;

    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    const jam = {
      id: randomUUID(),
      code,
      host_user_id: auth.userId,
      name: req.body?.name || "Weekend Jam",
      status: "open"
    };

    store.jams.push(jam);
    store.jamMembers.push({
      id: randomUUID(),
      jam_id: jam.id,
      user_id: auth.userId,
      role: "host",
      joined_at: NOW().toISOString()
    });

    createNotification({
      userId: auth.userId,
      type: "jam_created",
      title: "Jam created",
      message: `${jam.name} is live. Share code ${jam.code} to invite others.`,
      entityType: "jam",
      entityId: jam.id
    });

    res.json({ jam, link: `/jam/${code}` });
  });

  app.get("/api/jams/:code", (req, res) => {
    const jam = store.jams.find((candidate) => candidate.code === req.params.code.toUpperCase());
    if (!jam) {
      res.status(404).json({ error: "Jam not found" });
      return;
    }

    const members = store.jamMembers.filter((member) => member.jam_id === jam.id);
    res.json({ jam, members_count: members.length });
  });

  app.post("/api/jams/:code/accept", (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;

    const jam = store.jams.find((candidate) => candidate.code === req.params.code.toUpperCase());
    if (!jam) {
      res.status(404).json({ error: "Jam not found" });
      return;
    }

    if (!store.jamMembers.some((member) => member.jam_id === jam.id && member.user_id === auth.userId)) {
      store.jamMembers.push({
        id: randomUUID(),
        jam_id: jam.id,
        user_id: auth.userId,
        role: "member",
        joined_at: NOW().toISOString()
      });

      createNotification({
        userId: jam.host_user_id,
        type: "jam_accepted",
        title: "Jam invite accepted",
        message: `${auth.user.display_name || auth.user.email} accepted your jam invite.`,
        entityType: "jam",
        entityId: jam.id
      });
    }

    res.json({ accepted: true, jam });
  });

  app.post("/api/jams/:code/decline", (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;

    const jam = store.jams.find((candidate) => candidate.code === req.params.code.toUpperCase());
    if (!jam) {
      res.status(404).json({ error: "Jam not found" });
      return;
    }

    store.jamMembers = store.jamMembers.filter((member) => !(member.jam_id === jam.id && member.user_id === auth.userId));

    createNotification({
      userId: jam.host_user_id,
      type: "jam_declined",
      title: "Jam invite declined",
      message: `${auth.user.display_name || auth.user.email} declined your jam invite.`,
      entityType: "jam",
      entityId: jam.id
    });
    res.json({ declined: true, jam });
  });

  app.get("/api/notifications", (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;

    const items = store.notifications
      .filter((notification) => notification.user_id === auth.userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const unread_count = items.filter((notification) => !notification.read).length;
    res.json({ notifications: items, unread_count });
  });

  app.post("/api/notifications/:id/read", (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;

    const notification = store.notifications.find(
      (candidate) => candidate.id === req.params.id && candidate.user_id === auth.userId
    );
    if (!notification) {
      res.status(404).json({ error: "Notification not found" });
      return;
    }

    notification.read = true;
    res.json({ notification });
  });

  app.post("/api/notifications/read-all", (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;

    let updated = 0;
    store.notifications.forEach((notification) => {
      if (notification.user_id !== auth.userId || notification.read) return;
      notification.read = true;
      updated += 1;
    });

    res.json({ updated });
  });

  app.get("/api/study/tasks", (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;

    const tasks = store.studyTasks.filter((task) => task.user_id === auth.userId);
    res.json({ tasks, study_load: computeStudyLoad(auth.userId) });
  });

  app.post("/api/study/tasks", (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;

    const title = String(req.body?.title || "").trim();
    if (!title) {
      res.status(400).json({ error: "title is required" });
      return;
    }

    const task = {
      id: randomUUID(),
      user_id: auth.userId,
      source: req.body?.source || "manual",
      title,
      due_at: req.body?.due_at || new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
      course: req.body?.course || "General",
      duration_min: Number(req.body?.duration_min) || 60,
      done: false
    };
    store.studyTasks.push(task);

    res.json({ task, study_load: computeStudyLoad(auth.userId) });
  });

  app.post("/api/study/tasks/:taskId/toggle", (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;

    const task = store.studyTasks.find((candidate) => candidate.id === req.params.taskId && candidate.user_id === auth.userId);
    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    task.done = !task.done;
    res.json({ task, study_load: computeStudyLoad(auth.userId) });
  });

  app.post("/api/agent/chat", async (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;

    const message = String(req.body?.message || "").trim();
    if (!message) {
      res.status(400).json({ error: "message is required" });
      return;
    }

    const context = normalizeChatContext(req.body?.context, auth.userId);
    const intent = parseMessageIntent(message);
    const recommendations = rankedRecommendations(auth.userId, {
      weather: context.weather || "clear",
      timeOfDay: context.time_of_day || "evening",
      requestedCategories: intent.requestedCategories,
      strictCategoryMatch: intent.strictCategoryMatch
    });

    const cards = recommendations.slice(0, 3).map((item) => ({
      id: item.id,
      title: item.title,
      subtitle: item.description,
      deep_link: item.link,
      reason_tags: item.reason_tags,
      category: item.category,
      score: item.score
    }));

    const proposedActions = [];
    const lower = message.toLowerCase();

    if (lower.includes("plan")) {
      const actionId = randomUUID();
      const payload = {
        type: "create_plan_draft",
        title: "AI Draft Plan",
        constraints: { timeOfDay: "evening", weather: "clear", durationMin: 120 }
      };
      store.pendingActions.set(actionId, payload);
      proposedActions.push({ action_id: actionId, type: payload.type, payload, requires_confirmation: true });
    }

    if (lower.includes("rsvp") || lower.includes("confirm")) {
      const actionId = randomUUID();
      const payload = {
        type: "rsvp_event",
        item_id: cards[0]?.id || store.eventsCatalog[0].id,
        state: "confirmed"
      };
      store.pendingActions.set(actionId, payload);
      proposedActions.push({ action_id: actionId, type: payload.type, payload, requires_confirmation: true });
    }

    if (lower.includes("jam")) {
      const actionId = randomUUID();
      const payload = { type: "join_jam", code: "DEMO42" };
      store.pendingActions.set(actionId, payload);
      proposedActions.push({ action_id: actionId, type: payload.type, payload, requires_confirmation: true });
    }

    if (lower.includes("task") || lower.includes("study")) {
      const actionId = randomUUID();
      const payload = {
        type: "add_study_task",
        title: "AI-added study block",
        due_at: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
        course: "General"
      };
      store.pendingActions.set(actionId, payload);
      proposedActions.push({ action_id: actionId, type: payload.type, payload, requires_confirmation: true });
    }

    if (lower.includes("book") || lower.includes("reservation") || lower.includes("zipcar")) {
      const actionId = randomUUID();
      const payload = { type: "create_booking_intent", provider: "external", item_id: cards[0]?.id || "event-brew-quiet" };
      store.pendingActions.set(actionId, payload);
      proposedActions.push({ action_id: actionId, type: payload.type, payload, requires_confirmation: true });
    }

    const aiReply = await generateStructuredAssistantReply({
      message,
      context,
      cards,
      proposedActions
    });

    const chatId = randomUUID();
    store.aiActionLogs.push({
      id: chatId,
      user_id: auth.userId,
      prompt: message,
      context_json: context,
      cards_json: cards,
      assistant_text: aiReply.assistant_text,
      proposed_actions_json: proposedActions,
      confirmed_action_id: null,
      feedback_events: [],
      created_at: NOW().toISOString()
    });

    const finalCards = sanitizeCardsForIntent(aiReply.cards || cards, cards, intent);

    res.json({
      chat_id: chatId,
      assistant_text: aiReply.assistant_text,
      cards: finalCards,
      proposed_actions: aiReply.proposed_actions || proposedActions
    });
  });

  app.post("/api/agent/feedback", (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;

    const rawSignal = String(req.body?.signal || "").trim().toLowerCase();
    const signal = rawSignal === "helpful" || rawSignal === "up" ? "up" : rawSignal === "not_fit" || rawSignal === "down" ? "down" : null;
    if (!signal) {
      res.status(400).json({ error: "signal is required: helpful|not_fit (or up|down)" });
      return;
    }

    const chatId = String(req.body?.chat_id || "").trim();
    const cardIds = Array.isArray(req.body?.card_ids)
      ? req.body.card_ids.map((id) => String(id)).filter(Boolean).slice(0, 10)
      : [];
    const note = String(req.body?.note || "").trim().slice(0, 500);

    const feedback = {
      id: randomUUID(),
      user_id: auth.userId,
      signal,
      card_ids: cardIds,
      note,
      created_at: NOW().toISOString()
    };

    let attached_to_chat = false;
    if (chatId) {
      const log = store.aiActionLogs.find((row) => row.id === chatId && row.user_id === auth.userId);
      if (log) {
        if (!Array.isArray(log.feedback_events)) log.feedback_events = [];
        log.feedback_events.push(feedback);
        attached_to_chat = true;
      }
    }

    if (!attached_to_chat) {
      store.aiActionLogs.push({
        id: randomUUID(),
        user_id: auth.userId,
        prompt: String(req.body?.prompt || "").trim(),
        context_json: req.body?.context || {},
        cards_json: [],
        assistant_text: "",
        proposed_actions_json: [],
        confirmed_action_id: null,
        feedback_events: [feedback],
        created_at: NOW().toISOString()
      });
    }

    res.json({ ok: true, feedback, attached_to_chat });
  });

  app.post("/api/agent/actions/:actionId/confirm", (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;

    const action = store.pendingActions.get(req.params.actionId);
    if (!action) {
      res.status(404).json({ error: "Action not found or expired" });
      return;
    }

    let result = null;

    if (action.type === "create_plan_draft") {
      const recommendations = rankedRecommendations(auth.userId, { weather: "clear", timeOfDay: "evening" });
      const plan = {
        id: randomUUID(),
        host_user_id: auth.userId,
        title: action.title,
        constraints_json: action.constraints,
        status: "draft",
        finalized_option_json: null,
        created_at: NOW().toISOString(),
        options: generatePlanOptions({ constraints: action.constraints, recommendations })
      };
      store.plans.push(plan);
      result = { plan_id: plan.id, deep_link: `/plans/${plan.id}` };
    }

    if (action.type === "rsvp_event") {
      const row = {
        id: randomUUID(),
        user_id: auth.userId,
        event_id: action.item_id,
        state: action.state,
        expires_at: null,
        created_at: NOW().toISOString()
      };
      store.userEventStates.push(row);
      result = { event_id: row.event_id, state: row.state };
    }

    if (action.type === "join_jam") {
      const jam = store.jams.find((candidate) => candidate.code === action.code);
      result = jam ? { jam_id: jam.id, deep_link: `/jam/${jam.code}` } : { message: "Jam code not found" };
    }

    if (action.type === "add_study_task") {
      const task = {
        id: randomUUID(),
        user_id: auth.userId,
        source: "manual",
        title: action.title,
        due_at: action.due_at,
        course: action.course,
        duration_min: Number(action.duration_min) || 60,
        done: false
      };
      store.studyTasks.push(task);
      result = { task_id: task.id, title: task.title };
    }

    if (action.type === "create_booking_intent") {
      result = {
        provider: "opentable",
        deep_link: "https://www.opentable.com/",
        note: "Complete booking in provider flow."
      };
    }

    const chatId = String(req.body?.chat_id || "").trim();
    if (chatId) {
      const log = store.aiActionLogs.find((row) => row.id === chatId && row.user_id === auth.userId);
      if (log) {
        log.confirmed_action_id = req.params.actionId;
      }
    }

    store.pendingActions.delete(req.params.actionId);
    res.json({ confirmed: true, action_type: action.type, result });
  });

  app.post("/api/booking/intent", (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;

    const itemId = String(req.body?.item_id || "event-brew-quiet").trim();
    const includeGroup = Boolean(req.body?.include_group_availability);
    const item = store.eventsCatalog.find((candidate) => candidate.id === itemId)
      || {
        id: itemId,
        title: itemId.startsWith("restaurant:") ? "Restaurant Recommendation" : "Campus Event Recommendation",
        category: itemId.startsWith("restaurant:") ? "food" : "campus",
        vibe: "chill",
        budget: "medium",
        transport: "walk",
        when: "today",
        free: false,
        rating: 4.3,
        distanceMiles: 1.2,
        reasonTags: ["availability-match"],
        description: "Generated booking intent from mock reservation bot.",
        link: "/explore",
      };
    const { slots, provider, participants } = bookingOptions({ userId: auth.userId, item, includeGroup });
    const overlapSlots = findOverlapSlots(participants, {
      startAt: NOW().toISOString(),
      endAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5).toISOString(),
      minDurationMin: 45,
      limit: 6,
    }).map((slot) => ({
      overlap_id: slot.id,
      start_ts: slot.start_at,
      end_ts: slot.end_at,
      duration_min: slot.duration_min,
      user_ids: slot.user_ids,
    }));

    res.json({
      item,
      provider,
      participants,
      suggested_slots: slots,
      overlap_slots: overlapSlots,
      providers: [
        { name: "Yelp Reservations", deep_link: "https://www.yelp.com/reservations" },
        { name: "Ticketmaster", deep_link: "https://www.ticketmaster.com/" },
        { name: "Cal Poly NOW", deep_link: "https://now.calpoly.edu/" },
        { name: "Google Maps", deep_link: "https://maps.google.com/" }
      ],
      requires_external_completion: true
    });
  });

  app.post("/api/reservation-intents", (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;

    const idempotencyKey = String(req.header("Idempotency-Key") || "").trim();
    if (!idempotencyKey) {
      res.status(400).json({ error: "Idempotency-Key header is required" });
      return;
    }

    const venueId = String(req.body?.venueId || "").trim();
    const datetime = String(req.body?.datetime || "").trim();
    const partySize = normalizePartySize(req.body?.partySize);

    if (!venueId || !datetime || !partySize) {
      res.status(400).json({ error: "venueId, datetime, and valid partySize are required" });
      return;
    }

    const existing = findReservationIntentByIdempotency({ userId: auth.userId, idempotencyKey });
    if (existing) {
      res.json({ intent: existing, idempotent: true });
      return;
    }

    const intent = {
      id: randomUUID(),
      userId: auth.userId,
      venueId,
      datetime,
      partySize,
      status: "pending",
      idempotencyKey,
      createdAt: NOW().toISOString()
    };
    store.reservationIntents.push(intent);

    setTimeout(() => {
      const latest = findReservationIntentById(intent.id);
      if (latest && latest.status === "pending") {
        latest.status = "confirmed";
      }
    }, 1200);

    res.status(201).json({ intent, idempotent: false });
  });

  app.get("/api/reservation-intents/:id", (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;

    const intent = findReservationIntentById(req.params.id);
    if (!intent || intent.userId !== auth.userId) {
      res.status(404).json({ error: "Reservation intent not found" });
      return;
    }

    res.json({ intent });
  });

  app.post("/api/reservation-intents/:id/status", (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;

    const intent = findReservationIntentById(req.params.id);
    if (!intent || intent.userId !== auth.userId) {
      res.status(404).json({ error: "Reservation intent not found" });
      return;
    }

    const nextStatus = String(req.body?.status || "").trim();
    if (!VALID_RESERVATION_TRANSITIONS[intent.status]?.has(nextStatus)) {
      res.status(400).json({
        error: `Invalid status transition from ${intent.status} to ${nextStatus || "(empty)"}`
      });
      return;
    }

    intent.status = nextStatus;
    res.json({ intent });
  });

  app.post("/api/payments/applepay/merchant-session", (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;

    res.json({
      status: "stub",
      message: "Apple Pay merchant validation stub ready. Wire payment processor credentials next phase.",
      merchant_session: null
    });
  });

  app.post("/api/payments/applepay/confirm", (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;

    res.json({
      status: "stub",
      confirmed: false,
      message: "Apple Pay confirmation stub. Real processing is intentionally disabled in v1."
    });
  });
}
