import { useEffect, useMemo, useState } from "react";
import MobileShell from "../../components/MobileShell";
import { clearRecommendationProfile, rankEvents, trackAction } from "./recommendation";

const BACKEND_BASE = import.meta.env.VITE_BACKEND_URL || "http://localhost:8787";
const SESSION_REFRESH_KEY = "fremont_shows_refreshed_this_session";
const SESSION_PAYLOAD_KEY = "fremont_shows_payload";
const IMPRESSION_SESSION_KEY = "fremont_shows_impressions_seen";
const INITIAL_RENDER_COUNT = 12;
const LOAD_MORE_STEP = 8;
const PULL_TRIGGER_PX = 70;

function formatFetchTime(value) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function extractVenue(show) {
  if (!show?.title) return "Fremont Theater";
  const [firstPart] = String(show.title).split(":");
  return firstPart.length > 3 && firstPart.length < 36 ? firstPart : "Fremont Theater";
}

function loadImpressionSet() {
  try {
    const raw = sessionStorage.getItem(IMPRESSION_SESSION_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function saveImpressionSet(set) {
  sessionStorage.setItem(IMPRESSION_SESSION_KEY, JSON.stringify([...set]));
}

export default function FremontShowsPage() {
  const [state, setState] = useState({ loading: true, error: "", payload: null });
  const [showAll, setShowAll] = useState(false);
  const [hiddenById, setHiddenById] = useState({});
  const [likedById, setLikedById] = useState({});
  const [visibleCount, setVisibleCount] = useState(INITIAL_RENDER_COUNT);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [touchStartY, setTouchStartY] = useState(null);
  const [pullDistance, setPullDistance] = useState(0);

  async function fetchShows({ force = false, useSessionCache = true } = {}) {
    const hasRefreshed = sessionStorage.getItem(SESSION_REFRESH_KEY) === "1";
    const cachedPayload = sessionStorage.getItem(SESSION_PAYLOAD_KEY);

    if (!force && useSessionCache && hasRefreshed && cachedPayload) {
      return JSON.parse(cachedPayload);
    }

    const url = force ? `${BACKEND_BASE}/api/fremont-shows?refresh=1` : `${BACKEND_BASE}/api/fremont-shows`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Request failed (${res.status})`);
    }

    const payload = await res.json();
    sessionStorage.setItem(SESSION_REFRESH_KEY, "1");
    sessionStorage.setItem(SESSION_PAYLOAD_KEY, JSON.stringify(payload));
    return payload;
  }

  useEffect(() => {
    let ignore = false;

    async function loadShows() {
      try {
        const payload = await fetchShows({ force: false, useSessionCache: true });

        if (!ignore) {
          setState({ loading: false, error: "", payload });
        }
      } catch (error) {
        if (!ignore) {
          setState({
            loading: false,
            error: error instanceof Error ? error.message : "Unknown error",
            payload: null
          });
        }
      }
    }

    loadShows();

    return () => {
      ignore = true;
    };
  }, []);

  async function forceRefresh() {
    setIsRefreshing(true);
    try {
      const payload = await fetchShows({ force: true, useSessionCache: false });
      setState({ loading: false, error: "", payload });
      setVisibleCount(INITIAL_RENDER_COUNT);
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Refresh failed"
      }));
    } finally {
      setIsRefreshing(false);
    }
  }

  function onTouchStart(event) {
    if (window.scrollY > 0 || isRefreshing) return;
    setTouchStartY(event.touches?.[0]?.clientY ?? null);
  }

  function onTouchMove(event) {
    if (touchStartY === null || window.scrollY > 0 || isRefreshing) return;
    const currentY = event.touches?.[0]?.clientY ?? touchStartY;
    const delta = currentY - touchStartY;
    if (delta <= 0) return;
    setPullDistance(Math.min(120, delta * 0.5));
  }

  function onTouchEnd() {
    const shouldRefresh = pullDistance >= PULL_TRIGGER_PX;
    setTouchStartY(null);
    setPullDistance(0);
    if (shouldRefresh) {
      forceRefresh();
    }
  }

  const shows = state.payload?.shows || [];
  const fetchedLabel = useMemo(() => formatFetchTime(state.payload?.fetchedAt), [state.payload?.fetchedAt]);
  const ranking = useMemo(() => rankEvents(shows), [shows]);

  const visibleShows = useMemo(() => {
    const base = showAll ? shows : ranking.ranked.map((item) => item.event);
    return base.filter((event) => !hiddenById[event.id]).slice(0, visibleCount);
  }, [showAll, shows, ranking, hiddenById, visibleCount]);

  const fullVisibleCount = useMemo(() => {
    const base = showAll ? shows : ranking.ranked.map((item) => item.event);
    return base.filter((event) => !hiddenById[event.id]).length;
  }, [showAll, shows, ranking, hiddenById]);

  useEffect(() => {
    const seen = loadImpressionSet();
    let changed = false;

    visibleShows.slice(0, 8).forEach((event) => {
      if (!event?.id || seen.has(event.id)) return;
      trackAction(event, "impression");
      seen.add(event.id);
      changed = true;
    });

    if (changed) {
      saveImpressionSet(seen);
    }
  }, [visibleShows]);

  function onOpenEvent(event) {
    trackAction(event, "open_event");
  }

  function onBookEvent(event) {
    trackAction(event, "book_click");
  }

  function onToggleLike(event) {
    setLikedById((prev) => {
      const next = !prev[event.id];
      if (next) {
        trackAction(event, "like");
      }
      return { ...prev, [event.id]: next };
    });
  }

  function onDismiss(event) {
    trackAction(event, "dismiss");
    setHiddenById((prev) => ({ ...prev, [event.id]: true }));
  }

  return (
    <MobileShell showFab={false}>
      <section
        className="glass-card p-5"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {(pullDistance > 0 || isRefreshing) && (
          <p className="mb-2 text-xs font-semibold text-ink/60">
            {isRefreshing
              ? "Refreshing from Fremont..."
              : pullDistance >= PULL_TRIGGER_PX
                ? "Release to refresh"
                : "Pull down to refresh"}
          </p>
        )}
        <p className="text-sm font-semibold text-ink/60">Standalone Events Page</p>
        <h1 className="mt-1 text-2xl font-bold text-ink">Fremont SLO Theater Events</h1>
        <p className="mt-1 text-sm text-soft">
          Refreshed once per app open. Reopening the app starts a new refresh cycle.
        </p>
      </section>

      <section className="glass-card mt-4 p-4">
        {state.loading && <p className="text-sm text-soft">Loading shows...</p>}
        {state.error && !state.loading && (
          <p className="text-sm text-red-600">Error: {state.error}</p>
        )}

        {!state.loading && !state.error && (
          <>
            <p className="text-xs text-soft">
              Last fetched: <span className="font-semibold text-ink">{fetchedLabel}</span>
            </p>
            <p className="mt-1 text-xs text-soft">
              Total events: <span className="font-semibold text-ink">{shows.length}</span>
            </p>
            <p className="mt-1 text-xs text-soft">
              Showing:{" "}
              <span className="font-semibold text-ink">
                {visibleShows.length} {showAll ? "(all)" : "(recommended)"}
              </span>
            </p>
            <p className="mt-1 text-xs text-soft">
              Profile interactions:{" "}
              <span className="font-semibold text-ink">{ranking.interactions}</span>
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                className={`chip ${showAll ? "chip-idle" : "chip-active"}`}
                onClick={() => setShowAll(false)}
              >
                Recommended
              </button>
              <button
                className={`chip ${showAll ? "chip-active" : "chip-idle"}`}
                onClick={() => setShowAll(true)}
              >
                Show All
              </button>
              <button
                className="chip chip-idle"
                onClick={() => {
                  clearRecommendationProfile();
                  setHiddenById({});
                  setLikedById({});
                  setShowAll(false);
                  setVisibleCount(INITIAL_RENDER_COUNT);
                }}
              >
                Reset Profile
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {shows.length === 0 && (
                <article className="row-pill">
                  <p className="font-semibold text-ink">No events parsed right now.</p>
                  <p className="mt-1 text-sm text-soft">
                    The Fremont page layout may have changed. Try reopening the app to force a new fetch.
                  </p>
                  {state.payload?.debug && (
                    <pre className="mt-2 overflow-x-auto rounded-xl bg-black/5 p-2 text-[11px] text-soft">
                      {JSON.stringify(state.payload.debug, null, 2)}
                    </pre>
                  )}
                </article>
              )}

              {visibleShows.map((show) => (
                <article key={show.id} className="row-pill">
                  {show.image ? (
                    <img
                      src={show.image}
                      alt={show.title}
                      loading="lazy"
                      className="mb-3 h-44 w-full rounded-xl object-cover"
                    />
                  ) : (
                    <div className="mb-3 flex h-28 w-full items-center justify-center rounded-xl bg-ink/5 text-xs font-semibold uppercase tracking-wide text-ink/45">
                      No image from source
                    </div>
                  )}
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink/55">{extractVenue(show)}</p>
                  <h2 className="font-bold text-ink">{show.title}</h2>
                  <p className="mt-1 text-sm text-soft">{show.date || "Date unavailable"}</p>
                  {show.detail && <p className="mt-1 text-sm text-soft">{show.detail}</p>}
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    {show.link && (
                      <a className="chip chip-idle" href={show.link} target="_blank" rel="noreferrer" onClick={() => onOpenEvent(show)}>
                        Event Page
                      </a>
                    )}
                    {(show.tickets || show.link) && (
                      <a className="chip chip-active" href={show.tickets || show.link} target="_blank" rel="noreferrer" onClick={() => onBookEvent(show)}>
                        Book Tickets
                      </a>
                    )}
                    <button className={`chip ${likedById[show.id] ? "chip-active" : "chip-idle"}`} onClick={() => onToggleLike(show)}>
                      {likedById[show.id] ? "Liked" : "Like"}
                    </button>
                    <button className="chip chip-idle" onClick={() => onDismiss(show)}>
                      Hide
                    </button>
                  </div>
                </article>
              ))}

              {fullVisibleCount > visibleShows.length && (
                <button
                  className="chip chip-idle w-full py-3"
                  onClick={() => setVisibleCount((prev) => prev + LOAD_MORE_STEP)}
                >
                  Load More Events
                </button>
              )}
            </div>
          </>
        )}
      </section>
    </MobileShell>
  );
}
