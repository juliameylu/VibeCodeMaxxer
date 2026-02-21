import { useEffect, useMemo, useState } from "react";
import MobileShell from "../../components/MobileShell";

const BACKEND_BASE = import.meta.env.VITE_BACKEND_URL || "http://localhost:8787";
const SESSION_REFRESH_KEY = "fremont_shows_refreshed_this_session";
const SESSION_PAYLOAD_KEY = "fremont_shows_payload";

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

export default function FremontShowsPage() {
  const [state, setState] = useState({ loading: true, error: "", payload: null });

  useEffect(() => {
    let ignore = false;

    async function loadShows() {
      try {
        const hasRefreshed = sessionStorage.getItem(SESSION_REFRESH_KEY) === "1";
        const cachedPayload = sessionStorage.getItem(SESSION_PAYLOAD_KEY);

        if (hasRefreshed && cachedPayload) {
          const payload = JSON.parse(cachedPayload);
          if (!ignore) {
            setState({ loading: false, error: "", payload });
          }
          return;
        }

        const res = await fetch(`${BACKEND_BASE}/api/fremont-shows?refresh=1`);
        if (!res.ok) {
          throw new Error(`Request failed (${res.status})`);
        }

        const payload = await res.json();
        sessionStorage.setItem(SESSION_REFRESH_KEY, "1");
        sessionStorage.setItem(SESSION_PAYLOAD_KEY, JSON.stringify(payload));

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

  const shows = state.payload?.shows || [];
  const fetchedLabel = useMemo(() => formatFetchTime(state.payload?.fetchedAt), [state.payload?.fetchedAt]);

  return (
    <MobileShell showFab={false}>
      <section className="glass-card p-5">
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

              {shows.map((show) => (
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
                      <a className="chip chip-idle" href={show.link} target="_blank" rel="noreferrer">
                        Event Page
                      </a>
                    )}
                    {(show.tickets || show.link) && (
                      <a className="chip chip-active" href={show.tickets || show.link} target="_blank" rel="noreferrer">
                        Book Tickets
                      </a>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>
    </MobileShell>
  );
}
