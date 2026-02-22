import { useParams, useNavigate, useLocation } from "react-router";
import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { ArrowLeft, MapPin, Clock, DollarSign, Car, Bus, Footprints, Share2, Heart, ExternalLink, Users } from "lucide-react";
import { places } from "../data/places";
import { toast } from "sonner";
import { BottomNav } from "../components/BottomNav";

export function EventInfo() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const fromPath = (location.state as any)?.from || "/explore";

  const place = places.find(p => p.id === id);

  const [myEvents, setMyEvents] = useState<{ id: string; status: "confirmed" | "maybe" }[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("polyjarvis_my_events");
    if (saved) setMyEvents(JSON.parse(saved));
  }, []);

  if (!place) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-transparent p-6 text-white">
        <p className="text-white/40 text-lg mb-4">Event not found</p>
        <button onClick={() => navigate(-1)} className="text-[#8BC34A] font-bold">GO BACK</button>
      </div>
    );
  }

  const currentStatus = myEvents.find(e => e.id === place.id)?.status;

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
        navigator.clipboard.writeText(msg);
        toast.success("Copied to clipboard!");
      });
    } else {
      navigator.clipboard.writeText(msg);
      toast.success("Copied to clipboard!");
    }
  };

  const handleInvite = () => {
    const msg = `Join me at ${place.name}! ${place.description}\n\nRSVP on PolyJarvis`;
    if (navigator.share) {
      navigator.share({ title: `Join me at ${place.name}`, text: msg }).catch(() => {});
    } else {
      window.open(`sms:?body=${encodeURIComponent(msg)}`, "_blank");
    }
  };

  const transportIcon = place.features.includes("needs car") ? Car
    : place.features.includes("bus available") ? Bus
    : Footprints;
  const transportLabel = place.features.includes("needs car") ? "Needs Car"
    : place.features.includes("bus available") ? "Bus / Walk"
    : "Walkable";

  const TransportIcon = transportIcon;

  return (
    <div className="min-h-[100dvh] bg-transparent text-white pb-24">
      {/* Hero */}
      <div className="relative h-[44vh]">
        <img src={place.image} alt={place.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d1208] via-[#0d1208]/30 to-transparent" />

        {/* Back button */}
        <button
          onClick={() => navigate(fromPath)}
          className="absolute top-[env(safe-area-inset-top,12px)] left-4 mt-3 bg-black/30 backdrop-blur-md p-2.5 rounded-full text-white active:scale-90 transition-transform z-10"
        >
          <ArrowLeft size={20} />
        </button>

        {/* Share */}
        <button
          onClick={handleShare}
          className="absolute top-[env(safe-area-inset-top,12px)] right-4 mt-3 bg-black/30 backdrop-blur-md p-2.5 rounded-full text-white active:scale-90 transition-transform z-10"
        >
          <Share2 size={20} />
        </button>

        {/* Title overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#8BC34A] bg-[#8BC34A]/15 backdrop-blur-sm px-2.5 py-1 rounded-full">
              {place.category}
            </span>
            <h1 className="text-3xl font-bold text-white mt-2 leading-tight">{place.name}</h1>
            <p className="text-sm text-white/50 flex items-center gap-1 mt-1">
              <MapPin size={13} /> {place.address || place.city}
            </p>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="px-5 mt-5 space-y-5 max-w-lg mx-auto">
        {/* Quick stats row */}
        <div className="flex gap-3">
          <div className="flex-1 bg-white/5 rounded-xl p-3 text-center border border-white/8">
            <DollarSign size={16} className="mx-auto text-[#8BC34A] mb-1" />
            <p className="text-[10px] text-white/30 uppercase font-bold">COST</p>
            <p className="text-sm font-bold text-white">{place.price}</p>
          </div>
          <div className="flex-1 bg-white/5 rounded-xl p-3 text-center border border-white/8">
            <Clock size={16} className="mx-auto text-[#8BC34A] mb-1" />
            <p className="text-[10px] text-white/30 uppercase font-bold">TIME</p>
            <p className="text-sm font-bold text-white">{place.estimatedTime || "1-2 HR"}</p>
          </div>
          <div className="flex-1 bg-white/5 rounded-xl p-3 text-center border border-white/8">
            <TransportIcon size={16} className="mx-auto text-[#8BC34A] mb-1" />
            <p className="text-[10px] text-white/30 uppercase font-bold">GETTING THERE</p>
            <p className="text-sm font-bold text-white">{transportLabel}</p>
          </div>
        </div>

        {/* Description */}
        <p className="text-white/60 text-[15px] leading-relaxed">
          {place.longDescription || place.description}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          {place.tags.map(tag => (
            <span key={tag} className="text-[10px] font-bold bg-white/5 text-white/30 px-2.5 py-1 rounded-full border border-white/5 uppercase tracking-wider">
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
            className="flex items-center gap-2 text-sm text-[#8BC34A] font-bold hover:underline"
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
                  ? "bg-[#8BC34A] text-[#233216] shadow-lg shadow-[#8BC34A]/25"
                  : "bg-[#8BC34A]/10 text-[#8BC34A] border border-[#8BC34A]/20"
              }`}
            >
              <Heart size={18} fill={currentStatus === "confirmed" ? "currentColor" : "none"} />
              {currentStatus === "confirmed" ? "CONFIRMED!" : "CONFIRM"}
            </button>

            <button
              onClick={() => handleRsvp("maybe")}
              className={`flex-1 py-3.5 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all active:scale-95 ${
                currentStatus === "maybe"
                  ? "bg-[#F2E8CF] text-[#233216] shadow-lg shadow-[#F2E8CF]/25"
                  : "bg-white/5 text-white/40 border border-white/10"
              }`}
            >
              {currentStatus === "maybe" ? "MAYBE'D!" : "MAYBE"}
            </button>
          </div>

          {/* Invite friends */}
          <button
            onClick={handleInvite}
            className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-white/50 font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <Users size={16} /> INVITE FRIENDS
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}