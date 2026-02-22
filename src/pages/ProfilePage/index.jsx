import {
  Calendar,
  Circle,
  Link2,
  LogOut,
  RefreshCw,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import MobileShell from "../../components/MobileShell";
import OverlapTimeline from "../../components/OverlapTimeline";
import { clearSession, getSession } from "../../lib/auth/session";
import { MOCK_USERS } from "../../lib/auth/mockUsers";
import { useUserCalendarState } from "../../lib/hooks/useUserCalendarState";

function formatTs(value) {
  const date = new Date(value);
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function overlapWindows(windowsA, windowsB) {
  const overlaps = [];

  for (const a of windowsA) {
    const aStart = new Date(a.start_ts).getTime();
    const aEnd = new Date(a.end_ts).getTime();

    for (const b of windowsB) {
      const bStart = new Date(b.start_ts).getTime();
      const bEnd = new Date(b.end_ts).getTime();

      const start = Math.max(aStart, bStart);
      const end = Math.min(aEnd, bEnd);

      if (start < end) {
        overlaps.push({
          id: `${a.window_id}_${b.window_id}`,
          start_ts: new Date(start).toISOString(),
          end_ts: new Date(end).toISOString(),
        });
      }
    }
  }

  return overlaps
    .sort(
      (x, y) => new Date(x.start_ts).getTime() - new Date(y.start_ts).getTime(),
    )
    .slice(0, 10);
}

function parseCsvList(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function UserSummaryCard({ label, userList, selectedId, onSelect, state }) {
  const isConnected = state.data.calendarStatus?.status === "connected";

  return (
    <section className="glass-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-ink/70">{label}</p>
        {onSelect ? (
          <select
            value={selectedId}
            onChange={(event) => onSelect(event.target.value)}
            className="rounded-xl border border-black/10 bg-white/80 px-2 py-1 text-xs text-ink"
          >
            {userList.map((user) => (
              <option key={user.user_id} value={user.username}>
                {user.name}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      {state.isLoading && (
        <p className="text-xs text-soft">Loading user state...</p>
      )}

      {!state.isLoading && state.error && (
        <p className="text-xs font-semibold text-red-600">{state.error}</p>
      )}

      {!state.isLoading && !state.error && state.data.user && (
        <div className="space-y-2 text-xs text-soft">
          <p>
            <span className="font-semibold text-ink">User:</span>{" "}
            {state.data.user.user_id}
          </p>
          <p>
            <span className="font-semibold text-ink">Email:</span>{" "}
            {state.data.user.email}
          </p>
          <p>
            <span className="font-semibold text-ink">Calendar:</span>{" "}
            {state.data.calendarStatus?.status || "disconnected"}
          </p>
          <p>
            <span className="font-semibold text-ink">Last sync:</span>{" "}
            {state.data.syncedAt ? formatTs(state.data.syncedAt) : "Not synced"}
          </p>
          <p>
            <span className="font-semibold text-ink">Windows:</span>{" "}
            {state.data.availability.length}
          </p>
          <p>
            <span className="font-semibold text-ink">Mock events:</span>{" "}
            {state.data.eventsCount}
          </p>
          {state.data.lastAction ? (
            <p>
              <span className="font-semibold text-ink">Last action:</span>{" "}
              {state.data.lastAction}
            </p>
          ) : null}
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <button
          onClick={state.linkGoogleCalendar}
          className="chip chip-idle inline-flex items-center gap-2 text-xs"
        >
          <Link2 size={13} />
          {isConnected ? "Re-sync Google" : "Link Google Calendar"}
        </button>
        <button
          onClick={state.refresh}
          className="chip chip-idle inline-flex items-center gap-2 text-xs"
        >
          <RefreshCw size={13} />
          Refresh
        </button>
      </div>
    </section>
  );
}

export default function ProfilePage() {
  const [session, setSessionState] = useState(() => getSession());
  const [compareUsername, setCompareUsername] = useState("maria");
  const [priceMax, setPriceMax] = useState("$$$");
  const [distanceMaxM, setDistanceMaxM] = useState("3000");
  const [dietTagsText, setDietTagsText] = useState("");
  const [eventTagsText, setEventTagsText] = useState("");
  const [favoriteCategoriesText, setFavoriteCategoriesText] = useState("");
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [prefsStatus, setPrefsStatus] = useState("");
  const [prefsError, setPrefsError] = useState("");
  const navigate = useNavigate();

  const primaryUser = useMemo(() => {
    if (!session) return null;
    return {
      id: session.user_id,
      name: session.name,
      email: session.email,
      timezone: session.timezone,
    };
  }, [session]);

  const compareCandidates = useMemo(() => {
    if (!session) return MOCK_USERS;
    return MOCK_USERS.filter((user) => user.email !== session.email);
  }, [session]);

  const safeCompareId =
    compareCandidates.find((user) => user.username === compareUsername)?.username ||
    compareCandidates[0]?.username;

  const compareUser =
    compareCandidates.find((user) => user.username === safeCompareId) || null;

  const primaryState = useUserCalendarState(primaryUser);
  const compareState = useUserCalendarState(compareUser);

  useEffect(() => {
    const prefs = primaryState.data.preferences;
    if (!prefs) return;

    setPriceMax(prefs.price_max || "$$$");
    setDistanceMaxM(String(Number.isFinite(prefs.distance_max_m) ? prefs.distance_max_m : 3000));
    setDietTagsText(Array.isArray(prefs.diet_tags) ? prefs.diet_tags.join(", ") : "");
    setEventTagsText(Array.isArray(prefs.event_tags) ? prefs.event_tags.join(", ") : "");
    setFavoriteCategoriesText(
      Array.isArray(prefs.favorite_categories) ? prefs.favorite_categories.join(", ") : "",
    );
  }, [primaryState.data.preferences]);

  const sharedWindows = useMemo(
    () =>
      overlapWindows(
        primaryState.data.availability,
        compareState.data.availability,
      ),
    [primaryState.data.availability, compareState.data.availability],
  );

  function handleLogout() {
    clearSession();
    setSessionState(null);
    navigate("/login");
  }

  async function handleSavePreferences() {
    const distanceValue = Number.parseInt(distanceMaxM, 10);
    if (!Number.isInteger(distanceValue) || distanceValue < 0) {
      setPrefsError("Distance must be a non-negative integer.");
      setPrefsStatus("");
      return;
    }

    setPrefsSaving(true);
    setPrefsError("");
    setPrefsStatus("");

    try {
      await primaryState.savePreferences({
        price_max: priceMax,
        distance_max_m: distanceValue,
        diet_tags: parseCsvList(dietTagsText),
        event_tags: parseCsvList(eventTagsText),
        favorite_categories: parseCsvList(favoriteCategoriesText),
      });
      setPrefsStatus("Preferences saved.");
    } catch (err) {
      setPrefsError(err instanceof Error ? err.message : "Could not save preferences.");
    } finally {
      setPrefsSaving(false);
    }
  }

  if (!session) {
    return (
      <MobileShell showFab={false}>
        <section className="glass-card p-5">
          <p className="text-sm font-semibold text-ink/60">Profile</p>
          <h1 className="mt-1 text-2xl font-bold text-ink">Login required</h1>
          <p className="mt-1 text-sm text-soft">
            Sign in with a mock user to view profile + calendar state.
          </p>
          <Link to="/login" className="chip chip-active mt-3 inline-flex">
            Go to Login
          </Link>
        </section>
      </MobileShell>
    );
  }

  return (
    <MobileShell showFab={false}>
      <section className="glass-card p-5">
        <p className="text-sm font-semibold text-ink/60">
          Profile + Calendar Backend
        </p>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-ink">
          <Circle size={24} className="text-amberSoft" />
          {session.name}
        </h1>
        <p className="mt-1 text-sm text-soft">
          Logged in as {session.username}. Backend user state is live.
        </p>

        <div className="mt-3 flex gap-2">
          <Link to="/login" className="chip chip-idle text-xs">
            Switch User
          </Link>
          <button
            onClick={handleLogout}
            className="chip chip-idle inline-flex items-center gap-1 text-xs"
          >
            <LogOut size={13} /> Logout
          </button>
        </div>
      </section>

      <section className="mt-4 grid grid-cols-1 gap-3">
        <UserSummaryCard
          label="Logged-in User"
          userList={[]}
          selectedId={session.user_id}
          onSelect={null}
          state={primaryState}
        />

        {compareUser ? (
          <UserSummaryCard
            label="Compare User"
            userList={compareCandidates}
            selectedId={safeCompareId}
            onSelect={setCompareUsername}
            state={compareState}
          />
        ) : null}
      </section>

      <section className="glass-card mt-4 p-4">
        <h2 className="text-base font-bold text-ink">Recommendation Input (Testing)</h2>
        <p className="mt-1 text-xs text-soft">
          Edit profile preference fields and use them to seed restaurant recommendations.
        </p>

        <div className="mt-3 grid grid-cols-1 gap-3">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-soft">Max Price</span>
            <select
              value={priceMax}
              onChange={(event) => setPriceMax(event.target.value)}
              className="mt-1 w-full rounded-xl border border-black/10 bg-white/80 px-3 py-2 text-sm text-ink outline-none"
            >
              <option value="$">$</option>
              <option value="$$">$$</option>
              <option value="$$$">$$$</option>
              <option value="$$$$">$$$$</option>
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-soft">Max Distance (m)</span>
            <input
              type="number"
              min={0}
              step={100}
              value={distanceMaxM}
              onChange={(event) => setDistanceMaxM(event.target.value)}
              className="mt-1 w-full rounded-xl border border-black/10 bg-white/80 px-3 py-2 text-sm text-ink outline-none focus:border-amberSoft"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-soft">
              Diet Tags (comma separated)
            </span>
            <input
              value={dietTagsText}
              onChange={(event) => setDietTagsText(event.target.value)}
              placeholder="vegan, gluten-free, halal"
              className="mt-1 w-full rounded-xl border border-black/10 bg-white/80 px-3 py-2 text-sm text-ink outline-none focus:border-amberSoft"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-soft">
              Favorite Categories (comma separated)
            </span>
            <input
              value={favoriteCategoriesText}
              onChange={(event) => setFavoriteCategoriesText(event.target.value)}
              placeholder="coffee, sushi, brunch"
              className="mt-1 w-full rounded-xl border border-black/10 bg-white/80 px-3 py-2 text-sm text-ink outline-none focus:border-amberSoft"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-soft">
              Event Tags (comma separated)
            </span>
            <input
              value={eventTagsText}
              onChange={(event) => setEventTagsText(event.target.value)}
              placeholder="music, outdoors, networking"
              className="mt-1 w-full rounded-xl border border-black/10 bg-white/80 px-3 py-2 text-sm text-ink outline-none focus:border-amberSoft"
            />
          </label>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={handleSavePreferences}
            disabled={prefsSaving || primaryState.isLoading}
            className={`chip text-xs ${prefsSaving ? "chip-idle" : "chip-active"}`}
          >
            {prefsSaving ? "Saving..." : "Save Profile Preferences"}
          </button>
          {prefsStatus ? <p className="text-xs font-semibold text-green-700">{prefsStatus}</p> : null}
          {prefsError ? <p className="text-xs font-semibold text-red-600">{prefsError}</p> : null}
        </div>
      </section>

      <section className="glass-card mt-4 p-4">
        <div className="mb-4 flex items-center gap-2">
          <Users size={18} className="text-amberSoft" />
          <h2 className="text-base font-bold text-ink">
            Shared Free Windows: {session.name} & {compareUser?.name}
          </h2>
        </div>

        {(primaryState.isLoading || compareState.isLoading) && (
          <p className="text-xs text-soft">Calculating overlaps...</p>
        )}

        {!primaryState.isLoading &&
          !compareState.isLoading &&
          sharedWindows.length === 0 && (
            <p className="text-xs text-soft">
              No overlap in the next 7 days for selected users.
            </p>
          )}

        {!primaryState.isLoading &&
          !compareState.isLoading &&
          sharedWindows.length > 0 && (
            <OverlapTimeline
              windows={sharedWindows}
              user1Name={session.name}
              user2Name={compareUser?.name}
            />
          )}
      </section>

      <section className="glass-card mt-4 p-4">
        <div className="mb-2 flex items-center gap-2">
          <Calendar size={18} className="text-amberSoft" />
          <h2 className="text-base font-bold text-ink">
            Logged-in User Availability
          </h2>
        </div>

        {primaryState.isLoading && (
          <p className="text-xs text-soft">Loading windows...</p>
        )}

        {!primaryState.isLoading &&
          primaryState.data.availability.length === 0 && (
            <p className="text-xs text-soft">
              No windows available. Link Google calendar to generate windows.
            </p>
          )}

        {!primaryState.isLoading &&
          primaryState.data.availability.length > 0 && (
            <div className="space-y-2">
              {primaryState.data.availability.slice(0, 10).map((window) => (
                <div key={window.window_id} className="row-pill">
                  <p className="text-xs text-ink">
                    {formatTs(window.start_ts)} - {formatTs(window.end_ts)}
                  </p>
                </div>
              ))}
            </div>
          )}
      </section>
    </MobileShell>
  );
}
