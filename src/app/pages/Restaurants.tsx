import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  ExternalLink,
  Loader2,
  Sparkles,
  Users,
} from "lucide-react";
import { BottomNav } from "../components/BottomNav";
import { PageHeader } from "../components/PageHeader";
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
  listBackendFriends,
  listBackendUsers,
} from "../../lib/api/backend";
import { getSession } from "../../lib/auth/session";
import { useUserCalendarState } from "../../lib/hooks/useUserCalendarState";
import { listProfiles } from "../../lib/api/supabaseProfiles";

const CATEGORY_OPTIONS = [
  { label: "Restaurants", value: "restaurant" },
  { label: "Coffee", value: "coffee" },
];

const PRICE_OPTIONS = [
  { label: "All", value: "all" },
  { label: "$", value: "$" },
  { label: "$$", value: "$$" },
  { label: "$$$", value: "$$$" },
  { label: "$$$$", value: "$$$$" },
];

const SORT_OPTIONS = [
  { label: "Best match", value: "best_match" },
  { label: "Rating", value: "rating" },
  { label: "Distance", value: "distance" },
];

const PREF_OPTIONS = ["study-friendly", "vegan", "outdoor seating", "late-night"];
const RESERVATION_REQUEST_OPTIONS = [
  "allergy-aware prep",
  "need high chair",
  "bringing stroller",
  "quiet seating",
  "birthday/celebration",
];

const RESERVATION_NOTES_STORAGE_KEY = "mock_reservation_notes_v1";
const RESERVATION_REQUESTS_STORAGE_KEY = "mock_reservation_requests_v1";

function todayDateInputValue() {
  const now = new Date();
  return now.toISOString().slice(0, 10);
}

function loadStoredString(key: string) {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(key) || "";
}

function loadStoredArray(key: string) {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function overlapsRange(startATs: string, endATs: string, startBTs: string, endBTs: string) {
  const startA = new Date(startATs).getTime();
  const endA = new Date(endATs).getTime();
  const startB = new Date(startBTs).getTime();
  const endB = new Date(endBTs).getTime();
  return startA < endB && endA > startB;
}

function overlapWindows(windowsA: any[], windowsB: any[]) {
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

  return overlaps.sort((x: any, y: any) => new Date(x.start_ts).getTime() - new Date(y.start_ts).getTime());
}

function windowsForDate(windows: any[], dateText: string) {
  const start = new Date(`${dateText}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  return (Array.isArray(windows) ? windows : []).filter((window) =>
    overlapsRange(window.start_ts, window.end_ts, start.toISOString(), end.toISOString()),
  );
}

function slotMatchesAnyWindow(slot: any, windows: any[]) {
  return windows.some((window) =>
    overlapsRange(slot.start_ts, slot.end_ts, window.start_ts, window.end_ts),
  );
}

function formatSlotDate(ts: string) {
  return new Date(ts).toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatSlotTime(ts: string) {
  return new Date(ts).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function slotDurationMinutes(slot: any) {
  return Math.max(0, Math.round((new Date(slot.end_ts).getTime() - new Date(slot.start_ts).getTime()) / 60000));
}

function formatDistance(distanceMeters: number) {
  if (!Number.isFinite(distanceMeters)) return "N/A";
  if (distanceMeters < 1000) return `${Math.round(distanceMeters)}m`;
  return `${(distanceMeters / 1000).toFixed(1)}km`;
}

function buildPlaceUrl(place: any) {
  const raw = String(place?.url || "").trim();
  if (raw && raw !== "https://www.yelp.com" && raw !== "https://yelp.com") {
    return raw;
  }

  const search = new URLSearchParams({
    find_desc: place?.name || "restaurant",
    find_loc: place?.address || "San Luis Obispo, CA",
  });

  return `https://www.yelp.com/search?${search.toString()}`;
}

function formatDateTime(ts: string) {
  return new Date(ts).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatWindow(window: any) {
  return `${formatSlotDate(window.start_ts)} · ${formatSlotTime(window.start_ts)}-${formatSlotTime(window.end_ts)}`;
}

export function Restaurants() {
  const navigate = useNavigate();
  const [session] = useState(() => getSession());

  const [category, setCategory] = useState("restaurant");
  const [price, setPrice] = useState("all");
  const [openNow, setOpenNow] = useState(false);
  const [sortBy, setSortBy] = useState("best_match");
  const [preferences, setPreferences] = useState<string[]>([]);
  const [customPreference, setCustomPreference] = useState("");
  const [visibleCount, setVisibleCount] = useState(6);
  const [likedIds, setLikedIds] = useState<string[]>([]);
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [profileSeedError, setProfileSeedError] = useState("");
  const [selectedPlace, setSelectedPlace] = useState<any>(null);
  const [reservationDate, setReservationDate] = useState(todayDateInputValue());
  const [reservationSlots, setReservationSlots] = useState<any[]>([]);
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
  const [bookingStatus, setBookingStatus] = useState<any>(null);
  const [profileDistanceMaxM, setProfileDistanceMaxM] = useState<number | null>(null);
  const [sharedOnly, setSharedOnly] = useState(false);
  const [compareUsername, setCompareUsername] = useState("");
  const [compareUsers, setCompareUsers] = useState<any[]>([]);
  const [friendUserIds, setFriendUserIds] = useState<string[]>([]);
  const [slotEligibilityByPlaceId, setSlotEligibilityByPlaceId] = useState<Record<string, any>>({});
  const [slotEligibilityLoading, setSlotEligibilityLoading] = useState(false);
  const [slotEligibilityError, setSlotEligibilityError] = useState("");
  const lastSeededProfileUserIdRef = useRef("");
  const lastPersistedPreferenceSignatureRef = useRef("");

  const currentUserContext = useMemo(() => {
    if (!session?.email || !session?.timezone) return null;
    return {
      email: session.email,
      timezone: session.timezone,
    };
  }, [session?.email, session?.timezone]);

  useEffect(() => {
    let active = true;

    async function loadCompareUsers() {
      try {
        const backend = await listBackendUsers();
        if (!active) return;

        const backendUsers = (Array.isArray(backend?.items) ? backend.items : [])
          .filter((row: any) => row?.email)
          .map((row: any) => {
            const email = String(row.email || "").toLowerCase();
            const emailName = email.includes("@") ? email.split("@")[0] : email;
            return {
              user_id: String(row.user_id || row.id || email),
              username: emailName,
              name: String(row.name || row.display_name || emailName),
              email,
              timezone: String(row.timezone || session?.timezone || "America/Los_Angeles"),
            };
          });

        if (backendUsers.length > 0) {
          setCompareUsers(backendUsers);
          return;
        }
      } catch {
        // Fallback below.
      }

      const response = await listProfiles(100);
      if (!active || response?.error) return;

      const supabaseUsers = (Array.isArray(response?.data) ? response.data : [])
        .filter((row: any) => row?.email)
        .map((row: any) => {
          const email = String(row.email || "").toLowerCase();
          const emailName = email.includes("@") ? email.split("@")[0] : email;
          return {
            user_id: String(row.id || email),
            username: emailName,
            name: String(row.display_name || emailName),
            email,
            timezone: session?.timezone || "America/Los_Angeles",
          };
        });

      setCompareUsers(supabaseUsers);
    }

    loadCompareUsers();
    return () => {
      active = false;
    };
  }, [session?.timezone]);

  const compareCandidates = useMemo(() => {
    const pool = compareUsers.filter((user) => user.email !== session?.email);
    if (friendUserIds.length === 0) return pool;

    const friendSet = new Set(friendUserIds);
    const friends = pool.filter((user) => friendSet.has(String(user.user_id || "")));
    return friends.length > 0 ? friends : pool;
  }, [compareUsers, friendUserIds, session?.email]);

  const safeCompareUsername =
    compareCandidates.find((user) => user.username === compareUsername)?.username
    || compareCandidates[0]?.username
    || "";

  const compareUser =
    compareCandidates.find((user) => user.username === safeCompareUsername) || null;

  const primaryCalendarState = useUserCalendarState(currentUserContext);
  const compareCalendarState = useUserCalendarState(sharedOnly ? compareUser : null);

  const backendUserId = primaryCalendarState.data.user?.user_id || session?.user_id || "u_guest_mock";
  const backendUserError = session?.email ? primaryCalendarState.error : "";

  useEffect(() => {
    let active = true;

    async function loadFriendUserIds() {
      if (!backendUserId) {
        if (active) setFriendUserIds([]);
        return;
      }

      try {
        const response = await listBackendFriends(backendUserId);
        if (!active) return;
        const ids = Array.isArray(response?.friend_user_ids)
          ? response.friend_user_ids.map((id: any) => String(id || "")).filter(Boolean)
          : [];
        setFriendUserIds(ids);
      } catch {
        if (active) setFriendUserIds([]);
      }
    }

    loadFriendUserIds();
    return () => {
      active = false;
    };
  }, [backendUserId]);

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
      query: "",
      preferences: activePreferences,
      page: 1,
      pageSize: 24,
    }),
    [category, price, openNow, sortBy, activePreferences],
  );

  const { data, isLoading, error } = usePlacesSearch(filters);
  const safeItems = Array.isArray(data?.items) ? data.items : [];

  const preferenceEligibleItems = useMemo(() => {
    return safeItems.filter((place: any) => {
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

  const rankingById = useMemo(() => {
    const rows = Array.isArray(ranking?.ranked) ? ranking.ranked : [];
    const map: Record<string, any> = {};
    rows.forEach((row: any) => {
      if (row?.place?.id) {
        map[row.place.id] = row;
      }
    });
    return map;
  }, [ranking?.ranked]);

  const rankedItems = useMemo(
    () =>
      (Array.isArray(ranking?.ranked) ? ranking.ranked : [])
        .map((row: any) => row?.place)
        .filter((item: any) => item && typeof item === "object" && item.id),
    [ranking?.ranked],
  );

  const recommendationPool = useMemo(
    () => rankedItems.filter((place: any) => !hiddenIds.includes(place.id)),
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
    const userId = primaryCalendarState.data.user?.user_id;
    if (!userId) return;

    const normalized = [...new Set(activePreferences.map((value) => String(value || "").trim().toLowerCase()).filter(Boolean))]
      .slice(0, 24);
    const signature = `${userId}:${JSON.stringify(normalized)}:${price}`;
    if (signature === lastPersistedPreferenceSignatureRef.current) return;

    const timer = window.setTimeout(() => {
      primaryCalendarState
        .savePreferences({
          favorite_categories: normalized,
          event_tags: normalized.slice(0, 12),
          price_max: price !== "all" ? price : primaryCalendarState.data.preferences?.price_max || "$$$",
        })
        .then(() => {
          lastPersistedPreferenceSignatureRef.current = signature;
        })
        .catch(() => {
          // Keep UX non-blocking; page still works in local-only mode.
        });
    }, 280);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    activePreferences,
    price,
    primaryCalendarState.savePreferences,
    primaryCalendarState.data.preferences?.price_max,
    primaryCalendarState.data.user?.user_id,
  ]);

  useEffect(() => {
    let active = true;

    async function evaluateSlotEligibility() {
      if (recommendationPool.length === 0 || primaryWindowsForDate.length === 0) {
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
          recommendationPool.map(async (place: any) => {
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
    return recommendationPool.filter((place: any) => {
      const status = slotEligibilityByPlaceId[place.id];
      if (!status?.userMatch) return false;
      if (sharedOnly && !status?.sharedMatch) return false;
      return true;
    });
  }, [recommendationPool, slotEligibilityByPlaceId, sharedOnly]);

  const recommendationNumberByPlaceId = useMemo(() => {
    return Object.fromEntries(rankedItems.map((place: any, index: number) => [place.id, index + 1]));
  }, [rankedItems]);

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
      (place: any) => place.id,
      (place: any) => `${place.name} ${place.category} ${place.address} ${place.price}`,
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

  async function fetchReservationSlots(place: any, dateText: string) {
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
      const matching = slots.filter((slot) => {
        if (!slotMatchesAnyWindow(slot, primaryWindowsForDate)) return false;
        if (sharedOnly && !slotMatchesAnyWindow(slot, sharedWindowsForDate)) return false;
        return true;
      });

      setReservationSlots(matching);
      setSelectedSlotId(matching[0]?.slot_id || "");

      if (slots.length > 0 && matching.length === 0) {
        setReservationError("This recommendation has no reservation slots inside the selected availability windows.");
      }
    } catch (err) {
      setReservationSlots([]);
      setSelectedSlotId("");
      setReservationError(err instanceof Error ? err.message : "Could not load reservation times.");
    } finally {
      setReservationLoading(false);
    }
  }

  function toggleSpecialRequest(value: string) {
    setSpecialRequests((prev) =>
      prev.includes(value)
        ? prev.filter((item: string) => item !== value)
        : [...prev, value],
    );
  }

  function togglePreference(value: string) {
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
    setSelectedPlace(null);
    setReservationSlots([]);
    setReservationError("");
    setSelectedSlotId("");
  }

  function toggleLike(place: any) {
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

  function dismissPlace(place: any) {
    trackRestaurantAction({
      itemId: place.id,
      text: `${place.name} ${place.category} ${place.address} ${place.price}`,
      action: "dismiss",
    });
    setHiddenIds((prev) => [...new Set([...prev, place.id])]);
  }

  function onOpenPlace(place: any) {
    trackRestaurantAction({
      itemId: place.id,
      text: `${place.name} ${place.category} ${place.address} ${place.price}`,
      action: "open",
    });
    window.open(buildPlaceUrl(place), "_blank", "noopener,noreferrer");
  }

  async function onMockReserve(place: any) {
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
    <div className="min-h-[100dvh] bg-transparent text-white pb-20">
      <PageHeader />

      <div className="sticky top-0 z-20 bg-black/50 backdrop-blur-xl border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/explore")} className="p-1 -ml-1 text-white/45">
            <ArrowLeft size={22} />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-black uppercase tracking-wider text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
              Reservations Bot
            </h1>
            <p className="text-[10px] text-white/45">Only recommendation-eligible restaurant/coffee spots with matching availability</p>
            <p className="text-[10px] text-white/35">Listings are anonymized as Recommendation # to avoid direct Yelp-style name browsing.</p>
          </div>
          <div className="rounded-full bg-[#F2E8CF]/15 border border-[#F2E8CF]/25 px-3 py-1 text-[10px] font-black text-[#F2E8CF]">
            {filteredVisible.length} matched
          </div>
        </div>
      </div>

      <div className="px-4 pt-3 space-y-3">
        <section className="rounded-2xl border border-white/15 bg-white/10 backdrop-blur-md p-3 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {CATEGORY_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  setVisibleCount(6);
                  setCategory(option.value);
                }}
                className={`px-3 py-1.5 rounded-full text-[10px] font-black tracking-wider uppercase transition-all ${
                  category === option.value
                    ? "bg-[#F2E8CF] text-[#233216]"
                    : "bg-white/10 text-white/55 border border-white/15"
                }`}
              >
                {option.label}
              </button>
            ))}

            <button
              onClick={() => {
                clearRestaurantProfile();
                setLikedIds([]);
                setHiddenIds([]);
              }}
              className="ml-auto px-3 py-1.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-white/5 text-white/45 border border-white/10"
            >
              Reset profile
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="text-[10px] font-black tracking-wider text-white/50 uppercase">
              Price
              <select
                value={price}
                onChange={(event) => {
                  setVisibleCount(6);
                  setPrice(event.target.value);
                }}
                className="mt-1 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-xs text-white outline-none"
              >
                {PRICE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-[10px] font-black tracking-wider text-white/50 uppercase">
              Sort
              <select
                value={sortBy}
                onChange={(event) => {
                  setVisibleCount(6);
                  setSortBy(event.target.value);
                }}
                className="mt-1 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-xs text-white outline-none"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="inline-flex items-center gap-2 text-xs text-white/75 font-semibold">
              <input
                type="checkbox"
                checked={openNow}
                onChange={(event) => {
                  setVisibleCount(6);
                  setOpenNow(event.target.checked);
                }}
                className="h-4 w-4 rounded accent-[#F2E8CF]"
              />
              Open now
            </label>

            <label className="inline-flex items-center gap-2 text-xs text-white/75 font-semibold">
              <input
                type="checkbox"
                checked={sharedOnly}
                onChange={(event) => {
                  setVisibleCount(6);
                  setSharedOnly(event.target.checked);
                }}
                className="h-4 w-4 rounded accent-[#F2E8CF]"
              />
              Friend overlap only
            </label>
          </div>

          <div>
            <p className="mb-2 text-[10px] font-black tracking-wider text-white/50 uppercase">Preference filter</p>
            <div className="flex flex-wrap gap-2">
              {PREF_OPTIONS.map((pref) => (
                <button
                  key={pref}
                  onClick={() => togglePreference(pref)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase transition ${
                    preferences.includes(pref)
                      ? "bg-[#F2E8CF] text-[#233216]"
                      : "bg-white/10 text-white/55 border border-white/15"
                  }`}
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
              placeholder="Custom preference (example: quiet patio, gluten free ramen)"
              className="mt-2 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none"
            />
            <p className="mt-1 text-[11px] text-white/45">
              Custom preference matches semantic keywords from Yelp category/tag/attribute/review text.
            </p>
            {profileSeedError ? (
              <p className="mt-1 text-[11px] text-red-300">Profile seed issue: {profileSeedError}</p>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="text-[10px] font-black tracking-wider text-white/50 uppercase">
              <span className="inline-flex items-center gap-1"><CalendarDays size={12} /> Availability date</span>
              <input
                type="date"
                value={reservationDate}
                onChange={(event) => {
                  setVisibleCount(6);
                  setReservationDate(event.target.value);
                }}
                className="mt-1 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-xs text-white outline-none"
              />
            </label>

            {sharedOnly ? (
              compareCandidates.length > 0 ? (
                <label className="text-[10px] font-black tracking-wider text-white/50 uppercase">
                  <span className="inline-flex items-center gap-1"><Users size={12} /> Friend</span>
                  <select
                    value={safeCompareUsername}
                    onChange={(event) => {
                      setVisibleCount(6);
                      setCompareUsername(event.target.value);
                    }}
                    className="mt-1 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-xs text-white outline-none"
                  >
                    {compareCandidates.map((user) => (
                      <option key={user.user_id} value={user.username}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <div className="rounded-xl border border-white/10 bg-black/25 p-3 text-[11px] text-white/65">
                  No friends available yet for overlap matching.
                </div>
              )
            ) : null}
          </div>

          <div className="rounded-xl border border-white/10 bg-black/25 p-2 text-[11px] text-white/60 space-y-1">
            <p>Your free windows on date: {primaryWindowsForDate.length}</p>
            {sharedOnly ? <p>Shared windows on date: {sharedWindowsForDate.length}</p> : null}
            <p>Profile interactions: {ranking.interactions}</p>
            {backendUserError ? <p className="text-red-300">Calendar issue: {backendUserError}</p> : null}
            {primaryWindowsForDate.length > 0 ? (
              <div className="pt-1">
                <p className="text-white/75 font-semibold">My windows</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {primaryWindowsForDate.slice(0, 6).map((window: any) => (
                    <span key={window.window_id} className="rounded-full bg-white/10 border border-white/15 px-2 py-0.5 text-[10px] text-white/75">
                      {formatWindow(window)}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            {sharedOnly && sharedWindowsForDate.length > 0 ? (
              <div className="pt-1">
                <p className="text-[#F2E8CF] font-semibold">Shared windows</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {sharedWindowsForDate.slice(0, 6).map((window: any) => (
                    <span key={window.window_id} className="rounded-full bg-[#F2E8CF]/15 border border-[#F2E8CF]/25 px-2 py-0.5 text-[10px] text-[#F2E8CF]">
                      {formatWindow(window)}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </section>

        {selectedPlace ? (
          <section className="rounded-2xl border border-[#F2E8CF]/25 bg-[#F2E8CF]/8 backdrop-blur-md p-3 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[10px] font-black tracking-wider text-[#F2E8CF]/70 uppercase">Reservation slot picker</p>
                <h3 className="text-sm font-black text-white">
                  Recommendation #{recommendationNumberByPlaceId[selectedPlace.id] || "-"}
                </h3>
                <p className="text-[11px] text-white/60">Entity: restaurant:{selectedPlace.id}</p>
              </div>
              <button
                onClick={() => {
                  setSelectedPlace(null);
                  setReservationSlots([]);
                  setSelectedSlotId("");
                  setBookingStatus(null);
                  setReservationError("");
                }}
                className="px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/10 border border-white/20 text-white/70"
              >
                Close
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={reservationDate}
                onChange={(event) => setReservationDate(event.target.value)}
                className="rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-xs text-white outline-none"
              />
              <button
                onClick={() => fetchReservationSlots(selectedPlace, reservationDate)}
                className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider bg-[#F2E8CF] text-[#233216]"
              >
                Refresh slots
              </button>
              <button
                onClick={() => onOpenPlace(selectedPlace)}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider bg-white/10 border border-white/15 text-white/75"
              >
                Source listing <ExternalLink size={11} />
              </button>
            </div>

            <div>
              <p className="mb-2 text-[10px] font-black tracking-wider text-white/50 uppercase">Special requests</p>
              <div className="flex flex-wrap gap-2">
                {RESERVATION_REQUEST_OPTIONS.map((option) => (
                  <button
                    key={option}
                    onClick={() => toggleSpecialRequest(option)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase transition ${
                      specialRequests.includes(option)
                        ? "bg-[#F2E8CF] text-[#233216]"
                        : "bg-white/10 text-white/55 border border-white/15"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
              <textarea
                value={reservationNotes}
                onChange={(event) => setReservationNotes(event.target.value.slice(0, 500))}
                rows={3}
                placeholder="Add accessibility/allergy/seating notes"
                className="mt-2 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none"
              />
              <p className="mt-1 text-[11px] text-white/45">{reservationNotes.length}/500 chars</p>
            </div>

            {reservationLoading ? (
              <p className="text-xs text-white/65 inline-flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" /> Loading availability-matched slots...
              </p>
            ) : null}
            {reservationError ? <p className="text-xs font-semibold text-red-300">{reservationError}</p> : null}

            {!reservationLoading && reservationSlots.length === 0 ? (
              <p className="text-xs text-white/55">No slots in the selected user/shared availability windows.</p>
            ) : null}

            {!reservationLoading && reservationSlots.length > 0 ? (
              <>
                <div className="grid grid-cols-1 gap-2">
                  {reservationSlots.map((slot) => (
                    <button
                      key={slot.slot_id}
                      onClick={() => setSelectedSlotId(slot.slot_id)}
                      className={`rounded-xl border px-3 py-2 text-left transition ${
                        selectedSlotId === slot.slot_id
                          ? "border-[#F2E8CF] bg-[#F2E8CF]/15"
                          : "border-white/15 bg-black/20"
                      }`}
                    >
                      <p className="text-sm font-semibold text-white inline-flex items-center gap-1">
                        <Clock3 size={13} />
                        {formatSlotDate(slot.start_ts)} · {formatSlotTime(slot.start_ts)} - {formatSlotTime(slot.end_ts)}
                      </p>
                      <p className="text-xs text-white/55">
                        {slotDurationMinutes(slot)} min · {slot.seats_remaining} seats left · party {slot.party_size_min || 1}-{slot.party_size_max || 12}
                      </p>
                      <p className="text-[11px] text-white/50">Provider: {slot.provider || "yelp"} · Slot token: {slot.slot_id}</p>
                    </button>
                  ))}
                </div>

                {selectedReservationSlot ? (
                  <div className="rounded-xl border border-white/15 bg-black/25 p-3 text-xs text-white/70 space-y-1">
                    <p className="font-semibold text-white">Selected Slot Details</p>
                    <p>
                      Reservation window: {formatSlotDate(selectedReservationSlot.start_ts)} · {formatSlotTime(selectedReservationSlot.start_ts)} - {formatSlotTime(selectedReservationSlot.end_ts)}
                    </p>
                    <p>
                      Party size range: {selectedReservationSlot.party_size_min || 1}-{selectedReservationSlot.party_size_max || 12}
                    </p>
                    <p>Cancellation: {selectedReservationSlot.cancellation_policy || "Policy unavailable."}</p>
                    <p>
                      Booking URL:{" "}
                      {selectedReservationSlot.reservation_url ? (
                        <a
                          href={selectedReservationSlot.reservation_url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-[#F2E8CF]"
                        >
                          Open Yelp-style reservation link
                        </a>
                      ) : (
                        "Unavailable"
                      )}
                    </p>
                  </div>
                ) : null}

                <div className="flex items-center gap-2 flex-wrap">
                  <label className="text-xs font-semibold text-white/70">Party size</label>
                  <select
                    value={partySize}
                    onChange={(event) => setPartySize(Number(event.target.value))}
                    className="rounded-xl border border-white/15 bg-black/30 px-2 py-1 text-xs text-white"
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
                    className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider bg-[#F2E8CF] text-[#233216] disabled:opacity-50"
                  >
                    Confirm mock booking
                  </button>
                </div>
              </>
            ) : null}

            {bookingStatus ? (
              <div className="rounded-xl border border-emerald-200/30 bg-emerald-500/10 p-3 text-xs text-emerald-100 space-y-1">
                <p className="text-sm font-black">Reservation Confirmed</p>
                <p>ID: {bookingStatus.reservation_id}</p>
                <p>Slot token: {bookingStatus.slot_id}</p>
                <p>Time: {formatDateTime(bookingStatus.start_ts)} - {formatSlotTime(bookingStatus.end_ts)}</p>
                {bookingStatus.reservation_url ? (
                  <p>
                    Confirmation URL:{" "}
                    <a
                      href={bookingStatus.reservation_url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold underline"
                    >
                      Open booking link
                    </a>
                  </p>
                ) : null}
              </div>
            ) : null}
          </section>
        ) : null}

        {error ? (
          <section className="rounded-2xl border border-red-300/35 bg-red-500/10 p-3 text-xs text-red-100">
            Could not load places: {error}
          </section>
        ) : null}

        {slotEligibilityError ? (
          <section className="rounded-2xl border border-red-300/35 bg-red-500/10 p-3 text-xs text-red-100">
            Availability matching failed: {slotEligibilityError}
          </section>
        ) : null}

        {!error && !slotEligibilityError && !isLoading && !slotEligibilityLoading && safeItems.length > 0 && primaryWindowsForDate.length === 0 ? (
          <section className="rounded-2xl border border-white/15 bg-white/10 p-3 text-xs text-white/75">
            No available windows found for the selected date. Change date or sync calendar.
          </section>
        ) : null}

        {!isLoading && !slotEligibilityLoading && !error && safeItems.length > 0 && primaryWindowsForDate.length > 0 && filteredVisible.length === 0 ? (
          <section className="rounded-2xl border border-white/15 bg-white/10 p-3 text-xs text-white/75">
            No recommendation-eligible restaurants/coffee spots have slots that overlap your selected availability windows.
          </section>
        ) : null}

        {isLoading || slotEligibilityLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="h-28 rounded-2xl bg-white/10 border border-white/10 animate-pulse" />
            ))}
          </div>
        ) : null}

        {!isLoading && !slotEligibilityLoading && !error && filteredVisible.length > 0 ? (
          <>
            <div className="space-y-2">
              {visibleItems.map((place: any) => {
                const score = Number(rankingById[place.id]?.score || 0);
                const ordinal = recommendationNumberByPlaceId[place.id] || "-";
                return (
                  <div key={place.id} className="rounded-2xl border border-white/15 bg-white/10 overflow-hidden">
                    <img
                      src={place.imageUrl}
                      alt="Restaurant"
                      className="h-36 w-full object-cover"
                      loading="lazy"
                    />
                    <div className="p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-black uppercase tracking-wider text-[#F2E8CF]">
                          Recommendation #{ordinal}
                        </p>
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#F2E8CF]/15 border border-[#F2E8CF]/25 px-2 py-0.5 text-[10px] font-black text-[#F2E8CF]">
                          <Sparkles size={10} /> {Math.round(score * 100)}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[11px]">
                        <span className="font-bold text-white/85">⭐ {Number(place.rating || 0).toFixed(1)}</span>
                        <span className="text-white/35">{place.price || "$"}</span>
                        <span className="text-white/35">{formatDistance(Number(place.distanceMeters || 0))}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${place.isOpenNow ? "bg-emerald-500/20 text-emerald-100" : "bg-white/10 text-white/60"}`}>
                          {place.isOpenNow ? "Open now" : "Closed"}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-white/65 uppercase">
                          {place.category}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => onMockReserve(place)}
                          className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-[#F2E8CF] text-[#233216]"
                        >
                          Reserve by availability
                        </button>
                        <button
                          onClick={() => onOpenPlace(place)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-white/10 border border-white/15 text-white/75"
                        >
                          Source <ExternalLink size={11} />
                        </button>
                        <button
                          onClick={() => toggleLike(place)}
                          className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border ${likedIds.includes(place.id) ? "bg-[#F2E8CF]/20 border-[#F2E8CF]/40 text-[#F2E8CF]" : "bg-white/10 border-white/15 text-white/65"}`}
                        >
                          {likedIds.includes(place.id) ? "Liked" : "Like"}
                        </button>
                        <button
                          onClick={() => dismissPlace(place)}
                          className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-white/5 border border-white/10 text-white/45"
                        >
                          Hide
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setVisibleCount((count) => count + 6)}
              disabled={!hasMore}
              className="w-full px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider bg-white/10 border border-white/15 text-white/75 disabled:opacity-50"
            >
              {hasMore ? "Load more" : "All matched recommendations loaded"}
            </button>
          </>
        ) : null}

        <div className="pb-3">
          <button
            onClick={resetFilters}
            className="w-full px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider bg-white/5 border border-white/10 text-white/55"
          >
            Reset filters
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
