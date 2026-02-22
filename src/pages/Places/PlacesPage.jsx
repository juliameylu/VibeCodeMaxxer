import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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

const SORT_OPTIONS = [
  { label: "Best match", value: "best_match" },
  { label: "Rating", value: "rating" },
  { label: "Distance", value: "distance" },
];

export default function PlacesPage() {
  const [category, setCategory] = useState("restaurant");
  const [price, setPrice] = useState("all");
  const [query, setQuery] = useState("");
  const [openNow, setOpenNow] = useState(false);
  const [sortBy, setSortBy] = useState("best_match");
  const [preferences, setPreferences] = useState([]);
  const [customPreference, setCustomPreference] = useState("");
  const [visibleCount, setVisibleCount] = useState(6);
  const [likedIds, setLikedIds] = useState([]);
  const [hiddenIds, setHiddenIds] = useState([]);
  const [showAll, setShowAll] = useState(false);

  const filters = useMemo(
    () => ({
      category,
      price,
      query,
      openNow,
      sortBy,
      preferences: [...preferences, customPreference].filter(Boolean),
      page: 1,
      pageSize: 24,
    }),
    [category, price, query, openNow, sortBy, preferences, customPreference],
  );

  const { data, isLoading, error } = usePlacesSearch(filters);
  const ranking = useMemo(
    () =>
      rankRestaurants({
        items: data.items,
        activePreferences: [...preferences, customPreference].filter(Boolean),
      }),
    [data.items, preferences, customPreference]
  );

  const rankedItems = useMemo(() => ranking.ranked.map((row) => row.item), [ranking.ranked]);
  const baseItems = showAll ? data.items : rankedItems;
  const filteredVisible = useMemo(
    () => baseItems.filter((place) => !hiddenIds.includes(place.id)),
    [baseItems, hiddenIds]
  );
  const visibleItems = filteredVisible.slice(0, visibleCount);
  const hasMore = visibleCount < filteredVisible.length || data.hasMore;

  useEffect(() => {
    trackRestaurantImpressionsOncePerSession(
      filteredVisible,
      (place) => place.id,
      (place) => `${place.name} ${place.category} ${place.address} ${place.price}`,
      8,
    );
  }, [filteredVisible]);

  function togglePreference(value) {
    setVisibleCount(6);
    setPreferences((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value],
    );
  }

  function resetFilters() {
    setCategory("restaurant");
    setPrice("all");
    setQuery("");
    setOpenNow(false);
    setSortBy("best_match");
    setPreferences([]);
    setCustomPreference("");
    setVisibleCount(6);
  }

  function toggleLike(place) {
    setLikedIds((prev) => {
      const nextLiked = !prev.includes(place.id);
      if (nextLiked) {
        trackRestaurantAction({
          itemId: place.id,
          text: `${place.name} ${place.category} ${place.address} ${place.price}`,
          action: "like"
        });
      }
      return nextLiked ? [...prev, place.id] : prev.filter((id) => id !== place.id);
    });
  }

  function dismissPlace(place) {
    trackRestaurantAction({
      itemId: place.id,
      text: `${place.name} ${place.category} ${place.address} ${place.price}`,
      action: "dismiss"
    });
    setHiddenIds((prev) => [...new Set([...prev, place.id])]);
  }

  function onOpenPlace(place) {
    trackRestaurantAction({
      itemId: place.id,
      text: `${place.name} ${place.category} ${place.address} ${place.price}`,
      action: "open"
    });
  }

  return (
    <MobileShell showFab={false}>
      <SectionHeader
        title="Food & Coffee"
        subtitle="Yelp-style search with caching and hybrid recommendations"
        action={<span className="chip chip-idle text-xs">{data.total} found</span>}
      />

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        <Link to="/" className="chip chip-idle whitespace-nowrap">Home</Link>
        <Link to="/places" className="chip chip-active whitespace-nowrap">Restaurants</Link>
        <Link to="/events" className="chip chip-idle whitespace-nowrap">Events</Link>
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
                clearRestaurantProfile();
                setLikedIds([]);
                setHiddenIds([]);
                setShowAll(false);
              }}
            >
              Reset Profile
            </button>
            <span className="chip chip-idle text-xs">Interactions: {ranking.interactions}</span>
          </div>

          <div className="relative">
            <Search size={16} className="absolute left-3 top-3 text-soft" />
            <input
              value={query}
              onChange={(event) => {
                setVisibleCount(6);
                setQuery(event.target.value);
              }}
              placeholder="Search by name or address"
              className="w-full rounded-xl border border-black/10 bg-white/80 py-2 pl-9 pr-3 text-sm text-ink outline-none focus:border-amberSoft"
            />
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
          </div>

          <div className="flex items-center justify-between gap-3">
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
        </section>

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

        {isLoading ? (
          <div className="grid grid-cols-1 gap-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-56" />
            ))}
          </div>
        ) : null}

        {!isLoading && !error && data.items.length === 0 ? (
          <EmptyState
            title="No matching places"
            message="Try widening filters or removing preferences."
            action={
              <button onClick={resetFilters} className="chip chip-active text-xs">
                Clear filters
              </button>
            }
          />
        ) : null}

        {!isLoading && !error && data.items.length > 0 && filteredVisible.length === 0 ? (
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

        {!isLoading && !error && data.items.length > 0 ? (
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
                />
              ))}
            </div>

            <button
              onClick={() => setVisibleCount((count) => count + 6)}
              disabled={!hasMore}
              className={`chip w-full ${hasMore ? "chip-active" : "chip-idle"}`}
            >
              {hasMore ? "Load more" : "All results loaded"}
            </button>
          </>
        ) : null}
      </PageShell>
    </MobileShell>
  );
}
