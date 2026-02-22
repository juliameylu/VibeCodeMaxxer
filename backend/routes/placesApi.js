import { Router } from "express";

const router = Router();

function clampInt(value, min, max, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function toPriceParam(price) {
  if (!price || price === "all") return null;
  const mapped = Math.max(1, Math.min(4, String(price).length));
  return String(mapped);
}

function toSortParam(sortBy) {
  if (sortBy === "rating") return "rating";
  if (sortBy === "distance") return "distance";
  return "best_match";
}

function normalizePlaceCategory(category) {
  return category === "coffee" ? "coffee" : "restaurant";
}

router.get("/api/places", async (req, res) => {
  const apiKey = process.env.YELP_API_KEY;
  if (!apiKey) {
    res.status(503).json({
      error: "Missing YELP_API_KEY on backend. Set it in your shell and restart backend.",
    });
    return;
  }

  const category = String(req.query.category || "restaurant").trim().toLowerCase();
  const queryText = String(req.query.query || "").trim();
  const preferencesText = String(req.query.preferences || "").trim();
  const openNow = String(req.query.openNow || "false").toLowerCase() === "true";
  const sortBy = toSortParam(String(req.query.sortBy || "best_match").trim().toLowerCase());
  const page = clampInt(req.query.page, 1, 50, 1);
  const pageSize = clampInt(req.query.pageSize, 1, 50, 24);
  const price = String(req.query.price || "all").trim();

  const term = [queryText, preferencesText].filter(Boolean).join(" ").trim();
  const yelpCategories = category === "coffee" ? "coffee,coffeeroasteries,cafes" : "restaurants";
  const location = String(process.env.YELP_LOCATION || "San Luis Obispo, CA").trim();

  const upstream = new URL("https://api.yelp.com/v3/businesses/search");
  upstream.searchParams.set("location", location);
  upstream.searchParams.set("categories", yelpCategories);
  upstream.searchParams.set("sort_by", sortBy);
  upstream.searchParams.set("limit", String(pageSize));
  upstream.searchParams.set("offset", String((page - 1) * pageSize));
  if (term) upstream.searchParams.set("term", term);
  if (openNow) upstream.searchParams.set("open_now", "true");

  const yelpPrice = toPriceParam(price);
  if (yelpPrice) upstream.searchParams.set("price", yelpPrice);

  try {
    const upstreamRes = await fetch(upstream.toString(), {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
    });

    const payload = await upstreamRes.json().catch(() => ({}));
    if (!upstreamRes.ok) {
      const message =
        payload && typeof payload === "object" && payload?.error?.description
          ? payload.error.description
          : `Yelp request failed (${upstreamRes.status})`;
      res.status(upstreamRes.status).json({ error: message });
      return;
    }

    const businesses = Array.isArray(payload?.businesses) ? payload.businesses : [];
    const items = businesses.map((biz) => ({
      id: String(biz?.id || ""),
      name: String(biz?.name || "Restaurant"),
      category: normalizePlaceCategory(category),
      rating: Number(biz?.rating || 0),
      price: String(biz?.price || "$") || "$",
      distanceMeters: Math.round(Number(biz?.distance || 0)),
      imageUrl: String(biz?.image_url || ""),
      isOpenNow: biz?.is_closed === false,
      address: Array.isArray(biz?.location?.display_address)
        ? biz.location.display_address.join(", ")
        : "Address unavailable",
      url: String(biz?.url || "https://www.yelp.com"),
      categories: Array.isArray(biz?.categories)
        ? biz.categories.map((row) => ({
            alias: String(row?.alias || ""),
            title: String(row?.title || ""),
          }))
        : [],
      transactions: Array.isArray(biz?.transactions)
        ? biz.transactions.map((row) => String(row || ""))
        : [],
    }));

    const total = Number(payload?.total || items.length);
    res.json({
      items,
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total,
      source: "yelp",
    });
  } catch (error) {
    res.status(502).json({
      error: error instanceof Error ? `Yelp upstream request failed: ${error.message}` : "Yelp upstream request failed.",
    });
  }
});

export default router;
