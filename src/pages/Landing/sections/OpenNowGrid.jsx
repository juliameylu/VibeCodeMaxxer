import { Heart, MapPin, Share2, Star } from "lucide-react";
import { useState } from "react";

const DUMMY_PLACES = [
  {
    id: 1,
    name: "The Brew Coffeehouse",
    category: "Coffee",
    distance: "0.3 mi",
    rating: 4.7,
    icon: "☕",
    status: "Open now",
  },
  {
    id: 2,
    name: "Bueno Burger",
    category: "Food",
    distance: "0.5 mi",
    rating: 4.5,
    icon: "🍔",
    status: "Open now",
  },
  {
    id: 3,
    name: "Bishop Peak Trail",
    category: "Hiking",
    distance: "2.1 mi",
    rating: 4.8,
    icon: "⛰️",
    status: "Always Open",
  },
  {
    id: 4,
    name: "SLO Library",
    category: "Study",
    distance: "0.4 mi",
    rating: 4.6,
    icon: "📚",
    status: "Closes @ 9 PM",
  },
];

export default function OpenNowGrid() {
  const [liked, setLiked] = useState({});

  return (
    <section className="glass-card animate-fade-in p-5">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-xl font-bold text-ink">
          <MapPin size={22} className="text-amberSoft" />
          Around You
        </h3>
        <p className="text-sm text-soft">4 places</p>
      </div>

      <div className="mt-4 space-y-3">
        {DUMMY_PLACES.map((place) => (
          <article key={place.id} className="row-pill">
            <div className="flex items-start justify-between gap-3">
              <div className="flex gap-3">
                <span className="text-2xl">{place.icon}</span>
                <div>
                  <h4 className="font-bold text-ink">{place.name}</h4>
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink/55">{place.category}</p>
                </div>
              </div>

              <button onClick={() => setLiked((prev) => ({ ...prev, [place.id]: !prev[place.id] }))}>
                <Heart size={18} className={liked[place.id] ? "fill-amberSoft text-amberSoft" : "text-ink/30"} />
              </button>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="chip chip-idle px-3 py-1 text-xs">{place.status}</span>
              <span className="flex items-center gap-1 font-semibold text-ink">
                <Star size={13} className="fill-amberSoft text-amberSoft" />
                {place.rating}
              </span>
              <span className="text-soft">{place.distance}</span>
              <button className="text-ink/50 transition hover:text-ink">
                <Share2 size={14} />
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
