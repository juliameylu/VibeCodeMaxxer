import { useMemo } from "react";
import { Clock, MapPin } from "lucide-react";

/**
 * OverlapTimeline Component
 * Displays availability overlaps as visual blocks organized by day
 */
export function OverlapTimeline({
  windows = [],
  user1Name = "User 1",
  user2Name = "User 2",
}) {
  const timeline = useMemo(() => {
    if (!windows || windows.length === 0) return { byDay: {}, days: [] };

    const byDay = {};

    // Group windows by day
    windows.forEach((window) => {
      const windowDate = new Date(window.start_ts);
      const dayKey = windowDate.toISOString().split("T")[0];

      if (!byDay[dayKey]) {
        byDay[dayKey] = [];
      }
      byDay[dayKey].push(window);
    });

    const days = Object.keys(byDay).sort();

    return { byDay, days };
  }, [windows]);

  const formatTime = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDay = (dateString) => {
    const date = new Date(dateString + "T00:00:00");
    return date.toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const getDurationMinutes = (startTs, endTs) => {
    const start = new Date(startTs);
    const end = new Date(endTs);
    return Math.round((end.getTime() - start.getTime()) / (1000 * 60));
  };

  if (timeline.days.length === 0) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-white/40 to-white/20 p-4 backdrop-blur border border-white/20">
        <p className="text-sm text-soft">
          No overlapping times found in the next 7 days.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {timeline.days.map((dayKey) => {
        const windows = timeline.byDay[dayKey];

        return (
          <div
            key={dayKey}
            className="overflow-hidden rounded-2xl bg-gradient-to-br from-white/30 to-white/10 p-4 backdrop-blur border border-white/20"
          >
            <div className="mb-3 flex items-center gap-2 pb-3 border-b border-white/20">
              <Clock size={16} className="text-primary" />
              <h3 className="font-semibold text-ink text-sm">
                {formatDay(dayKey)}
              </h3>
              <span className="ml-auto text-xs font-medium text-soft">
                {windows.length} overlap{windows.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="space-y-2">
              {windows.map((window) => {
                const duration = getDurationMinutes(
                  window.start_ts,
                  window.end_ts,
                );

                return (
                  <div
                    key={window.id}
                    className="group relative rounded-xl bg-gradient-to-r from-primary/70 to-primary/50 p-3 border border-primary/60 shadow-md hover:shadow-lg hover:from-primary/80 hover:to-primary/60 transition-all duration-200"
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex items-baseline justify-between">
                        <p className="text-sm font-bold text-white">
                          {formatTime(window.start_ts)} -{" "}
                          {formatTime(window.end_ts)}
                        </p>
                        <span className="text-xs font-semibold text-white/90 ml-2">
                          {duration} min
                        </span>
                      </div>
                      <p className="text-xs text-white/80">
                        Both available •{" "}
                        {duration < 60
                          ? `${duration} minutes`
                          : `${Math.floor(duration / 60)}h ${duration % 60}m`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <div className="mt-4 rounded-xl bg-blue/5 p-3 border border-blue/20">
        <p className="text-xs text-soft">
          💡 <strong>Tip:</strong> These are times when both {user1Name} and{" "}
          {user2Name} are free. Perfect for scheduling meetings or activities
          together.
        </p>
      </div>
    </div>
  );
}

export default OverlapTimeline;
