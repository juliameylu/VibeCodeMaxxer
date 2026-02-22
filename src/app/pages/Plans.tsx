import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { clsx } from "clsx";
import { places } from "../data/places";
import { copyToClipboard } from "../utils/clipboard";
import { BottomNav } from "../components/BottomNav";
import { PageHeader } from "../components/PageHeader";
import { MustangIcon } from "../components/MustangIcon";
import { Plus, Share2, Trash2, MapPin, Clock, ArrowLeft, X, ChevronRight, Search, Compass, Users, PenLine, ChevronDown, Pin } from "lucide-react";

type EventSource = "custom" | "explore" | "jam";

interface PlanEvent {
  id: string;
  name: string;
  location?: string;
  time?: string;
  note?: string;
  source: EventSource;
  sourceId?: string;
  emoji?: string;
}

interface Plan {
  id: string;
  name: string;
  emoji: string;
  date?: string;
  events: PlanEvent[];
  shareCode: string;
  createdAt: string;
}

const sampleJams = [
  { id: "j1", name: "Beach Crew", emoji: "🏖️", code: "PISMO-7" },
  { id: "j2", name: "Study Squad", emoji: "📚", code: "GRND-88" },
];

const planEmojis = ["📋", "🗺️", "🎉", "🏖️", "🍽️", "🎸", "📚", "🚗", "⛺", "🎿"];

const initialPlans: Plan[] = [
  {
    id: "p1",
    name: "Pismo Day Trip",
    emoji: "🏖️",
    date: "Sat, Feb 28",
    events: [
      { id: "e1", name: "Pick up Alex", location: "Grand Ave Dorms", time: "9:30 AM", source: "custom" },
      { id: "e2", name: "Get Zipcar", location: "Grand Ave Parking Structure", time: "9:45 AM", source: "custom" },
      { id: "e3", name: "Pismo Beach Pier", location: "Pismo Beach, CA", time: "10:30 AM", source: "explore", sourceId: "pismo-beach-pier-pismo-beach", emoji: "🏖️" },
      { id: "e4", name: "Lunch at Splash Cafe", location: "Splash Cafe, Pismo", time: "12:00 PM", source: "custom" },
      { id: "e5", name: "Beach Crew Meetup", location: "Pismo Pier", time: "1:30 PM", source: "jam", sourceId: "j1", emoji: "🏖️" },
      { id: "e6", name: "Drive home", location: "SLO", time: "5:00 PM", source: "custom" },
    ],
    shareCode: "PLAN-28",
    createdAt: "Today",
  },
  {
    id: "p2",
    name: "Saturday Errands",
    emoji: "🚗",
    date: "Sat, Mar 1",
    events: [
      { id: "e7", name: "SLO Farmers' Market", location: "Downtown SLO", time: "6:00 PM", source: "explore", sourceId: "downtown-slo-farmers-market", emoji: "🥕" },
      { id: "e8", name: "Study session", location: "Kennedy Library", time: "2:00 PM", source: "explore", sourceId: "cal-poly-kennedy-library", emoji: "📚" },
    ],
    shareCode: "PLAN-01",
    createdAt: "Yesterday",
  },
];

export function Plans() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>(initialPlans);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [showCreatePlan, setShowCreatePlan] = useState(false);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [tab, setTab] = useState<"plans" | "pinned">("plans");

  const [planName, setPlanName] = useState("");
  const [planDate, setPlanDate] = useState("");
  const [planEmoji, setPlanEmoji] = useState("📋");

  const [eventSource, setEventSource] = useState<EventSource>("custom");
  const [eventName, setEventName] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [eventNote, setEventNote] = useState("");
  const [exploreSearch, setExploreSearch] = useState("");
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [selectedJamId, setSelectedJamId] = useState<string | null>(null);

  const generateCode = () => {
    const words = ["PLAN", "TRIP", "OUTING", "ROUTE"];
    return `${words[Math.floor(Math.random() * words.length)]}-${Math.floor(Math.random() * 99) + 1}`;
  };

  const filteredPlaces = useMemo(() => {
    if (!exploreSearch.trim()) return places.slice(0, 12);
    const q = exploreSearch.toLowerCase();
    return places.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.tags.some(t => t.toLowerCase().includes(q))
    ).slice(0, 12);
  }, [exploreSearch]);

  const handleCreatePlan = () => {
    if (!planName.trim()) return;
    const newPlan: Plan = {
      id: Date.now().toString(),
      name: planName,
      emoji: planEmoji,
      date: planDate || undefined,
      events: [],
      shareCode: generateCode(),
      createdAt: "Just now",
    };
    setPlans([newPlan, ...plans]);
    setSelectedPlan(newPlan);
    setPlanName(""); setPlanDate(""); setPlanEmoji("📋");
    setShowCreatePlan(false);
    toast.success("Plan created! Add events to it.");
  };

  const handleAddEvent = () => {
    if (!selectedPlan) return;
    let newEvent: PlanEvent;

    if (eventSource === "custom") {
      if (!eventName.trim()) return;
      newEvent = { id: Date.now().toString(), name: eventName, location: eventLocation || undefined, time: eventTime || undefined, note: eventNote || undefined, source: "custom" };
    } else if (eventSource === "explore") {
      if (!selectedPlaceId) return;
      const place = places.find(p => p.id === selectedPlaceId);
      if (!place) return;
      newEvent = { id: Date.now().toString(), name: place.name, location: place.city, time: eventTime || undefined, note: eventNote || undefined, source: "explore", sourceId: place.id, emoji: getCategoryEmoji(place.category) };
    } else {
      if (!selectedJamId) return;
      const jam = sampleJams.find(j => j.id === selectedJamId);
      if (!jam) return;
      newEvent = { id: Date.now().toString(), name: jam.name, note: `Jam Code: ${jam.code}`, source: "jam", sourceId: jam.id, emoji: jam.emoji };
    }

    const updated = plans.map(p => p.id === selectedPlan.id ? { ...p, events: [...p.events, newEvent] } : p);
    setPlans(updated);
    setSelectedPlan(prev => prev ? { ...prev, events: [...prev.events, newEvent] } : null);
    resetEventForm();
    setShowAddEvent(false);
    toast.success(eventSource === "jam" ? "Jam added to your plan!" : "Event added!");
  };

  const resetEventForm = () => {
    setEventName(""); setEventLocation(""); setEventTime(""); setEventNote("");
    setExploreSearch(""); setSelectedPlaceId(null); setSelectedJamId(null);
    setEventSource("custom");
  };

  const handleDeleteEvent = (planId: string, eventId: string) => {
    const updated = plans.map(p => p.id === planId ? { ...p, events: p.events.filter(e => e.id !== eventId) } : p);
    setPlans(updated);
    setSelectedPlan(prev => prev ? { ...prev, events: prev.events.filter(e => e.id !== eventId) } : null);
  };

  const handleDeletePlan = (planId: string) => {
    setPlans(plans.filter(p => p.id !== planId));
    setSelectedPlan(null);
    toast.success("Plan deleted.");
  };

  const handleShare = (plan: Plan) => {
    const events = plan.events.map((e, i) => `${i + 1}. ${e.time || "TBD"} — ${e.name}${e.location ? ` @ ${e.location}` : ""}`).join("\n");
    const msg = `📋 ${plan.name}${plan.date ? ` (${plan.date})` : ""}\n\n${events}\n\nShared from PolyJarvis`;
    if (navigator.share) {
      navigator.share({ title: plan.name, text: msg }).catch(() => { copyToClipboard(msg); toast.success("Plan copied to clipboard!"); });
    } else {
      copyToClipboard(msg); toast.success("Plan copied to clipboard!");
    }
  };

  const sourceColors: Record<EventSource, { dot: string; badge: string; badgeText: string; label: string }> = {
    custom: { dot: "bg-[#F2E8CF]", badge: "bg-white/5 text-white/30", badgeText: "CUSTOM", label: "Custom" },
    explore: { dot: "bg-[#8BC34A]", badge: "bg-[#8BC34A]/10 text-[#8BC34A]", badgeText: "EXPLORE", label: "Explore" },
    jam: { dot: "bg-amber-400", badge: "bg-amber-400/10 text-amber-400", badgeText: "JAM", label: "Jam" },
  };

  const pinnedIds: string[] = (() => {
    try { return JSON.parse(localStorage.getItem("pinnedEvents") || "[]"); } catch { return []; }
  })();
  const pinnedPlaces = places.filter(p => pinnedIds.includes(p.id));

  return (
    <div className="min-h-[100dvh] bg-transparent text-white pb-24 flex flex-col">
      <PageHeader />

      {/* Clean header — no gradient rectangle */}
      <div className="px-5 border-b border-white/8 pb-3 sticky top-0 z-10 bg-black/40 backdrop-blur-xl">
        {!selectedPlan ? (
          <div>
            <div className="flex justify-between items-center pt-2">
              <div>
                <h1 className="text-2xl font-black text-white tracking-tight uppercase">MY PLANS</h1>
                <p className="text-[10px] text-white/25 font-bold mt-0.5 uppercase tracking-wider">BUILD YOUR DAY AS A FLOWCHART</p>
              </div>
            </div>
            {/* Tabs */}
            <div className="flex gap-1 mt-3 bg-white/5 rounded-xl p-1">
              <button
                onClick={() => setTab("plans")}
                className={clsx("flex-1 py-2 rounded-lg text-[10px] font-black tracking-wider flex items-center justify-center gap-1.5 transition-all",
                  tab === "plans" ? "bg-[#F2E8CF] text-[#233216]" : "text-white/35"
                )}
              >
                📋 PLANS
              </button>
              <button
                onClick={() => setTab("pinned")}
                className={clsx("flex-1 py-2 rounded-lg text-[10px] font-black tracking-wider flex items-center justify-center gap-1.5 transition-all",
                  tab === "pinned" ? "bg-[#F2E8CF] text-[#233216]" : "text-white/35"
                )}
              >
                <Pin size={10} /> PINNED
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 pt-2">
            <button onClick={() => setSelectedPlan(null)} className="p-1 -ml-1 text-white/30 active:text-white/60">
              <ArrowLeft size={22} />
            </button>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-black text-white flex items-center gap-2 truncate uppercase">
                <span>{selectedPlan.emoji}</span> {selectedPlan.name}
              </h2>
              {selectedPlan.date && <p className="text-xs text-white/30">{selectedPlan.date}</p>}
            </div>
            <button onClick={() => handleShare(selectedPlan)} className="p-2 bg-[#F2E8CF]/15 rounded-full text-[#F2E8CF]">
              <Share2 size={18} />
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {!selectedPlan ? (
          tab === "plans" ? (
          <div className="p-4 space-y-3">
            {plans.length === 0 ? (
              <div className="text-center py-16 px-6">
                <div className="text-5xl mb-3">📋</div>
                <h3 className="text-lg font-bold text-white/50 mb-1">NO PLANS YET</h3>
                <p className="text-sm text-white/25 mb-5">Create a plan to organize your day or trip.</p>
                <button onClick={() => setShowCreatePlan(true)} className="px-5 py-2.5 bg-[#F2E8CF] text-[#233216] rounded-full font-bold text-sm shadow-md">
                  CREATE A PLAN
                </button>
              </div>
            ) : (
              plans.map(plan => (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/10 rounded-2xl border border-white/15 p-4 active:scale-[0.98] transition-transform cursor-pointer"
                  onClick={() => setSelectedPlan(plan)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-[#F2E8CF]/10 flex items-center justify-center text-xl flex-shrink-0">
                      {plan.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-white text-base truncate">{plan.name}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        {plan.date && <span className="text-xs text-white/30">{plan.date}</span>}
                        <span className="text-xs text-white/15">·</span>
                        <span className="text-xs text-[#F2E8CF] font-bold">{plan.events.length} events</span>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-white/15" />
                  </div>
                  {plan.events.length > 0 && (
                    <div className="mt-3 flex gap-1.5 overflow-hidden">
                      {plan.events.slice(0, 4).map(e => (
                        <span key={e.id} className="text-[10px] bg-white/5 text-white/30 px-2 py-1 rounded-full truncate max-w-[80px] font-medium">
                          {e.emoji || "•"} {e.name}
                        </span>
                      ))}
                      {plan.events.length > 4 && (
                        <span className="text-[10px] bg-white/5 text-white/20 px-2 py-1 rounded-full font-bold">+{plan.events.length - 4}</span>
                      )}
                    </div>
                  )}
                </motion.div>
              ))
            )}

            {/* Plus button below */}
            <button
              onClick={() => setShowCreatePlan(true)}
              className="w-full py-3.5 bg-[#F2E8CF]/8 border-2 border-dashed border-[#F2E8CF]/20 rounded-xl text-[#F2E8CF] font-bold text-sm flex items-center justify-center gap-2 active:bg-[#F2E8CF]/15 transition-colors"
            >
              <Plus size={18} /> NEW PLAN
            </button>
          </div>
          ) : (
          /* PINNED TAB */
          <div className="p-4 space-y-2">
            {pinnedPlaces.length === 0 ? (
              <div className="text-center py-16 px-6">
                <Pin size={32} className="text-white/15 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-white/50 mb-1">NO PINS YET</h3>
                <p className="text-sm text-white/25 mb-5">Pin places from Explore to save them here.</p>
                <button onClick={() => navigate("/explore")} className="px-5 py-2.5 bg-[#F2E8CF] text-[#233216] rounded-full font-bold text-sm shadow-md">
                  BROWSE EXPLORE
                </button>
              </div>
            ) : (
              pinnedPlaces.map(place => (
                <div
                  key={place.id}
                  onClick={() => navigate(`/event/${place.id}`)}
                  className="bg-white/10 rounded-xl border border-white/15 p-3 flex items-center gap-3 active:bg-white/15 transition-colors cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
                    <img src={place.image} alt="" className="w-full h-full object-cover" loading="lazy" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-white text-sm truncate">{place.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-white/30">{place.category}</span>
                      <span className="text-[10px] text-white/15">·</span>
                      <span className="text-[10px] text-white/30">{place.price}</span>
                      <span className="text-[10px] text-white/15">·</span>
                      <span className="text-[10px] font-bold text-[#F2E8CF] flex items-center gap-0.5"><MustangIcon size={10} fill="currentColor" /> {place.rating}</span>
                    </div>
                  </div>
                  <Pin size={14} className="text-[#F2E8CF] flex-shrink-0" fill="currentColor" />
                </div>
              ))
            )}
          </div>
          )
        ) : (
          <div className="p-4 space-y-4">
            <div className="flex gap-3 flex-wrap">
              {(["custom", "explore", "jam"] as EventSource[]).map(s => (
                <div key={s} className="flex items-center gap-1.5">
                  <div className={clsx("w-2.5 h-2.5 rounded-full", sourceColors[s].dot)} />
                  <span className="text-[10px] font-bold text-white/30 uppercase">{sourceColors[s].label}</span>
                </div>
              ))}
            </div>

            {selectedPlan.events.length === 0 ? (
              <div className="text-center py-12 bg-white/3 rounded-2xl border-2 border-dashed border-white/10">
                <p className="text-white/25 font-bold mb-3">NO EVENTS YET</p>
                <button onClick={() => { resetEventForm(); setShowAddEvent(true); }} className="px-5 py-2 bg-[#F2E8CF] text-[#233216] rounded-full font-bold text-sm shadow-md">
                  ADD FIRST EVENT
                </button>
              </div>
            ) : (
              <div className="relative">
                <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-gradient-to-b from-[#F2E8CF]/30 via-white/10 to-[#F2E8CF]/30" />
                {selectedPlan.events.map((event, idx) => {
                  const sc = sourceColors[event.source];
                  return (
                    <motion.div key={event.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.03 }} className="relative flex gap-3 mb-1">
                      <div className="flex-shrink-0 w-10 flex flex-col items-center pt-1 z-10">
                        <div className={clsx("w-4 h-4 rounded-full border-2 shadow-sm", sc.dot)} />
                        {idx < selectedPlan.events.length - 1 && <ChevronDown size={10} className="text-white/10 mt-0.5" />}
                      </div>
                      <div className="flex-1 bg-white/8 rounded-xl border border-white/12 p-3 mb-3 group hover:bg-white/10 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {event.time && <span className="text-[10px] font-bold text-[#F2E8CF] bg-[#F2E8CF]/10 px-2 py-0.5 rounded-full">{event.time}</span>}
                              <span className={clsx("text-[9px] font-black px-1.5 py-0.5 rounded", sc.badge)}>{sc.badgeText}</span>
                            </div>
                            <h4 className="font-bold text-white text-sm flex items-center gap-1.5">
                              {event.emoji && <span>{event.emoji}</span>}{event.name}
                            </h4>
                            {event.location && <p className="text-xs text-white/30 flex items-center gap-1 mt-0.5"><MapPin size={10} />{event.location}</p>}
                            {event.note && <p className="text-xs text-white/15 mt-1 italic">{event.note}</p>}
                          </div>
                          <button onClick={() => handleDeleteEvent(selectedPlan.id, event.id)} className="p-1.5 text-white/10 hover:text-red-400 transition-colors"><X size={14} /></button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            <button onClick={() => { resetEventForm(); setShowAddEvent(true); }} className="w-full py-3 bg-[#F2E8CF]/8 border-2 border-dashed border-[#F2E8CF]/20 rounded-xl text-[#F2E8CF] font-bold text-sm flex items-center justify-center gap-2 active:bg-[#F2E8CF]/15 transition-colors">
              <Plus size={16} /> ADD EVENT
            </button>

            <div className="flex gap-2 pt-2">
              <button onClick={() => handleShare(selectedPlan)} className="flex-1 py-3 bg-[#F2E8CF] text-[#233216] rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-md">
                <Share2 size={16} /> SHARE PLAN
              </button>
              <button onClick={() => handleDeletePlan(selectedPlan.id)} className="py-3 px-4 text-red-400/60 font-bold text-sm rounded-xl border border-red-500/15 flex items-center gap-1">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      <BottomNav />

      {/* Create Plan Modal */}
      <AnimatePresence>
        {showCreatePlan && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ y: "100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: "100%", opacity: 0 }} transition={{ type: "spring", damping: 28, stiffness: 350 }}
              className="bg-[#0a0f07]/95 backdrop-blur-xl rounded-t-3xl sm:rounded-2xl w-full sm:max-w-sm p-5 shadow-2xl border-t border-white/10">
              <div className="w-10 h-1 bg-white/10 rounded-full mx-auto mb-4 sm:hidden" />
              <h3 className="text-lg font-bold text-white mb-4">NEW PLAN</h3>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {planEmojis.map(e => (
                    <button key={e} onClick={() => setPlanEmoji(e)} className={clsx("w-9 h-9 rounded-lg text-lg flex items-center justify-center", planEmoji === e ? "bg-[#F2E8CF] scale-110" : "bg-white/8")}>{e}</button>
                  ))}
                </div>
                <input type="text" placeholder="Plan name (e.g. Pismo Day Trip)" value={planName} onChange={e => setPlanName(e.target.value)} className="w-full border border-white/15 bg-white/8 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/25 focus:border-[#F2E8CF]/40 outline-none" />
                <input type="date" value={planDate} onChange={e => setPlanDate(e.target.value)} className="w-full border border-white/15 bg-white/8 rounded-xl px-4 py-3 text-sm text-white focus:border-[#F2E8CF]/40 outline-none [color-scheme:dark]" />
                <div className="flex gap-2 pt-1">
                  <button onClick={() => setShowCreatePlan(false)} className="flex-1 py-3 text-white/30 font-bold rounded-xl">CANCEL</button>
                  <button onClick={handleCreatePlan} className="flex-1 py-3 bg-[#F2E8CF] text-[#233216] rounded-xl font-bold shadow-md">CREATE</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Event Modal */}
      <AnimatePresence>
        {showAddEvent && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ y: "100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: "100%", opacity: 0 }} transition={{ type: "spring", damping: 28, stiffness: 350 }}
              className="bg-[#0a0f07]/95 backdrop-blur-xl rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md p-5 shadow-2xl border-t border-white/10 max-h-[85vh] overflow-y-auto">
              <div className="w-10 h-1 bg-white/10 rounded-full mx-auto mb-4 sm:hidden" />
              <h3 className="text-lg font-bold text-white mb-4">ADD EVENT</h3>
              <div className="flex gap-1 bg-white/5 rounded-xl p-1 mb-4">
                {([{ key: "custom" as EventSource, icon: PenLine, label: "CUSTOM" }, { key: "explore" as EventSource, icon: Compass, label: "EXPLORE" }, { key: "jam" as EventSource, icon: Users, label: "JAM" }]).map(tab => (
                  <button key={tab.key} onClick={() => setEventSource(tab.key)} className={clsx("flex-1 py-2 rounded-lg text-[10px] font-black tracking-wider flex items-center justify-center gap-1.5 transition-all", eventSource === tab.key ? "bg-[#F2E8CF] text-[#233216]" : "text-white/30 hover:text-white/50")}>
                    <tab.icon size={12} />{tab.label}
                  </button>
                ))}
              </div>
              <div className="space-y-3">
                {eventSource === "custom" && (
                  <>
                    <input type="text" placeholder="Event name *" value={eventName} onChange={e => setEventName(e.target.value)} className="w-full border border-white/15 bg-white/8 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/25 focus:border-[#F2E8CF]/40 outline-none" />
                    <div className="relative"><MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" /><input type="text" placeholder="Location (optional)" value={eventLocation} onChange={e => setEventLocation(e.target.value)} className="w-full border border-white/15 bg-white/8 rounded-xl pl-9 pr-4 py-3 text-sm text-white placeholder:text-white/25 focus:border-[#F2E8CF]/40 outline-none" /></div>
                    <div className="relative"><Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" /><input type="time" value={eventTime} onChange={e => setEventTime(e.target.value)} className="w-full border border-white/15 bg-white/8 rounded-xl pl-9 pr-4 py-3 text-sm text-white focus:border-[#F2E8CF]/40 outline-none [color-scheme:dark]" /></div>
                  </>
                )}
                {eventSource === "explore" && (
                  <>
                    <div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" /><input type="text" placeholder="Search places..." value={exploreSearch} onChange={e => setExploreSearch(e.target.value)} className="w-full border border-white/15 bg-white/8 rounded-xl pl-9 pr-4 py-3 text-sm text-white placeholder:text-white/25 focus:border-[#F2E8CF]/40 outline-none" /></div>
                    <div className="max-h-48 overflow-y-auto space-y-1.5">
                      {filteredPlaces.map(place => (
                        <button key={place.id} onClick={() => setSelectedPlaceId(place.id)} className={clsx("w-full flex items-center gap-3 p-2.5 rounded-xl border transition-all text-left", selectedPlaceId === place.id ? "border-[#F2E8CF] bg-[#F2E8CF]/10" : "border-white/8 bg-white/3 hover:bg-white/5")}>
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/5 flex-shrink-0"><img src={place.image} alt="" className="w-full h-full object-cover" loading="lazy" /></div>
                          <div className="flex-1 min-w-0"><p className="text-xs font-bold text-white truncate">{place.name}</p><p className="text-[10px] text-white/30">{place.category} · {place.city}</p></div>
                          {selectedPlaceId === place.id && <div className="w-5 h-5 rounded-full bg-[#F2E8CF] flex items-center justify-center text-[#233216] text-xs font-bold flex-shrink-0">✓</div>}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                {eventSource === "jam" && (
                  <>
                    <p className="text-xs text-white/40 italic">Add a jam as part of your day:</p>
                    <div className="space-y-1.5">
                      {sampleJams.map(jam => (
                        <button key={jam.id} onClick={() => setSelectedJamId(jam.id)} className={clsx("w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left", selectedJamId === jam.id ? "border-amber-400 bg-amber-400/10" : "border-white/8 bg-white/5 hover:bg-white/8")}>
                          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-lg flex-shrink-0">{jam.emoji}</div>
                          <div className="flex-1 min-w-0"><p className="text-sm font-bold text-white">{jam.name}</p><p className="text-[10px] font-mono text-white/25">{jam.code}</p></div>
                          {selectedJamId === jam.id && <div className="w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center text-[#233216] text-xs font-bold flex-shrink-0">✓</div>}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                <div className="flex gap-2 pt-1">
                  <button onClick={() => setShowAddEvent(false)} className="flex-1 py-3 text-white/30 font-bold rounded-xl">CANCEL</button>
                  <button onClick={handleAddEvent} disabled={(eventSource === "custom" && !eventName.trim()) || (eventSource === "explore" && !selectedPlaceId) || (eventSource === "jam" && !selectedJamId)} className="flex-1 py-3 bg-[#F2E8CF] text-[#233216] rounded-xl font-bold shadow-md disabled:opacity-40">ADD</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function getCategoryEmoji(category: string): string {
  const map: Record<string, string> = { "Food & Treats": "🍽️", "Beaches": "🏖️", "Hikes": "🥾", "Coffee Shops": "☕", "Study Spots": "📚", "Farmers Markets": "🥕", "Live Music": "🎵", "Movies": "🎬", "Bowling": "🎳", "Art": "🎨", "Museums": "🏛️", "Viewpoints": "🌅", "Parks & Gardens": "🌳", "Breweries": "🍺", "Zoos & Aquariums": "🐼", "Shopping": "🛍️" };
  return map[category] || "📍";
}