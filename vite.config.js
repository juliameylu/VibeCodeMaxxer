import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

function clampNumber(value, min, max, fallback) {
  const num = Number(value);
  if (Number.isNaN(num)) return fallback;
  return Math.min(max, Math.max(min, num));
}

function toEventCategory(title) {
  const text = String(title || "").toLowerCase();
  if (text.match(/concert|band|dj|choir|music/)) return "Music";
  if (text.match(/talk|lecture|panel|workshop|speaker/)) return "Talks";
  if (text.match(/soccer|basketball|baseball|sport|game|rec/)) return "Sports";
  if (text.match(/club|org|chapter|meeting/)) return "Clubs";
  if (text.match(/theatre|theater|performance|show|dance|comedy/)) return "Performances";
  return "Community";
}

function parseCalPolyEvents(markdown) {
  const lines = markdown.split("\n");
  const events = [];
  const seen = new Set();

  for (const line of lines) {
    const match = line.match(/\[([^\]]+)\]\((https?:\/\/now\.calpoly\.edu\/[^\s)]+)\)/i);
    if (!match) continue;

    const title = match[1].replace(/^#{1,6}\s+/, "").trim();
    const url = match[2];
    if (title.length < 10 || seen.has(url)) continue;
    if (/home|search|menu|skip/i.test(title)) continue;

    const idx = events.length;
    const start = new Date();
    start.setHours(10 + (idx % 8), 0, 0, 0);
    start.setDate(start.getDate() + Math.floor(idx / 3));
    const end = new Date(start);
    end.setHours(start.getHours() + 1, 30, 0, 0);

    events.push({
      id: url,
      title,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      location: "Cal Poly Campus",
      category: toEventCategory(title),
      description: "Live event listing from Cal Poly NOW.",
      url,
    });
    seen.add(url);

    if (events.length >= 30) break;
  }

  return events;
}

async function handlePlaces(req, res) {
  const query = new URL(req.url, "http://localhost").searchParams;
  const apiKey = process.env.YELP_API_KEY;

  if (!apiKey) {
    return sendJson(res, 503, {
      error: "Missing YELP_API_KEY on server. Add it to .env and restart Vite.",
    });
  }

  const category = query.get("category") || "restaurant";
  const queryText = query.get("query") || "";
  const preferences = query.get("preferences") || "";
  const openNow = query.get("openNow") === "true";
  const sortBy = query.get("sortBy") || "best_match";
  const page = clampNumber(query.get("page"), 1, 50, 1);
  const pageSize = clampNumber(query.get("pageSize"), 1, 20, 8);
  const price = query.get("price") || "all";

  const yelpSort = sortBy === "rating" ? "rating" : sortBy === "distance" ? "distance" : "best_match";

  const terms = [queryText, preferences].filter(Boolean).join(" ").trim();
  const categories = category === "coffee" ? "coffee" : "restaurants";

  const upstream = new URL("https://api.yelp.com/v3/businesses/search");
  upstream.searchParams.set("location", process.env.YELP_LOCATION || "San Luis Obispo, CA");
  upstream.searchParams.set("categories", categories);
  upstream.searchParams.set("sort_by", yelpSort);
  upstream.searchParams.set("limit", String(pageSize));
  upstream.searchParams.set("offset", String((page - 1) * pageSize));
  if (terms) upstream.searchParams.set("term", terms);
  if (price !== "all") upstream.searchParams.set("price", String(Math.min(4, Math.max(1, price.length))));
  if (openNow) upstream.searchParams.set("open_now", "true");

  const upstreamRes = await fetch(upstream, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
  });

  const payload = await upstreamRes.json().catch(() => ({}));
  if (!upstreamRes.ok) {
    return sendJson(res, upstreamRes.status, {
      error: payload?.error?.description || "Yelp request failed",
    });
  }

  const businesses = Array.isArray(payload.businesses) ? payload.businesses : [];
  const items = businesses.map((biz) => ({
    id: biz.id,
    name: biz.name,
    category: category === "coffee" ? "coffee" : "restaurant",
    rating: biz.rating || 0,
    price: biz.price || "$",
    distanceMeters: Math.round(biz.distance || 0),
    imageUrl: biz.image_url || "",
    isOpenNow: biz.is_closed === false,
    address: biz.location?.display_address?.join(", ") || "Address unavailable",
    url: biz.url || "https://www.yelp.com",
  }));

  return sendJson(res, 200, {
    items,
    total: payload.total || items.length,
    page,
    pageSize,
    hasMore: (page - 1) * pageSize + items.length < (payload.total || 0),
  });
}

async function handleEvents(req, res) {
  const query = new URL(req.url, "http://localhost").searchParams;
  const timeRange = query.get("timeRange") || "today";
  const category = query.get("category") || "all";
  const searchQuery = (query.get("query") || "").toLowerCase();

  const source = process.env.CALPOLY_EVENTS_SOURCE || "https://r.jina.ai/http://now.calpoly.edu/";
  const upstreamRes = await fetch(source);
  const text = await upstreamRes.text();

  if (!upstreamRes.ok) {
    return sendJson(res, upstreamRes.status, { error: "Failed to fetch Cal Poly events source." });
  }

  let items = parseCalPolyEvents(text);
  const now = new Date();
  const weekEnd = new Date(now);
  weekEnd.setDate(now.getDate() + 7);

  items = items.filter((event) => {
    const start = new Date(event.startTime);

    const timeOk =
      timeRange === "today"
        ? start.toDateString() === now.toDateString()
        : timeRange === "tonight"
          ? start.toDateString() === now.toDateString() && (start.getHours() >= 17 || start.getHours() < 3)
          : start >= now && start <= weekEnd;

    const categoryOk = category === "all" || event.category.toLowerCase() === category;
    const queryOk = !searchQuery || `${event.title} ${event.description} ${event.location}`.toLowerCase().includes(searchQuery);

    return timeOk && categoryOk && queryOk;
  });

  return sendJson(res, 200, { items, total: items.length });
}

function localApiPlugin() {
  return {
    name: "local-api-plugin",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        try {
          if (req.url?.startsWith("/api/places")) {
            await handlePlaces(req, res);
            return;
          }
          if (req.url?.startsWith("/api/events")) {
            await handleEvents(req, res);
            return;
          }
          next();
        } catch (error) {
          sendJson(res, 500, {
            error: error instanceof Error ? error.message : "Unexpected server error",
          });
        }
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use(async (req, res, next) => {
        try {
          if (req.url?.startsWith("/api/places")) {
            await handlePlaces(req, res);
            return;
          }
          if (req.url?.startsWith("/api/events")) {
            await handleEvents(req, res);
            return;
          }
          next();
        } catch (error) {
          sendJson(res, 500, {
            error: error instanceof Error ? error.message : "Unexpected server error",
          });
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), localApiPlugin()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:8787",
      "/health": "http://localhost:8787",
    },
  },
});
