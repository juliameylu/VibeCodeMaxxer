import { MapPin, Heart, Share2, Star } from "lucide-react";
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
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <MapPin size={28} className="text-secondary" />
          Around You
        </h3>
        <p className="text-sm text-slate-600">4 places</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {DUMMY_PLACES.map((place) => (
          <div
            key={place.id}
            className="card-shadow p-5 hover-scale cursor-pointer group overflow-hidden"
          >
            {/* Header with icon and status */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-3 flex-1">
                <span className="text-3xl">{place.icon}</span>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-slate-900 group-hover:text-primary transition line-clamp-2">
                    {place.name}
                  </h4>
                  <p className="text-xs text-slate-500 uppercase tracking-wide mt-0.5">
                    {place.category}
                  </p>
                </div>
              </div>

              {/* Like button */}
              <button
                onClick={() => setLiked((prev) => ({ ...prev, [place.id]: !prev[place.id] }))}
                className="ml-2 flex-shrink-0"
              >
                <Heart
                  size={20}
                  className={`transition ${
                    liked[place.id]
                      ? "fill-red-500 text-red-500"
                      : "text-slate-300 hover:text-slate-600"
                  }`}
                />
              </button>
            </div>

            {/* Status badge */}
            <div className="mb-4">
              <span className="text-xs font-bold bg-green-100 text-green-700 px-3 py-1 rounded-full inline-block">
                {place.status}
              </span>
            </div>

            {/* Footer with rating and distance */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <div className="flex items-center gap-1">
                <Star size={14} className="fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-semibold text-slate-900">
                  {place.rating}
                </span>
              </div>
              <span className="text-xs text-slate-600">{place.distance}</span>
              <button className="text-slate-400 hover:text-slate-600 transition">
                <Share2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
