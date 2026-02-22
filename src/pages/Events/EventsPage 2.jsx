import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import MobileShell from "../../components/MobileShell";
import PageShell from "../../components/ui/PageShell";
import SectionHeader from "../../components/ui/SectionHeader";
import ChipRow from "../../components/ui/ChipRow";
import Skeleton from "../../components/ui/Skeleton";
import EmptyState from "../../components/ui/EmptyState";
import { useCampusEvents } from "../../lib/hooks/useCampusEvents";
import EventCard from "./components/EventCard";

const TIME_OPTIONS = [
  { label: "Today", value: "today" },
  { label: "Tonight", value: "tonight" },
  { label: "This Week", value: "week" },
];

const CATEGORY_OPTIONS = [
  { label: "All", value: "all" },
  { label: "Music", value: "music" },
  { label: "Talks", value: "talks" },
  { label: "Sports", value: "sports" },
  { label: "Clubs", value: "clubs" },
  { label: "Performances", value: "performances" },
  { label: "Community", value: "community" },
];

const SAVED_KEY = "campus-events-saved";

function formatIcsDate(date) {
  return new Date(date).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function createIcsContent(event) {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SLO Day//Campus Events//EN",
    "BEGIN:VEVENT",
    `UID:${event.id}@sloday`,
    `DTSTAMP:${formatIcsDate(Date.now())}`,
    `DTSTART:${formatIcsDate(event.startTime)}`,
    `DTEND:${formatIcsDate(event.endTime)}`,
    `SUMMARY:${event.title}`,
    `LOCATION:${event.location}`,
    `DESCRIPTION:${event.description}\\n${event.url}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\n");
}

export default function EventsPage() {
  const [timeRange, setTimeRange] = useState("today");
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [savedIds, setSavedIds] = useState([]);

  const filters = useMemo(() => ({ timeRange, category, query }), [timeRange, category, query]);
  const { data, isLoading, error } = useCampusEvents(filters);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVED_KEY);
      setSavedIds(raw ? JSON.parse(raw) : []);
    } catch {
      setSavedIds([]);
    }
  }, []);

  function toggleSaved(eventId) {
    setSavedIds((prev) => {
      const next = prev.includes(eventId) ? prev.filter((id) => id !== eventId) : [...prev, eventId];
      localStorage.setItem(SAVED_KEY, JSON.stringify(next));
      return next;
    });
  }

  function downloadIcs(event) {
    const content = createIcsContent(event);
    const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${event.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.ics`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function clearFilters() {
    setTimeRange("today");
    setCategory("all");
    setQuery("");
  }

  return (
    <MobileShell showFab={false}>
      <SectionHeader
        title="Cal Poly NOW Events"
        subtitle="Fresh campus events with quick save and calendar export"
        action={<span className="chip chip-idle text-xs">{data.total} events</span>}
      />

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        <Link to="/" className="chip chip-idle whitespace-nowrap">Home</Link>
        <Link to="/places" className="chip chip-idle whitespace-nowrap">Restaurants</Link>
        <Link to="/events" className="chip chip-active whitespace-nowrap">Events</Link>
      </div>

      <PageShell>
        <section className="glass-card p-4 space-y-3">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-soft">Time Window</p>
            <ChipRow options={TIME_OPTIONS} value={timeRange} onChange={setTimeRange} />
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-soft">Category</p>
            <ChipRow options={CATEGORY_OPTIONS} value={category} onChange={setCategory} />
          </div>

          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by title, location, or description"
            className="w-full rounded-xl border border-black/10 bg-white/80 px-3 py-2 text-sm text-ink outline-none focus:border-amberSoft"
          />
        </section>

        {error ? (
          <EmptyState
            title="Could not load events"
            message={error}
            action={<button onClick={clearFilters} className="chip chip-active text-xs">Reset filters</button>}
          />
        ) : null}

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-44" />
            ))}
          </div>
        ) : null}

        {!isLoading && !error && data.items.length === 0 ? (
          <EmptyState
            title="No events match these filters"
            message="Try 'This Week' or clear category filters."
            action={<button onClick={clearFilters} className="chip chip-active text-xs">Show all</button>}
          />
        ) : null}

        {!isLoading && !error && data.items.length > 0 ? (
          <div className="space-y-3">
            {data.items.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                saved={savedIds.includes(event.id)}
                onToggleSave={toggleSaved}
                onAddCalendar={downloadIcs}
              />
            ))}
          </div>
        ) : null}
      </PageShell>
    </MobileShell>
  );
}
