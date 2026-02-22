import { toast } from "sonner";
import { BottomNav } from "../components/BottomNav";
import { copyToClipboard } from "../utils/clipboard";
import { useParams, useNavigate, useLocation } from "react-router";
import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft, MapPin, Clock, DollarSign, Car, Bus, Footprints, Bike,
  Share2, Pin, ExternalLink, Users, AlertTriangle, CheckCircle, Info,
  Sparkles, ClipboardList, Plus, ChevronDown, Navigation, Download,
  Star, ChevronUp, Mountain, Waves, TreePine, Eye
} from "lucide-react";
import { places } from "../data/places";
import { getUserPreferences, getPreferenceScore } from "../utils/preferences";
import { MustangIcon } from "../components/MustangIcon";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const JAMS_KEY = "polyjarvis_jams";
const PLANS_KEY = "polyjarvis_plans";

const transportModes = [
  { id: "walk", label: "Walk", icon: Footprints, color: "#8BC34A" },
  { id: "bike", label: "Bike", icon: Bike, color: "#F2E8CF" },
  { id: "bus", label: "Bus", icon: Bus, color: "#64B5F6" },
  { id: "car", label: "Car", icon: Car, color: "#FBC02D" },
] as const;

type TransportMode = typeof transportModes[number]["id"];

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

// Determine difficulty-like label from category + features
function getDifficultyLabel(place: typeof places[0]): { label: string; color: string } | null {
  if (place.category === "Hikes") {
    if (place.elevation && parseInt(place.elevation) > 600) return { label: "Moderate", color: "#FFB74D" };
    if (place.elevation && parseInt(place.elevation) > 300) return { label: "Easy-Moderate", color: "#8BC34A" };
    return { label: "Easy", color: "#8BC34A" };
  }
  if (place.category === "Beaches" || place.category === "Parks & Gardens") return { label: "Easy", color: "#8BC34A" };
  return null;
}

// Get category-specific icon
function getCategoryIcon(cat: string) {
  if (cat === "Hikes" || cat === "Viewpoints") return Mountain;
  if (cat === "Beaches" || cat === "Water Sports") return Waves;
  if (cat === "Parks & Gardens") return TreePine;
  return MapPin;
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
  const [showAddTo, setShowAddTo] = useState(false);
  const [showFullDesc, setShowFullDesc] = useState(false);

  const userPrefs = useMemo(() => getUserPreferences(), []);

  useEffect(() => {
    const saved = localStorage.getItem("polyjarvis_my_events");
    if (saved) setMyEvents(JSON.parse(saved));
    const pinned = localStorage.getItem("pinnedEvents");
    if (pinned && place) {
      setIsPinned(JSON.parse(pinned).includes(place.id));
    }
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
        <button onClick={() => navigate(-1)} className="text-[#F2E8CF] font-bold">Go Back</button>
      </div>
    );
  }

  const currentStatus = myEvents.find(e => e.id === place.id)?.status;
  const transportInfo = getTransportInfo(selectedTransport, place);
  const needsCar = place.features?.includes("needs car");

  const prefRating = userPrefs.hasTrainingData
    ? getPreferenceScore(place, userPrefs)
    : Math.min(10, Math.round((place.rating / 5) * 8 + (place.price === "Free" || place.price === "$" ? 1.5 : 0) + (needsCar ? -0.5 : 0.5)));
  const isHighMatch = userPrefs.hasTrainingData && prefRating >= 7;

  const difficulty = getDifficultyLabel(place);
  const CatIcon = getCategoryIcon(place.category);
  const longDesc = place.longDescription || place.description;
  const shouldTruncate = longDesc.length > 180;

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

  // Quick action buttons inspired by Ridge Trail reference
  const quickActions = [
    { icon: Navigation, label: "Directions", action: () => window.open(`https://maps.google.com/?q=${encodeURIComponent(place.address || place.name + " " + place.city)}`, "_blank") },
    { icon: Share2, label: "Share", action: handleShare },
    { icon: Pin, label: isPinned ? "Pinned" : "Pin", action: handlePin, active: isPinned },
    { icon: Download, label: "Save", action: () => { handleRsvp("confirmed"); } },
  ];

  return (
    <div className="min-h-[100dvh] bg-transparent text-white pb-24">
      {/* Hero Image with Gradient Overlay */}
      <div className="relative h-[48vh]">
        <img src={place.image} alt={place.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d1208] via-[#0d1208]/50 to-black/40" />
        <div className="absolute inset-0 bg-black/15" />

        {/* Back button */}
        <button
          onClick={() => navigate(fromPath)}
          className="absolute top-[env(safe-area-inset-top,12px)] left-4 mt-3 bg-black/40 backdrop-blur-md p-2.5 rounded-full text-white active:scale-90 transition-transform z-10"
        >
          <ArrowLeft size={20} />
        </button>

        {/* Pin + Share buttons — top right */}
        <div className="absolute top-[env(safe-area-inset-top,12px)] right-4 mt-3 flex gap-2 z-10">
          <button
            onClick={handlePin}
            className={`bg-black/40 backdrop-blur-md p-2.5 rounded-full active:scale-90 transition-transform ${isPinned ? "text-[#F2E8CF]" : "text-white"}`}
          >
            <Pin size={20} fill={isPinned ? "currentColor" : "none"} />
          </button>
        </div>

        {/* Title + Meta Overlay — anchored to bottom of hero */}
        <div className="absolute bottom-0 left-0 right-0 p-5 pb-4">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-3xl font-extrabold text-white leading-tight drop-shadow-xl">{place.name}</h1>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {difficulty && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: difficulty.color, backgroundColor: `${difficulty.color}20`, border: `1px solid ${difficulty.color}30` }}>
                  {difficulty.label}
                </span>
              )}
              <span className="text-[10px] font-bold text-[#F2E8CF]/70 bg-[#F2E8CF]/10 px-2 py-0.5 rounded-full border border-[#F2E8CF]/15">
                {place.category}
              </span>
              <span className="flex items-center gap-1 text-[11px] text-white/70">
                <Star size={11} className="text-[#FBC02D]" fill="#FBC02D" /> {place.rating}
              </span>
              {isHighMatch && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-[#233216] bg-[#F2E8CF]/90 px-2 py-0.5 rounded-full">
                  <Sparkles size={8} fill="currentColor" /> {prefRating}/10
                </span>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Quick Action Buttons Row — inspired by Ridge Trail "Directions / Navigate / Share / Download" */}
      <div className="px-5 -mt-3 relative z-10 sticky top-0">
        <div className="bg-white/10 backdrop-blur-xl border border-white/15 rounded-2xl p-3 flex justify-around shadow-lg shadow-black/20">
          {quickActions.map((qa, i) => {
            const QIcon = qa.icon;
            return (
              <button key={i} onClick={qa.action} className="flex flex-col items-center gap-1.5 active:scale-90 transition-transform group">
                <div className={`w-11 h-11 rounded-full flex items-center justify-center border transition-colors ${
                  qa.active
                    ? "bg-[#F2E8CF] border-[#F2E8CF]/50 text-[#233216]"
                    : "bg-white/10 border-white/15 text-white/70 group-active:bg-[#F2E8CF]/20"
                }`}>
                  <QIcon size={18} fill={qa.active ? "currentColor" : "none"} />
                </div>
                <span className={`text-[9px] font-bold ${qa.active ? "text-[#F2E8CF]" : "text-white/50"}`}>{qa.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="px-5 mt-5 space-y-5 max-w-lg mx-auto">
        {/* === ADD TO JAM OR PLAN — above stats === */}
        <div className="relative">
          <button
            onClick={() => setShowAddTo(!showAddTo)}
            className="w-full py-3 bg-[#F2E8CF]/15 border border-[#F2E8CF]/25 rounded-xl text-[#F2E8CF] font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <Plus size={16} /> Add to Jam or Plan
            <ChevronDown size={14} className={`ml-1 transition-transform ${showAddTo ? "rotate-180" : ""}`} />
          </button>

          <AnimatePresence>
            {showAddTo && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="mt-2 bg-white/10 backdrop-blur-xl border border-white/15 rounded-xl overflow-hidden"
              >
                <QuickAddPanel placeId={place.id} placeName={place.name} navigate={navigate} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Description with Show More */}
        <div>
          <p className="text-white/65 text-[15px] leading-relaxed">
            {shouldTruncate && !showFullDesc ? longDesc.slice(0, 180) + "..." : longDesc}
          </p>
          {shouldTruncate && (
            <button
              onClick={() => setShowFullDesc(!showFullDesc)}
              className="text-sm font-bold text-white underline underline-offset-2 mt-1 flex items-center gap-1"
            >
              {showFullDesc ? <>Show less <ChevronUp size={14} /></> : <>Show more <ChevronDown size={14} /></>}
            </button>
          )}
        </div>

        {/* Stats Row — inspired by Ridge Trail Length/Elevation/Route */}
        <div className="border-t border-b border-white/10 py-4">
          <div className="flex gap-0">
            <div className="flex-1 text-center border-r border-white/10">
              <p className="text-[10px] text-white/40 capitalize font-semibold tracking-wide">Cost</p>
              <p className="text-lg font-bold text-white mt-0.5">{place.price}</p>
            </div>
            <div className="flex-1 text-center border-r border-white/10">
              <p className="text-[10px] text-white/40 capitalize font-semibold tracking-wide">Time</p>
              <p className="text-lg font-bold text-white mt-0.5">{place.estimatedTime || "1-2 hr"}</p>
            </div>
            <div className="flex-1 text-center">
              <p className="text-[10px] text-white/40 capitalize font-semibold tracking-wide">Rating</p>
              <p className="text-lg font-bold text-white mt-0.5 flex items-center justify-center gap-1">
                <Star size={14} className="text-[#FBC02D]" fill="#FBC02D" /> {place.rating}
              </p>
            </div>
          </div>
          {/* Extra stats for hikes */}
          {(place.elevation || place.distance) && (
            <div className="flex gap-0 mt-3 pt-3 border-t border-white/8">
              {place.distance && (
                <div className="flex-1 text-center border-r border-white/10">
                  <p className="text-[10px] text-white/40 capitalize font-semibold tracking-wide">Distance</p>
                  <p className="text-base font-bold text-white mt-0.5">{place.distance}</p>
                </div>
              )}
              {place.elevation && (
                <div className="flex-1 text-center">
                  <p className="text-[10px] text-white/40 capitalize font-semibold tracking-wide">Elevation</p>
                  <p className="text-base font-bold text-white mt-0.5">{place.elevation}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tags — chip style like Ridge Trail */}
        {place.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {place.tags.map(tag => (
              <span key={tag} className="text-[11px] font-semibold bg-white/8 text-white/55 px-3 py-1.5 rounded-full border border-white/12">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Notes */}
        {place.notes && (
          <div className="bg-[#F2E8CF]/8 border border-[#F2E8CF]/15 rounded-xl p-3.5 flex items-start gap-2.5">
            <Info size={14} className="text-[#F2E8CF] mt-0.5 flex-shrink-0" />
            <p className="text-sm text-[#F2E8CF]/80 leading-relaxed">{place.notes}</p>
          </div>
        )}

        {/* Location + Address */}
        <div className="bg-white/8 border border-white/12 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <MapPin size={14} className="text-[#F2E8CF]" />
            <span className="text-xs font-bold text-white/60 capitalize tracking-wider">Location</span>
          </div>
          <p className="text-sm text-white/70 leading-relaxed">{place.address || `${place.name}, ${place.city}`}</p>

          {/* Mini Leaflet map preview */}
          <div
            className="mt-3 rounded-lg overflow-hidden border border-white/10 cursor-pointer active:opacity-80 transition-opacity"
            style={{ height: 140 }}
            onClick={() => navigate(`/map?focus=${place.id}`)}
          >
            <style>{`
              .mini-map .leaflet-container { background: #0e1a05; }
              .mini-map .leaflet-control-zoom, .mini-map .leaflet-control-attribution { display: none !important; }
              .mini-map .leaflet-marker-icon { background: transparent !important; border: none !important; }
            `}</style>
            <div className="mini-map w-full h-full">
              <MapContainer
                center={[place.lat, place.lng]}
                zoom={14}
                zoomControl={false}
                attributionControl={false}
                dragging={false}
                scrollWheelZoom={false}
                doubleClickZoom={false}
                touchZoom={false}
                className="w-full h-full"
                style={{ background: "#0e1a05" }}
              >
                <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                <Marker
                  position={[place.lat, place.lng]}
                  icon={L.divIcon({
                    className: "leaflet-marker-icon",
                    html: `<div style="width:16px;height:16px;border-radius:50%;background:#F2E8CF;border:3px solid rgba(242,232,208,0.4);box-shadow:0 0 16px rgba(242,232,208,0.4);"></div>`,
                    iconSize: [16, 16],
                    iconAnchor: [8, 8],
                  })}
                />
              </MapContainer>
            </div>
          </div>

          <button
            onClick={() => navigate(`/map?focus=${place.id}`)}
            className="mt-2 text-[11px] font-bold text-[#F2E8CF] flex items-center gap-1"
          >
            <Navigation size={10} /> View on Map <MapPin size={9} />
          </button>
        </div>

        {/* Transport Mode Selector - PROMINENT */}
        <div className="bg-gradient-to-br from-[#1a2e12]/70 to-[#0d1a08]/70 border border-[#F2E8CF]/15 rounded-2xl p-4">
          <h3 className="text-base font-bold text-white capitalize tracking-wide mb-1">How are you getting there?</h3>
          <p className="text-[10px] text-white/30 mb-3">Choose your transport mode</p>
          <div className="flex gap-2 mb-3">
            {transportModes.map(t => {
              const Icon = t.icon;
              const active = selectedTransport === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setSelectedTransport(t.id)}
                  className={`flex-1 py-3 rounded-xl flex flex-col items-center gap-1.5 transition-all text-center ${
                    active
                      ? "border-2 shadow-lg"
                      : "bg-white/8 border border-white/10"
                  }`}
                  style={active ? { backgroundColor: `${t.color}20`, borderColor: `${t.color}50`, boxShadow: `0 4px 12px ${t.color}20` } : {}}
                >
                  <Icon size={20} style={{ color: active ? t.color : "rgba(255,255,255,0.4)" }} />
                  <span className="text-[10px] font-semibold tracking-wider" style={{ color: active ? t.color : "rgba(255,255,255,0.35)" }}>
                    {t.label}
                  </span>
                </button>
              );
            })}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={selectedTransport}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
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
                <div className="flex gap-2 mt-3 pt-2 border-t border-white/8">
                  <a href="https://www.slocity.org/government/department-directory/public-works/slo-transit" target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-[9px] font-bold text-blue-300/70 bg-blue-300/8 px-2.5 py-1.5 rounded-lg border border-blue-300/15">
                    <Bus size={10} /> SLO Transit <ExternalLink size={8} />
                  </a>
                  <a href="https://afd.calpoly.edu/sustainability/commute-options/mustang-shuttle" target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-[9px] font-bold text-green-300/70 bg-green-300/8 px-2.5 py-1.5 rounded-lg border border-green-300/15">
                    <Bus size={10} /> Mustang Shuttle <ExternalLink size={8} />
                  </a>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Website link */}
        {place.website && (
          <a
            href={place.website}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-[#F2E8CF] font-bold hover:underline bg-[#F2E8CF]/8 border border-[#F2E8CF]/15 rounded-xl px-4 py-3"
          >
            <ExternalLink size={14} /> Visit Website
          </a>
        )}

        {/* Menu link — for restaurants */}
        {place.menuUrl && (
          <a
            href={place.menuUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-white font-bold bg-gradient-to-r from-amber-500/20 to-orange-500/15 border border-amber-400/25 rounded-xl px-4 py-3.5 active:scale-[0.97] transition-transform"
          >
            <ClipboardList size={15} className="text-amber-400" />
            <span className="text-amber-400">View Menu</span>
            <ExternalLink size={11} className="ml-auto text-amber-400/50" />
          </a>
        )}

        {/* === RSVP + INVITE === */}
        <div className="pt-2 space-y-3">
          <button
            onClick={() => handleRsvp("maybe")}
            className={`w-full py-3.5 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all active:scale-95 ${
              currentStatus === "maybe"
                ? "bg-white text-[#233216] shadow-lg shadow-white/15"
                : "bg-white/8 text-white/45 border border-white/12"
            }`}
          >
            {currentStatus === "maybe" ? "Maybe'd!" : "Maybe"}
          </button>

          <button
            onClick={handleInvite}
            className="w-full py-3 bg-white/8 border border-white/12 rounded-xl text-white/55 font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <Users size={16} /> Invite Friends
          </button>
        </div>

        {/* Book a Ride — Uber & Lyft deep links */}
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-white/30 capitalize tracking-wider">Book a Ride</p>
          <div className="flex gap-2">
            <a
              href={`https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[latitude]=${place.lat}&dropoff[longitude]=${place.lng}&dropoff[nickname]=${encodeURIComponent(place.name)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-3.5 bg-black rounded-xl font-bold text-sm flex items-center justify-center gap-2.5 active:scale-95 transition-transform border border-white/15 shadow-lg"
            >
              <svg width="20" height="14" viewBox="0 0 118 24" fill="white"><path d="M33.72 0v15.36c0 .53.2.67.65.67h1.04V20h-1.3c-2.67 0-4.1-1.03-4.1-3.5V0h3.71zm20.04 5.94V20h-3.52v-2.21c-1.17 1.63-3.04 2.56-5.37 2.56-4.3 0-7.63-3.45-7.63-7.38 0-3.93 3.32-7.38 7.63-7.38 2.33 0 4.2.93 5.37 2.56V5.94h3.52zM45.5 16.78c2.42 0 4.49-1.8 4.49-3.81 0-2.01-2.07-3.81-4.49-3.81-2.42 0-4.36 1.8-4.36 3.81 0 2.01 1.94 3.81 4.36 3.81zM16.11 5.94V20H12.6v-2.21C11.42 19.42 9.56 20.35 7.22 20.35c-4.3 0-7.22-3.45-7.22-7.38C0 9.04 2.92 5.6 7.22 5.6c2.34 0 4.2.93 5.37 2.56V5.94h3.52zM7.85 16.78c2.42 0 4.49-1.8 4.49-3.81 0-2.01-2.07-3.81-4.49-3.81-2.42 0-4.36 1.8-4.36 3.81 0 2.01 1.94 3.81 4.36 3.81zM64.43 20.35c-4.62 0-7.95-3.29-7.95-7.38 0-4.09 3.33-7.38 7.95-7.38 2.85 0 5.3 1.39 6.58 3.58l-3.12 1.75c-.65-1.13-1.97-1.8-3.46-1.8-2.41 0-4.23 1.78-4.23 3.85 0 2.07 1.82 3.85 4.23 3.85 1.49 0 2.81-.67 3.46-1.8l3.12 1.75c-1.29 2.2-3.73 3.58-6.58 3.58zm23.82-8.83L83.79 20H80l-3.22-5.2L73.57 20H69.6l4.62-7.47-4.34-6.59h3.97l2.94 4.83 2.94-4.83h3.97l-4.34 6.58h.01l.01-.01zM25.18 5.94v8.4c0 1.8 1.29 2.82 3 2.82 1.71 0 3.13-1.01 3.13-2.82v-8.4h3.71v8.4c0 3.93-2.73 6.01-6.84 6.01-4.1 0-6.71-2.08-6.71-6.01v-8.4h3.71z"/></svg>
              <span className="text-white text-sm font-bold tracking-tight">Uber</span>
            </a>
            <a
              href={`https://lyft.com/ride?id=lyft&pickup=current&destination[latitude]=${place.lat}&destination[longitude]=${place.lng}&destination[address]=${encodeURIComponent(place.address || place.name + ', ' + place.city)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-3.5 bg-gradient-to-r from-[#FF00BF] to-[#a600ff] rounded-xl font-bold text-sm flex items-center justify-center gap-2.5 active:scale-95 transition-transform shadow-lg shadow-[#FF00BF]/20"
            >
              <svg width="16" height="20" viewBox="0 0 24 30" fill="white"><path d="M19.6 12.4V2.1c0-1.2-.9-2.1-2.1-2.1-1.2 0-2.1.9-2.1 2.1v10.3c0 2.2-1.8 4-4 4s-4-1.8-4-4V2.1C7.4.9 6.5 0 5.3 0 4.1 0 3.2.9 3.2 2.1v10.3c0 4.5 3.7 8.2 8.2 8.2s8.2-3.7 8.2-8.2zM5.3 24.8c0 1.2.9 2.1 2.1 2.1 1.2 0 2.1-.9 2.1-2.1v-1.5c-1.5-.2-3-.7-4.2-1.5v3z"/></svg>
              <span className="text-white text-sm font-bold tracking-tight">Lyft</span>
            </a>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

function QuickAddPanel({ placeId, placeName, navigate }: { placeId: string; placeName: string; navigate: (path: string) => void }) {
  const [jams, setJams] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);

  useEffect(() => {
    try {
      const j = JSON.parse(localStorage.getItem("polyjarvis_jams") || "[]");
      setJams(j);
    } catch {}
    try {
      const p = JSON.parse(localStorage.getItem("polyjarvis_plans") || "[]");
      setPlans(p);
    } catch {}
  }, []);

  const addToJam = (jam: any) => {
    try {
      const allJams = JSON.parse(localStorage.getItem("polyjarvis_jams") || "[]");
      const idx = allJams.findIndex((j: any) => j.id === jam.id);
      if (idx >= 0) {
        if (!allJams[idx].events) allJams[idx].events = [];
        allJams[idx].events.push({ id: Date.now().toString(), placeId, name: placeName, addedBy: "You" });
        localStorage.setItem("polyjarvis_jams", JSON.stringify(allJams));
        toast.success(`Added "${placeName}" to ${jam.name}`);
      }
    } catch {
      toast.error("Couldn't add to jam");
    }
  };

  const addToPlan = (plan: any) => {
    try {
      const allPlans = JSON.parse(localStorage.getItem("polyjarvis_plans") || "[]");
      const idx = allPlans.findIndex((p: any) => p.id === plan.id);
      if (idx >= 0) {
        allPlans[idx].events.push({
          id: `e-${Date.now()}`,
          name: placeName,
          source: "explore",
          sourceId: placeId,
        });
        localStorage.setItem("polyjarvis_plans", JSON.stringify(allPlans));
        toast.success(`Added "${placeName}" to ${plan.name}`);
      }
    } catch {
      toast.error("Couldn't add to plan");
    }
  };

  return (
    <div className="p-3 space-y-3">
      <div>
        <p className="text-[9px] font-semibold text-[#F2E8CF]/60 capitalize tracking-wider mb-1.5 flex items-center gap-1">
          <Users size={9} /> Your Jams
        </p>
        {jams.length === 0 ? (
          <button
            onClick={() => navigate("/jams")}
            className="w-full py-2 bg-white/6 border border-white/10 rounded-lg text-xs text-white/40 flex items-center justify-center gap-1.5"
          >
            <Plus size={12} /> Create a Jam
          </button>
        ) : (
          <div className="space-y-1">
            {jams.slice(0, 3).map((jam: any) => (
              <button
                key={jam.id}
                onClick={() => addToJam(jam)}
                className="w-full flex items-center gap-2 px-3 py-2 bg-white/6 rounded-lg text-left active:bg-white/12 transition-colors"
              >
                <span className="text-base">{jam.emoji || "👥"}</span>
                <span className="text-xs font-bold text-white/70 flex-1 truncate">{jam.name}</span>
                <Plus size={12} className="text-white/30" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <p className="text-[9px] font-semibold text-[#F2E8CF]/60 capitalize tracking-wider mb-1.5 flex items-center gap-1">
          <ClipboardList size={9} /> Your Plans
        </p>
        {plans.length === 0 ? (
          <button
            onClick={() => navigate("/plans")}
            className="w-full py-2 bg-white/6 border border-white/10 rounded-lg text-xs text-white/40 flex items-center justify-center gap-1.5"
          >
            <Plus size={12} /> Create a Plan
          </button>
        ) : (
          <div className="space-y-1">
            {plans.slice(0, 3).map((plan: any) => (
              <button
                key={plan.id}
                onClick={() => addToPlan(plan)}
                className="w-full flex items-center gap-2 px-3 py-2 bg-white/6 rounded-lg text-left active:bg-white/12 transition-colors"
              >
                <span className="text-base">{plan.emoji || "📋"}</span>
                <span className="text-xs font-bold text-white/70 flex-1 truncate">{plan.name}</span>
                <Plus size={12} className="text-white/30" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-1 border-t border-white/8">
        <button
          onClick={() => navigate("/jams")}
          className="flex-1 py-2 bg-[#F2E8CF]/8 border border-[#F2E8CF]/15 rounded-lg text-[10px] font-bold text-[#F2E8CF] flex items-center justify-center gap-1"
        >
          <Plus size={10} /> New Jam
        </button>
        <button
          onClick={() => navigate("/plans")}
          className="flex-1 py-2 bg-[#F2E8CF]/8 border border-[#F2E8CF]/15 rounded-lg text-[10px] font-bold text-[#F2E8CF] flex items-center justify-center gap-1"
        >
          <Plus size={10} /> New Plan
        </button>
      </div>
    </div>
  );
}