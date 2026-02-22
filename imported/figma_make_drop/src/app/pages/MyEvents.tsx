import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Pin, MapPin, Users, Trash2, Share2, ChevronRight } from "lucide-react";
import { places } from "../data/places";
import { toast } from "sonner";
import { BottomNav } from "../components/BottomNav";
import { PageHeader } from "../components/PageHeader";

interface MyEvent {
  id: string;
  status: "confirmed" | "maybe";
}

export function MyEvents() {
  const navigate = useNavigate();
  const [myEvents, setMyEvents] = useState<MyEvent[]>([]);
  const [filter, setFilter] = useState<"all" | "confirmed" | "maybe">("all");

  useEffect(() => {
    const saved = localStorage.getItem("polyjarvis_my_events");
    if (saved) setMyEvents(JSON.parse(saved));
  }, []);

  const save = (events: MyEvent[]) => {
    setMyEvents(events);
    localStorage.setItem("polyjarvis_my_events", JSON.stringify(events));
  };

  const removeEvent = (id: string) => {
    save(myEvents.filter(e => e.id !== id));
    toast.success("Removed from events");
  };

  const changeStatus = (id: string, status: "confirmed" | "maybe") => {
    save(myEvents.map(e => e.id === id ? { ...e, status } : e));
    toast.success(`Updated to ${status}`);
  };

  const handleShare = (place: typeof places[0]) => {
    const msg = `Check out ${place.name}! ${place.description}\n\nShared from PolyJarvis`;
    if (navigator.share) {
      navigator.share({ title: place.name, text: msg }).catch(() => {});
    } else {
      window.open(`sms:?body=${encodeURIComponent(msg)}`, "_blank");
    }
  };

  const filtered = useMemo(() => {
    return myEvents
      .filter(e => filter === "all" || e.status === filter)
      .map(e => ({ ...e, place: places.find(p => p.id === e.id) }))
      .filter(e => e.place);
  }, [myEvents, filter]);

  const confirmedCount = myEvents.filter(e => e.status === "confirmed").length;
  const maybeCount = myEvents.filter(e => e.status === "maybe").length;

  return (
    <div className="min-h-[100dvh] bg-transparent text-white pb-24">
      <PageHeader />

      <div className="px-5 pb-2">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold text-white tracking-tight capitalize">My Events</h1>
          <Link to="/groups">
            <button className="flex items-center gap-1.5 text-[10px] font-semibold text-[#8BC34A] bg-[#8BC34A]/10 px-3 py-2 rounded-full active:scale-95 transition-transform capitalize tracking-wider">
              <Users size={14} /> Groups
            </button>
          </Link>
        </div>
        <p className="text-[10px] text-white/25 font-semibold capitalize tracking-wider">Events you've confirmed or saved</p>
      </div>

      <div className="px-5 py-3 flex gap-2">
        {([
          { key: "all", label: `All (${myEvents.length})` },
          { key: "confirmed", label: `Confirmed (${confirmedCount})` },
          { key: "maybe", label: `Maybe (${maybeCount})` },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-3.5 py-1.5 rounded-full text-[10px] font-bold tracking-wider transition-all ${
              filter === tab.key
                ? "bg-[#8BC34A] text-[#233216]"
                : "bg-white/8 text-white/30"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="px-5 space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">📋</div>
            <h3 className="text-lg font-bold text-white/50 mb-1">
              {filter === "all" ? "No Events Yet" : `No ${filter} Events`}
            </h3>
            <p className="text-sm text-white/25 mb-5">Explore and confirm events to see them here</p>
            <Link to="/explore">
              <button className="px-5 py-2.5 bg-[#8BC34A] text-[#233216] rounded-full font-bold text-sm shadow-md active:scale-95 transition-transform">
                Browse Events
              </button>
            </Link>
          </div>
        ) : (
          <AnimatePresence>
            {filtered.map(({ id, status, place }) => (
              <motion.div
                key={id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="bg-white/5 rounded-2xl border border-white/8 overflow-hidden"
              >
                <div
                  onClick={() => navigate(`/event/${id}`, { state: { from: "/myevents" } })}
                  className="flex gap-3 p-3 cursor-pointer active:bg-white/8 transition-colors"
                >
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-white/5 flex-shrink-0">
                    <img src={place!.image} alt="" className="w-full h-full object-cover" loading="lazy" />
                  </div>
                  <div className="flex-1 min-w-0 py-0.5">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full capitalize tracking-wider ${
                        status === "confirmed"
                          ? "bg-[#8BC34A]/15 text-[#8BC34A]"
                          : "bg-[#F2E8CF]/15 text-[#F2E8CF]"
                      }`}>
                        {status === "confirmed" ? "Confirmed" : "Maybe"}
                      </span>
                    </div>
                    <h3 className="font-bold text-white text-sm truncate">{place!.name}</h3>
                    <p className="text-[11px] text-white/30 flex items-center gap-1 mt-0.5">
                      <MapPin size={9} /> {place!.city} · {place!.price}
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-white/15 self-center" />
                </div>

                <div className="flex border-t border-white/5 text-[10px] font-bold">
                  {status === "maybe" ? (
                    <button
                      onClick={() => changeStatus(id, "confirmed")}
                      className="flex-1 py-2 text-[#8BC34A] flex items-center justify-center gap-1 active:bg-white/5 capitalize tracking-wider"
                    >
                      <Pin size={11} /> Confirm
                    </button>
                  ) : (
                    <button
                      onClick={() => changeStatus(id, "maybe")}
                      className="flex-1 py-2 text-[#F2E8CF] flex items-center justify-center gap-1 active:bg-white/5 capitalize tracking-wider"
                    >
                      Move to Maybe
                    </button>
                  )}
                  <div className="w-px bg-white/5" />
                  <button
                    onClick={() => handleShare(place!)}
                    className="flex-1 py-2 text-white/30 flex items-center justify-center gap-1 active:bg-white/5 capitalize tracking-wider"
                  >
                    <Share2 size={11} /> Invite
                  </button>
                  <div className="w-px bg-white/5" />
                  <button
                    onClick={() => removeEvent(id)}
                    className="flex-1 py-2 text-white/15 flex items-center justify-center gap-1 hover:text-red-400 active:bg-white/5 capitalize tracking-wider"
                  >
                    <Trash2 size={11} /> Remove
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      <BottomNav />
    </div>
  );
}