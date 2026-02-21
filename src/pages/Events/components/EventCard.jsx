import Card from "../../../components/ui/Card";

function formatTimeRange(startTime, endTime) {
  const start = new Date(startTime);
  const end = new Date(endTime);

  const day = start.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const startLabel = start.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const endLabel = end.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  return `${day} · ${startLabel} - ${endLabel}`;
}

export default function EventCard({
  event,
  saved,
  liked = false,
  onToggleSave,
  onAddCalendar,
  onViewSource,
  onToggleLike,
  onDismiss,
}) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-bold text-ink">{event.title}</h3>
          <p className="mt-1 text-xs text-soft">{formatTimeRange(event.startTime, event.endTime)}</p>
          <p className="text-xs text-soft">{event.location}</p>
        </div>
        <span className="chip chip-idle px-2 py-1 text-[10px] uppercase">{event.category}</span>
      </div>

      <p className="mt-3 text-sm text-soft">{event.description}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={() => onToggleSave(event.id)} className={`chip text-xs ${saved ? "chip-active" : "chip-idle"}`}>
          {saved ? "Saved" : "Save"}
        </button>
        <button onClick={() => onAddCalendar(event)} className="chip chip-idle text-xs">
          Add to calendar
        </button>
        <a
          href={event.url}
          target="_blank"
          rel="noreferrer"
          onClick={() => onViewSource?.(event)}
          className="chip chip-idle text-xs"
        >
          View source
        </a>
        <button onClick={() => onToggleLike?.(event)} className={`chip text-xs ${liked ? "chip-active" : "chip-idle"}`}>
          {liked ? "Liked" : "Like"}
        </button>
        <button onClick={() => onDismiss?.(event)} className="chip chip-idle text-xs">
          Hide
        </button>
      </div>
    </Card>
  );
}
