import { useEffect, useMemo, useState } from "react";
import { searchPlaces } from "../api/places";
import { buildQueryCacheKey, readCachedQuery, writeCachedQuery } from "../cache/queryCache";

const PLACES_CACHE_TTL_MS = 1000 * 60 * 10;

export function usePlacesSearch(filters) {
  const [data, setData] = useState({ items: [], total: 0, hasMore: false, page: 1, pageSize: 8 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const cacheKey = useMemo(() => buildQueryCacheKey("places-search", filters), [filters]);

  useEffect(() => {
    let active = true;
    const cached = readCachedQuery(cacheKey, PLACES_CACHE_TTL_MS);

    if (cached?.value) {
      setData(cached.value);
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
          setData(result);
          writeCachedQuery(cacheKey, result);
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
