import { scorePlacePreferenceMatch } from "./preferenceMatching";

const STORAGE_KEY = "restaurant_reco_profile_v1";
const IMPRESSION_KEY = "restaurant_reco_impressions_v1";
const MAX_HISTORY = 600;
const DEFAULT_EPSILON = 0.15;

const ACTION_WEIGHT = {
  impression: 0.3,
  open: 2.0,
  book: 4.2,
  like: 3.4,
  dismiss: -3.2,
};

function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2);
}

function loadProfile() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { history: [] };
    const parsed = JSON.parse(raw);
    return { history: Array.isArray(parsed.history) ? parsed.history.slice(-MAX_HISTORY) : [] };
  } catch {
    return { history: [] };
  }
}

function saveProfile(profile) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ history: profile.history.slice(-MAX_HISTORY) }));
}

function normalizeScores(values) {
  if (!values.length) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) return values.map(() => 0.5);
  return values.map((value) => (value - min) / (max - min));
}

function buildTagWeights(history) {
  const now = Date.now();
  const halfLifeDays = 12;
  const weights = new Map();

  history.forEach((entry) => {
    const base = ACTION_WEIGHT[entry.action] ?? 0;
    if (!base) return;

    const ageDays = Math.max(0, (now - entry.at) / (1000 * 60 * 60 * 24));
    const decay = Math.pow(0.5, ageDays / halfLifeDays);

    tokenize(entry.text).forEach((token) => {
      const prev = weights.get(token) || 0;
      weights.set(token, prev + base * decay);
    });
  });

  return weights;
}

function textAffinity(place, tokenWeights) {
  const tokens = tokenize(`${place.name} ${place.category} ${place.address} ${place.price}`);
  if (!tokens.length) return 0;
  let score = 0;
  tokens.forEach((token) => {
    score += tokenWeights.get(token) || 0;
  });
  return score / tokens.length;
}

function novelty(placeId, history) {
  const seen = history.filter((row) => row.itemId === placeId && row.action === "impression").length;
  return 1 / (1 + seen);
}

function preferenceScore(place, prefs) {
  return scorePlacePreferenceMatch(place, prefs);
}

function explorationRows(rows, count) {
  return [...rows]
    .sort((a, b) => a.seenCount - b.seenCount)
    .slice(0, count);
}

export function trackRestaurantAction({ itemId, text, action }) {
  const profile = loadProfile();
  profile.history.push({
    at: Date.now(),
    itemId,
    text,
    action,
  });
  saveProfile(profile);
}

export function trackRestaurantImpressionsOncePerSession(items, getId, getText, limit = 8) {
  try {
    const raw = sessionStorage.getItem(IMPRESSION_KEY);
    const seen = new Set(raw ? JSON.parse(raw) : []);
    let changed = false;

    items.slice(0, limit).forEach((item) => {
      const id = getId(item);
      if (!id || seen.has(id)) return;
      trackRestaurantAction({ itemId: id, text: getText(item), action: "impression" });
      seen.add(id);
      changed = true;
    });

    if (changed) {
      sessionStorage.setItem(IMPRESSION_KEY, JSON.stringify([...seen]));
    }
  } catch {
    // ignore
  }
}

export function clearRestaurantProfile() {
  localStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(IMPRESSION_KEY);
}

export function rankRestaurants({ items, activePreferences = [], epsilon = DEFAULT_EPSILON }) {
  const profile = loadProfile();
  const tokenWeights = buildTagWeights(profile.history);
  const safeItems = Array.isArray(items)
    ? items.filter((item) => item && typeof item === "object")
    : [];

  const rawRows = safeItems.map((place) => {
    const quality = Number(place.rating || 0);
    const distance = Number(place.distanceMeters || 0);
    const distanceScore = distance > 0 ? 1 / distance : 0;
    const openBoost = place.isOpenNow ? 1 : 0;
    const affinity = textAffinity(place, tokenWeights);
    const preference = preferenceScore(place, activePreferences);
    const noveltyScore = novelty(place.id, profile.history);
    const seenCount = profile.history.filter(
      (row) => row.itemId === place.id && row.action === "impression",
    ).length;

    return {
      place,
      quality,
      distanceScore,
      openBoost,
      affinity,
      preference,
      noveltyScore,
      seenCount,
    };
  });

  const qualityNorm = normalizeScores(rawRows.map((row) => row.quality));
  const distanceNorm = normalizeScores(rawRows.map((row) => row.distanceScore));
  const affinityNorm = normalizeScores(rawRows.map((row) => row.affinity));
  const preferenceNorm = normalizeScores(rawRows.map((row) => row.preference));
  const noveltyNorm = normalizeScores(rawRows.map((row) => row.noveltyScore));

  const rankedRows = rawRows
    .map((row, index) => ({
      ...row,
      score:
        qualityNorm[index] * 0.3 +
        distanceNorm[index] * 0.15 +
        affinityNorm[index] * 0.25 +
        preferenceNorm[index] * 0.2 +
        noveltyNorm[index] * 0.05 +
        row.openBoost * 0.05,
    }))
    .sort((a, b) => b.score - a.score);

  const exploreCount = Math.max(1, Math.round(rankedRows.length * epsilon));
  const explore = explorationRows(rankedRows, exploreCount);
  const exploreIds = new Set(explore.map((row) => row.place.id));

  const base = rankedRows.slice(0, Math.max(0, rankedRows.length - exploreCount));
  const merged = [...base, ...rankedRows.filter((row) => exploreIds.has(row.place.id))];

  const deduped = [];
  const used = new Set();
  merged.forEach((row) => {
    const id = row.place.id;
    if (!id || used.has(id)) return;
    used.add(id);
    deduped.push(row);
  });

  return {
    ranked: deduped,
    interactions: profile.history.length,
    profileReady: profile.history.length > 0,
  };
}
