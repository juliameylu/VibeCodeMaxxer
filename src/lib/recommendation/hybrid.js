const VECTOR_DIM = 32;
const MAX_HISTORY = 500;
const DEFAULT_EPSILON = 0.18;

const ACTION_WEIGHT = {
  impression: 0.5,
  open: 2.2,
  book: 4.0,
  like: 3.2,
  dismiss: -3.0
};

const SYNONYMS = {
  music: ["live", "concert", "show"],
  concert: ["music", "live", "show"],
  comedy: ["standup", "laugh", "performance"],
  sports: ["game", "match", "athletic"],
  coffee: ["cafe", "latte", "espresso"],
  restaurant: ["food", "dining", "eat"],
  vegan: ["plant", "healthy"],
  outdoor: ["patio", "open-air"],
  theater: ["performance", "show", "stage"],
  event: ["show", "activity", "happening"]
};

function storageKey(namespace) {
  return `hybrid_reco_profile_v1:${namespace}`;
}

function impressionKey(namespace) {
  return `hybrid_reco_impressions_session:${namespace}`;
}

function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2);
}

function enrichTokens(tokens) {
  const next = [...tokens];
  tokens.forEach((token) => {
    const syn = SYNONYMS[token];
    if (syn) next.push(...syn);
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
    vector[i] = ((mixed >>> 0) % 2000) / 1000 - 1;
  }

  return vector;
}

function normalizeVector(vector) {
  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  if (norm === 0) return vector;
  return vector.map((v) => v / norm);
}

function vectorForText(text) {
  const tokens = enrichTokens(tokenize(text));
  const vector = new Array(VECTOR_DIM).fill(0);

  tokens.forEach((token) => {
    const tv = hashTokenToVector(token);
    for (let i = 0; i < VECTOR_DIM; i += 1) {
      vector[i] += tv[i];
    }
  });

  return normalizeVector(vector);
}

function cosine(a, b) {
  let dot = 0;
  for (let i = 0; i < VECTOR_DIM; i += 1) {
    dot += (a[i] || 0) * (b[i] || 0);
  }
  return dot;
}

function normalizeScores(scores) {
  if (scores.length === 0) return [];
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  if (min === max) return scores.map(() => 0.5);
  return scores.map((score) => (score - min) / (max - min));
}

function loadProfile(namespace) {
  try {
    const raw = localStorage.getItem(storageKey(namespace));
    if (!raw) return { history: [] };
    const parsed = JSON.parse(raw);
    return { history: Array.isArray(parsed.history) ? parsed.history.slice(-MAX_HISTORY) : [] };
  } catch {
    return { history: [] };
  }
}

function saveProfile(namespace, profile) {
  localStorage.setItem(storageKey(namespace), JSON.stringify({ history: profile.history.slice(-MAX_HISTORY) }));
}

function buildTagWeights(history) {
  const now = Date.now();
  const halfLifeDays = 10;
  const weights = new Map();

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

function buildUserVector(tagWeights) {
  const sorted = [...tagWeights.entries()]
    .filter(([, weight]) => weight > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 80);

  const vector = new Array(VECTOR_DIM).fill(0);

  sorted.forEach(([token, weight]) => {
    const tv = hashTokenToVector(token);
    for (let i = 0; i < VECTOR_DIM; i += 1) {
      vector[i] += tv[i] * weight;
    }
  });

  return normalizeVector(vector);
}

function behaviorScore(text, tagWeights) {
  const tokens = enrichTokens(tokenize(text));
  if (tokens.length === 0) return 0;

  let total = 0;
  tokens.forEach((token) => {
    total += tagWeights.get(token) || 0;
  });

  return total / tokens.length;
}

export function trackRecommendationAction({ namespace, itemId, text, action }) {
  const profile = loadProfile(namespace);
  profile.history.push({
    at: Date.now(),
    action,
    itemId,
    text
  });
  saveProfile(namespace, profile);
}

export function trackImpressionsOncePerSession({ namespace, items, getId, getText, limit = 8 }) {
  try {
    const raw = sessionStorage.getItem(impressionKey(namespace));
    const seen = new Set(raw ? JSON.parse(raw) : []);
    let changed = false;

    items.slice(0, limit).forEach((item) => {
      const id = getId(item);
      if (!id || seen.has(id)) return;
      trackRecommendationAction({
        namespace,
        itemId: id,
        text: getText(item),
        action: "impression"
      });
      seen.add(id);
      changed = true;
    });

    if (changed) {
      sessionStorage.setItem(impressionKey(namespace), JSON.stringify([...seen]));
    }
  } catch {
    // Ignore session storage failures.
  }
}

export function clearRecommendationProfile(namespace) {
  localStorage.removeItem(storageKey(namespace));
  sessionStorage.removeItem(impressionKey(namespace));
}

export function rankItems({ namespace, items, getId, getText, epsilon = DEFAULT_EPSILON }) {
  const profile = loadProfile(namespace);
  const weights = buildTagWeights(profile.history);
  const userVector = buildUserVector(weights);

  const scored = items.map((item) => {
    const text = getText(item);
    const semantic = cosine(vectorForText(text), userVector);
    const behavior = behaviorScore(text, weights);
    const seen = profile.history.filter((entry) => entry.itemId === getId(item) && entry.action === "impression").length;
    const novelty = 1 / (1 + seen);

    return {
      item,
      semantic,
      behavior,
      novelty,
      seen
    };
  });

  const semanticNorm = normalizeScores(scored.map((row) => row.semantic));
  const behaviorNorm = normalizeScores(scored.map((row) => row.behavior));
  const noveltyNorm = normalizeScores(scored.map((row) => row.novelty));

  const rankedRows = scored
    .map((row, index) => ({
      ...row,
      score: behaviorNorm[index] * 0.55 + semanticNorm[index] * 0.35 + noveltyNorm[index] * 0.1
    }))
    .sort((a, b) => b.score - a.score);

  const exploreCount = Math.max(1, Math.round(rankedRows.length * epsilon));
  const exploreRows = [...rankedRows].sort((a, b) => a.seen - b.seen).slice(0, exploreCount);
  const exploreIds = new Set(exploreRows.map((row) => getId(row.item)));

  const primaryRows = rankedRows.filter((row, index) => index < rankedRows.length - exploreCount);
  const merged = [...primaryRows, ...rankedRows.filter((row) => exploreIds.has(getId(row.item)))];

  const deduped = [];
  const used = new Set();
  merged.forEach((row) => {
    const id = getId(row.item);
    if (!id || used.has(id)) return;
    used.add(id);
    deduped.push(row);
  });

  return {
    ranked: deduped,
    interactions: profile.history.length,
    profileReady: profile.history.length > 0
  };
}
