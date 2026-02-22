import "dotenv/config";
import express from "express";
import cors from "cors";
import * as cheerio from "cheerio";
import { registerPlannerApi } from "./plannerApi.js";

const app = express();
const PORT = Number(process.env.BACKEND_PORT || 8787);
const TARGET_URL = "https://www.fremontslo.com/shows/";
const EVENTS_API_URL = new URL("/wp-json/tribe/events/v1/events?per_page=50", TARGET_URL).toString();
const CACHE_TTL_MS = Number(process.env.SHOWS_CACHE_TTL_MS || 1000 * 60 * 30);
const IMAGE_CACHE_TTL_MS = Number(process.env.IMAGE_CACHE_TTL_MS || 1000 * 60 * 60 * 24);

app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:5173" }));
app.use(express.json());

let cache = null;
let refreshInFlight = null;
const eventImageCache = new Map();

function normalizeText(value) {
  return (value || "").replace(/\s+/g, " ").trim();
}

function absoluteUrl(value) {
  if (!value) return "";
  try {
    return new URL(value, TARGET_URL).toString();
  } catch {
    return value;
  }
}

function pickText($root, selectors) {
  for (const selector of selectors) {
    const text = normalizeText($root.find(selector).first().text());
    if (text) return text;
  }
  return "";
}

function parseShows(html) {
  const $ = cheerio.load(html);

  const containers = [
    ".tribe-events-calendar-list__event-row",
    ".tribe-events-pro-photo__event",
    ".tribe-events-list__event-row",
    ".event",
    "article"
  ];

  const seen = new Set();
  const shows = [];

  const dateRegex = /(Mon|Tue|Wed|Thu|Fri|Sat|Sun),\s+[A-Za-z]+\s+\d{1,2},\s+\d{4}/;

  function findEventContainer($el) {
    let current = $el;
    for (let i = 0; i < 8 && current.length; i += 1) {
      const text = normalizeText(current.text());
      if (dateRegex.test(text) && text.length > 25) {
        return current;
      }
      current = current.parent();
    }
    return $el.parent();
  }

  function parseFromContainer($container, $moreInfoLink) {
    const rawText = normalizeText($container.text());
    const dateMatch = rawText.match(dateRegex);

    if (!dateMatch) return null;

    const date = dateMatch[0];
    const beforeDate = normalizeText(rawText.slice(0, dateMatch.index));
    const afterDate = normalizeText(rawText.slice((dateMatch.index ?? 0) + date.length));

    const title = beforeDate
      .replace(/UPCOMING EVENTS/gi, "")
      .replace(/View as (List|Grid|Calendar)/gi, "")
      .replace(/Tickets?/gi, "")
      .replace(/More Info/gi, "")
      .trim();

    if (!title || title.length < 2) return null;

    const detail = afterDate
      .split(/Tickets?/i)[0]
      .replace(/More Info/gi, "")
      .trim();

    const ticketsHref =
      $container
        .find('a[href*="ticket"], a[href*="prekindle"], a[href*="eventbrite"], a[href*="etix"], a[href*="axs"], a[href*="showclix"]')
        .first()
        .attr("href") || "";

    const moreInfoHref = $moreInfoLink.attr("href") || "";
    const imageSrc =
      $container.find("img").first().attr("src") ||
      $container.find("img").first().attr("data-src") ||
      $container.find("img").first().attr("data-lazy-src") ||
      "";

    return {
      id: title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
      title,
      date,
      detail,
      link: absoluteUrl(moreInfoHref),
      tickets: absoluteUrl(ticketsHref),
      image: absoluteUrl(imageSrc)
    };
  }

  containers.forEach((selector) => {
    $(selector).each((_, node) => {
      const $node = $(node);

      const title = pickText($node, [
        ".tribe-event-title a",
        ".tribe-events-calendar-list__event-title a",
        ".tribe-events-pro-photo__event-title a",
        ".tribe-events-list-event-title a",
        "h2 a",
        "h3 a",
        "h4 a"
      ]);

      if (!title || seen.has(title.toLowerCase())) return;

      const date = pickText($node, [
        ".tribe-event-date-start",
        ".tribe-events-calendar-list__event-date-tag-datetime",
        ".tribe-events-pro-photo__event-datetime",
        ".tribe-events-schedule",
        "time"
      ]);

      const link =
        $node.find("a[href]").first().attr("href") ||
        "";

      const tickets =
        $node.find('a[href*="ticket"], a[href*="eventbrite"], a[href*="etix"], a[href*="axs"], a[href*="showclix"]').first().attr("href") ||
        "";
      const image =
        $node.find("img").first().attr("src") ||
        $node.find("img").first().attr("data-src") ||
        $node.find("img").first().attr("data-lazy-src") ||
        "";

      shows.push({
        id: `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        title,
        date: normalizeText(date),
        detail: "",
        link,
        tickets,
        image
      });

      seen.add(title.toLowerCase());
    });
  });

  if (shows.length === 0) {
    $('a[href]').each((_, node) => {
      const $link = $(node);
      const linkText = normalizeText($link.text()).toLowerCase();
      if (linkText !== "more info") return;

      const container = findEventContainer($link);
      const parsed = parseFromContainer(container, $link);
      if (!parsed) return;

      if (seen.has(parsed.title.toLowerCase())) return;
      seen.add(parsed.title.toLowerCase());
      shows.push(parsed);
    });
  }

  return shows.slice(0, 60).map((item) => ({
    ...item,
    link: absoluteUrl(item.link),
    tickets: absoluteUrl(item.tickets),
    image: absoluteUrl(item.image)
  }));
}

function flattenJsonLd(value, output) {
  if (!value) return;
  if (Array.isArray(value)) {
    value.forEach((item) => flattenJsonLd(item, output));
    return;
  }
  if (typeof value !== "object") return;
  output.push(value);
  if (value["@graph"]) flattenJsonLd(value["@graph"], output);
  if (value.mainEntity) flattenJsonLd(value.mainEntity, output);
  if (value.itemListElement) flattenJsonLd(value.itemListElement, output);
}

function parseJsonLdShows(html) {
  const $ = cheerio.load(html);
  const nodes = [];
  const shows = [];
  const seen = new Set();

  $('script[type="application/ld+json"]').each((_, node) => {
    const raw = normalizeText($(node).html());
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      flattenJsonLd(parsed, nodes);
    } catch {
      // Skip invalid script blocks.
    }
  });

  function getImageFromJsonLd(item) {
    const value = item?.image;
    if (!value) return "";
    if (typeof value === "string") return value;
    if (Array.isArray(value)) {
      const first = value[0];
      if (typeof first === "string") return first;
      return normalizeText(first?.url || first?.contentUrl || "");
    }
    return normalizeText(value?.url || value?.contentUrl || "");
  }

  nodes.forEach((item) => {
    const rawType = item["@type"];
    const types = Array.isArray(rawType) ? rawType : [rawType];
    const isEvent = types.some((type) => String(type || "").toLowerCase() === "event");
    if (!isEvent) return;

    const title = normalizeText(item.name);
    if (!title) return;

    const date = normalizeText(item.startDate);
    const detail = normalizeText(item.description || item.eventStatus || "");
    const link = normalizeText(item.url || "");
    const tickets = normalizeText(item.offers?.url || "");
    const image = normalizeText(getImageFromJsonLd(item));
    const key = `${title.toLowerCase()}|${date.toLowerCase()}`;

    if (seen.has(key)) return;
    seen.add(key);

    shows.push({
      id: title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
      title,
      date,
      detail,
      link,
      tickets,
      image: absoluteUrl(image)
    });
  });

  return shows;
}

async function fetchWithHeaders(url, accept) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    return await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: accept,
        "Accept-Language": "en-US,en;q=0.9",
        Referer: TARGET_URL
      },
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchEventPageImage(link) {
  if (!link) return "";

  const cached = eventImageCache.get(link);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.image;
  }

  try {
    const res = await fetchWithHeaders(link, "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8");
    if (!res.ok) return "";

    const html = await res.text();
    const $ = cheerio.load(html);

    const ogImage = normalizeText($('meta[property="og:image"]').attr("content"));
    const twitterImage = normalizeText($('meta[name="twitter:image"]').attr("content"));
    const featuredImage =
      normalizeText($(".tribe-events-event-image img").first().attr("src")) ||
      normalizeText($(".tribe-events-event-image img").first().attr("data-src")) ||
      normalizeText($("article img").first().attr("src"));

    const resolved = absoluteUrl(ogImage || twitterImage || featuredImage);
    if (resolved) {
      eventImageCache.set(link, { image: resolved, expiresAt: Date.now() + IMAGE_CACHE_TTL_MS });
    }
    return resolved;
  } catch {
    return "";
  }
}

async function enrichImagesFromEventPages(shows, maxEnrich = 8) {
  const missing = shows
    .map((show, index) => ({ show, index }))
    .filter(({ show }) => !show.image && show.link)
    .slice(0, maxEnrich);

  if (missing.length === 0) {
    return { shows, enrichedCount: 0, attemptedCount: 0 };
  }

  const results = await Promise.all(
    missing.map(async ({ index, show }) => {
      const image = await fetchEventPageImage(show.link);
      return { index, image };
    })
  );

  const nextShows = [...shows];
  let enrichedCount = 0;

  results.forEach(({ index, image }) => {
    if (!image) return;
    nextShows[index] = { ...nextShows[index], image };
    enrichedCount += 1;
  });

  return { shows: nextShows, enrichedCount, attemptedCount: missing.length };
}

function normalizeApiEvent(event) {
  const title = normalizeText(event?.title);
  if (!title) return null;

  const dateText =
    normalizeText(event?.start_date_details?.month_name) &&
    normalizeText(event?.start_date_details?.day)
      ? `${normalizeText(event.start_date_details.month_name)} ${normalizeText(event.start_date_details.day)}, ${normalizeText(event.start_date_details.year)}`
      : normalizeText(event?.start_date || event?.start_date_utc || "");

  const image =
    normalizeText(event?.image?.url) ||
    normalizeText(event?.featured_image?.url) ||
    normalizeText(event?.featured_media?.url) ||
    "";

  return {
    id: String(event?.id || title.toLowerCase().replace(/[^a-z0-9]+/g, "-")),
    title,
    date: dateText,
    detail: normalizeText(event?.description || event?.excerpt || ""),
    link: normalizeText(event?.url || ""),
    tickets: normalizeText(event?.website || event?.cost_details?.url || ""),
    image: absoluteUrl(image)
  };
}

async function scrapeShows() {
  const debug = {
    api: { attempted: false, status: null, error: "" },
    html: { attempted: false, status: null, error: "" },
    imageEnrichment: { attempted: 0, filled: 0 }
  };

  try {
    debug.api.attempted = true;
    const apiRes = await fetchWithHeaders(EVENTS_API_URL, "application/json");
    debug.api.status = apiRes.status;

    if (apiRes.ok) {
      const apiData = await apiRes.json();
      const events = Array.isArray(apiData?.events) ? apiData.events : [];
      const rawShows = events.map(normalizeApiEvent).filter(Boolean).slice(0, 60);
      const enriched = await enrichImagesFromEventPages(rawShows);
      debug.imageEnrichment.attempted = enriched.attemptedCount;
      debug.imageEnrichment.filled = enriched.enrichedCount;
      const shows = enriched.shows;

      if (shows.length > 0) {
        return {
          source: EVENTS_API_URL,
          fetchedAt: new Date().toISOString(),
          count: shows.length,
          shows,
          debug
        };
      }
    }
  } catch (error) {
    debug.api.error = error instanceof Error ? error.message : "Unknown API error";
  }

  try {
    debug.html.attempted = true;
    const res = await fetchWithHeaders(TARGET_URL, "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8");
    debug.html.status = res.status;

    if (!res.ok) {
      throw new Error(`Failed to fetch Fremont page: ${res.status}`);
    }

    const html = await res.text();
    const parsedHtmlShows = parseShows(html);
    const jsonLdShows = parseJsonLdShows(html);

    const combined = [];
    const seen = new Set();
    [...parsedHtmlShows, ...jsonLdShows].forEach((show) => {
      const key = `${normalizeText(show.title).toLowerCase()}|${normalizeText(show.date).toLowerCase()}`;
      if (!show.title || seen.has(key)) return;
      seen.add(key);
      combined.push(show);
    });

    const enriched = await enrichImagesFromEventPages(combined.slice(0, 60));
    debug.imageEnrichment.attempted = enriched.attemptedCount;
    debug.imageEnrichment.filled = enriched.enrichedCount;

    return {
      source: TARGET_URL,
      fetchedAt: new Date().toISOString(),
      count: enriched.shows.length,
      shows: enriched.shows,
      debug
    };
  } catch (error) {
    debug.html.error = error instanceof Error ? error.message : "Unknown HTML error";
  }

  return {
    source: TARGET_URL,
    fetchedAt: new Date().toISOString(),
    count: 0,
    shows: [],
    debug
  };
}

function isCacheFresh(value) {
  if (!value?.fetchedAt) return false;
  const fetchedMs = new Date(value.fetchedAt).getTime();
  if (Number.isNaN(fetchedMs)) return false;
  return Date.now() - fetchedMs < CACHE_TTL_MS;
}

async function refreshCache(reason = "manual") {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const fresh = await scrapeShows();
    cache = {
      ...fresh,
      cache: {
        reason,
        ttlMs: CACHE_TTL_MS,
        stale: false
      }
    };
    return cache;
  })()
    .finally(() => {
      refreshInFlight = null;
    });

  return refreshInFlight;
}

app.get("/health", (_, res) => {
  res.json({ ok: true, service: "fremont-shows-backend" });
});

app.get("/api/figma/test", async (_, res) => {
  const apiKey = process.env.FIGMA_API_KEY;
  const fileKey = process.env.FIGMA_FILE_KEY;

  if (!apiKey || !fileKey) {
    res.status(500).json({ error: "Missing FIGMA_API_KEY or FIGMA_FILE_KEY in backend environment." });
    return;
  }

  try {
    const response = await fetch(`https://api.figma.com/v1/files/${fileKey}`, {
      headers: { "X-Figma-Token": apiKey }
    });
    const data = await response.json();

    if (!response.ok) {
      res.status(response.status).json({
        error: "Figma API request failed",
        details: data
      });
      return;
    }

    res.json({
      ok: true,
      name: data?.name || "",
      lastModified: data?.lastModified || "",
      version: data?.version || "",
      role: data?.role || ""
    });
  } catch (error) {
    res.status(500).json({
      error: "Figma request error",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

app.get("/api/fremont-shows", async (req, res) => {
  const forceRefresh = req.query.refresh === "1";

  try {
    if (forceRefresh) {
      const fresh = await refreshCache("force");
      return res.json({ ...fresh, cacheHit: false });
    }

    if (!cache) {
      const fresh = await refreshCache("cold-start");
      return res.json({ ...fresh, cacheHit: false });
    }

    if (isCacheFresh(cache)) {
      return res.json({ ...cache, cacheHit: true, cache: { ...cache.cache, stale: false } });
    }

    // Stale-while-revalidate: return stale data immediately and refresh in background.
    if (!refreshInFlight) {
      refreshCache("stale-revalidate").catch(() => {});
    }

    return res.json({
      ...cache,
      cacheHit: true,
      cache: { ...cache.cache, stale: true, refreshing: Boolean(refreshInFlight) }
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to scrape Fremont shows",
      error: error instanceof Error ? error.message : "Unknown error",
      ...(cache ? { staleCache: cache } : {})
    });
  }
});

registerPlannerApi(app);

app.listen(PORT, () => {
  console.log(`Fremont scraper backend running on http://localhost:${PORT}`);
});
