import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import Masonry, { ResponsiveMasonry } from "react-responsive-masonry";
import { Search, MapPin, Pin, ArrowLeft, Car, Bus, DollarSign, Bike, Sparkles, Users, Home, TreePine, Award, Footprints, Plus, ClipboardList, SlidersHorizontal, ExternalLink } from "lucide-react";
import { places } from "../data/places";
import { clsx } from "clsx";
import { BottomNav } from "../components/BottomNav";
import { PageHeader } from "../components/PageHeader";
import { MustangIcon } from "../components/MustangIcon";
import { getUserPreferences, getPreferenceScore, type UserPreferences } from "../utils/preferences";

const fallbackImage = "https://images.unsplash.com/photo-1551449440-f29f2e53104b?auto=format&fit=crop&w=800";

const JAMS_KEY = "polyjarvis_jams";
const PLANS_KEY = "polyjarvis_plans";

/** Get a human-readable reason why this place matches preferences */
function getMatchReason(place: typeof places[0], prefs: UserPreferences): string {
  const reasons: string[] = [];
  if (prefs.likes.includes("t1") && place.category === "Beaches") reasons.push("you like beach vibes");
  if (prefs.likes.includes("t2") && (place.category === "Hikes" || place.category === "Viewpoints")) reasons.push("you love mountain adventures");
  if (prefs.likes.includes("t3") && place.category === "Coffee Shops") reasons.push("coffee shop culture is your thing");
  if (prefs.likes.includes("t4") && (place.category === "Breweries" || place.category === "Live Music")) reasons.push("you're into nightlife");
  if (prefs.likes.includes("t5") && place.tags.some(t => t.toLowerCase().includes("mexican"))) reasons.push("you love Mexican food");
  if (prefs.likes.includes("t7") && place.tags.some(t => t.toLowerCase().includes("pizza"))) reasons.push("pizza is your thing");
  if (prefs.likes.includes("t8") && place.features.includes("healthy")) reasons.push("you prefer healthy options");
  if (prefs.likes.includes("t9") && place.category === "Hikes") reasons.push("sunrise hikes are your vibe");
  if (prefs.likes.includes("t10") && (place.category === "Art" || place.category === "Museums")) reasons.push("you're into art & museums");
  if (prefs.likes.includes("t11") && place.category === "Live Music") reasons.push("live music fan");
  if (prefs.likes.includes("t12") && (place.category === "Study Spots" || place.category === "Coffee Shops")) reasons.push("great study spot");
  if (prefs.likes.includes("t13") && (place.price === "Free" || place.price === "$")) reasons.push("budget-friendly");
  if (prefs.likes.includes("t15") && place.features.includes("walkable")) reasons.push("walking distance");
  if (place.rating >= 4.8) reasons.push("top rated");
  if (reasons.length === 0 && place.rating >= 4.5) reasons.push("highly rated in SLO");
  return reasons.slice(0, 2).join(" & ");
}

/** Category icon mapping using lucide icons */
function getCatIcon(category: string) {
  const map: Record<string, typeof MapPin> = {
    "Beaches": TreePine, "Hikes": TreePine, "Coffee Shops": Home,
    "Food & Treats": DollarSign, "Study Spots": Home, "Live Music": Sparkles,
    "Parks & Gardens": TreePine, "Viewpoints": Award, "Breweries": Home,
  };
  return map[category] || MapPin;
}

// Macro filter definitions
const macroFilters = [
  { id: "Pinned", label: "Pinned", icon: Pin, special: false, pinned: true },
  { id: "All", label: "All", icon: Search },
  { id: "For You", label: "For You", icon: Sparkles, special: true },
  { id: "Inside", label: "Indoors", icon: Home },
  { id: "Outside", label: "Outdoors", icon: TreePine },
  { id: "Budget", label: "Budget", icon: DollarSign },
  { id: "Top rated", label: "Top Rated", icon: Award },
];

export function Explore() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [searchParams] = useSearchParams();
  const [priceFilter, setPriceFilter] = useState<string | null>(null);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const userPrefs = useMemo(() => getUserPreferences(), []);
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    const state = location.state as { category?: string } | null;
    if (state?.category) {
      setActiveCategory(state.category);
      window.history.replaceState({}, document.title);
      return;
    }
    const cat = searchParams.get("category");
    if (cat) setActiveCategory(cat);
    const pinned = localStorage.getItem("pinnedEvents");
    if (pinned) setPinnedIds(JSON.parse(pinned));
  }, []);

  // Keep pinnedIds fresh
  useEffect(() => {
    const pinned = localStorage.getItem("pinnedEvents");
    if (pinned) setPinnedIds(JSON.parse(pinned));
  }, [activeCategory]);

  const togglePin = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = pinnedIds.includes(id) ? pinnedIds.filter(l => l !== id) : [...pinnedIds, id];
    setPinnedIds(updated);
    localStorage.setItem("pinnedEvents", JSON.stringify(updated));
  };

  const addToJam = (placeId: string, placeName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate("/jams", { state: { placeId, placeName } });
  };

  const categories = useMemo(() => {
    const cats = Array.from(new Set(places.map(p => p.category)));
    return cats.sort();
  }, []);

  const allFilters = useMemo(() => {
    const base = macroFilters.filter(f => {
      if (f.id === "For You") return userPrefs.hasTrainingData;
      return true;
    });
    return base;
  }, [userPrefs.hasTrainingData]);

  const filteredPlaces = useMemo(() => {
    const isUnder21 = localStorage.getItem("polyjarvis_age_21") === "no";
    const adultCategories = new Set(["Breweries", "Wineries"]);

    let result = places.filter(place => {
      // Filter 21+ content for under-21 users
      if (isUnder21 && adultCategories.has(place.category)) return false;

      let matchesCategory = false;
      switch (activeCategory) {
        case "All": matchesCategory = true; break;
        case "Pinned":
          matchesCategory = pinnedIds.includes(place.id);
          break;
        case "For You":
          matchesCategory = getPreferenceScore(place, userPrefs) >= 7;
          break;
        case "Inside":
          matchesCategory = ["Coffee Shops", "Study Spots", "Movies", "Bowling", "Museums", "Live Music", "Breweries", "Food & Treats", "Art", "Gym", "Escape Rooms", "Games & Arcades"].includes(place.category);
          break;
        case "Outside":
          matchesCategory = ["Hikes", "Beaches", "Parks & Gardens", "Farmers Markets", "Viewpoints", "Water Sports", "Day Trips"].includes(place.category);
          break;
        case "Budget":
          matchesCategory = place.price === "$" || place.price === "Free";
          break;
        case "Top rated":
          matchesCategory = place.rating >= 4.8;
          break;
        default:
          matchesCategory = place.category === activeCategory || place.tags.includes(activeCategory);
      }
      const matchesSearch = place.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        place.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesPrice = !priceFilter || place.price === priceFilter;
      return matchesCategory && matchesSearch && matchesPrice;
    });

    if (userPrefs.hasTrainingData) {
      result = [...result].sort((a, b) => getPreferenceScore(b, userPrefs) - getPreferenceScore(a, userPrefs));
    }

    return result;
  }, [activeCategory, searchQuery, priceFilter, userPrefs]);

  return (
    <div className="min-h-[100dvh] bg-transparent text-white pb-20">
      <PageHeader />

      {/* Header */}
      <div className="sticky top-0 z-20 bg-black/50 backdrop-blur-xl border-b border-white/8 px-4 pb-3 space-y-3 pt-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/dashboard")} className="p-1 -ml-1 text-white/40">
            <ArrowLeft size={22} />
          </button>
          <h1 className="text-lg font-extrabold text-white capitalize tracking-wider flex-1">Explore SLO</h1>
          <button onClick={() => setShowFilterPanel(!showFilterPanel)}
            className={clsx("p-2 rounded-xl transition-all", showFilterPanel ? "bg-[#F2E8CF] text-[#233216]" : "bg-white/10 text-white/40 border border-white/10")}>
            <SlidersHorizontal size={16} />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" size={16} />
          <input type="text" placeholder="Search places..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/10 border border-white/15 rounded-xl py-2.5 pl-9 pr-4 text-sm text-white focus:outline-none focus:border-[#F2E8CF]/40 placeholder:text-white/25"
          />
        </div>

        {/* Macro Filters — big, clean */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4">
          {allFilters.map((f) => {
            const FIcon = f.icon;
            const isPinnedFilter = (f as any).pinned;
            const pinnedCount = pinnedIds.length;
            return (
              <button key={f.id} onClick={() => setActiveCategory(f.id)}
                className={clsx(
                  "whitespace-nowrap px-3 py-2 rounded-xl text-[10px] font-semibold tracking-wider transition-all flex items-center gap-1.5 relative",
                  activeCategory === f.id
                    ? isPinnedFilter
                      ? "bg-[#F2E8CF] text-[#233216] shadow-lg shadow-[#F2E8CF]/25 ring-2 ring-[#F2E8CF]/40"
                      : f.special
                        ? "bg-gradient-to-r from-[#F2E8CF] to-[#E8D5B0] text-[#233216] shadow-md"
                        : "bg-[#F2E8CF] text-[#233216]"
                    : isPinnedFilter
                      ? "bg-[#F2E8CF]/20 text-[#F2E8CF] border-2 border-[#F2E8CF]/40 shadow-sm shadow-[#F2E8CF]/10"
                      : f.special
                        ? "bg-[#F2E8CF]/15 text-[#F2E8CF] border border-[#F2E8CF]/20"
                        : "bg-white/8 text-white/40 border border-white/10"
                )}
              >
                <FIcon size={isPinnedFilter ? 13 : 11} fill={isPinnedFilter && (activeCategory === f.id || pinnedCount > 0) ? "currentColor" : "none"} />
                {f.label}
                {isPinnedFilter && pinnedCount > 0 && (
                  <span className={clsx(
                    "min-w-[16px] h-4 flex items-center justify-center rounded-full text-[8px] font-semibold px-1",
                    activeCategory === f.id
                      ? "bg-[#233216] text-[#F2E8CF]"
                      : "bg-[#F2E8CF] text-[#233216]"
                  )}>
                    {pinnedCount}
                  </span>
                )}
              </button>
            );
          })}
          {/* Sub-categories */}
          {categories.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className={clsx(
                "whitespace-nowrap px-2.5 py-2 rounded-xl text-[9px] font-bold tracking-wider transition-all",
                activeCategory === cat ? "bg-white/20 text-white" : "bg-white/5 text-white/30"
              )}
            >{cat}</button>
          ))}
        </div>
      </div>

      {/* "For You" preference banner */}
      {activeCategory === "For You" && userPrefs.hasTrainingData && (
        <div className="px-4 pt-3">
          <div className="bg-gradient-to-r from-[#F2E8CF]/12 to-[#64B5F6]/8 border border-[#F2E8CF]/20 rounded-xl p-3 mb-1">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={13} className="text-[#F2E8CF]" />
              <p className="text-xs font-semibold text-[#F2E8CF] capitalize tracking-wider">Based on Your Preferences</p>
            </div>
            <p className="text-[11px] text-white/50 leading-relaxed">
              You told Jarvis what you like. These are your top-scored spots with reasons why each one matches you.
            </p>
          </div>
        </div>
      )}

      {/* Price sub-filter */}
      <div className="px-4 pt-2">
        <div className="flex gap-1.5 mb-2 overflow-x-auto pb-1">
          <p className="text-[9px] font-semibold text-white/25 capitalize tracking-wider self-center mr-1 flex-shrink-0">Price:</p>
          {["Free", "$", "$$", "$$$"].map(p => (
            <button key={p} onClick={() => setPriceFilter(priceFilter === p ? null : p)}
              className={clsx("whitespace-nowrap px-2.5 py-1 rounded-full text-[9px] font-semibold tracking-wider transition-all",
                priceFilter === p ? "bg-[#F2E8CF] text-[#233216]" : "bg-white/8 text-white/35 border border-white/10"
              )}
            >{p}</button>
          ))}
          {priceFilter && (
            <button onClick={() => setPriceFilter(null)} className="text-[9px] font-bold text-red-400/60 px-2 py-1">Clear</button>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="p-4 pt-1">
        <ResponsiveMasonry columnsCountBreakPoints={{ 350: 2, 750: 3 }}>
          <Masonry gutter="10px">
            {filteredPlaces.map((place) => {
              const isPinned = pinnedIds.includes(place.id);
              const needsCar = place.features?.includes("needs car");
              const hasBus = place.features?.includes("bus available");
              const prefScore = userPrefs.hasTrainingData ? getPreferenceScore(place, userPrefs) : null;
              const matchReason = activeCategory === "For You" && userPrefs.hasTrainingData ? getMatchReason(place, userPrefs) : null;

              return (
                <motion.div key={place.id} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
                  onClick={() => navigate(`/event/${place.id}`, { state: { from: "/explore" } })}
                  className="group relative bg-white/10 rounded-xl overflow-hidden border border-white/12 cursor-pointer active:scale-[0.97] transition-transform shadow-lg shadow-black/10"
                >
                  <div className="aspect-[4/3] overflow-hidden relative">
                    <img src={place.image || fallbackImage} alt={place.name} className="w-full h-full object-cover" loading="lazy" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-black/10" />

                     {/* Add to jam button */}
                     <button onClick={(e) => addToJam(place.id, place.name, e)}
                       className="absolute top-2 right-2 p-1.5 rounded-full bg-black/40 text-white/70 backdrop-blur-md hover:bg-[#F2E8CF]/80 hover:text-[#233216] transition-all"
                       title="Add to Jam">
                       <Users size={11} />
                     </button>

                     {/* Pin button */}
                     <button onClick={(e) => togglePin(place.id, e)}
                       className={clsx(
                         "absolute top-2 right-10 p-1.5 rounded-full backdrop-blur-md transition-all",
                         pinnedIds.includes(place.id)
                           ? "bg-[#c4a46c] text-white"
                           : "bg-black/40 text-white/70 hover:bg-[#c4a46c]/80 hover:text-white"
                       )}
                       title={pinnedIds.includes(place.id) ? "Unpin" : "Pin"}>
                       <Pin size={11} className={pinnedIds.includes(place.id) ? "fill-current" : ""} />
                     </button>

                    <div className="absolute bottom-2 left-2 right-2 text-white">
                      <h3 className="text-sm font-extrabold leading-tight drop-shadow-md">{place.name}</h3>
                      <p className="text-[10px] text-white/70 flex items-center gap-0.5">
                        <MapPin size={8} /> {place.city}
                      </p>
                    </div>
                  </div>

                  {/* Match reason (For You) */}
                  {matchReason && (
                    <div className="px-2 py-1 bg-[#F2E8CF]/8 border-b border-[#F2E8CF]/10">
                      <p className="text-[8px] font-bold text-[#F2E8CF]/70 italic truncate">Because {matchReason}</p>
                    </div>
                  )}

                  <div className="px-2 py-1.5 flex items-center gap-1.5">
                    <span className="text-[9px] font-bold text-[#F2E8CF] flex items-center gap-0.5">
                      <MustangIcon size={9} fill="currentColor" /> {place.rating}
                    </span>
                    <span className="text-[9px] text-white/20">&middot;</span>
                    <span className="text-[9px] font-bold text-white/45">{place.price}</span>
                    <span className="text-[9px] text-white/20">&middot;</span>
                    <span className="text-[9px] font-bold text-white/35">{place.distance}</span>
                    {needsCar && (
                      <span className="ml-auto flex items-center gap-0.5 text-[8px] font-bold text-orange-300/70 bg-orange-300/10 px-1 py-0.5 rounded">
                        <Car size={8} /> Car
                      </span>
                    )}
                    {hasBus && (
                      <span className={`${needsCar ? "" : "ml-auto"} flex items-center gap-0.5 text-[8px] font-bold text-blue-300/70 bg-blue-300/10 px-1 py-0.5 rounded`}>
                        <Bus size={8} /> Bus
                      </span>
                    )}
                    {!needsCar && !hasBus && place.features?.includes("walkable") && (
                      <span className="ml-auto flex items-center gap-0.5 text-[8px] font-bold text-green-300/70 bg-green-300/10 px-1 py-0.5 rounded">
                        <Footprints size={8} /> Walk
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </Masonry>
        </ResponsiveMasonry>

        {filteredPlaces.length === 0 && (
          <div className="text-center py-16 px-6">
            {activeCategory === "Pinned" ? (
              <>
                <Pin size={36} className="mx-auto text-[#F2E8CF]/20 mb-3" />
                <p className="text-lg font-bold text-white/40 mb-1">No Pinned Spots Yet</p>
                <p className="text-sm text-white/25 mb-4">Pin places you love by tapping the pin icon on any card. They'll show up here for quick access.</p>
                <button onClick={() => setActiveCategory("All")} className="px-5 py-2 bg-[#F2E8CF]/15 border border-[#F2E8CF]/25 rounded-xl text-[#F2E8CF] font-bold text-sm">Browse All</button>
              </>
            ) : (
              <p className="text-white/25">No places found.</p>
            )}
          </div>
        )}
      </div>

      <BottomNav />

      {/* ═══ FILTER SIDE PANEL ═══ */}
      <AnimatePresence>
        {showFilterPanel && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-30 bg-black/40"
              onClick={() => setShowFilterPanel(false)}
            />
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed top-0 right-0 bottom-0 w-[280px] z-40 bg-gradient-to-b from-[#1a2e12]/98 to-[#0d1a08]/98 backdrop-blur-2xl border-l border-[#F2E8CF]/15 shadow-2xl overflow-y-auto"
            >
              <div className="p-5 pt-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-extrabold text-white capitalize tracking-wider">Filters</h2>
                  <button onClick={() => setShowFilterPanel(false)} className="p-1.5 bg-white/10 rounded-lg text-white/40">
                    <SlidersHorizontal size={14} />
                  </button>
                </div>

                {/* Activity Type */}
                <div className="mb-6">
                  <p className="text-[10px] font-semibold text-[#F2E8CF]/50 capitalize tracking-wider mb-3">Activity Type</p>
                  <div className="space-y-1.5">
                    {categories.map(cat => (
                      <button key={cat} onClick={() => { setActiveCategory(cat); setShowFilterPanel(false); }}
                        className={clsx("w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
                          activeCategory === cat ? "bg-[#F2E8CF] text-[#233216]" : "bg-white/5 text-white/50 border border-white/8 hover:bg-white/10"
                        )}>
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: activeCategory === cat ? "#233216" : "rgba(255,255,255,0.2)" }} />
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quick Filters */}
                <div className="mb-6">
                  <p className="text-[10px] font-semibold text-[#F2E8CF]/50 capitalize tracking-wider mb-3">Quick Filters</p>
                  <div className="space-y-1.5">
                    {allFilters.map(f => {
                      const FIcon = f.icon;
                      return (
                        <button key={f.id} onClick={() => { setActiveCategory(f.id); setShowFilterPanel(false); }}
                          className={clsx("w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
                            activeCategory === f.id ? "bg-[#F2E8CF] text-[#233216]" : "bg-white/5 text-white/50 border border-white/8 hover:bg-white/10"
                          )}>
                          <FIcon size={12} /> {f.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Price */}
                <div className="mb-6">
                  <p className="text-[10px] font-semibold text-[#F2E8CF]/50 capitalize tracking-wider mb-3">Price Range</p>
                  <div className="flex gap-2">
                    {["Free", "$", "$$", "$$$"].map(p => (
                      <button key={p} onClick={() => setPriceFilter(priceFilter === p ? null : p)}
                        className={clsx("flex-1 py-2.5 rounded-xl text-[10px] font-semibold transition-all",
                          priceFilter === p ? "bg-[#F2E8CF] text-[#233216]" : "bg-white/8 text-white/35 border border-white/10"
                        )}>{p}</button>
                    ))}
                  </div>
                </div>

                {/* Clear filters */}
                <button onClick={() => { setActiveCategory("All"); setPriceFilter(null); setShowFilterPanel(false); }}
                  className="w-full py-3 bg-white/8 border border-white/10 rounded-xl text-xs font-bold text-white/40 active:scale-95 transition-transform">
                  Clear All Filters
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}