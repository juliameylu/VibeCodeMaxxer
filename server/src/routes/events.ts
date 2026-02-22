import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Router } from "express";
import { shortStableSuffix } from "../store/ids.js";

const router = Router();

const DEFAULT_CALPOLY_EVENTS_SOURCE = "https://r.jina.ai/http://now.calpoly.edu/";
const DEFAULT_TICKETMASTER_CITY = "San Luis Obispo";
const EVENT_RETENTION_DAYS = Math.max(1, Number.parseInt(process.env.EVENT_RETENTION_DAYS || "14", 10) || 14);
const EVENTS_SYNC_COOLDOWN_MS = Math.max(
  10_000,
  Number.parseInt(process.env.EVENTS_SYNC_COOLDOWN_MS || "120000", 10) || 120_000,
);

type TimeRange = "today" | "tonight" | "week" | "all";

interface CampusEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  location: string;
  category: string;
  description: string;
  url: string;
  source: "calpoly_now" | "ticketmaster" | "fixture";
}

interface SupabaseEventRow {
  id: string;
  title: string;
  category: string;
  description: string | null;
  payload: {
    startTime?: string;
    endTime?: string;
    location?: string;
    url?: string;
    source?: string;
  } | null;
  created_at?: string;
}

interface SyncSummary {
  ok: boolean;
  syncedAt: string;
  upserted: number;
  staleDeleted: number;
  sourceErrors: string[];
  warning?: string;
}

interface SupabaseConfig {
  url: string;
  key: string;
  keySource: "service_role" | "anon" | "none";
}

let lastSyncSummary: SyncSummary | null = null;
let syncInFlight: Promise<SyncSummary> | null = null;

function ensureEventId(rawId: string): string {
  const trimmed = String(rawId || "").trim();
  if (!trimmed) {
    return `event:generated:${shortStableSuffix(String(Date.now()))}`;
  }
  return trimmed.startsWith("event:") ? trimmed : `event:${trimmed}`;
}

function parseTimeRange(value: unknown): TimeRange {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "tonight") return "tonight";
  if (normalized === "week") return "week";
  if (normalized === "all") return "all";
  return "today";
}

function normalizeCategory(input: string): string {
  const text = String(input || "").trim().toLowerCase();
  if (text.includes("music") || text.includes("concert")) return "Music";
  if (text.includes("sport") || text.includes("game")) return "Sports";
  if (text.includes("talk") || text.includes("lecture") || text.includes("panel")) return "Talks";
  if (text.includes("club") || text.includes("org")) return "Clubs";
  if (text.includes("perform") || text.includes("theatre") || text.includes("comedy")) return "Performances";
  if (text.includes("community") || text.includes("volunteer") || text.includes("network")) return "Community";
  return "Community";
}

function inferCategoryFromTitle(title: string): string {
  return normalizeCategory(title);
}

function slugify(input: string): string {
  return String(input || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function startOfToday(date = new Date()): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function plusHours(base: Date, hours: number): Date {
  return new Date(base.getTime() + hours * 60 * 60 * 1000);
}

function isTonight(date: Date): boolean {
  const hour = date.getHours();
  return hour >= 17 || hour < 3;
}

function inThisWeek(date: Date, now: Date): boolean {
  const end = new Date(now);
  end.setDate(now.getDate() + 7);
  return date >= now && date <= end;
}

function getSupabaseConfig(): SupabaseConfig {
  const url = String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "")
    .trim()
    .replace(/\/+$/g, "");
  const serviceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  const anonKey = String(process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "").trim();
  if (url && serviceRoleKey) {
    return { url, key: serviceRoleKey, keySource: "service_role" };
  }
  if (url && anonKey) {
    return { url, key: anonKey, keySource: "anon" };
  }
  return { url: "", key: "", keySource: "none" };
}

function hasSupabaseConfig(config: SupabaseConfig): boolean {
  return Boolean(config.url && config.key);
}

async function callSupabaseRest(
  config: SupabaseConfig,
  pathWithQuery: string,
  init: RequestInit = {},
): Promise<unknown> {
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
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text) as unknown;
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    const message =
      typeof payload === "object" && payload && "message" in payload
        ? String((payload as { message?: unknown }).message || "Supabase REST request failed.")
        : typeof payload === "object" && payload && "error" in payload
          ? String((payload as { error?: unknown }).error || "Supabase REST request failed.")
          : `Supabase REST request failed (${response.status})`;
    throw new Error(message);
  }

  return payload;
}

function getFixtureFilePath(): string {
  const routesDir = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(routesDir, "..", "..", "..");
  return path.resolve(repoRoot, "src", "mocks", "fixtures", "events.json");
}

function loadFixtureEvents(): CampusEvent[] {
  const filePath = getFixtureFilePath();
  if (!fs.existsSync(filePath)) return [];

  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item): CampusEvent | null => {
        if (!item || typeof item !== "object") return null;
        const row = item as Record<string, unknown>;
        const start = String(row.startTime || "");
        const end = String(row.endTime || "");
        if (!start || !end) return null;
        return {
          id: ensureEventId(String(row.id || shortStableSuffix(start))),
          title: String(row.title || "Campus Event"),
          startTime: new Date(start).toISOString(),
          endTime: new Date(end).toISOString(),
          location: String(row.location || "Cal Poly"),
          category: normalizeCategory(String(row.category || "Community")),
          description: String(row.description || "Campus event"),
          url: String(row.url || "https://now.calpoly.edu/"),
          source: "fixture",
        };
      })
      .filter((event): event is CampusEvent => Boolean(event));
  } catch {
    return [];
  }
}

function buildTicketmasterFallbackEvents(): CampusEvent[] {
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
    const slug = slugify(seed.title);
    return {
      id: ensureEventId(`ticketmaster:${slug}:${index + 1}`),
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

function toIsoOrFallback(dateTime: unknown, fallback: Date): string {
  const value = String(dateTime || "");
  if (!value) return fallback.toISOString();
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return fallback.toISOString();
  return parsed.toISOString();
}

async function fetchTicketmasterEvents(): Promise<CampusEvent[]> {
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

  const payload = (await response.json()) as {
    _embedded?: { events?: Array<Record<string, unknown>> };
  };

  const events = Array.isArray(payload?._embedded?.events) ? payload._embedded?.events : [];
  if (!events || events.length === 0) {
    return buildTicketmasterFallbackEvents();
  }

  return events
    .map((event, index): CampusEvent | null => {
      const id = ensureEventId(`ticketmaster:${String(event.id || index)}`);
      const title = String(event.name || "Ticketmaster Event");
      const url = String(event.url || `https://www.ticketmaster.com/search?q=${encodeURIComponent(title)}`);

      const venue = Array.isArray((event._embedded as { venues?: Array<Record<string, unknown>> } | undefined)?.venues)
        ? ((event._embedded as { venues?: Array<Record<string, unknown>> }).venues?.[0] || {})
        : {};
      const location = String((venue as Record<string, unknown>).name || city);

      const classifications = Array.isArray(event.classifications)
        ? (event.classifications as Array<Record<string, unknown>>)
        : [];
      const primaryClassification = classifications[0] || {};
      const segment = (primaryClassification.segment as Record<string, unknown> | undefined)?.name;
      const genre = (primaryClassification.genre as Record<string, unknown> | undefined)?.name;
      const category = normalizeCategory(String(segment || genre || "Community"));

      const now = new Date();
      const fallbackStart = plusHours(startOfToday(now), 24 + index * 8);
      const dates = event.dates as Record<string, unknown> | undefined;
      const startData = dates?.start as Record<string, unknown> | undefined;
      const startDateTime = startData?.dateTime || "";
      const localDate = String(startData?.localDate || "");
      const localTime = String(startData?.localTime || "19:00:00");
      const assembledLocal = localDate ? `${localDate}T${localTime}` : "";
      const startTime = toIsoOrFallback(startDateTime || assembledLocal, fallbackStart);
      const endTime = plusHours(new Date(startTime), 2).toISOString();

      return {
        id,
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
    .filter((event): event is CampusEvent => Boolean(event));
}

function normalizeCalPolyUrl(url: string): string {
  if (!url) return "https://now.calpoly.edu/";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return `https://now.calpoly.edu${url}`;
  return "https://now.calpoly.edu/";
}

function parseCalPolyLinkEvents(markdownText: string): CampusEvent[] {
  const linkPattern = /\[([^\]\n]{5,})\]\((https?:\/\/[^\s)]+|\/[^\s)]+)\)/g;
  const seen = new Set<string>();
  const now = new Date();
  const base = startOfToday(now);
  base.setHours(17, 30, 0, 0);
  const out: CampusEvent[] = [];
  let match: RegExpExecArray | null = linkPattern.exec(markdownText);
  let index = 0;

  while (match) {
    const title = String(match[1] || "").trim();
    const url = normalizeCalPolyUrl(String(match[2] || "").trim());
    const key = `${title.toLowerCase()}|${url}`;
    const titleLooksValid = !title.toLowerCase().includes("image") && !title.toLowerCase().startsWith("http");

    if (titleLooksValid && !seen.has(key)) {
      seen.add(key);
      const start = plusHours(base, index * 18);
      const end = plusHours(start, 2);
      const slug = slugify(title) || shortStableSuffix(key);
      out.push({
        id: ensureEventId(`calpoly-now:${slug}:${index + 1}`),
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

async function fetchCalPolyNowEvents(): Promise<CampusEvent[]> {
  const sourceUrl = String(process.env.CALPOLY_EVENTS_SOURCE || DEFAULT_CALPOLY_EVENTS_SOURCE).trim();
  if (!sourceUrl) {
    return [];
  }

  const response = await fetch(sourceUrl, {
    headers: { Accept: "text/plain, text/html, application/json" },
  });
  if (!response.ok) {
    throw new Error(`Cal Poly NOW scrape request failed (${response.status})`);
  }
  const text = await response.text();
  const parsed = parseCalPolyLinkEvents(text);
  if (parsed.length > 0) return parsed;
  return loadFixtureEvents().slice(0, 20).map((event, index) => ({
    ...event,
    id: ensureEventId(`calpoly-fixture:${event.id}:${index}`),
    source: "calpoly_now",
  }));
}

function dedupeById(events: CampusEvent[]): CampusEvent[] {
  const map = new Map<string, CampusEvent>();
  events.forEach((event) => {
    if (!event?.id) return;
    map.set(event.id, event);
  });
  return Array.from(map.values()).sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
  );
}

function applyFilters(
  items: CampusEvent[],
  options: { timeRange: TimeRange; category: string; query: string },
): CampusEvent[] {
  const now = new Date();
  const category = options.category.trim().toLowerCase();
  const query = options.query.trim().toLowerCase();

  return items.filter((event) => {
    const start = new Date(event.startTime);
    if (Number.isNaN(start.getTime())) return false;

    const categoryOk = category === "all" || event.category.toLowerCase() === category;
    const queryText = `${event.title} ${event.location} ${event.description}`.toLowerCase();
    const queryOk = !query || queryText.includes(query);

    let timeOk = true;
    if (options.timeRange === "today") {
      timeOk = start.toDateString() === now.toDateString();
    } else if (options.timeRange === "tonight") {
      timeOk = start.toDateString() === now.toDateString() && isTonight(start);
    } else if (options.timeRange === "week") {
      timeOk = inThisWeek(start, now);
    }

    return categoryOk && queryOk && timeOk;
  });
}

function supabaseRowToCampusEvent(row: SupabaseEventRow): CampusEvent | null {
  if (!row || !row.id) return null;
  const payload = row.payload || {};
  const fallbackStart = new Date();
  fallbackStart.setHours(fallbackStart.getHours() + 6);
  const startTime = toIsoOrFallback(payload.startTime, fallbackStart);
  const endTime = toIsoOrFallback(payload.endTime, plusHours(new Date(startTime), 2));
  return {
    id: ensureEventId(row.id),
    title: String(row.title || "Campus Event"),
    startTime,
    endTime,
    location: String(payload.location || "San Luis Obispo"),
    category: normalizeCategory(String(row.category || "Community")),
    description: String(row.description || "Campus event"),
    url: String(payload.url || "https://now.calpoly.edu/"),
    source: String(payload.source || "fixture").includes("ticketmaster") ? "ticketmaster" : "calpoly_now",
  };
}

async function loadSupabaseEvents(config: SupabaseConfig): Promise<CampusEvent[]> {
  if (!hasSupabaseConfig(config)) return [];

  const payload = await callSupabaseRest(
    config,
    "events_catalog?select=id,title,category,description,payload,created_at&order=created_at.desc&limit=500",
  );

  if (!Array.isArray(payload)) return [];
  return payload
    .map((row) => supabaseRowToCampusEvent(row as SupabaseEventRow))
    .filter((row): row is CampusEvent => Boolean(row));
}

async function upsertSupabaseEvents(config: SupabaseConfig, events: CampusEvent[]): Promise<void> {
  if (!hasSupabaseConfig(config) || events.length === 0) return;

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
}

async function pruneStaleSupabaseEvents(config: SupabaseConfig, retentionDays: number): Promise<number> {
  if (!hasSupabaseConfig(config)) return 0;

  const payload = await callSupabaseRest(
    config,
    "events_catalog?select=id,payload,created_at&order=created_at.asc&limit=1000",
  );
  if (!Array.isArray(payload)) return 0;

  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const staleIds = payload
    .map((row) => {
      const item = row as { id?: unknown; payload?: { startTime?: unknown } | null; created_at?: unknown };
      const id = String(item.id || "");
      if (!id) return "";
      const payloadStart = String(item.payload?.startTime || "");
      const createdAt = String(item.created_at || "");
      const startMs = payloadStart ? new Date(payloadStart).getTime() : Number.NaN;
      const createdMs = createdAt ? new Date(createdAt).getTime() : Number.NaN;
      const compareMs = Number.isFinite(startMs) ? startMs : createdMs;
      return compareMs < cutoff ? id : "";
    })
    .filter(Boolean);

  for (const id of staleIds) {
    await callSupabaseRest(config, `events_catalog?id=eq.${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: {
        Prefer: "return=minimal",
      },
    });
  }
  return staleIds.length;
}

async function collectSourceEvents(): Promise<{ events: CampusEvent[]; errors: string[] }> {
  const [calPolyResult, ticketmasterResult] = await Promise.allSettled([
    fetchCalPolyNowEvents(),
    fetchTicketmasterEvents(),
  ]);

  const events: CampusEvent[] = [];
  const errors: string[] = [];

  if (calPolyResult.status === "fulfilled") {
    events.push(...calPolyResult.value);
  } else {
    errors.push(`Cal Poly NOW: ${calPolyResult.reason instanceof Error ? calPolyResult.reason.message : "unknown error"}`);
  }

  if (ticketmasterResult.status === "fulfilled") {
    events.push(...ticketmasterResult.value);
  } else {
    errors.push(
      `Ticketmaster: ${ticketmasterResult.reason instanceof Error ? ticketmasterResult.reason.message : "unknown error"}`,
    );
  }

  if (events.length === 0) {
    events.push(...loadFixtureEvents());
  }

  return { events: dedupeById(events), errors };
}

async function syncEventsToSupabase(force: boolean): Promise<SyncSummary> {
  const config = getSupabaseConfig();
  const now = new Date();

  if (!hasSupabaseConfig(config)) {
    const summary: SyncSummary = {
      ok: false,
      syncedAt: now.toISOString(),
      upserted: 0,
      staleDeleted: 0,
      sourceErrors: [],
      warning: "Supabase is not configured for backend events sync.",
    };
    lastSyncSummary = summary;
    return summary;
  }

  if (
    !force
    && lastSyncSummary
    && Date.now() - new Date(lastSyncSummary.syncedAt).getTime() < EVENTS_SYNC_COOLDOWN_MS
  ) {
    return lastSyncSummary;
  }

  if (syncInFlight) {
    return syncInFlight;
  }

  syncInFlight = (async () => {
    const { events, errors } = await collectSourceEvents();
    await upsertSupabaseEvents(config, events);
    const staleDeleted = await pruneStaleSupabaseEvents(config, EVENT_RETENTION_DAYS);
    const summary: SyncSummary = {
      ok: true,
      syncedAt: new Date().toISOString(),
      upserted: events.length,
      staleDeleted,
      sourceErrors: errors,
      warning:
        config.keySource === "anon"
          ? "Using anon key for backend sync; prefer SUPABASE_SERVICE_ROLE_KEY."
          : undefined,
    };
    lastSyncSummary = summary;
    return summary;
  })();

  try {
    return await syncInFlight;
  } finally {
    syncInFlight = null;
  }
}

export async function warmSyncEventsOnStartup(): Promise<void> {
  try {
    const summary = await syncEventsToSupabase(true);
    if (!summary.ok && summary.warning) {
      // eslint-disable-next-line no-console
      console.warn(`[events] warm sync skipped: ${summary.warning}`);
      return;
    }
    // eslint-disable-next-line no-console
    console.log(
      `[events] warm sync complete (${summary.upserted} upserted, ${summary.staleDeleted} stale deleted) at ${summary.syncedAt}`,
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn(`[events] warm sync failed: ${error instanceof Error ? error.message : "unknown error"}`);
  }
}

router.get("/api/events", async (req, res) => {
  const timeRange = parseTimeRange(req.query.timeRange);
  const category = String(req.query.category || "all");
  const query = String(req.query.query || "");
  const refresh = String(req.query.refresh || "false").toLowerCase() === "true";

  try {
    const syncSummary = await syncEventsToSupabase(refresh);
    const config = getSupabaseConfig();
    let events = await loadSupabaseEvents(config);

    if (events.length === 0) {
      const collected = await collectSourceEvents();
      events = collected.events;
    }

    const filtered = applyFilters(events, { timeRange, category, query });
    res.json({
      items: filtered,
      total: filtered.length,
      source: events.length > 0 && hasSupabaseConfig(config) ? "supabase_events_catalog" : "live_sources",
      sync: syncSummary,
      retention_days: EVENT_RETENTION_DAYS,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Could not load events.",
    });
  }
});

export default router;
