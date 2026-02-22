import { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import Masonry, { ResponsiveMasonry } from "react-responsive-masonry";
import { motion } from "motion/react";
import { Search, MapPin, Heart, ArrowLeft } from "lucide-react";
import { places } from "../data/places";
import { clsx } from "clsx";
import { BottomNav } from "../components/BottomNav";
import { PageHeader } from "../components/PageHeader";

const fallbackImage = "https://images.unsplash.com/photo-1551449440-f29f2e53104b?auto=format&fit=crop&w=800";

export function Explore() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [likedIds, setLikedIds] = useState<string[]>([]);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const cat = searchParams.get("category");
    if (cat) setActiveCategory(cat);
    const liked = localStorage.getItem("polyjarvis_liked");
    if (liked) setLikedIds(JSON.parse(liked));
  }, [searchParams]);

  const toggleLike = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = likedIds.includes(id) ? likedIds.filter(l => l !== id) : [...likedIds, id];
    setLikedIds(updated);
    localStorage.setItem("polyjarvis_liked", JSON.stringify(updated));
  };

  const categories = useMemo(() => {
    const cats = Array.from(new Set(places.map(p => p.category)));
    return ["All", ...cats.sort()];
  }, []);

  const filteredPlaces = useMemo(() => {
    return places.filter(place => {
      let matchesCategory = false;
      switch (activeCategory) {
        case "All": matchesCategory = true; break;
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
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  return (
    <div className="min-h-[100dvh] bg-transparent text-white pb-20">
      <PageHeader />

      {/* Header */}
      <div className="sticky top-0 z-20 bg-black/40 backdrop-blur-xl border-b border-white/5 px-4 pb-2 space-y-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/dashboard")} className="p-1 -ml-1 text-white/30">
            <ArrowLeft size={22} />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-black text-white uppercase tracking-wider">EXPLORE</h1>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={16} />
          <input
            type="text"
            placeholder="Search places..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/8 border border-white/10 rounded-xl py-2.5 pl-9 pr-4 text-sm text-white focus:outline-none focus:border-[#8BC34A]/40 placeholder:text-white/20"
          />
        </div>

        {/* Categories */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={clsx(
                "whitespace-nowrap px-3 py-1.5 rounded-full text-[10px] font-black tracking-wider transition-all uppercase",
                activeCategory === cat
                  ? "bg-[#8BC34A] text-[#233216]"
                  : "bg-white/8 text-white/30"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="p-4">
        <ResponsiveMasonry columnsCountBreakPoints={{ 350: 2, 750: 3 }}>
          <Masonry gutter="10px">
            {filteredPlaces.map((place) => (
              <motion.div
                key={place.id}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                onClick={() => navigate(`/event/${place.id}`, { state: { from: "/explore" } })}
                className="group relative bg-white/8 rounded-xl overflow-hidden border border-white/10 cursor-pointer active:scale-[0.97] transition-transform"
              >
                <div className="aspect-[4/3] overflow-hidden relative">
                  <img src={place.image || fallbackImage} alt={place.name}
                    className="w-full h-full object-cover" loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                  {/* Like button */}
                  <button
                    onClick={(e) => toggleLike(place.id, e)}
                    className={clsx(
                      "absolute top-2 right-2 p-1.5 rounded-full backdrop-blur-md transition-all",
                      likedIds.includes(place.id) ? "bg-red-500/80 text-white" : "bg-black/30 text-white/70"
                    )}
                  >
                    <Heart size={12} fill={likedIds.includes(place.id) ? "currentColor" : "none"} />
                  </button>

                  <div className="absolute bottom-2 left-2 right-2 text-white">
                    <h3 className="text-sm font-bold leading-tight drop-shadow-md truncate">{place.name}</h3>
                    <p className="text-[10px] text-white/70 flex items-center gap-0.5">
                      <MapPin size={8} /> {place.city}
                    </p>
                  </div>
                </div>

                <div className="px-2 py-1.5 flex items-center gap-1.5">
                  <span className="text-[9px] font-bold text-white/30">{place.price}</span>
                  <span className="text-[9px] text-white/15">·</span>
                  <span className="text-[9px] font-bold text-[#8BC34A]/60">{place.distance}</span>
                </div>
              </motion.div>
            ))}
          </Masonry>
        </ResponsiveMasonry>

        {filteredPlaces.length === 0 && (
          <div className="text-center py-16 text-white/20">No places found.</div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}