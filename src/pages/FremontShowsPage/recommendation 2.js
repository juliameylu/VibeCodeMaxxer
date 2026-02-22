const STORAGE_KEY = "fremont_reco_profile_v1";
const MAX_HISTORY = 400;
const VECTOR_DIM = 32;
const DEFAULT_EPSILON = 0.2;

const ACTION_WEIGHT = {
  impression: 0.6,
  open_event: 2.2,
  book_click: 4.5,
  like: 3.5,
  dismiss: -3.2
};

const SYNONYMS = {
  metal: ["rock", "heavy", "hardcore"],
  rock: ["metal", "indie", "alt"],
  country: ["folk", "americana"],
  electronic: ["edm", "dj", "dance"],
  dance: ["edm", "electronic"],
  comedy: ["standup", "laugh"],
  hiphop: ["rap", "trap"],
  rap: ["hiphop"],
  latin: ["reggaeton", "salsa"],
  jazz: ["blues", "soul"],
  theater: ["show", "live"],
  live: ["show", "concert"]
};

function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2);
}

function eventText(event) {
  return `${event?.title || ""} ${event?.detail || ""}`;
}

function enrichTokens(tokens) {
  const next = [...tokens];
  tokens.forEach((token) => {
    const add = SYNONYMS[token];
    if (add) next.push(...add);
  });
  return next;
}

function hashTokenToVector(token) {
  const vector = new Array(VECTOR_DIM).fill(0);
  let seed = 2166136261;

  for (let i = 0; i < token.length; i += 1) {
    seed ^= token.charCodeAt(i);
    seed = Math.imul(seed, 16777619);
  }

  for (let i = 0; i < VECTOR_DIM; i += 1) {
    const mixed = Math.imul(seed ^ (i * 2654435761), 1597334677);
    const unit = ((mixed >>> 0) % 2000) / 1000 - 1;
    vector[i] = unit;
  }

  return vector;
}

function normalizeVector(vector) {
  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  if (norm === 0) return vector;
  return vector.map((v) => v / norm);
}

function toEventVector(event) {
  const tokens = enrichTokens(tokenize(eventText(event)));
  const vec = new Array(VECTOR_DIM).fill(0);

  tokens.forEach((token) => {
    const tokenVec = hashTokenToVector(token);
    for (let i = 0; i < VECTOR_DIM; i += 1) {
      vec[i] += tokenVec[i];
    }
  });

  return normalizeVector(vec);
}

function cosine(a, b) {
  let dot = 0;
  for (let i = 0; i < VECTOR_DIM; i += 1) {
    dot += (a[i] || 0) * (b[i] || 0);
  }
  return dot;
}

function nowMs() {
  return Date.now();
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

export function trackAction(event, action) {
  const profile = loadProfile();
  profile.history.push({
    at: nowMs(),
    action,
    eventId: event?.id || "unknown",
    text: eventText(event)
  });
  saveProfile(profile);
}

function getTagWeights(history) {
  const halfLifeDays = 10;
  const weights = new Map();
  const now = nowMs();

  history.forEach((entry) => {
    const base = ACTION_WEIGHT[entry.action] ?? 0;
    if (!base) return;
    const ageDays = Math.max(0, (now - entry.at) / (1000 * 60 * 60 * 24));
    const decay = Math.pow(0.5, ageDays / halfLifeDays);
    const tokens = enrichTokens(tokenize(entry.text));

    tokens.forEach((token) => {
      const prev = weights.get(token) || 0;
      weights.set(token, prev + base * decay);
    });
  });

  return weights;
}

function buildInterestVector(tagWeights) {
  const sorted = [...tagWeights.entries()]
    .filter(([, score]) => score > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 60);

  const vec = new Array(VECTOR_DIM).fill(0);
  sorted.forEach(([token, weight]) => {
    const tokenVec = hashTokenToVector(token);
    for (let i = 0; i < VECTOR_DIM; i += 1) {
      vec[i] += tokenVec[i] * weight;
    }
  });

  return normalizeVector(vec);
}

function behaviorScoreForEvent(event, tagWeights) {
  const tokens = enrichTokens(tokenize(eventText(event)));
  if (tokens.length === 0) return 0;

  let sum = 0;
  tokens.forEach((token) => {
    sum += tagWeights.get(token) || 0;
  });

  return sum / tokens.length;
}

function noveltyScore(event, history) {
  const seenCount = history.filter((h) => h.eventId === event.id && h.action === "impression").length;
  return 1 / (1 + seenCount);
}

function explorationPick(scored, count) {
  const leastSeen = [...scored]
    .sort((a, b) => a.seen - b.seen)
    .slice(0, count)
    .map((item) => item.event.id);
  return new Set(leastSeen);
}

function normalizeScores(values) {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) return values.map(() => 0.5);
  return values.map((v) => (v - min) / (max - min));
}

export function rankEvents(events, options = {}) {
  const epsilon = options.epsilon ?? DEFAULT_EPSILON;
  const profile = loadProfile();
  const tagWeights = getTagWeights(profile.history);
  const userVector = buildInterestVector(tagWeights);

  const scored = events.map((event) => {
    const behavior = behaviorScoreForEvent(event, tagWeights);
    const semantic = cosine(toEventVector(event), userVector);
    const novelty = noveltyScore(event, profile.history);
    const seen = profile.history.filter((h) => h.eventId === event.id && h.action === "impression").length;

    return { event, behavior, semantic, novelty, seen };
  });

  const behaviorNorm = normalizeScores(scored.map((s) => s.behavior));
  const semanticNorm = normalizeScores(scored.map((s) => s.semantic));
  const noveltyNorm = normalizeScores(scored.map((s) => s.novelty));

  const withScore = scored.map((item, i) => ({
    ...item,
    score: behaviorNorm[i] * 0.55 + semanticNorm[i] * 0.35 + noveltyNorm[i] * 0.1
  }));

  withScore.sort((a, b) => b.score - a.score);

  const exploreCount = Math.max(1, Math.round(withScore.length * epsilon));
  const exploreIds = explorationPick(withScore, exploreCount);

  const selected = [];
  const used = new Set();

  withScore.forEach((item, index) => {
    if (index < withScore.length - exploreCount) {
      selected.push(item);
      used.add(item.event.id);
    }
  });

  withScore.forEach((item) => {
    if (exploreIds.has(item.event.id) && !used.has(item.event.id)) {
      selected.push(item);
      used.add(item.event.id);
    }
  });

  return {
    ranked: selected,
    profileReady: profile.history.length > 0,
    interactions: profile.history.length
  };
}

export function clearRecommendationProfile() {
  localStorage.removeItem(STORAGE_KEY);
}
