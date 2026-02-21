import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import MobileShell from "../../components/MobileShell";
import PageShell from "../../components/ui/PageShell";
import SectionHeader from "../../components/ui/SectionHeader";
import ChipRow from "../../components/ui/ChipRow";
import Skeleton from "../../components/ui/Skeleton";
import EmptyState from "../../components/ui/EmptyState";
import { useCampusEvents } from "../../lib/hooks/useCampusEvents";
import {
  clearRecommendationProfile,
  rankItems,
  trackImpressionsOncePerSession,
  trackRecommendationAction,
} from "../../lib/recommendation/hybrid";
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
  const [likedIds, setLikedIds] = useState([]);
  const [hiddenIds, setHiddenIds] = useState([]);
  const [showAll, setShowAll] = useState(false);

  const filters = useMemo(() => ({ timeRange, category, query }), [timeRange, category, query]);
  const { data, isLoading, error } = useCampusEvents(filters);
  const ranking = useMemo(
    () =>
      rankItems({
        namespace: "events-page",
        items: data.items,
        getId: (event) => event.id,
        getText: (event) => `${event.title} ${event.category} ${event.location} ${event.description}`
      }),
    [data.items]
  );

  const rankedItems = useMemo(() => ranking.ranked.map((row) => row.item), [ranking.ranked]);
  const baseItems = showAll ? data.items : rankedItems;
  const visibleItems = useMemo(
    () => baseItems.filter((event) => !hiddenIds.includes(event.id)),
    [baseItems, hiddenIds]
  );

  useEffect(() => {
    trackImpressionsOncePerSession({
      namespace: "events-page",
      items: visibleItems,
      getId: (event) => event.id,
      getText: (event) => `${event.title} ${event.category} ${event.location} ${event.description}`,
      limit: 8
    });
  }, [visibleItems]);

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

  function toggleLike(event) {
    setLikedIds((prev) => {
      const nextLiked = !prev.includes(event.id);
      if (nextLiked) {
        trackRecommendationAction({
          namespace: "events-page",
          itemId: event.id,
          text: `${event.title} ${event.category} ${event.location} ${event.description}`,
          action: "like"
        });
      }
      return nextLiked ? [...prev, event.id] : prev.filter((id) => id !== event.id);
    });
  }

  function dismissEvent(event) {
    trackRecommendationAction({
      namespace: "events-page",
      itemId: event.id,
      text: `${event.title} ${event.category} ${event.location} ${event.description}`,
      action: "dismiss"
    });
    setHiddenIds((prev) => [...new Set([...prev, event.id])]);
  }

  function onViewSource(event) {
    trackRecommendationAction({
      namespace: "events-page",
      itemId: event.id,
      text: `${event.title} ${event.category} ${event.location} ${event.description}`,
      action: "open"
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
        subtitle="Fresh campus events with caching and hybrid recommendations"
        action={<span className="chip chip-idle text-xs">{data.total} events</span>}
      />

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        <Link to="/" className="chip chip-idle whitespace-nowrap">Home</Link>
        <Link to="/places" className="chip chip-idle whitespace-nowrap">Restaurants</Link>
        <Link to="/events" className="chip chip-active whitespace-nowrap">Events</Link>
      </div>

      <PageShell>
        <section className="glass-card p-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            <button className={`chip text-xs ${showAll ? "chip-idle" : "chip-active"}`} onClick={() => setShowAll(false)}>
              Recommended
            </button>
            <button className={`chip text-xs ${showAll ? "chip-active" : "chip-idle"}`} onClick={() => setShowAll(true)}>
              All
            </button>
            <button
              className="chip chip-idle text-xs"
              onClick={() => {
                clearRecommendationProfile("events-page");
                setLikedIds([]);
                setHiddenIds([]);
                setShowAll(false);
              }}
            >
              Reset Profile
            </button>
            <span className="chip chip-idle text-xs">Interactions: {ranking.interactions}</span>
          </div>

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

        {!isLoading && !error && data.items.length > 0 && visibleItems.length === 0 ? (
          <EmptyState
            title="No visible recommendations"
            message="You hid all current items. Reset profile or show all."
            action={
              <button
                onClick={() => {
                  setHiddenIds([]);
                  setShowAll(true);
                }}
                className="chip chip-active text-xs"
              >
                Show All
              </button>
            }
          />
        ) : null}

        {!isLoading && !error && visibleItems.length > 0 ? (
          <div className="space-y-3">
            {visibleItems.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                saved={savedIds.includes(event.id)}
                liked={likedIds.includes(event.id)}
                onToggleSave={toggleSaved}
                onAddCalendar={downloadIcs}
                onViewSource={onViewSource}
                onToggleLike={toggleLike}
                onDismiss={dismissEvent}
              />
            ))}
          </div>
        ) : null}
      </PageShell>
    </MobileShell>
  );
}
