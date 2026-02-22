import { Link } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import MobileShell from "../../components/MobileShell";
import PageShell from "../../components/ui/PageShell";
import SectionHeader from "../../components/ui/SectionHeader";
import ChipRow from "../../components/ui/ChipRow";
import EmptyState from "../../components/ui/EmptyState";
import Skeleton from "../../components/ui/Skeleton";
import { usePlacesSearch } from "../../lib/hooks/usePlacesSearch";
import {
  clearRestaurantProfile,
  rankRestaurants,
  trackRestaurantAction,
  trackRestaurantImpressionsOncePerSession,
} from "../../lib/recommendation/restaurants";
import { matchPlaceToPreferences } from "../../lib/recommendation/preferenceMatching";
import {
  bookMockReservation,
  getMockReservationAvailability,
} from "../../lib/api/backend";
import { getSession } from "../../lib/auth/session";
import { MOCK_USERS } from "../../lib/auth/mockUsers";
import { useUserCalendarState } from "../../lib/hooks/useUserCalendarState";
import PlaceCard from "./components/PlaceCard";

const CATEGORY_OPTIONS = [
  { label: "Restaurants", value: "restaurant" },
  { label: "Coffee", value: "coffee" },
];

const PRICE_OPTIONS = [
  { label: "All Prices", value: "all" },
  { label: "$", value: "$" },
  { label: "$$", value: "$$" },
  { label: "$$$", value: "$$$" },
  { label: "$$$$", value: "$$$$" },
];

const PREF_OPTIONS = ["study-friendly", "vegan", "outdoor seating", "late-night"];
const RESERVATION_REQUEST_OPTIONS = [
  "allergy-aware prep",
  "need high chair",
  "bringing stroller",
  "quiet seating",
  "birthday/celebration",
];

const SORT_OPTIONS = [
  { label: "Best match", value: "best_match" },
  { label: "Rating", value: "rating" },
  { label: "Distance", value: "distance" },
];

const RESERVATION_NOTES_STORAGE_KEY = "mock_reservation_notes_v1";
const RESERVATION_REQUESTS_STORAGE_KEY = "mock_reservation_requests_v1";

function todayDateInputValue() {
  const now = new Date();
  return now.toISOString().slice(0, 10);
}

function loadStoredString(key) {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(key) || "";
}

function loadStoredArray(key) {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function overlapsRange(startATs, endATs, startBTs, endBTs) {
  const startA = new Date(startATs).getTime();
  const endA = new Date(endATs).getTime();
  const startB = new Date(startBTs).getTime();
  const endB = new Date(endBTs).getTime();
  return startA < endB && endA > startB;
}

function overlapWindows(windowsA, windowsB) {
  const overlaps = [];

  for (const a of windowsA) {
    for (const b of windowsB) {
      const start = new Date(Math.max(new Date(a.start_ts).getTime(), new Date(b.start_ts).getTime()));
      const end = new Date(Math.min(new Date(a.end_ts).getTime(), new Date(b.end_ts).getTime()));

      if (start.getTime() < end.getTime()) {
        overlaps.push({
          window_id: `${a.window_id}_${b.window_id}`,
          start_ts: start.toISOString(),
          end_ts: end.toISOString(),
        });
      }
    }
  }

  return overlaps.sort((x, y) => new Date(x.start_ts).getTime() - new Date(y.start_ts).getTime());
}

function windowsForDate(windows, dateText) {
  const start = new Date(`${dateText}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  return (Array.isArray(windows) ? windows : []).filter((window) =>
    overlapsRange(window.start_ts, window.end_ts, start.toISOString(), end.toISOString()),
  );
}

function slotMatchesAnyWindow(slot, windows) {
  return windows.some((window) =>
    overlapsRange(slot.start_ts, slot.end_ts, window.start_ts, window.end_ts),
  );
}

function formatSlotDate(ts) {
  return new Date(ts).toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatSlotTime(ts) {
  return new Date(ts).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function slotDurationMinutes(slot) {
  return Math.max(0, Math.round((new Date(slot.end_ts).getTime() - new Date(slot.start_ts).getTime()) / 60000));
}

export default function PlacesPage() {
  const [session] = useState(() => getSession());
  const [category, setCategory] = useState("restaurant");
  const [price, setPrice] = useState("all");
  const [openNow, setOpenNow] = useState(false);
  const [sortBy, setSortBy] = useState("best_match");
  const [preferences, setPreferences] = useState([]);
  const [customPreference, setCustomPreference] = useState("");
  const [visibleCount, setVisibleCount] = useState(6);
  const [likedIds, setLikedIds] = useState([]);
  const [hiddenIds, setHiddenIds] = useState([]);
  const [profileSeedError, setProfileSeedError] = useState("");
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [reservationDate, setReservationDate] = useState(todayDateInputValue());
  const [reservationSlots, setReservationSlots] = useState([]);
  const [reservationLoading, setReservationLoading] = useState(false);
  const [reservationError, setReservationError] = useState("");
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [partySize, setPartySize] = useState(2);
  const [specialRequests, setSpecialRequests] = useState(() =>
    loadStoredArray(RESERVATION_REQUESTS_STORAGE_KEY),
  );
  const [reservationNotes, setReservationNotes] = useState(() =>
    loadStoredString(RESERVATION_NOTES_STORAGE_KEY),
  );
  const [bookingStatus, setBookingStatus] = useState(null);
  const [profileDistanceMaxM, setProfileDistanceMaxM] = useState(null);
  const [sharedOnly, setSharedOnly] = useState(false);
  const [compareUsername, setCompareUsername] = useState("maria");
  const [slotEligibilityByPlaceId, setSlotEligibilityByPlaceId] = useState({});
  const [slotEligibilityLoading, setSlotEligibilityLoading] = useState(false);
  const [slotEligibilityError, setSlotEligibilityError] = useState("");
  const lastSeededProfileUserIdRef = useRef("");

  const currentUserContext = useMemo(() => {
    if (!session?.email || !session?.timezone) return null;
    return {
      email: session.email,
      timezone: session.timezone,
    };
  }, [session?.email, session?.timezone]);

  const compareCandidates = useMemo(
    () => MOCK_USERS.filter((user) => user.email !== session?.email),
    [session?.email],
  );

  const safeCompareUsername =
    compareCandidates.find((user) => user.username === compareUsername)?.username
    || compareCandidates[0]?.username
    || "";

  const compareUser =
    compareCandidates.find((user) => user.username === safeCompareUsername) || null;

  const primaryCalendarState = useUserCalendarState(currentUserContext);
  const compareCalendarState = useUserCalendarState(sharedOnly ? compareUser : null);

  const backendUserId = primaryCalendarState.data.user?.user_id || "u_guest_mock";
  const backendUserError = session?.email ? primaryCalendarState.error : "";

  const activePreferences = useMemo(
    () => [...preferences, customPreference].map((value) => String(value || "").trim()).filter(Boolean),
    [preferences, customPreference],
  );

  const filters = useMemo(
    () => ({
      category,
      price,
      openNow,
      sortBy,
      page: 1,
      pageSize: 24,
    }),
    [category, price, openNow, sortBy],
  );

  const { data, isLoading, error } = usePlacesSearch(filters);
  const safeItems = Array.isArray(data?.items) ? data.items : [];

  const preferenceEligibleItems = useMemo(() => {
    return safeItems.filter((place) => {
      if (!place || typeof place !== "object" || !place.id) return false;
      if (Number.isInteger(profileDistanceMaxM) && Number(place.distanceMeters || 0) > profileDistanceMaxM) {
        return false;
      }
      return matchPlaceToPreferences(place, activePreferences);
    });
  }, [safeItems, profileDistanceMaxM, activePreferences]);

  const ranking = useMemo(
    () =>
      rankRestaurants({
        items: preferenceEligibleItems,
        activePreferences,
      }),
    [preferenceEligibleItems, activePreferences],
  );

  const rankedItems = useMemo(
    () =>
      (Array.isArray(ranking?.ranked) ? ranking.ranked : [])
        .map((row) => row?.place)
        .filter((item) => item && typeof item === "object" && item.id),
    [ranking?.ranked],
  );

  const recommendationPool = useMemo(
    () => rankedItems.filter((place) => !hiddenIds.includes(place.id)),
    [rankedItems, hiddenIds],
  );

  const primaryWindowsForDate = useMemo(
    () => windowsForDate(primaryCalendarState.data.availability, reservationDate),
    [primaryCalendarState.data.availability, reservationDate],
  );

  const sharedWindowsForDate = useMemo(() => {
    if (!sharedOnly) return [];
    const compareWindowsForDate = windowsForDate(compareCalendarState.data.availability, reservationDate);
    return overlapWindows(primaryWindowsForDate, compareWindowsForDate);
  }, [sharedOnly, primaryWindowsForDate, compareCalendarState.data.availability, reservationDate]);

  useEffect(() => {
    const userId = primaryCalendarState.data.user?.user_id;
    const prefs = primaryCalendarState.data.preferences;

    if (!userId || !prefs) return;
    if (lastSeededProfileUserIdRef.current === userId) return;

    const seeded = [
      ...(Array.isArray(prefs?.diet_tags) ? prefs.diet_tags : []),
      ...(Array.isArray(prefs?.favorite_categories) ? prefs.favorite_categories : []),
    ]
      .map((value) => String(value || "").trim())
      .filter(Boolean);

    if (seeded.length > 0) {
      setPreferences((prev) => [...new Set([...seeded, ...prev])].slice(0, 16));
    }

    if (prefs?.price_max) {
      setPrice((prev) => (prev === "all" ? prefs.price_max : prev));
    }

    const distanceMax = Number.isInteger(prefs?.distance_max_m) ? prefs.distance_max_m : null;
    setProfileDistanceMaxM(distanceMax);
    setProfileSeedError("");
    lastSeededProfileUserIdRef.current = userId;
  }, [primaryCalendarState.data.user?.user_id, primaryCalendarState.data.preferences]);

  useEffect(() => {
    if (primaryCalendarState.error && session?.email) {
      setProfileSeedError(primaryCalendarState.error);
    }
  }, [primaryCalendarState.error, session?.email]);

  useEffect(() => {
    let active = true;

    async function evaluateSlotEligibility() {
      if (recommendationPool.length === 0) {
        if (active) {
          setSlotEligibilityByPlaceId({});
          setSlotEligibilityError("");
          setSlotEligibilityLoading(false);
        }
        return;
      }

      if (primaryWindowsForDate.length === 0) {
        if (active) {
          setSlotEligibilityByPlaceId({});
          setSlotEligibilityError("");
          setSlotEligibilityLoading(false);
        }
        return;
      }

      setSlotEligibilityLoading(true);
      setSlotEligibilityError("");

      try {
        const rows = await Promise.all(
          recommendationPool.map(async (place) => {
            const response = await getMockReservationAvailability({
              userId: backendUserId,
              restaurantId: `restaurant:${place.id}`,
              restaurantName: place.name,
              date: reservationDate,
            });
            const slots = Array.isArray(response?.slots) ? response.slots : [];
            const userMatch = slots.some((slot) => slotMatchesAnyWindow(slot, primaryWindowsForDate));
            const sharedMatch = slots.some((slot) => slotMatchesAnyWindow(slot, sharedWindowsForDate));
            return [place.id, { userMatch, sharedMatch }];
          }),
        );

        if (active) {
          setSlotEligibilityByPlaceId(Object.fromEntries(rows));
        }
      } catch (err) {
        if (active) {
          setSlotEligibilityByPlaceId({});
          setSlotEligibilityError(
            err instanceof Error ? err.message : "Could not evaluate availability-matched restaurants.",
          );
        }
      } finally {
        if (active) {
          setSlotEligibilityLoading(false);
        }
      }
    }

    evaluateSlotEligibility();
    return () => {
      active = false;
    };
  }, [recommendationPool, primaryWindowsForDate, sharedWindowsForDate, reservationDate, backendUserId]);

  const filteredVisible = useMemo(() => {
    return recommendationPool.filter((place) => {
      const status = slotEligibilityByPlaceId[place.id];
      if (!status?.userMatch) return false;
      if (sharedOnly && !status?.sharedMatch) return false;
      return true;
    });
  }, [recommendationPool, slotEligibilityByPlaceId, sharedOnly]);

  const visibleItems = filteredVisible.slice(0, visibleCount);
  const hasMore = visibleCount < filteredVisible.length;
  const selectedReservationSlot = useMemo(
    () => reservationSlots.find((slot) => slot.slot_id === selectedSlotId) || null,
    [reservationSlots, selectedSlotId],
  );

  useEffect(() => {
    if (!selectedReservationSlot) return;
    const min = Number.isInteger(selectedReservationSlot.party_size_min)
      ? selectedReservationSlot.party_size_min
      : 1;
    const max = Number.isInteger(selectedReservationSlot.party_size_max)
      ? selectedReservationSlot.party_size_max
      : 12;

    if (partySize < min) {
      setPartySize(min);
      return;
    }
    if (partySize > max) {
      setPartySize(max);
    }
  }, [selectedReservationSlot, partySize]);

  useEffect(() => {
    trackRestaurantImpressionsOncePerSession(
      filteredVisible,
      (place) => place.id,
      (place) => `${place.name} ${place.category} ${place.address} ${place.price}`,
      8,
    );
  }, [filteredVisible]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(RESERVATION_NOTES_STORAGE_KEY, reservationNotes);
  }, [reservationNotes]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      RESERVATION_REQUESTS_STORAGE_KEY,
      JSON.stringify(specialRequests),
    );
  }, [specialRequests]);

  async function fetchReservationSlots(place, dateText) {
    setReservationLoading(true);
    setReservationError("");
    setBookingStatus(null);

    try {
      const response = await getMockReservationAvailability({
        userId: backendUserId,
        restaurantId: `restaurant:${place.id}`,
        restaurantName: place.name,
        date: dateText,
      });

      const slots = Array.isArray(response?.slots) ? response.slots : [];
      setReservationSlots(slots);
      setSelectedSlotId(slots[0]?.slot_id || "");
    } catch (err) {
      setReservationSlots([]);
      setSelectedSlotId("");
      setReservationError(err instanceof Error ? err.message : "Could not load mock reservation times.");
    } finally {
      setReservationLoading(false);
    }
  }

  function toggleSpecialRequest(value) {
    setSpecialRequests((prev) =>
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value],
    );
  }

  function togglePreference(value) {
    setVisibleCount(6);
    setPreferences((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value],
    );
  }

  function resetFilters() {
    setCategory("restaurant");
    setPrice("all");
    setOpenNow(false);
    setSortBy("best_match");
    setPreferences([]);
    setCustomPreference("");
    setVisibleCount(6);
    setSharedOnly(false);
  }

  function toggleLike(place) {
    setLikedIds((prev) => {
      const nextLiked = !prev.includes(place.id);
      if (nextLiked) {
        trackRestaurantAction({
          itemId: place.id,
          text: `${place.name} ${place.category} ${place.address} ${place.price}`,
          action: "like",
        });
      }
      return nextLiked ? [...prev, place.id] : prev.filter((id) => id !== place.id);
    });
  }

  function dismissPlace(place) {
    trackRestaurantAction({
      itemId: place.id,
      text: `${place.name} ${place.category} ${place.address} ${place.price}`,
      action: "dismiss",
    });
    setHiddenIds((prev) => [...new Set([...prev, place.id])]);
  }

  function onOpenPlace(place) {
    trackRestaurantAction({
      itemId: place.id,
      text: `${place.name} ${place.category} ${place.address} ${place.price}`,
      action: "open",
    });
  }

  async function onMockReserve(place) {
    setSelectedPlace(place);
    await fetchReservationSlots(place, reservationDate);
  }

  async function onBookReservation() {
    if (!selectedPlace || !selectedSlotId) return;

    const slot = selectedReservationSlot;
    if (!slot) return;

    setReservationLoading(true);
    setReservationError("");
    setBookingStatus(null);

    try {
      const booking = await bookMockReservation({
        user_id: backendUserId,
        restaurant_id: `restaurant:${selectedPlace.id}`,
        restaurant_name: selectedPlace.name,
        slot_id: slot.slot_id,
        start_ts: slot.start_ts,
        end_ts: slot.end_ts,
        party_size: partySize,
        special_requests: specialRequests,
        notes: reservationNotes,
      });

      trackRestaurantAction({
        itemId: selectedPlace.id,
        text: `${selectedPlace.name} ${selectedPlace.category} ${selectedPlace.address} ${selectedPlace.price}`,
        action: "book",
      });

      setBookingStatus(booking);
    } catch (err) {
      setReservationError(err instanceof Error ? err.message : "Could not create mock reservation.");
    } finally {
      setReservationLoading(false);
    }
  }

  return (
    <MobileShell showFab={false}>
      <SectionHeader
        title="Food & Coffee"
        subtitle="Recommendation-first restaurants filtered by your calendar availability"
        action={<span className="chip chip-idle text-xs">{filteredVisible.length} matched</span>}
      />

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        <Link to="/" className="chip chip-idle whitespace-nowrap">Home</Link>
        <Link to="/places" className="chip chip-active whitespace-nowrap">Restaurants</Link>
        <Link to="/events" className="chip chip-idle whitespace-nowrap">Events</Link>
      </div>

      <PageShell>
        <section className="glass-card p-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            <button
              className="chip chip-idle text-xs"
              onClick={() => {
                clearRestaurantProfile();
                setLikedIds([]);
                setHiddenIds([]);
              }}
            >
              Reset Profile
            </button>
            <span className="chip chip-idle text-xs">Interactions: {ranking.interactions}</span>
            {Number.isInteger(profileDistanceMaxM) ? (
              <span className="chip chip-idle text-xs">Profile distance: {profileDistanceMaxM}m</span>
            ) : null}
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-soft">Category</p>
            <ChipRow
              options={CATEGORY_OPTIONS}
              value={category}
              onChange={(value) => {
                setVisibleCount(6);
                setCategory(value);
              }}
            />
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-soft">Price</p>
            <ChipRow
              options={PRICE_OPTIONS}
              value={price}
              onChange={(value) => {
                setVisibleCount(6);
                setPrice(value);
              }}
            />
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-soft">Preferences</p>
            <div className="flex flex-wrap gap-2">
              {PREF_OPTIONS.map((pref) => (
                <button
                  key={pref}
                  onClick={() => togglePreference(pref)}
                  className={`chip text-xs ${preferences.includes(pref) ? "chip-active" : "chip-idle"}`}
                >
                  {pref}
                </button>
              ))}
            </div>
            <input
              value={customPreference}
              onChange={(event) => {
                setVisibleCount(6);
                setCustomPreference(event.target.value);
              }}
              placeholder="Custom preference"
              className="mt-2 w-full rounded-xl border border-black/10 bg-white/80 px-3 py-2 text-sm text-ink outline-none focus:border-amberSoft"
            />
            {profileSeedError ? (
              <p className="mt-2 text-xs text-red-600">Profile preference seed issue: {profileSeedError}</p>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={openNow}
                onChange={(event) => {
                  setVisibleCount(6);
                  setOpenNow(event.target.checked);
                }}
                className="h-4 w-4 rounded accent-amberSoft"
              />
              Open now
            </label>

            <select
              value={sortBy}
              onChange={(event) => {
                setVisibleCount(6);
                setSortBy(event.target.value);
              }}
              className="rounded-xl border border-black/10 bg-white/80 px-3 py-2 text-sm text-ink outline-none"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-soft">Availability Date</span>
              <input
                type="date"
                value={reservationDate}
                onChange={(event) => {
                  setVisibleCount(6);
                  setReservationDate(event.target.value);
                }}
                className="mt-1 w-full rounded-xl border border-black/10 bg-white/80 px-3 py-2 text-sm text-ink outline-none"
              />
            </label>

            <label className="flex items-center gap-2 text-sm text-ink mt-6 sm:mt-0 sm:self-end">
              <input
                type="checkbox"
                checked={sharedOnly}
                onChange={(event) => {
                  setVisibleCount(6);
                  setSharedOnly(event.target.checked);
                }}
                className="h-4 w-4 rounded accent-amberSoft"
              />
              Match shared availability with another user
            </label>
          </div>

          {sharedOnly ? (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-soft">Compare User</p>
              <select
                value={safeCompareUsername}
                onChange={(event) => {
                  setVisibleCount(6);
                  setCompareUsername(event.target.value);
                }}
                className="w-full rounded-xl border border-black/10 bg-white/80 px-3 py-2 text-sm text-ink outline-none"
              >
                {compareCandidates.map((user) => (
                  <option key={user.user_id} value={user.username}>
                    {user.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="rounded-xl border border-black/10 bg-white/60 p-3 text-xs text-soft space-y-1">
            <p>Your free windows on this date: {primaryWindowsForDate.length}</p>
            {sharedOnly ? <p>Shared free windows on this date: {sharedWindowsForDate.length}</p> : null}
            {backendUserError ? <p className="text-red-600">Calendar state issue: {backendUserError}</p> : null}
          </div>
        </section>

        {selectedPlace ? (
          <section className="glass-card p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-soft">Mock Reservation</p>
                <h3 className="text-base font-bold text-ink">{selectedPlace.name}</h3>
                <p className="text-xs text-soft">{selectedPlace.address}</p>
              </div>
              <button
                onClick={() => {
                  setSelectedPlace(null);
                  setReservationSlots([]);
                  setSelectedSlotId("");
                  setBookingStatus(null);
                  setReservationError("");
                }}
                className="chip chip-idle text-xs"
              >
                Close
              </button>
            </div>

            <div className="flex gap-2">
              <input
                type="date"
                value={reservationDate}
                onChange={(event) => setReservationDate(event.target.value)}
                className="rounded-xl border border-black/10 bg-white/80 px-3 py-2 text-sm text-ink outline-none"
              />
              <button
                onClick={() => fetchReservationSlots(selectedPlace, reservationDate)}
                className="chip chip-idle text-xs"
              >
                Refresh times
              </button>
            </div>

            {backendUserError ? (
              <p className="text-xs text-red-600">Using guest mode: {backendUserError}</p>
            ) : (
              <p className="text-xs text-soft">Booking as user: {backendUserId}</p>
            )}

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-soft">
                Reservation requests
              </p>
              <div className="flex flex-wrap gap-2">
                {RESERVATION_REQUEST_OPTIONS.map((option) => (
                  <button
                    key={option}
                    onClick={() => toggleSpecialRequest(option)}
                    className={`chip text-xs ${specialRequests.includes(option) ? "chip-active" : "chip-idle"}`}
                  >
                    {option}
                  </button>
                ))}
              </div>
              <textarea
                value={reservationNotes}
                onChange={(event) => setReservationNotes(event.target.value.slice(0, 500))}
                rows={3}
                placeholder="Add allergy, kid/high-chair, stroller, or seating notes"
                className="mt-2 w-full rounded-xl border border-black/10 bg-white/80 px-3 py-2 text-sm text-ink outline-none focus:border-amberSoft"
              />
              <p className="mt-1 text-[11px] text-soft">{reservationNotes.length}/500 chars</p>
            </div>

            {reservationLoading ? <p className="text-xs text-soft">Loading available times...</p> : null}
            {reservationError ? <p className="text-xs font-semibold text-red-600">{reservationError}</p> : null}

            {!reservationLoading && reservationSlots.length === 0 ? (
              <p className="text-xs text-soft">No slots available for this date.</p>
            ) : null}

            {!reservationLoading && reservationSlots.length > 0 ? (
              <>
                <div className="grid grid-cols-1 gap-2">
                  {reservationSlots.map((slot) => (
                    <button
                      key={slot.slot_id}
                      onClick={() => setSelectedSlotId(slot.slot_id)}
                      className={`rounded-xl border px-3 py-2 text-left ${
                        selectedSlotId === slot.slot_id
                          ? "border-amberSoft bg-amberSoft/15"
                          : "border-black/10 bg-white/70"
                      }`}
                    >
                      <p className="text-sm font-semibold text-ink">
                        {formatSlotDate(slot.start_ts)} · {formatSlotTime(slot.start_ts)} - {formatSlotTime(slot.end_ts)}
                      </p>
                      <p className="text-xs text-soft">
                        {slotDurationMinutes(slot)} min · {slot.seats_remaining} seats left · party{" "}
                        {Number.isInteger(slot.party_size_min) ? slot.party_size_min : 1}
                        -
                        {Number.isInteger(slot.party_size_max) ? slot.party_size_max : 12}
                      </p>
                      <p className="text-[11px] text-soft">
                        Provider: {slot.provider || "yelp"} · Slot token: {slot.slot_id}
                      </p>
                    </button>
                  ))}
                </div>

                {selectedReservationSlot ? (
                  <div className="rounded-xl border border-black/10 bg-white/70 p-3 text-xs text-soft">
                    <p className="font-semibold text-ink">Selected Slot Details</p>
                    <p>
                      Reservation window: {formatSlotDate(selectedReservationSlot.start_ts)} ·{" "}
                      {formatSlotTime(selectedReservationSlot.start_ts)} - {formatSlotTime(selectedReservationSlot.end_ts)}
                    </p>
                    <p>
                      Party size range: {selectedReservationSlot.party_size_min || 1}-
                      {selectedReservationSlot.party_size_max || 12}
                    </p>
                    <p>Cancellation: {selectedReservationSlot.cancellation_policy || "Policy unavailable."}</p>
                    <p>
                      Booking URL:{" "}
                      {selectedReservationSlot.reservation_url ? (
                        <a
                          href={selectedReservationSlot.reservation_url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-amberSoft"
                        >
                          Open Yelp-style reservation link
                        </a>
                      ) : (
                        "Unavailable"
                      )}
                    </p>
                  </div>
                ) : null}

                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-soft">Party size</label>
                  <select
                    value={partySize}
                    onChange={(event) => setPartySize(Number(event.target.value))}
                    className="rounded-xl border border-black/10 bg-white/80 px-2 py-1 text-xs text-ink"
                  >
                    {Array.from({
                      length: Math.max(
                        1,
                        (selectedReservationSlot?.party_size_max || 12)
                          - (selectedReservationSlot?.party_size_min || 1)
                          + 1,
                      ),
                    }).map((_, index) => {
                      const value = (selectedReservationSlot?.party_size_min || 1) + index;
                      return (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      );
                    })}
                  </select>
                  <button
                    onClick={onBookReservation}
                    disabled={!selectedReservationSlot || reservationLoading}
                    className={`chip text-xs ${selectedSlotId ? "chip-active" : "chip-idle"}`}
                  >
                    Confirm mock booking
                  </button>
                </div>
              </>
            ) : null}

            {bookingStatus ? (
              <div className="row-pill">
                <p className="text-xs font-semibold text-ink">Reservation Confirmed</p>
                <p className="text-xs text-soft">ID: {bookingStatus.reservation_id}</p>
                <p className="text-xs text-soft">Slot token: {bookingStatus.slot_id}</p>
                <p className="text-xs text-soft">
                  Time: {new Date(bookingStatus.start_ts).toLocaleString([], { hour: "numeric", minute: "2-digit" })} -{" "}
                  {new Date(bookingStatus.end_ts).toLocaleString([], { hour: "numeric", minute: "2-digit" })}
                </p>
                {bookingStatus.reservation_url ? (
                  <p className="text-xs text-soft">
                    Confirmation URL:{" "}
                    <a
                      href={bookingStatus.reservation_url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-amberSoft"
                    >
                      Open booking link
                    </a>
                  </p>
                ) : null}
                {bookingStatus.cancellation_policy ? (
                  <p className="text-xs text-soft">Cancellation: {bookingStatus.cancellation_policy}</p>
                ) : null}
                {Array.isArray(bookingStatus.special_requests) && bookingStatus.special_requests.length > 0 ? (
                  <p className="text-xs text-soft">
                    Requests: {bookingStatus.special_requests.join(", ")}
                  </p>
                ) : null}
                {bookingStatus.notes ? <p className="text-xs text-soft">Notes: {bookingStatus.notes}</p> : null}
              </div>
            ) : null}
          </section>
        ) : null}

        {error ? (
          <EmptyState
            title="Could not load places"
            message={error}
            action={
              <button onClick={resetFilters} className="chip chip-active text-xs">
                Reset filters
              </button>
            }
          />
        ) : null}

        {slotEligibilityError ? (
          <EmptyState
            title="Availability matching failed"
            message={slotEligibilityError}
            action={
              <button onClick={resetFilters} className="chip chip-active text-xs">
                Reset filters
              </button>
            }
          />
        ) : null}

        {isLoading || slotEligibilityLoading ? (
          <div className="grid grid-cols-1 gap-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-56" />
            ))}
          </div>
        ) : null}

        {!isLoading && !slotEligibilityLoading && !error && safeItems.length === 0 ? (
          <EmptyState
            title="No matching places"
            message="Try widening category, price, or open-now filters."
            action={
              <button onClick={resetFilters} className="chip chip-active text-xs">
                Clear filters
              </button>
            }
          />
        ) : null}

        {!isLoading && !slotEligibilityLoading && !error && safeItems.length > 0 && primaryWindowsForDate.length === 0 ? (
          <EmptyState
            title="No available time windows"
            message="No calendar availability is open for the selected date. Change date or sync your calendar state."
            action={
              <button
                onClick={() => setReservationDate(todayDateInputValue())}
                className="chip chip-active text-xs"
              >
                Use today
              </button>
            }
          />
        ) : null}

        {!isLoading && !slotEligibilityLoading && !error && safeItems.length > 0 && primaryWindowsForDate.length > 0 && filteredVisible.length === 0 ? (
          <EmptyState
            title="No recommendations fit availability"
            message="No recommended restaurants have reservation slots that overlap your selected free windows."
            action={
              <button
                onClick={() => {
                  setHiddenIds([]);
                  setVisibleCount(6);
                }}
                className="chip chip-active text-xs"
              >
                Retry recommendations
              </button>
            }
          />
        ) : null}

        {!isLoading && !slotEligibilityLoading && !error && filteredVisible.length > 0 ? (
          <>
            <div className="grid grid-cols-1 gap-3">
              {visibleItems.map((place) => (
                <PlaceCard
                  key={place.id}
                  place={place}
                  liked={likedIds.includes(place.id)}
                  onView={onOpenPlace}
                  onToggleLike={toggleLike}
                  onDismiss={dismissPlace}
                  onMockReserve={onMockReserve}
                />
              ))}
            </div>

            <button
              onClick={() => setVisibleCount((count) => count + 6)}
              disabled={!hasMore}
              className={`chip w-full ${hasMore ? "chip-active" : "chip-idle"}`}
            >
              {hasMore ? "Load more" : "All matched recommendations loaded"}
            </button>
          </>
        ) : null}
      </PageShell>
    </MobileShell>
  );
}
