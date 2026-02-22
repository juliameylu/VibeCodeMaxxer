import { useEffect, useMemo, useState } from "react";
import { searchPlaces } from "../api/places";
import { buildQueryCacheKey, readCachedQuery, writeCachedQuery } from "../cache/queryCache";

const PLACES_CACHE_TTL_MS = 1000 * 60 * 10;
const PLACES_MODE = import.meta.env.VITE_DEMO_MODE === "true" ? "demo" : "live";

function normalizePlacesResult(result) {
  return {
    items: Array.isArray(result?.items) ? result.items : [],
    total: Number(result?.total || 0),
    hasMore: Boolean(result?.hasMore),
    page: Number(result?.page || 1),
    pageSize: Number(result?.pageSize || 8),
  };
}

export function usePlacesSearch(filters) {
  const [data, setData] = useState({ items: [], total: 0, hasMore: false, page: 1, pageSize: 8 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const cacheKey = useMemo(
    () => buildQueryCacheKey("places-search", { ...filters, mode: PLACES_MODE }),
    [filters],
  );

  useEffect(() => {
    let active = true;
    const cached = readCachedQuery(cacheKey, PLACES_CACHE_TTL_MS);

    if (cached?.value) {
      setData(normalizePlacesResult(cached.value));
      setIsLoading(false);
    }

    if (cached?.value && !cached.stale) {
      return () => {
        active = false;
      };
    }

    async function run() {
      if (!cached?.value) {
        setIsLoading(true);
      }
      setError("");

      try {
        const result = await searchPlaces(filters);
        if (active) {
          const normalized = normalizePlacesResult(result);
          setData(normalized);
          writeCachedQuery(cacheKey, normalized);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Could not load places.");
          setData({ items: [], total: 0, hasMore: false, page: 1, pageSize: 8 });
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    run();
    return () => {
      active = false;
    };
  }, [filters, cacheKey]);

  return { data, isLoading, error };
}
