import fixtures from "../../mocks/fixtures/places.json";
import { DEMO_PLACE_SEMANTIC_META } from "../../mocks/fixtures/placeSemanticMeta";
import { matchPlaceToPreferences } from "../recommendation/preferenceMatching";
import { httpGetJson } from "./http";
import { withApiBase } from "./baseUrl";

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";

function normalizeString(value) {
  return String(value || "").toLowerCase();
}

function enrichDemoPlace(place) {
  const meta = DEMO_PLACE_SEMANTIC_META[place?.id];
  if (!meta) return place;
  return { ...place, ...meta };
}

function placeSearchText(place) {
  const fields = [
    place?.name,
    place?.address,
    ...(Array.isArray(place?.cuisine_tags) ? place.cuisine_tags : []),
    ...(Array.isArray(place?.menu_tags) ? place.menu_tags : []),
    ...(Array.isArray(place?.attribute_tags) ? place.attribute_tags : []),
    ...(Array.isArray(place?.review_snippets) ? place.review_snippets : []),
  ];
  return normalizeString(fields.filter(Boolean).join(" "));
}

export async function searchPlaces(params = {}) {
  if (DEMO_MODE) {
    const {
      category = "restaurant",
      price = "all",
      query = "",
      preferences = [],
      openNow = false,
      sortBy = "best_match",
      page = 1,
      pageSize = 8,
    } = params;

    let results = fixtures.map(enrichDemoPlace).filter((place) => {
      const categoryOk = category === "all" || place.category === category;
      const priceOk = price === "all" || place.price === price;
      const openOk = !openNow || place.isOpenNow;

      const queryText = placeSearchText(place);
      const queryOk = !query || queryText.includes(normalizeString(query));

      const prefOk = matchPlaceToPreferences(place, preferences);

      return categoryOk && priceOk && openOk && queryOk && prefOk;
    });

    if (sortBy === "rating") {
      results = [...results].sort((a, b) => b.rating - a.rating);
    } else if (sortBy === "distance") {
      results = [...results].sort((a, b) => a.distanceMeters - b.distanceMeters);
    }

    const total = results.length;
    const start = (page - 1) * pageSize;
    const items = results.slice(start, start + pageSize);

    return {
      items,
      total,
      page,
      pageSize,
      hasMore: start + pageSize < total,
    };
  }

  // TODO: wire this endpoint to a server-side Yelp proxy (e.g. /api/places or Supabase Edge Function).
  // Never call Yelp directly from the client with secret keys.
  const search = new URLSearchParams({
    category: params.category || "restaurant",
    price: params.price || "all",
    query: params.query || "",
    preferences: (params.preferences || []).join(","),
    openNow: String(Boolean(params.openNow)),
    sortBy: params.sortBy || "best_match",
    page: String(params.page || 1),
    pageSize: String(params.pageSize || 8),
  });

  return httpGetJson(withApiBase(`/api/places?${search.toString()}`));
}
