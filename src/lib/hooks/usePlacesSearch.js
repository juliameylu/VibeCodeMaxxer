import { useEffect, useState } from "react";
import { searchPlaces } from "../api/places";

export function usePlacesSearch(filters) {
  const [data, setData] = useState({ items: [], total: 0, hasMore: false, page: 1, pageSize: 8 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function run() {
      setIsLoading(true);
      setError("");

      try {
        const result = await searchPlaces(filters);
        if (active) {
          setData(result);
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
  }, [filters]);

  return { data, isLoading, error };
}
