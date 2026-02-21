import { useEffect, useMemo, useState } from "react";
import { fetchCampusEvents } from "../api/events";
import { buildQueryCacheKey, readCachedQuery, writeCachedQuery } from "../cache/queryCache";

const EVENTS_CACHE_TTL_MS = 1000 * 60 * 10;

export function useCampusEvents(filters) {
  const [data, setData] = useState({ items: [], total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const cacheKey = useMemo(() => buildQueryCacheKey("campus-events", filters), [filters]);

  useEffect(() => {
    let active = true;
    const cached = readCachedQuery(cacheKey, EVENTS_CACHE_TTL_MS);

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
        const result = await fetchCampusEvents(filters);
        if (active) {
          setData(result);
          writeCachedQuery(cacheKey, result);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Could not load campus events.");
          setData({ items: [], total: 0 });
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
