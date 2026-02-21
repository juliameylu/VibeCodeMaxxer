import { MapPin, ChevronRight, Star } from "lucide-react";

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
  return (
    <div className="animate-fade-in">
      <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
        <MapPin size={24} className="text-secondary" />
        What's Open Around You
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {DUMMY_PLACES.map((place) => (
          <div
            key={place.id}
            className="bg-white rounded-xl p-4 border border-slate-200 hover:border-secondary/50 hover:shadow-md transition cursor-pointer group"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                <span className="text-2xl">{place.icon}</span>
                <div className="flex-1">
                  <h4 className="font-semibold text-slate-900 group-hover:text-secondary transition">
                    {place.name}
                  </h4>
                  <p className="text-xs text-slate-600 uppercase">
                    {place.category}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-1 rounded-full">
                      {place.status}
                    </span>
                  </div>
                </div>
              </div>
              <ChevronRight
                size={20}
                className="text-slate-400 group-hover:text-secondary transition"
              />
            </div>

            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <Star size={14} className="fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-semibold">{place.rating}</span>
              </div>
              <span className="text-xs text-slate-600">{place.distance}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
