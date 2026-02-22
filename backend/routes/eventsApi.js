import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Router } from "express";

const router = Router();
const DEFAULT_CALPOLY_EVENTS_SOURCE = "https://r.jina.ai/http://now.calpoly.edu/";
const DEFAULT_TICKETMASTER_CITY = "San Luis Obispo";

function slugify(input) {
  return String(input || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function ensureEventId(rawId) {
  const trimmed = String(rawId || "").trim();
  if (!trimmed) return `event:generated:${Date.now()}`;
  return trimmed.startsWith("event:") ? trimmed : `event:${trimmed}`;
}

function normalizeCategory(input) {
  const text = String(input || "").trim().toLowerCase();
  if (text.includes("music") || text.includes("concert")) return "Music";
  if (text.includes("sport") || text.includes("game")) return "Sports";
  if (text.includes("talk") || text.includes("lecture") || text.includes("panel")) return "Talks";
  if (text.includes("club") || text.includes("org")) return "Clubs";
  if (text.includes("perform") || text.includes("theatre") || text.includes("comedy")) return "Performances";
  return "Community";
}

function startOfToday(date = new Date()) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function plusHours(base, hours) {
  return new Date(base.getTime() + hours * 60 * 60 * 1000);
}

function isTonight(date) {
  const hour = date.getHours();
  return hour >= 17 || hour < 3;
}

function inThisWeek(date, now) {
  const end = new Date(now);
  end.setDate(now.getDate() + 7);
  return date >= now && date <= end;
}

function parseTimeRange(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "tonight") return "tonight";
  if (normalized === "week") return "week";
  if (normalized === "all") return "all";
  return "today";
}

function normalizeCalPolyUrl(url) {
  if (!url) return "https://now.calpoly.edu/";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return `https://now.calpoly.edu${url}`;
  return "https://now.calpoly.edu/";
}

function inferCategoryFromTitle(title) {
  return normalizeCategory(title);
}

function parseCalPolyLinkEvents(markdownText) {
  const linkPattern = /\[([^\]\n]{5,})\]\((https?:\/\/[^\s)]+|\/[^\s)]+)\)/g;
  const seen = new Set();
  const out = [];
  const now = new Date();
  const base = startOfToday(now);
  base.setHours(17, 30, 0, 0);

  let index = 0;
  let match = linkPattern.exec(markdownText);
  while (match) {
    const title = String(match[1] || "").trim();
    const url = normalizeCalPolyUrl(String(match[2] || "").trim());
    const key = `${title.toLowerCase()}|${url}`;

    if (
      title
      && !seen.has(key)
      && !title.toLowerCase().includes("image")
      && !title.toLowerCase().startsWith("http")
    ) {
      seen.add(key);
      const start = plusHours(base, index * 18);
      const end = plusHours(start, 2);
      out.push({
        id: ensureEventId(`calpoly-now:${slugify(title)}:${index + 1}`),
        title,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        location: "Cal Poly Campus",
        category: inferCategoryFromTitle(title),
        description: "Imported from Cal Poly NOW.",
        url,
        source: "calpoly_now",
      });
      index += 1;
    }

    if (out.length >= 30) break;
    match = linkPattern.exec(markdownText);
  }

  return out;
}

function getFixtureFilePath() {
  const routesDir = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(routesDir, "..", "..");
  return path.resolve(repoRoot, "src", "mocks", "fixtures", "events.json");
}

function loadFixtureEvents() {
  const filePath = getFixtureFilePath();
  if (!fs.existsSync(filePath)) return [];

  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item, index) => {
        if (!item || typeof item !== "object") return null;
        const start = String(item.startTime || "");
        const end = String(item.endTime || "");
        if (!start || !end) return null;
        return {
          id: ensureEventId(String(item.id || `fixture-${index}`)),
          title: String(item.title || "Campus Event"),
          startTime: new Date(start).toISOString(),
          endTime: new Date(end).toISOString(),
          location: String(item.location || "Cal Poly"),
          category: normalizeCategory(String(item.category || "Community")),
          description: String(item.description || "Campus event"),
          url: String(item.url || "https://now.calpoly.edu/"),
          source: String(item.source || "fixture"),
        };
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

async function fetchCalPolyNowEvents() {
  const sourceUrl = String(process.env.CALPOLY_EVENTS_SOURCE || DEFAULT_CALPOLY_EVENTS_SOURCE).trim();
  if (!sourceUrl) return [];

  const response = await fetch(sourceUrl, {
    headers: { Accept: "text/plain, text/html, application/json" },
  });

  if (!response.ok) {
    throw new Error(`Cal Poly NOW scrape request failed (${response.status})`);
  }

  const text = await response.text();
  const parsed = parseCalPolyLinkEvents(text).map((event) => ({
    ...event,
    url: normalizeCalPolyUrl(event.url),
  }));
  if (parsed.length > 0) return parsed;

  return loadFixtureEvents().slice(0, 20).map((event, index) => ({
    ...event,
    id: ensureEventId(`calpoly-fixture:${event.id}:${index}`),
    url: normalizeCalPolyUrl(event.url),
    source: "calpoly_now",
  }));
}

function buildTicketmasterFallbackEvents() {
  const base = startOfToday();
  base.setHours(19, 0, 0, 0);

  const seeds = [
    { title: "Downtown SLO Indie Night", location: "SLO Brew Rock", category: "Music" },
    { title: "Mustang Arena Showcase", location: "Alex G. Spanos Stadium", category: "Sports" },
    { title: "Central Coast Speaker Series", location: "Cal Poly PAC", category: "Talks" },
    { title: "Comedy at the Mission", location: "Fremont Theater", category: "Performances" },
    { title: "Local Makers Pop-Up", location: "Downtown SLO", category: "Community" },
  ];

  return seeds.map((seed, index) => {
    const start = plusHours(base, index * 24);
    const end = plusHours(start, 2);
    return {
      id: ensureEventId(`ticketmaster:${slugify(seed.title)}:${index + 1}`),
      title: seed.title,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      location: seed.location,
      category: seed.category,
      description: `Ticketmaster-style listing for ${seed.title}.`,
      url: `https://www.ticketmaster.com/search?q=${encodeURIComponent(seed.title)}`,
      source: "ticketmaster",
    };
  });
}

function toIsoOrFallback(dateTime, fallback) {
  const value = String(dateTime || "").trim();
  if (!value) return fallback.toISOString();
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return fallback.toISOString();
  return parsed.toISOString();
}

async function fetchTicketmasterEvents() {
  const apiKey = String(process.env.TICKETMASTER_API_KEY || "").trim();
  if (!apiKey) {
    return buildTicketmasterFallbackEvents();
  }

  const city = String(process.env.TICKETMASTER_CITY || DEFAULT_TICKETMASTER_CITY).trim();
  const countryCode = String(process.env.TICKETMASTER_COUNTRY_CODE || "US").trim();
  const stateCode = String(process.env.TICKETMASTER_STATE_CODE || "CA").trim();
  const size = Math.max(1, Math.min(50, Number.parseInt(process.env.TICKETMASTER_RESULT_LIMIT || "20", 10) || 20));

  const endpoint = new URL("https://app.ticketmaster.com/discovery/v2/events.json");
  endpoint.searchParams.set("apikey", apiKey);
  endpoint.searchParams.set("city", city);
  endpoint.searchParams.set("countryCode", countryCode);
  endpoint.searchParams.set("stateCode", stateCode);
  endpoint.searchParams.set("sort", "date,asc");
  endpoint.searchParams.set("size", String(size));

  const response = await fetch(endpoint.toString(), {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Ticketmaster request failed (${response.status})`);
  }

  const payload = await response.json();
  const events = Array.isArray(payload?._embedded?.events) ? payload._embedded.events : [];
  if (events.length === 0) return buildTicketmasterFallbackEvents();

  return events
    .map((event, index) => {
      const title = String(event?.name || "Ticketmaster Event");
      const url = String(event?.url || `https://www.ticketmaster.com/search?q=${encodeURIComponent(title)}`);

      const venue = Array.isArray(event?._embedded?.venues) ? event._embedded.venues[0] || {} : {};
      const location = String(venue?.name || city);

      const classifications = Array.isArray(event?.classifications) ? event.classifications : [];
      const primaryClassification = classifications[0] || {};
      const segment = primaryClassification?.segment?.name;
      const genre = primaryClassification?.genre?.name;
      const category = normalizeCategory(String(segment || genre || "Community"));

      const fallbackStart = plusHours(startOfToday(new Date()), 24 + index * 8);
      const dates = event?.dates || {};
      const startData = dates?.start || {};
      const startDateTime = startData?.dateTime || "";
      const localDate = String(startData?.localDate || "");
      const localTime = String(startData?.localTime || "19:00:00");
      const assembledLocal = localDate ? `${localDate}T${localTime}` : "";
      const startTime = toIsoOrFallback(startDateTime || assembledLocal, fallbackStart);
      const endTime = plusHours(new Date(startTime), 2).toISOString();

      return {
        id: ensureEventId(`ticketmaster:${String(event?.id || index)}`),
        title,
        startTime,
        endTime,
        location,
        category,
        description: `Ticketmaster event: ${title}`,
        url,
        source: "ticketmaster",
      };
    })
    .filter(Boolean);
}

function dedupeById(events) {
  const map = new Map();
  events.forEach((event) => {
    if (!event?.id) return;
    map.set(event.id, event);
  });
  return Array.from(map.values()).sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
  );
}

function applyFilters(items, { timeRange, category, query }) {
  const now = new Date();
  const normalizedCategory = String(category || "all").trim().toLowerCase();
  const normalizedQuery = String(query || "").trim().toLowerCase();

  return items.filter((event) => {
    const start = new Date(event.startTime);
    if (Number.isNaN(start.getTime())) return false;

    const categoryOk = normalizedCategory === "all" || String(event.category || "").toLowerCase() === normalizedCategory;
    const queryText = `${event.title} ${event.location} ${event.description}`.toLowerCase();
    const queryOk = !normalizedQuery || queryText.includes(normalizedQuery);

    let timeOk = true;
    if (timeRange === "today") {
      timeOk = start.toDateString() === now.toDateString();
    } else if (timeRange === "tonight") {
      timeOk = start.toDateString() === now.toDateString() && isTonight(start);
    } else if (timeRange === "week") {
      timeOk = inThisWeek(start, now);
    }

    return categoryOk && queryOk && timeOk;
  });
}

function getSupabaseConfig() {
  const url = String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "")
    .trim()
    .replace(/\/+$/g, "");
  const serviceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  const anonKey = String(process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "").trim();

  if (url && serviceRoleKey) return { url, key: serviceRoleKey };
  if (url && anonKey) return { url, key: anonKey };
  return { url: "", key: "" };
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

async function upsertSupabaseEvents(events) {
  const config = getSupabaseConfig();
  if (!hasSupabaseConfig(config) || events.length === 0) return false;

  const rows = events.map((event) => ({
    id: event.id,
    title: event.title,
    category: event.category,
    description: event.description,
    payload: {
      startTime: event.startTime,
      endTime: event.endTime,
      location: event.location,
      url: event.url,
      source: event.source,
    },
  }));

  await callSupabaseRest(config, "events_catalog?on_conflict=id", {
    method: "POST",
    headers: {
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(rows),
  });

  return true;
}

async function collectSourceEvents() {
  const [calPolyResult, ticketmasterResult] = await Promise.allSettled([
    fetchCalPolyNowEvents(),
    fetchTicketmasterEvents(),
  ]);

  const events = [];
  const errors = [];

  if (calPolyResult.status === "fulfilled") {
    events.push(...calPolyResult.value);
  } else {
    errors.push(`Cal Poly NOW: ${calPolyResult.reason instanceof Error ? calPolyResult.reason.message : "unknown error"}`);
  }

  if (ticketmasterResult.status === "fulfilled") {
    events.push(...ticketmasterResult.value);
  } else {
    errors.push(`Ticketmaster: ${ticketmasterResult.reason instanceof Error ? ticketmasterResult.reason.message : "unknown error"}`);
  }

  if (events.length === 0) {
    events.push(...loadFixtureEvents());
  }

  return { events: dedupeById(events), errors };
}

router.get("/api/events", async (req, res) => {
  const timeRange = parseTimeRange(req.query.timeRange);
  const category = String(req.query.category || "all");
  const query = String(req.query.query || "");

  try {
    const { events, errors } = await collectSourceEvents();
    const filtered = applyFilters(events, { timeRange, category, query });

    let persisted = false;
    try {
      persisted = await upsertSupabaseEvents(events);
    } catch {
      persisted = false;
    }

    res.json({
      items: filtered,
      total: filtered.length,
      source: persisted ? "live_sources+supabase_upsert" : "live_sources",
      sync: {
        ok: true,
        upserted: events.length,
        sourceErrors: errors,
        syncedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Could not load events.",
    });
  }
});

router.get("/api/events/calpoly-now", async (_req, res) => {
  try {
    const items = await fetchCalPolyNowEvents();
    res.json({
      items,
      total: items.length,
      source: "calpoly_now",
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Could not load Cal Poly NOW events.",
    });
  }
});

export default router;
