import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router";
import { motion } from "motion/react";
import Masonry, { ResponsiveMasonry } from "react-responsive-masonry";
import { Search, MapPin, Pin, ArrowLeft, Car, Bus, DollarSign, Bike, ExternalLink, Sparkles, Zap } from "lucide-react";
import { places, getPlaceEmoji } from "../data/places";
import { clsx } from "clsx";
import { BottomNav } from "../components/BottomNav";
import { PageHeader } from "../components/PageHeader";
import { MustangIcon } from "../components/MustangIcon";
import { getUserPreferences, getPreferenceScore, type UserPreferences } from "../utils/preferences";

const fallbackImage = "https://images.unsplash.com/photo-1551449440-f29f2e53104b?fm=jpg&fit=crop&w=800";

// Events widget data (moved from Dashboard)
const sloEvents = [
  { id: "ev1", name: "Downtown Farmers Market", when: "Thu", time: "6–9 PM", emoji: "🥕" },
  { id: "ev2", name: "SLO Brew Live Music", when: "Today", time: "8 PM", emoji: "🎵" },
  { id: "ev3", name: "Bishop Peak Sunset Hike", when: "Tomorrow", time: "5 PM", emoji: "🌅" },
  { id: "ev4", name: "Art After Dark", when: "Tomorrow", time: "6–9 PM", emoji: "🎨" },
  { id: "ev5", name: "Cal Poly Basketball", when: "Sat", time: "7 PM", emoji: "🏀" },
  { id: "ev6", name: "Pismo Car Show", when: "Sat", time: "10 AM", emoji: "🚗" },
];

export function Explore() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [searchParams] = useSearchParams();
  const [eventFilter, setEventFilter] = useState("Today");
  const [priceFilter, setPriceFilter] = useState<string | null>(null);
  const [sortByPreference, setSortByPreference] = useState(true);
  const userPrefs = useMemo(() => getUserPreferences(), []);
  const initRef = useRef(false);

  // Read category from search params or router state on mount only
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    // Check router state first (from Preferences / Profile "Train Jarvis")
    const state = location.state as { category?: string } | null;
    if (state?.category) {
      setActiveCategory(state.category);
      // Clear state so it doesn't stick on browser back
      window.history.replaceState({}, document.title);
      return;
    }

    // Then check URL search params
    const cat = searchParams.get("category");
    if (cat) setActiveCategory(cat);

    const pinned = localStorage.getItem("pinnedEvents");
    if (pinned) setPinnedIds(JSON.parse(pinned));
  }, []); // run once on mount

  const togglePin = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = pinnedIds.includes(id) ? pinnedIds.filter(l => l !== id) : [...pinnedIds, id];
    setPinnedIds(updated);
    localStorage.setItem("pinnedEvents", JSON.stringify(updated));
  };

  const categories = useMemo(() => {
    const cats = Array.from(new Set(places.map(p => p.category)));
    // Add "For You" category when training data exists
    const base = userPrefs.hasTrainingData
      ? ["All", "For You", "Inside", "Outside", "Budget", "Top rated"]
      : ["All", "Inside", "Outside", "Budget", "Top rated"];
    return [...base, ...cats.sort()];
  }, [userPrefs.hasTrainingData]);

  const filteredPlaces = useMemo(() => {
    let result = places.filter(place => {
      let matchesCategory = false;
      switch (activeCategory) {
        case "All": matchesCategory = true; break;
        case "For You":
          // Show places with high preference scores (7+)
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

    // Sort by preference score when training data exists and sort is enabled
    if (userPrefs.hasTrainingData && sortByPreference) {
      result = [...result].sort((a, b) => {
        const scoreA = getPreferenceScore(a, userPrefs);
        const scoreB = getPreferenceScore(b, userPrefs);
        return scoreB - scoreA;
      });
    }

    return result;
  }, [activeCategory, searchQuery, priceFilter, userPrefs, sortByPreference]);

  const filteredEvents = sloEvents.filter(e => e.when === eventFilter);

  return (
    <div
      className="min-h-full text-white pb-20"
      style={{
        background: "linear-gradient(180deg, rgba(13,18,8,0.92) 0%, rgba(13,18,8,0.78) 14%, rgba(13,18,8,0) 36%)",
      }}
    >
      <PageHeader />

      {/* Header - fixed clash by using smaller text */}
      <div className="sticky top-0 z-20 bg-black/50 backdrop-blur-xl border-b border-white/8 px-4 pb-2 space-y-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/dashboard")} className="p-1 -ml-1 text-white/40">
            <ArrowLeft size={22} />
          </button>
          <div className="flex-1">
            <h1
              className="text-lg font-black text-white uppercase tracking-wider"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              EXPLORE SLO
            </h1>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" size={16} />
          <input
            type="text"
            placeholder="Search places..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/10 border border-white/15 rounded-xl py-2.5 pl-9 pr-4 text-sm text-white focus:outline-none focus:border-[#F2E8CF]/40 placeholder:text-white/25"
          />
        </div>

        {/* Categories */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={clsx(
                "whitespace-nowrap px-3 py-1.5 rounded-full text-[10px] font-black tracking-wider transition-all uppercase flex items-center gap-1",
                activeCategory === cat
                  ? cat === "For You"
                    ? "bg-gradient-to-r from-[#F2E8CF] to-[#E8D5B0] text-[#233216] shadow-md shadow-[#F2E8CF]/20"
                    : "bg-[#F2E8CF] text-[#233216]"
                  : cat === "For You"
                    ? "bg-[#F2E8CF]/15 text-[#F2E8CF] border border-[#F2E8CF]/20"
                    : "bg-white/10 text-white/40"
              )}
            >
              {cat === "For You" && <Sparkles size={9} />}
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Happening Soon Widget */}
      <div className="px-4 pt-3">
        {/* Price filter chips */}
        <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
          <p className="text-[9px] font-black text-white/25 uppercase tracking-widest self-center mr-1 flex-shrink-0">PRICE:</p>
          {["Free", "$", "$$", "$$$"].map(p => (
            <button
              key={p}
              onClick={() => setPriceFilter(priceFilter === p ? null : p)}
              className={clsx(
                "whitespace-nowrap px-2.5 py-1 rounded-full text-[9px] font-black tracking-wider transition-all",
                priceFilter === p
                  ? "bg-[#F2E8CF] text-[#233216]"
                  : "bg-white/8 text-white/35 border border-white/10"
              )}
            >
              {p}
            </button>
          ))}
          {priceFilter && (
            <button
              onClick={() => setPriceFilter(null)}
              className="text-[9px] font-bold text-red-400/60 px-2 py-1"
            >
              CLEAR
            </button>
          )}
        </div>

        <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl p-3 mb-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-black text-[#F2E8CF] uppercase tracking-widest">HAPPENING SOON</p>
            <div className="flex gap-1">
              {["Today", "Tomorrow", "Thu", "Sat"].map(d => (
                <button
                  key={d}
                  onClick={() => setEventFilter(d)}
                  className={`text-[9px] font-black px-2 py-1 rounded-md tracking-wider transition-all ${
                    eventFilter === d
                      ? "bg-[#F2E8CF]/20 text-[#F2E8CF]"
                      : "text-white/30 hover:text-white/45"
                  }`}
                >
                  {d.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          {filteredEvents.length === 0 ? (
            <p className="text-xs text-white/25 text-center py-1">Nothing scheduled for {eventFilter}</p>
          ) : (
            <div className="space-y-1">
              {filteredEvents.map(ev => (
                <div key={ev.id} className="flex items-center gap-3 bg-white/6 rounded-lg px-3 py-2">
                  <span className="text-lg">{ev.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white/75 truncate">{ev.name}</p>
                    <p className="text-[10px] text-white/35">{ev.time}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SLO Transit quick links */}
      <div className="px-4 mb-2">
        <div className="flex gap-2">
          {/* Personalized sort toggle when training data exists */}
          {userPrefs.hasTrainingData && (
            <button
              onClick={() => setSortByPreference(!sortByPreference)}
              className={clsx(
                "flex items-center gap-1.5 text-[9px] font-bold px-2.5 py-1.5 rounded-lg border transition-all",
                sortByPreference
                  ? "text-[#F2E8CF] bg-[#F2E8CF]/12 border-[#F2E8CF]/20"
                  : "text-white/40 bg-white/5 border-white/10"
              )}
            >
              <Sparkles size={10} /> {sortByPreference ? "PERSONALIZED" : "DEFAULT ORDER"}
            </button>
          )}
          <a
            href="https://www.slocity.org/government/department-directory/public-works/slo-transit"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[9px] font-bold text-blue-300/70 bg-blue-300/8 px-2.5 py-1.5 rounded-lg border border-blue-300/15"
          >
            <Bus size={10} /> SLO TRANSIT <ExternalLink size={8} />
          </a>
          <a
            href="https://afd.calpoly.edu/sustainability/commute-options/mustang-shuttle"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[9px] font-bold text-green-300/70 bg-green-300/8 px-2.5 py-1.5 rounded-lg border border-green-300/15"
          >
            <Bus size={10} /> MUSTANG SHUTTLE <ExternalLink size={8} />
          </a>
        </div>
      </div>

      {/* Grid */}
      <div className="p-4">
        {/* Personalized banner */}
        {userPrefs.hasTrainingData && sortByPreference && activeCategory !== "For You" && (
          <div className="flex items-center gap-2 mb-3 bg-[#F2E8CF]/8 border border-[#F2E8CF]/15 rounded-lg px-3 py-2">
            <Sparkles size={12} className="text-[#F2E8CF] flex-shrink-0" />
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-[10px] font-bold text-[#F2E8CF]/70">Sorted by your preferences</p>
              <button
                onClick={() => setActiveCategory("For You")}
                className="flex items-center gap-1.5 text-[9px] font-bold tracking-wider uppercase text-[#F2E8CF] bg-[#F2E8CF]/12 px-2.5 py-1 rounded-lg border border-[#F2E8CF]/20 active:bg-[#F2E8CF]/20 transition-all"
              >
                <Sparkles size={10} />
                See Top Picks
              </button>
            </div>
          </div>
        )}
        <ResponsiveMasonry columnsCountBreakPoints={{ 350: 2, 750: 3 }}>
          <Masonry gutter="10px">
            {filteredPlaces.map((place) => {
              const isPinned = pinnedIds.includes(place.id);
              const needsCar = place.features?.includes("needs car");
              const hasBus = place.features?.includes("bus available");
              const prefScore = userPrefs.hasTrainingData ? getPreferenceScore(place, userPrefs) : null;

              return (
                <motion.div
                  key={place.id}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  onClick={() => navigate(`/event/${place.id}`, { state: { from: "/explore" } })}
                  className="group relative bg-white/10 rounded-xl overflow-hidden border border-white/15 cursor-pointer active:scale-[0.97] transition-transform"
                >
                  <div className="aspect-[4/3] overflow-hidden relative">
                    <img src={place.image || fallbackImage} alt={place.name}
                      className="w-full h-full object-cover" loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                    {/* Pin button */}
                    <button
                      onClick={(e) => togglePin(place.id, e)}
                      className={clsx(
                        "absolute top-2 right-2 p-1.5 rounded-full backdrop-blur-md transition-all",
                        isPinned ? "bg-[#F2E8CF]/80 text-[#233216]" : "bg-black/40 text-white/70"
                      )}
                    >
                      <Pin size={12} fill={isPinned ? "currentColor" : "none"} />
                    </button>

                    {/* Preference score badge */}
                    {prefScore !== null && prefScore >= 7 && (
                      <div className="absolute top-2 left-2 flex items-center gap-1 bg-[#F2E8CF]/90 text-[#233216] px-1.5 py-0.5 rounded-full backdrop-blur-md">
                        <Zap size={8} fill="currentColor" />
                        <span className="text-[8px] font-black">{prefScore}/10</span>
                      </div>
                    )}

                    <div className="absolute bottom-2 left-2 right-2 text-white">
                      <h3 className="text-sm font-bold leading-tight drop-shadow-md truncate">
                        {getPlaceEmoji(place)} {place.name}
                      </h3>
                      <p className="text-[10px] text-white/70 flex items-center gap-0.5">
                        <MapPin size={8} /> {place.city}
                      </p>
                    </div>
                  </div>

                  <div className="px-2 py-1.5 flex items-center gap-1.5">
                    <span className="text-[9px] font-bold text-[#F2E8CF] flex items-center gap-0.5">
                      <MustangIcon size={9} fill="currentColor" /> {place.rating}
                    </span>
                    <span className="text-[9px] text-white/20">·</span>
                    <span className="text-[9px] font-bold text-white/45 flex items-center gap-0.5">
                      <DollarSign size={8} />{place.price}
                    </span>
                    <span className="text-[9px] text-white/20">·</span>
                    <span className="text-[9px] font-bold text-white/35">{place.distance}</span>
                    {/* Preference score (subtle) for medium scores */}
                    {prefScore !== null && prefScore >= 5 && prefScore < 7 && (
                      <>
                        <span className="text-[9px] text-white/20">·</span>
                        <span className="text-[8px] font-bold text-[#F2E8CF]/50 flex items-center gap-0.5">
                          <Sparkles size={7} /> {prefScore}
                        </span>
                      </>
                    )}
                    {needsCar && (
                      <span className="ml-auto flex items-center gap-0.5 text-[8px] font-bold text-orange-300/70 bg-orange-300/10 px-1 py-0.5 rounded">
                        <Car size={8} /> CAR
                      </span>
                    )}
                    {hasBus && (
                      <span className={`${needsCar ? "" : "ml-auto"} flex items-center gap-0.5 text-[8px] font-bold text-blue-300/70 bg-blue-300/10 px-1 py-0.5 rounded`}>
                        <Bus size={8} /> BUS
                      </span>
                    )}
                    {!needsCar && !hasBus && place.features?.includes("walkable") && (
                      <span className="ml-auto flex items-center gap-0.5 text-[8px] font-bold text-green-300/70 bg-green-300/10 px-1 py-0.5 rounded">
                        🚶 WALK
                      </span>
                    )}
                    {place.features?.includes("bike friendly") && (
                      <span className="flex items-center gap-0.5 text-[8px] font-bold text-purple-300/70 bg-purple-300/10 px-1 py-0.5 rounded">
                        <Bike size={8} /> BIKE
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </Masonry>
        </ResponsiveMasonry>

        {filteredPlaces.length === 0 && (
          <div className="text-center py-16 text-white/25">No places found.</div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
