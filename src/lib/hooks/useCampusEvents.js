import { useEffect, useState } from "react";
import { fetchCampusEvents } from "../api/events";

export function useCampusEvents(filters) {
  const [data, setData] = useState({ items: [], total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function run() {
      setIsLoading(true);
      setError("");

      try {
        const result = await fetchCampusEvents(filters);
        if (active) {
          setData(result);
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
  }, [filters]);

  return { data, isLoading, error };
}
