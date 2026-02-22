import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import * as cheerio from "cheerio";
import fs from "fs/promises";
import { registerPlannerApi } from "./plannerApi.js";
import eventsRouter from "./routes/eventsApi.js";
import placesRouter from "./routes/placesApi.js";
import reservationsRouter from "./routes/mockReservationsApi.js";

dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local", override: true });

const app = express();
const PORT = Number(process.env.BACKEND_PORT || 8787);
const HOST = process.env.BACKEND_HOST || "0.0.0.0";
const TARGET_URL = "https://www.fremontslo.com/shows/";
const EVENTS_API_URL = new URL("/wp-json/tribe/events/v1/events?per_page=50", TARGET_URL).toString();
const DEFAULT_SLOCAL_OUTDOOR_URL = "https://www.slocal.com/things-to-do/outdoor-activities/";
const DEFAULT_TRAILS_CSV_PATH = "/Users/kalanisterling/Downloads/Proposed_Trails.csv";
const DEFAULT_WIKIPEDIA_CATEGORY_URL =
  "https://en.wikipedia.org/wiki/Category:Tourist_attractions_in_San_Luis_Obispo_County,_California";
const CAL_POLY_NOW_URL = "https://now.calpoly.edu/events";

const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173,http://localhost:5174")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }
      callback(null, allowedOrigins.includes(origin));
    }
  })
);
app.use(express.json({ limit: "1mb" }));

let cache = null;

function normalizeText(value) {
  return (value || "").replace(/\s+/g, " ").trim();
}

function toId(value) {
  return normalizeText(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function absoluteUrl(value) {
  if (!value) return "";
  try {
    return new URL(value, TARGET_URL).toString();
  } catch {
    return value;
  }
}

function absoluteUrlFrom(base, value) {
  if (!value) return "";
  try {
    return new URL(value, base).toString();
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

    return absoluteUrl(ogImage || twitterImage || featuredImage);
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

function parseSimpleCsvLine(line) {
  const cells = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      const next = line[i + 1];
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      cells.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current);
  return cells.map((cell) => normalizeText(cell));
}

async function importTrailsFromCsv(csvPath = DEFAULT_TRAILS_CSV_PATH) {
  const raw = await fs.readFile(csvPath, "utf8");
  const lines = raw.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) return [];

  const header = parseSimpleCsvLine(lines[0]);
  const idxPlanningArea = header.findIndex((h) => h.toLowerCase() === "planning_area");
  const idxTrailName = header.findIndex((h) => h.toLowerCase() === "trail_name");
  const idxTrailRoute = header.findIndex((h) => h.toLowerCase() === "trail_route");
  const idxLength = header.findIndex((h) => h.toLowerCase() === "shapestlength");

  const dedup = new Map();

  for (let i = 1; i < lines.length; i += 1) {
    const row = parseSimpleCsvLine(lines[i]);
    const planningArea = normalizeText(idxPlanningArea >= 0 ? row[idxPlanningArea] : "");
    const trailName = normalizeText(idxTrailName >= 0 ? row[idxTrailName] : "");
    const trailRoute = normalizeText(idxTrailRoute >= 0 ? row[idxTrailRoute] : "");
    const shapeLength = normalizeText(idxLength >= 0 ? row[idxLength] : "");
    const bestName = trailName || trailRoute;
    if (!bestName || bestName.length < 2) continue;

    const key = `${bestName.toLowerCase()}|${planningArea.toLowerCase()}`;
    const miles = Number(shapeLength) ? Number(shapeLength) / 1609.34 : null;

    const existing = dedup.get(key);
    if (!existing) {
      dedup.set(key, {
        id: `trail-${toId(bestName)}-${toId(planningArea || "countywide")}`,
        title: bestName,
        category: "Hikes",
        subcategory: "Proposed Trail",
        city: "San Luis Obispo County",
        location: planningArea || "Countywide",
        distance: miles ? `${miles.toFixed(1)} miles` : "Varies",
        price: "Free",
        rating: 4.2,
        features: ["outdoor", "proposed", "group friendly"],
        tags: ["trail", "proposed", "slo county"],
        website: "",
        source: "Proposed_Trails.csv",
      });
    } else if (miles) {
      const currentMiles = Number(existing.distance.split(" ")[0]);
      if (Number.isFinite(currentMiles) && miles > currentMiles) {
        existing.distance = `${miles.toFixed(1)} miles`;
      }
    }
  }

  return Array.from(dedup.values()).sort((a, b) => a.title.localeCompare(b.title)).slice(0, 250);
}

function scrapeSlocalOutdoorActivities(html, baseUrl = DEFAULT_SLOCAL_OUTDOOR_URL) {
  const $ = cheerio.load(html);
  const seen = new Set();
  const results = [];

  const candidateSelectors = [
    "main a[href]",
    ".entry-content a[href]",
    ".content a[href]",
    "article a[href]",
    "a[href*='/things-to-do/']"
  ];

  candidateSelectors.forEach((selector) => {
    $(selector).each((_, node) => {
      const $node = $(node);
      const title = normalizeText($node.text());
      const href = normalizeText($node.attr("href"));

      if (!title || title.length < 3) return;
      if (!href || href.startsWith("#")) return;
      if (/read more|learn more|view all|click here|next|prev/i.test(title)) return;

      const key = title.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);

      results.push({
        id: `slocal-${toId(title)}`,
        title,
        category: "Outdoors",
        subcategory: "SLOCAL Outdoor Activities",
        city: "San Luis Obispo",
        location: "San Luis Obispo County",
        distance: "Varies",
        price: "Free",
        rating: 4.3,
        features: ["outdoor", "group friendly"],
        tags: ["slocal", "outdoor", "local guide"],
        website: absoluteUrlFrom(baseUrl, href || baseUrl),
        source: baseUrl
      });
    });
  });

  return results.slice(0, 120);
}

function scrapeWikipediaCategoryAttractions(html, baseUrl = DEFAULT_WIKIPEDIA_CATEGORY_URL) {
  const $ = cheerio.load(html);
  const seen = new Set();
  const spots = [];

  const selectors = [
    "#mw-pages .mw-category-group li a",
    "#mw-pages li a",
    ".mw-category li a"
  ];

  selectors.forEach((selector) => {
    $(selector).each((_, node) => {
      const $node = $(node);
      const title = normalizeText($node.text());
      const href = normalizeText($node.attr("href"));
      if (!title || title.length < 2) return;
      if (!href || !href.startsWith("/wiki/")) return;
      if (title.toLowerCase().startsWith("category:")) return;

      const key = title.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);

      spots.push({
        id: `wikipedia-${toId(title)}`,
        title,
        category: "Outdoors",
        subcategory: "Wikipedia Tourist Attraction",
        city: "San Luis Obispo County",
        location: "San Luis Obispo County",
        distance: "Varies",
        price: "Free",
        rating: 4.2,
        features: ["outdoor", "group friendly", "walkable"],
        tags: ["wikipedia", "tourist attraction", "slo county"],
        website: absoluteUrlFrom(baseUrl, href),
        source: baseUrl
      });
    });
  });

  return spots.slice(0, 250);
}

app.get("/health", (_, res) => {
  res.json({ ok: true, service: "fremont-shows-backend" });
});

app.get("/api/fremont-shows", async (req, res) => {
  const forceRefresh = req.query.refresh === "1";

  try {
    const hadCacheBeforeRequest = Boolean(cache);
    if (!cache || forceRefresh) {
      cache = await scrapeShows();
    }

    res.json({ ...cache, cacheHit: !forceRefresh && hadCacheBeforeRequest });
  } catch (error) {
    res.status(500).json({
      message: "Failed to scrape Fremont shows",
      error: error instanceof Error ? error.message : "Unknown error",
      ...(cache ? { staleCache: cache } : {})
    });
  }
});

app.get("/api/import/slocal-outdoor", async (req, res) => {
  const url = normalizeText(req.query.url) || DEFAULT_SLOCAL_OUTDOOR_URL;
  try {
    const response = await fetchWithHeaders(url, "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8");
    if (!response.ok) {
      res.status(502).json({ error: "Failed to fetch source URL", status: response.status, url });
      return;
    }
    const html = await response.text();
    const spots = scrapeSlocalOutdoorActivities(html, url);
    res.json({
      ok: true,
      source: url,
      count: spots.length,
      spots
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: "Failed to import from SLOCAL outdoor page",
      details: error instanceof Error ? error.message : "Unknown error",
      source: url
    });
  }
});

app.get("/api/import/wikipedia-category", async (req, res) => {
  const url = normalizeText(req.query.url) || DEFAULT_WIKIPEDIA_CATEGORY_URL;
  try {
    const response = await fetchWithHeaders(url, "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8");
    if (!response.ok) {
      res.status(502).json({ error: "Failed to fetch Wikipedia category page", status: response.status, source: url });
      return;
    }
    const html = await response.text();
    const spots = scrapeWikipediaCategoryAttractions(html, url);
    res.json({
      ok: true,
      source: url,
      count: spots.length,
      spots
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: "Failed to import Wikipedia category attractions",
      details: error instanceof Error ? error.message : "Unknown error",
      source: url
    });
  }
});

app.post("/api/import/proposed-trails-csv", async (req, res) => {
  const csvPath = normalizeText(req.body?.csv_path) || DEFAULT_TRAILS_CSV_PATH;
  try {
    const spots = await importTrailsFromCsv(csvPath);
    res.json({
      ok: true,
      source: csvPath,
      count: spots.length,
      spots
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: "Failed to parse proposed trails CSV",
      details: error instanceof Error ? error.message : "Unknown error",
      source: csvPath
    });
  }
});

app.get("/api/calpoly-now/events", async (req, res) => {
  const interests = String(req.query.interests || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  try {
    const response = await fetchWithHeaders(CAL_POLY_NOW_URL, "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8");
    if (!response.ok) {
      res.status(502).json({ error: "Failed to fetch Cal Poly NOW", status: response.status });
      return;
    }
    const html = await response.text();
    const $ = cheerio.load(html);
    const events = [];
    $("article, .event-item, .view-content .views-row").each((_, node) => {
      const root = $(node);
      const title = normalizeText(root.find("h2, h3, .field-content a").first().text());
      const summary = normalizeText(root.find("p, .summary, .field-content").first().text());
      const link = absoluteUrlFrom(CAL_POLY_NOW_URL, root.find("a[href]").first().attr("href") || "");
      if (!title) return;
      events.push({
        id: `cpnow-${toId(title)}`,
        title,
        summary,
        category: "campus",
        link,
        source: CAL_POLY_NOW_URL
      });
    });

    const deduped = Array.from(new Map(events.map((event) => [event.id, event])).values());
    const filtered = interests.length
      ? deduped.filter((event) => {
          const haystack = `${event.title} ${event.summary}`.toLowerCase();
          return interests.some((interest) => haystack.includes(interest));
        })
      : deduped;

    res.json({ ok: true, source: CAL_POLY_NOW_URL, count: filtered.length, events: filtered.slice(0, 30) });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: "Failed to scrape Cal Poly NOW",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

app.use(eventsRouter);
app.use(placesRouter);
app.use(reservationsRouter);

registerPlannerApi(app);

app.listen(PORT, HOST, () => {
  console.log(`Fremont scraper backend running on http://${HOST}:${PORT}`);
});
