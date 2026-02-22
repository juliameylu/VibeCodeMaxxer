import { useState, useEffect } from "react";
import { Pin, ChevronDown } from "lucide-react";
import { places } from "../data/places";

interface Props {
  onSelect: (place: typeof places[0]) => void;
}

export function PinnedPlacePicker({ onSelect }: Props) {
  const [showPinned, setShowPinned] = useState(false);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const ids = JSON.parse(localStorage.getItem("pinnedEvents") || "[]");
      setPinnedIds(ids);
    } catch {}
  }, []);

  const pinnedPlaces = places.filter(p => pinnedIds.includes(p.id));

  if (pinnedPlaces.length === 0) return null;

  return (
    <div>
      <button
        onClick={() => setShowPinned(!showPinned)}
        className="w-full flex items-center gap-2 text-[10px] font-bold text-[#F2E8CF]/60 bg-[#F2E8CF]/5 border border-[#F2E8CF]/10 rounded-lg px-3 py-2 transition-all hover:bg-[#F2E8CF]/10"
      >
        <Pin size={10} />
        <span className="flex-1 text-left">ADD FROM PINNED ({pinnedPlaces.length})</span>
        <ChevronDown size={12} className={`transition-transform ${showPinned ? "rotate-180" : ""}`} />
      </button>
      {showPinned && (
        <div className="mt-1.5 space-y-1 max-h-32 overflow-y-auto">
          {pinnedPlaces.map(p => (
            <button
              key={p.id}
              onClick={() => {
                onSelect(p);
                setShowPinned(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg text-left active:bg-white/10 transition-colors"
            >
              <div className="w-7 h-7 rounded-md overflow-hidden bg-white/5 flex-shrink-0">
                <img src={p.image} alt="" className="w-full h-full object-cover" loading="lazy" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-white/70 truncate">{p.name}</p>
                <p className="text-[9px] text-white/25">{p.city}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
