import { toast } from "sonner";
import { BottomNav } from "../components/BottomNav";
import { copyToClipboard } from "../utils/clipboard";
import { useParams, useNavigate, useLocation } from "react-router";
import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, MapPin, Clock, DollarSign, Car, Bus, Footprints, Bike, Share2, Pin, ExternalLink, Users, AlertTriangle, CheckCircle, Info, Sparkles, Zap } from "lucide-react";
import { places } from "../data/places";
import { getUserPreferences, getPreferenceScore } from "../utils/preferences";
import { MustangIcon } from "../components/MustangIcon";

const transportModes = [
  { id: "walk", label: "WALK", icon: Footprints, color: "#8BC34A" },
  { id: "bike", label: "BIKE", icon: Bike, color: "#F2E8CF" },
  { id: "bus", label: "BUS", icon: Bus, color: "#64B5F6" },
  { id: "car", label: "CAR", icon: Car, color: "#FBC02D" },
] as const;

type TransportMode = typeof transportModes[number]["id"];
const SLO_COUNTY_BUS_SCHEDULE_URL = "https://www.slorta.org/schedules-fares/";

function getTransportInfo(mode: TransportMode, place: typeof places[0]) {
  const needsCar = place.features?.includes("needs car");
  const hasBus = place.features?.includes("bus available");
  const distStr = place.distance || "5 min";
  const distNum = parseFloat(distStr) || 5;

  switch (mode) {
    case "walk":
      if (needsCar) {
        return {
          time: `${Math.round(distNum * 12)} min`,
          feasible: false,
          warning: "This spot is too far to walk comfortably. Consider driving or taking the bus.",
          tips: ["Bring lots of water", "Allow extra time", "Check weather before heading out"],
          cost: "Free",
        };
      }
      return {
        time: `${Math.round(distNum * 4)} min`,
        feasible: true,
        warning: null,
        tips: ["Great exercise!", "Enjoy the SLO scenery", "Wear comfortable shoes"],
        cost: "Free",
      };
    case "bike":
      if (needsCar && distNum > 15) {
        return {
          time: `${Math.round(distNum * 4)} min`,
          feasible: false,
          warning: "This is a long ride. Make sure you're prepared for the distance.",
          tips: ["Bring a bike lock", "Check tire pressure", "Hydrate well"],
          cost: "Free",
        };
      }
      return {
        time: `${Math.round(distNum * 3)} min`,
        feasible: true,
        warning: null,
        tips: ["Lock up at bike racks", "SLO has great bike lanes", "Bring a lock"],
        cost: "Free",
      };
    case "bus":
      if (!hasBus && needsCar) {
        return {
          time: "N/A",
          feasible: false,
          warning: "No direct bus route available. You'll need a car or ride share.",
          tips: ["Check SLO Transit app", "Free with Cal Poly ID"],
          cost: "Free with student ID",
        };
      }
      return {
        time: `${Math.round(distNum * 5 + 10)} min`,
        feasible: true,
        warning: null,
        tips: ["FREE with Cal Poly ID", "Route 4 or 6 from campus", "Check schedule at SLO Transit"],
        cost: "Free with student ID",
      };
    case "car":
      return {
        time: `${Math.round(distNum * 2)} min`,
        feasible: true,
        warning: null,
        tips: [
          place.features?.includes("free parking") ? "Free parking available!" : "Check parking availability",
          "Carpool to save on gas",
          distNum > 10 ? "Fill up before heading out" : "Quick drive from campus",
        ],
        cost: distNum > 10 ? `~$${Math.round(distNum * 0.3)} gas` : "~$2-3 gas",
      };
  }
}

export function EventInfo() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const fromPath = (location.state as any)?.from || "/explore";

  const place = places.find(p => p.id === id);

  const [myEvents, setMyEvents] = useState<{ id: string; status: "confirmed" | "maybe" }[]>([]);
  const [selectedTransport, setSelectedTransport] = useState<TransportMode>("walk");
  const [isPinned, setIsPinned] = useState(false);

  // Use real preference scoring
  const userPrefs = useMemo(() => getUserPreferences(), []);

  useEffect(() => {
    const saved = localStorage.getItem("polyjarvis_my_events");
    if (saved) setMyEvents(JSON.parse(saved));
    const pinned = localStorage.getItem("pinnedEvents");
    if (pinned && place) {
      setIsPinned(JSON.parse(pinned).includes(place.id));
    }
    // Auto-detect best transport
    if (place) {
      if (place.features?.includes("needs car")) setSelectedTransport("car");
      else if (place.features?.includes("bus available")) setSelectedTransport("bus");
      else setSelectedTransport("walk");
    }
  }, [place]);

  if (!place) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-transparent p-6 text-white">
        <p className="text-white/40 text-lg mb-4">Event not found</p>
        <button onClick={() => navigate(-1)} className="text-[#F2E8CF] font-bold">GO BACK</button>
      </div>
    );
  }

  const currentStatus = myEvents.find(e => e.id === place.id)?.status;
  const transportInfo = getTransportInfo(selectedTransport, place);

  // Personalized rating from training data
  const needsCar = place.features?.includes("needs car");
  const prefRating = userPrefs.hasTrainingData
    ? getPreferenceScore(place, userPrefs)
    : Math.min(10, Math.round((place.rating / 5) * 8 + (place.price === "Free" || place.price === "$" ? 1.5 : 0) + (needsCar ? -0.5 : 0.5)));
  const isHighMatch = userPrefs.hasTrainingData && prefRating >= 7;

  const handleRsvp = (status: "confirmed" | "maybe") => {
    let updated: typeof myEvents;
    if (currentStatus === status) {
      updated = myEvents.filter(e => e.id !== place.id);
      toast.success("Removed from My Events");
    } else {
      updated = [...myEvents.filter(e => e.id !== place.id), { id: place.id, status }];
      toast.success(status === "confirmed" ? "Confirmed! Added to My Events." : "Added as Maybe.");
    }
    setMyEvents(updated);
    localStorage.setItem("polyjarvis_my_events", JSON.stringify(updated));
  };

  const handleShare = () => {
    const msg = `Check out ${place.name} in ${place.city}!\n${place.description}\n\nShared from PolyJarvis`;
    if (navigator.share) {
      navigator.share({ title: place.name, text: msg }).catch(() => {
        copyToClipboard(msg);
        toast.success("Copied to clipboard!");
      });
    } else {
      copyToClipboard(msg);
      toast.success("Copied to clipboard!");
    }
  };

  const handlePin = () => {
    const pinned = JSON.parse(localStorage.getItem("pinnedEvents") || "[]");
    const updated = isPinned ? pinned.filter((p: string) => p !== place.id) : [...pinned, place.id];
    localStorage.setItem("pinnedEvents", JSON.stringify(updated));
    setIsPinned(!isPinned);
    toast.success(isPinned ? "Unpinned" : "Pinned!");
  };

  const handleInvite = () => {
    const msg = `Join me at ${place.name}! ${place.description}\n\nRSVP on PolyJarvis`;
    if (navigator.share) {
      navigator.share({ title: `Join me at ${place.name}`, text: msg }).catch(() => {});
    } else {
      window.open(`sms:?body=${encodeURIComponent(msg)}`, "_blank");
    }
  };

  return (
    <div className="min-h-[100dvh] bg-transparent text-white pb-24">
      {/* Hero */}
      <div className="relative h-[44vh]">
        <img src={place.image} alt={place.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d1208] via-[#0d1208]/30 to-transparent" />

        {/* Back button */}
        <button
          onClick={() => navigate(fromPath)}
          className="absolute top-[env(safe-area-inset-top,12px)] left-4 mt-3 bg-black/40 backdrop-blur-md p-2.5 rounded-full text-white active:scale-90 transition-transform z-10"
        >
          <ArrowLeft size={20} />
        </button>

        {/* Pin + Share */}
        <div className="absolute top-[env(safe-area-inset-top,12px)] right-4 mt-3 flex gap-2 z-10">
          <button
            onClick={handlePin}
            className={`bg-black/40 backdrop-blur-md p-2.5 rounded-full active:scale-90 transition-transform ${isPinned ? "text-[#F2E8CF]" : "text-white"}`}
          >
            <Pin size={20} fill={isPinned ? "currentColor" : "none"} />
          </button>
          <button
            onClick={handleShare}
            className="bg-black/40 backdrop-blur-md p-2.5 rounded-full text-white active:scale-90 transition-transform"
          >
            <Share2 size={20} />
          </button>
        </div>

        {/* Title overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#F2E8CF] bg-[#F2E8CF]/15 backdrop-blur-sm px-2.5 py-1 rounded-full">
                {place.category}
              </span>
              <span className={`text-[10px] font-black backdrop-blur-sm px-2 py-1 rounded-full flex items-center gap-1 ${
                isHighMatch
                  ? "text-[#233216] bg-[#F2E8CF]/90"
                  : "text-[#F2E8CF] bg-[#F2E8CF]/10"
              }`}>
                {isHighMatch ? <Zap size={8} fill="currentColor" /> : <MustangIcon size={10} fill="currentColor" />}
                {prefRating}/10 {userPrefs.hasTrainingData ? "MATCH" : "FOR YOU"}
              </span>
            </div>
            <h1 className="text-3xl font-bold text-white mt-1 leading-tight">{place.name}</h1>
            <p className="text-sm text-white/55 flex items-center gap-1 mt-1">
              <MapPin size={13} /> {place.address || place.city}
            </p>
            {isHighMatch && (
              <div className="flex items-center gap-1.5 mt-2 bg-[#F2E8CF]/10 backdrop-blur-sm rounded-lg px-2.5 py-1.5 w-fit">
                <Sparkles size={10} className="text-[#F2E8CF]" />
                <span className="text-[10px] font-bold text-[#F2E8CF]">Great match based on your preferences!</span>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="px-5 mt-5 space-y-5 max-w-lg mx-auto">
        {/* Quick stats row */}
        <div className="flex gap-3">
          <div className="flex-1 bg-white/10 rounded-xl p-3 text-center border border-white/15">
            <DollarSign size={16} className="mx-auto text-[#F2E8CF] mb-1" />
            <p className="text-[10px] text-white/35 uppercase font-bold">COST</p>
            <p className="text-sm font-bold text-white">{place.price}</p>
          </div>
          <div className="flex-1 bg-white/10 rounded-xl p-3 text-center border border-white/15">
            <Clock size={16} className="mx-auto text-[#F2E8CF] mb-1" />
            <p className="text-[10px] text-white/35 uppercase font-bold">TIME</p>
            <p className="text-sm font-bold text-white">{place.estimatedTime || "1-2 HR"}</p>
          </div>
          <div className="flex-1 bg-white/10 rounded-xl p-3 text-center border border-white/15">
            <MustangIcon size={18} className="mx-auto text-[#FBC02D] mb-1" fill="currentColor" />
            <p className="text-[10px] text-white/35 uppercase font-bold">RATING</p>
            <p className="text-sm font-bold text-white">{place.rating} / 5</p>
          </div>
        </div>

        {/* Transport Mode Selector */}
        <div>
          <p className="text-[10px] font-black text-white/35 uppercase tracking-widest mb-2">HOW ARE YOU GETTING THERE?</p>
          <div className="flex gap-2 mb-3">
            {transportModes.map(t => {
              const Icon = t.icon;
              const active = selectedTransport === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setSelectedTransport(t.id)}
                  className={`flex-1 py-2.5 rounded-xl flex flex-col items-center gap-1 transition-all text-center ${
                    active
                      ? "border-2"
                      : "bg-white/8 border border-white/10"
                  }`}
                  style={active ? { backgroundColor: `${t.color}15`, borderColor: `${t.color}40` } : {}}
                >
                  <Icon size={16} style={{ color: active ? t.color : "rgba(255,255,255,0.4)" }} />
                  <span className="text-[9px] font-black tracking-wider" style={{ color: active ? t.color : "rgba(255,255,255,0.35)" }}>
                    {t.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Dynamic transport info */}
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedTransport}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15 }}
              className={`rounded-xl p-4 border ${
                transportInfo.feasible
                  ? "bg-white/8 border-white/12"
                  : "bg-orange-500/8 border-orange-500/15"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {transportInfo.feasible ? (
                    <CheckCircle size={14} className="text-[#8BC34A]" />
                  ) : (
                    <AlertTriangle size={14} className="text-orange-400" />
                  )}
                  <span className="text-sm font-bold text-white">
                    {transportInfo.feasible ? transportInfo.time : "Not Recommended"}
                  </span>
                </div>
                <span className="text-[10px] font-bold text-white/40 bg-white/8 px-2 py-0.5 rounded">
                  {transportInfo.cost}
                </span>
              </div>

              {transportInfo.warning && (
                <p className="text-xs text-orange-300/80 mb-2">{transportInfo.warning}</p>
              )}

              <div className="space-y-1">
                {transportInfo.tips.map((tip, i) => (
                  <div key={i} className="flex items-start gap-1.5">
                    <Info size={9} className="text-white/25 mt-0.5 flex-shrink-0" />
                    <p className="text-[11px] text-white/45">{tip}</p>
                  </div>
                ))}
              </div>

              {selectedTransport === "bus" && (
                <a
                  href={SLO_COUNTY_BUS_SCHEDULE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold bg-[#F2E8CF]/10 text-[#F2E8CF] px-3 py-1.5 rounded-full border border-[#F2E8CF]/20 active:scale-95 transition-transform"
                >
                  <ExternalLink size={11} /> SLO COUNTY BUS SCHEDULES
                </a>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Description */}
        <p className="text-white/65 text-[15px] leading-relaxed">
          {place.longDescription || place.description}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          {place.tags.map(tag => (
            <span key={tag} className="text-[10px] font-bold bg-white/8 text-white/40 px-2.5 py-1 rounded-full border border-white/8 uppercase tracking-wider">
              #{tag}
            </span>
          ))}
        </div>

        {/* Notes */}
        {place.notes && (
          <div className="bg-[#F2E8CF]/10 border border-[#F2E8CF]/20 rounded-xl p-3 text-sm text-[#F2E8CF]">
            {place.notes}
          </div>
        )}

        {/* Website link */}
        {place.website && (
          <a
            href={place.website}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-[#F2E8CF] font-bold hover:underline"
          >
            <ExternalLink size={14} /> VISIT WEBSITE
          </a>
        )}

        {/* === PRIMARY ACTIONS — Confirm / Maybe === */}
        <div className="pt-3 space-y-3">
          <div className="flex gap-3">
            <button
              onClick={() => handleRsvp("confirmed")}
              className={`flex-1 py-3.5 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all active:scale-95 ${
                currentStatus === "confirmed"
                  ? "bg-[#F2E8CF] text-[#233216] shadow-lg shadow-[#F2E8CF]/20"
                  : "bg-[#F2E8CF]/10 text-[#F2E8CF] border border-[#F2E8CF]/20"
              }`}
            >
              <Pin size={18} fill={currentStatus === "confirmed" ? "currentColor" : "none"} />
              {currentStatus === "confirmed" ? "CONFIRMED!" : "CONFIRM"}
            </button>

            <button
              onClick={() => handleRsvp("maybe")}
              className={`flex-1 py-3.5 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all active:scale-95 ${
                currentStatus === "maybe"
                  ? "bg-white text-[#233216] shadow-lg shadow-white/15"
                  : "bg-white/8 text-white/45 border border-white/12"
              }`}
            >
              {currentStatus === "maybe" ? "MAYBE'D!" : "MAYBE"}
            </button>
          </div>

          {/* Invite friends */}
          <button
            onClick={handleInvite}
            className="w-full py-3 bg-white/8 border border-white/12 rounded-xl text-white/55 font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <Users size={16} /> INVITE FRIENDS
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
