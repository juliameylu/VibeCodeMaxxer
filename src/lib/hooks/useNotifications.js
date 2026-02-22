import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../apiClient";

export default function useNotifications({ pollMs = 20000 } = {}) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await apiFetch("/api/notifications");
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    const run = async () => {
      if (!active) return;
      try {
        await refresh();
      } catch {
        // Best-effort polling.
      }
    };

    run();
    const id = window.setInterval(run, pollMs);

    return () => {
      active = false;
      window.clearInterval(id);
    };
  }, [pollMs, refresh]);

  const markRead = useCallback(
    async (id) => {
      await apiFetch(`/api/notifications/${id}/read`, { method: "POST", body: {} });
      await refresh();
    },
    [refresh]
  );

  const markAllRead = useCallback(async () => {
    await apiFetch("/api/notifications/read-all", { method: "POST", body: {} });
    await refresh();
  }, [refresh]);

  return { notifications, unreadCount, loading, refresh, markRead, markAllRead };
}
