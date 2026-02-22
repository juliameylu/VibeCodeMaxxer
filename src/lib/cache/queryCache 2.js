const PREFIX = "vibecodemaxxer_cache_v1";

function nowMs() {
  return Date.now();
}

function toStorageKey(key) {
  return `${PREFIX}:${key}`;
}

export function buildQueryCacheKey(namespace, params = {}) {
  return `${namespace}:${JSON.stringify(params)}`;
}

export function readCachedQuery(key, ttlMs) {
  try {
    const raw = localStorage.getItem(toStorageKey(key));
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const ts = Number(parsed?.ts || 0);
    const ageMs = Math.max(0, nowMs() - ts);
    const stale = ageMs > ttlMs;

    return {
      stale,
      ageMs,
      value: parsed?.value
    };
  } catch {
    return null;
  }
}

export function writeCachedQuery(key, value) {
  try {
    localStorage.setItem(
      toStorageKey(key),
      JSON.stringify({ ts: nowMs(), value })
    );
  } catch {
    // Ignore quota/storage failures.
  }
}
