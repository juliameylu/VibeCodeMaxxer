import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { BottomNav } from "../components/BottomNav";
import { PageHeader } from "../components/PageHeader";
import { copyToClipboard } from "../utils/clipboard";
import { places } from "../data/places";
import { 
  Plus, Users, ArrowLeft, ArrowRight, Share2, Send, Copy, ChevronRight, Trash2, 
  Hash, Lock, Vote, MapPin, Pin, Shuffle, Search, Image, Pencil, ThumbsUp, 
  ThumbsDown, Check, X, Sparkles, Calendar, Clock, Archive, CheckCircle2, Menu,
  MessageSquare, Settings, LogOut, LayoutGrid, Info, Camera, Save, Home, ChevronUp,
  Mountain, Coffee, Utensils, Music, BookOpen, Dumbbell, Palmtree, PartyPopper, Car, Heart, Tag,
  CircleHelp, CircleX, CircleDot
} from "lucide-react";
import { clsx } from "clsx";

interface JamEvent {
  id: string;
  placeId?: string;
  name: string;
  addedBy: string;
  votes?: { up: number; down: number; voted?: "up" | "down" };
  description?: string;
}

interface JamMember {
  id: string;
  name: string;
  rsvp: "going" | "maybe" | "pending" | "not going";
}

type JamCategory = "adventure" | "study" | "food" | "hangout" | "workout" | "music" | "road-trip" | "date" | "custom";

interface Jam {
  id: string;
  name: string;
  emoji: string;
  code: string;
  members: JamMember[];
  isOwner: boolean;
  lastMessage?: string;
  createdAt: string;
  type: "locked" | "voting";
  category?: JamCategory;
  customCategory?: string;
  events?: JamEvent[];
  description?: string;
  profileImage?: string;
  date?: string;
  time?: string;
}

const jamCategories: { id: JamCategory; label: string; icon: any; color: string }[] = [
  { id: "adventure", label: "Adventure", icon: Mountain, color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" },
  { id: "study", label: "Study", icon: BookOpen, color: "bg-blue-500/15 text-blue-400 border-blue-500/25" },
  { id: "food", label: "Food Run", icon: Utensils, color: "bg-orange-500/15 text-orange-400 border-orange-500/25" },
  { id: "hangout", label: "Hangout", icon: Users, color: "bg-[#F2E8CF]/15 text-[#F2E8CF] border-[#F2E8CF]/25" },
  { id: "workout", label: "Workout", icon: Dumbbell, color: "bg-red-500/15 text-red-400 border-red-500/25" },
  { id: "music", label: "Music", icon: Music, color: "bg-purple-500/15 text-purple-400 border-purple-500/25" },
  { id: "road-trip", label: "Road Trip", icon: Car, color: "bg-[#c4a46c]/15 text-[#c4a46c] border-[#c4a46c]/25" },
  { id: "date", label: "Date Night", icon: Heart, color: "bg-pink-500/15 text-pink-400 border-pink-500/25" },
  { id: "custom", label: "Custom", icon: Tag, color: "bg-white/10 text-white/60 border-white/20" },
];

function getCategoryStyle(cat?: JamCategory) {
  return jamCategories.find(c => c.id === cat) || jamCategories.find(c => c.id === "hangout")!;
}

const initialJams: Jam[] = [
  {
    id: "j1", name: "Beach Crew", emoji: "", code: "PISMO-7", isOwner: true, lastMessage: "Who's driving Saturday?", createdAt: "2 days ago", type: "locked", category: "adventure",
    members: [{ id: "m1", name: "You", rsvp: "going" }, { id: "m2", name: "Alex M.", rsvp: "going" }, { id: "m3", name: "Emma R.", rsvp: "maybe" }],
    events: [{ id: "e1", placeId: "pismo-beach-pier-pismo-beach", name: "Pismo Beach Pier", addedBy: "You" }],
    date: "Sat, Mar 1", time: "10:00 AM",
  },
  {
    id: "j2", name: "Study Squad", emoji: "", code: "GRND-88", isOwner: false, lastMessage: "Library 4th floor at 7?", createdAt: "5 days ago", type: "voting", category: "study",
    members: [{ id: "m5", name: "Sarah K.", rsvp: "going" }, { id: "m6", name: "You", rsvp: "going" }],
    events: [
      { id: "e2", name: "Kennedy Library", addedBy: "Sarah K.", votes: { up: 2, down: 0 } },
      { id: "e3", name: "Scout Coffee", addedBy: "You", votes: { up: 1, down: 1 } },
    ],
    date: "Wed, Feb 26", time: "7:00 PM",
  },
];

const JAMS_KEY = "polyjarvis_jams";
const ARCHIVED_JAMS_KEY = "polyjarvis_jams_archive";
type CreateStep = "name" | "style" | "events" | "confirm";

export function Jams() {
  const navigate = useNavigate();
  const location = useLocation();

  const [jams, setJams] = useState<Jam[]>(() => {
    try { const saved = localStorage.getItem(JAMS_KEY); if (saved) { const p = JSON.parse(saved); if (Array.isArray(p) && p.length > 0) return p; } } catch {}
    localStorage.setItem(JAMS_KEY, JSON.stringify(initialJams));
    return initialJams;
  });

  const [view, setView] = useState<"list" | "create" | "detail">("list");
  const [selectedJam, setSelectedJam] = useState<Jam | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<{ sender: string; text: string; time: string }[]>([]);
  
  // Sidebar state
  const [showSidebar, setShowSidebar] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "spots" | "members">("chat");

  // Create wizard
  const [createStep, setCreateStep] = useState<CreateStep>("name");
  const [newType, setNewType] = useState<"locked" | "voting">("locked");
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState<JamCategory>("hangout");
  const [newCustomCategory, setNewCustomCategory] = useState("");
  const [newEvents, setNewEvents] = useState<JamEvent[]>([]);
  const [eventSearch, setEventSearch] = useState("");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");

  // Edit state
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [archivedJams, setArchivedJams] = useState<Jam[]>(() => {
    try { const saved = localStorage.getItem(ARCHIVED_JAMS_KEY); if (saved) return JSON.parse(saved); } catch {} return [];
  });

  // Sidebar editing
  const [sidebarEditName, setSidebarEditName] = useState("");
  const [sidebarEditImage, setSidebarEditImage] = useState<string | null>(null);
  const [sidebarEditCategory, setSidebarEditCategory] = useState<JamCategory>("hangout");
  const [sidebarCustomCategory, setSidebarCustomCategory] = useState("");
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  useEffect(() => {
    if (showSidebar && selectedJam) {
      setSidebarEditName(selectedJam.name);
      setSidebarEditImage(selectedJam.profileImage || null);
      setSidebarEditCategory(selectedJam.category || "hangout");
      setSidebarCustomCategory(selectedJam.customCategory || "");
    }
  }, [showSidebar, selectedJam]);

  const persistJams = (updated: Jam[]) => { setJams(updated); localStorage.setItem(JAMS_KEY, JSON.stringify(updated)); };
  const persistArchive = (updated: Jam[]) => { setArchivedJams(updated); localStorage.setItem(ARCHIVED_JAMS_KEY, JSON.stringify(updated)); };

  const generateCode = () => {
    const words = ["PEAK", "WAVE", "BREW", "SURF", "HIKE", "CHILL", "CREW"];
    return `${words[Math.floor(Math.random() * words.length)]}-${Math.floor(Math.random() * 99) + 1}`;
  };

  const generateName = () => {
    const names = [
      "Taco Tuesday", "Beach Crew", "Study Squad", "Sunset Session",
      "Coffee Crawl", "Downtown Stroll", "Hike Day", "Brunch Bunch",
      "Road Trip Crew", "Movie Night", "Pizza Party", "Game Night",
      "Weekend Warriors", "Thirsty Thursday", "Surf Sesh", "Market Day"
    ];
    setNewName(names[Math.floor(Math.random() * names.length)]);
  };

  const startCreate = () => {
    setCreateStep("name");
    setNewType("locked");
    setNewName("");
    setNewCategory("hangout");
    setNewCustomCategory("");
    setNewEvents([]);
    setProfileImage(null);
    setNewDate("");
    setNewTime("");
    setView("create");
  };

  const finishCreate = () => {
    if (!newName.trim()) return;
    const jam: Jam = {
      id: Date.now().toString(), name: newName, emoji: "", code: generateCode(), isOwner: true, createdAt: "Just now",
      members: [{ id: "you", name: "You", rsvp: "going" }], type: newType, category: newCategory,
      customCategory: newCategory === "custom" ? newCustomCategory : undefined,
      events: newEvents, profileImage: profileImage || undefined,
      date: newDate || undefined, time: newTime || undefined,
    };
    persistJams([jam, ...jams]);
    setSelectedJam(jam);
    setMessages([{ sender: "system", text: "You created this jam", time: "Just now" }]);
    setView("detail");
    setActiveTab("chat");
    toast.success(`"${jam.name}" created!`);
  };

  const openDetail = (jam: Jam) => {
    setSelectedJam(jam);
    setMessages([
      { sender: "system", text: `${jam.isOwner ? "You" : jam.members[0]?.name} created this jam`, time: jam.createdAt },
      ...(jam.lastMessage ? [{ sender: "Member", text: jam.lastMessage, time: "2h ago" }] : [])
    ]);
    setView("detail");
    setActiveTab("chat");
  };

  const sendMessage = () => {
    if (!chatInput.trim()) return;
    setMessages([...messages, { sender: "You", text: chatInput, time: "now" }]);
    setChatInput("");
  };

  const rsvpColor: Record<string, string> = {
    going: "bg-[#F2E8CF]/20 text-[#F2E8CF] border-[#F2E8CF]/30",
    maybe: "bg-white/10 text-white border-white/20",
    pending: "bg-white/5 text-white/30 border-white/10",
    "not going": "bg-red-400/20 text-red-400 border-red-400/30",
  };

  const searchedPlaces = eventSearch.trim()
    ? places.filter(p => p.name.toLowerCase().includes(eventSearch.toLowerCase())).slice(0, 8)
    : places.slice(0, 8);

  const addEventToJam = (name: string, placeId?: string) => {
    if (!selectedJam) {
        if (view === "create") {
             setNewEvents([...newEvents, { id: Date.now().toString(), name, placeId, addedBy: "You" }]);
             toast.success(`Added ${name}`);
             return;
        }
        return;
    }
    const newEvent: JamEvent = { id: Date.now().toString(), name, placeId, addedBy: "You", votes: selectedJam.type === "voting" ? { up: 0, down: 0 } : undefined };
    const updatedJam = { ...selectedJam, events: [...(selectedJam.events || []), newEvent] };
    const updated = jams.map(j => j.id === selectedJam.id ? updatedJam : j);
    persistJams(updated);
    setSelectedJam(updatedJam);
    setShowAddEvent(false);
    toast.success(`Added "${name}"`);
  };

  const removeEventFromJam = (eventId: string) => {
    if (view === "create") {
      setNewEvents(newEvents.filter(e => e.id !== eventId));
      return;
    }
    if (!selectedJam) return;
    const updatedEvents = (selectedJam.events || []).filter(e => e.id !== eventId);
    const updatedJam = { ...selectedJam, events: updatedEvents };
    const updated = jams.map(j => j.id === selectedJam.id ? updatedJam : j);
    persistJams(updated);
    setSelectedJam(updatedJam);
    toast.success("Spot removed");
  };

  const moveEvent = (eventId: string, direction: "up" | "down") => {
    const events = view === "create" ? [...newEvents] : [...(selectedJam?.events || [])];
    const idx = events.findIndex(e => e.id === eventId);
    if (idx === -1) return;
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === events.length - 1) return;
    const newIdx = direction === "up" ? idx - 1 : idx + 1;
    [events[idx], events[newIdx]] = [events[newIdx], events[idx]];
    if (view === "create") {
      setNewEvents(events);
    } else if (selectedJam) {
      const updatedJam = { ...selectedJam, events };
      persistJams(jams.map(j => j.id === selectedJam.id ? updatedJam : j));
      setSelectedJam(updatedJam);
    }
  };
  
  const saveSidebarChanges = () => {
    if (!selectedJam) return;
    const updatedJam = {
      ...selectedJam,
      name: sidebarEditName,
      profileImage: sidebarEditImage || undefined,
      category: sidebarEditCategory,
      customCategory: sidebarEditCategory === "custom" ? sidebarCustomCategory : undefined,
    };
    const updated = jams.map(j => j.id === selectedJam.id ? updatedJam : j);
    persistJams(updated);
    setSelectedJam(updatedJam);
    toast.success("Jam details updated");
    setShowSidebar(false);
  };

  const handleSidebarImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setSidebarEditImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleProfileImageCreate = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setProfileImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const archiveJam = () => {
    if (!selectedJam) return;
    persistArchive([selectedJam, ...archivedJams]);
    persistJams(jams.filter(j => j.id !== selectedJam.id));
    setSelectedJam(null);
    setShowSidebar(false);
    setView("list");
    toast.success("Jam archived");
  };

  const addJamToPlan = () => {
    if (!selectedJam) return;
    navigate("/plans", { state: { startCreate: true, fromJam: { id: selectedJam.id, name: selectedJam.name, events: selectedJam.events } } });
  };

  return (
    <div className="min-h-[100dvh] bg-transparent text-white pb-24 flex flex-col relative overflow-hidden font-[system-ui]">
      <PageHeader />

      <AnimatePresence mode="wait">
        {/* LIST VIEW */}
        {view === "list" && (
          <motion.div 
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="px-5 pt-2 flex-1 flex flex-col"
          >
            <div className="flex items-center justify-between mb-4">
               <button onClick={() => navigate("/dashboard")} className="flex items-center gap-1.5 text-white/40 text-xs font-semibold hover:text-white transition-colors">
                  <ArrowLeft size={14} /> Home
               </button>
               <div className="text-center">
                 <h1 className="text-base font-extrabold text-white">My Jams</h1>
                 <p className="text-[10px] text-[#F2E8CF]/60 font-semibold">{jams.length} active</p>
               </div>
               <button onClick={() => setShowArchive(!showArchive)} className="p-2 bg-white/5 rounded-full text-white/40 active:scale-90 transition-transform">
                  <Archive size={16} />
               </button>
            </div>

            <button onClick={startCreate}
              className="w-full py-3.5 bg-amber-400 text-[#233216] rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-400/20 active:scale-[0.97] transition-transform mb-4"
            >
              <Plus size={16} /> New Jam
            </button>

            <div className="space-y-3">
              {jams.map(jam => {
                const stopCount = jam.events?.length || 0;
                const visibleStops = (jam.events || []).slice(0, 4);
                const overflow = stopCount - visibleStops.length;
                return (
                <div key={jam.id} onClick={() => openDetail(jam)}
                  className="bg-[#1a2e12]/60 border border-amber-400/12 rounded-2xl p-4 active:scale-[0.98] transition-transform cursor-pointer shadow-sm relative overflow-hidden group border-l-[3px] border-l-amber-400/40"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-xl bg-white/8 flex items-center justify-center flex-shrink-0 border border-white/10 overflow-hidden mt-0.5">
                      {jam.profileImage ? <img src={jam.profileImage} className="w-full h-full object-cover" /> : <Users size={18} className="text-[#F2E8CF]/70" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                          <h3 className="font-bold text-white text-[15px] truncate">{jam.name}</h3>
                          {(() => { const cat = getCategoryStyle(jam.category); const CatIcon = cat.icon; return (
                            <span className={clsx("text-[8px] px-1.5 py-0.5 rounded-full border font-semibold flex items-center gap-0.5 flex-shrink-0", cat.color)}>
                              <CatIcon size={8} /> {jam.category === "custom" && jam.customCategory ? jam.customCategory : cat.label}
                            </span>
                          ); })()}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {jam.date && <span className="text-[10px] text-white/35 flex items-center gap-1"><Calendar size={9} /> {jam.date}</span>}
                        {stopCount > 0 && <span className="text-[10px] text-white/35">{stopCount} {stopCount === 1 ? "stop" : "stops"}</span>}
                      </div>
                      {/* Event stop pills */}
                      {stopCount > 0 && (
                        <div className="flex items-center gap-1.5 mt-2 overflow-hidden">
                          {visibleStops.map(ev => (
                            <span key={ev.id} className="flex items-center gap-1 text-[9px] text-[#008080] bg-[#008080]/10 px-2 py-0.5 rounded-full border border-[#008080]/15 whitespace-nowrap max-w-[110px] truncate flex-shrink-0">
                              <MapPin size={8} className="flex-shrink-0" /> {ev.name}
                            </span>
                          ))}
                          {overflow > 0 && (
                            <span className="text-[9px] text-white/30 font-semibold flex-shrink-0">+{overflow}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <ChevronRight size={16} className="text-white/15 mt-1 flex-shrink-0" />
                  </div>
                </div>
                );
              })}
            </div>
            
            {showArchive && (
               <div className="mt-8 pt-4 border-t border-white/10">
                  <h3 className="text-xs font-semibold text-white/30 mb-2 capitalize tracking-wider">Archived</h3>
                  {archivedJams.length === 0 && <p className="text-[10px] text-white/20">No archived jams.</p>}
                  {archivedJams.map(j => (
                      <div key={j.id} className="py-2 text-white/30 flex items-center gap-2">
                          <CheckCircle2 size={12} /> <span className="text-xs">{j.name}</span>
                      </div>
                  ))}
               </div>
            )}
          </motion.div>
        )}

        {/* DETAIL VIEW - Softer UI */}
        {view === "detail" && selectedJam && (
          <motion.div 
            key="detail"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col h-[calc(100dvh-6rem)]"
          >
             {/* Header - softer */}
             <div className="px-4 py-3 bg-[#1a2e12]/60 backdrop-blur-md border-b border-white/8 flex items-center justify-between z-20 sticky top-0">
                <button onClick={() => setView("list")} className="p-2 -ml-2 text-white/50 hover:text-white transition-colors flex items-center gap-1">
                    <ArrowLeft size={18} /> <span className="text-xs font-semibold">Back</span>
                </button>
                <div className="flex flex-col items-center">
                   <div className="flex items-center gap-2">
                     {selectedJam.profileImage && <img src={selectedJam.profileImage} className="w-6 h-6 rounded-lg object-cover" />}
                     <h2 className="text-sm font-bold text-white">{selectedJam.name}</h2>
                   </div>
                   <div className="flex items-center gap-1.5">
                     <p className="text-[9px] text-white/35 font-semibold">{selectedJam.members.length} members {selectedJam.date ? `\u00B7 ${selectedJam.date}` : ""}</p>
                     {(() => { const cat = getCategoryStyle(selectedJam.category); const CatIcon = cat.icon; return (
                       <span className={clsx("text-[7px] px-1.5 py-0.5 rounded-full border font-semibold flex items-center gap-0.5", cat.color)}>
                         <CatIcon size={7} /> {selectedJam.category === "custom" && selectedJam.customCategory ? selectedJam.customCategory : cat.label}
                       </span>
                     ); })()}
                   </div>
                </div>
                <button onClick={() => setShowSidebar(true)} className="p-2 -mr-2 text-white/50 hover:text-white transition-colors"><Menu size={20} /></button>
             </div>

             {/* Tabs - softer styling */}
             <div className="flex border-b border-white/8 bg-[#1a2e12]/30">
                <button onClick={() => setActiveTab("chat")} className={clsx("flex-1 py-3 text-xs font-semibold transition-colors border-b-2", activeTab === "chat" ? "text-amber-400 border-amber-400" : "text-white/25 border-transparent hover:text-white/50")}>Chat</button>
                <button onClick={() => setActiveTab("spots")} className={clsx("flex-1 py-3 text-xs font-semibold transition-colors border-b-2", activeTab === "spots" ? "text-amber-400 border-amber-400" : "text-white/25 border-transparent hover:text-white/50")}>Spots</button>
                <button onClick={() => setActiveTab("members")} className={clsx("flex-1 py-3 text-xs font-semibold transition-colors border-b-2", activeTab === "members" ? "text-amber-400 border-amber-400" : "text-white/25 border-transparent hover:text-white/50")}>People</button>
             </div>

             {/* Content */}
             <div className="flex-1 overflow-y-auto bg-transparent relative scroll-smooth">
                
                {/* CHAT TAB */}
                {activeTab === "chat" && (
                   <div className="flex flex-col h-full">
                      <div className="flex-1 p-4 space-y-3 overflow-y-auto pb-20">
                         {messages.map((msg, i) => (
                           <div key={i} className={clsx("flex", msg.sender === "You" ? "justify-end" : "justify-start")}>
                              {msg.sender === "system" ? (
                                 <p className="w-full text-center text-[9px] text-white/15 my-2 font-semibold">{msg.text}</p>
                              ) : (
                                  <div className={clsx("max-w-[80%] px-3.5 py-2.5 rounded-2xl text-xs shadow-sm", msg.sender === "You" ? "bg-[#F2E8CF] text-[#1a2e12] font-medium rounded-br-sm" : "bg-white/8 text-white/80 rounded-bl-sm border border-white/5")}>
                                     {msg.sender !== "You" && <p className="text-[9px] font-semibold text-white/35 mb-0.5">{msg.sender}</p>}
                                     <p>{msg.text}</p>
                                  </div>
                              )}
                           </div>
                         ))}
                      </div>
                      <div className="p-3 bg-[#0d1208]/80 backdrop-blur-sm border-t border-white/8 flex gap-2 absolute bottom-0 left-0 right-0">
                         <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage()} placeholder="Message..." className="flex-1 bg-white/5 border border-white/8 rounded-full px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#F2E8CF]/40 transition-colors placeholder:text-white/20" />
                         <button onClick={sendMessage} className="p-2.5 bg-[#F2E8CF] text-[#1a2e12] rounded-full active:scale-95 transition-transform"><Send size={16} /></button>
                      </div>
                   </div>
                )}

                {/* SPOTS TAB - Timeline style like Plans */}
                {activeTab === "spots" && (
                   <div className="p-4 pb-20">
                      <div className="flex gap-2 mb-4">
                        <button onClick={() => setShowAddEvent(true)} className="flex-1 py-3 border border-dashed border-white/15 rounded-xl text-xs font-semibold text-white/30 flex items-center justify-center gap-2 hover:border-[#F2E8CF]/30 hover:text-[#F2E8CF] transition-colors">
                           <Plus size={14} /> Add Spot
                        </button>
                        <button onClick={addJamToPlan} className="px-4 py-3 bg-[#F2E8CF]/10 border border-[#F2E8CF]/15 rounded-xl text-xs font-semibold text-[#F2E8CF]/70 flex items-center justify-center gap-2 hover:bg-[#F2E8CF]/15 transition-colors">
                           <ArrowRight size={14} /> To Plan
                        </button>
                      </div>

                      {/* Timeline */}
                      {(selectedJam.events?.length || 0) > 0 ? (
                        <div className="relative border-l-2 border-[#F2E8CF]/12 ml-4 space-y-1">
                          {selectedJam.events?.map((ev, i) => (
                            <div key={ev.id} className="relative pl-7 group">
                              <div className="absolute -left-[9px] top-3 w-4 h-4 rounded-full bg-[#1a2e12] border-2 border-[#F2E8CF]/50 flex items-center justify-center">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#F2E8CF]/60" />
                              </div>
                              <div className="p-3 rounded-xl bg-white/5 border border-white/8 transition-all hover:border-white/15">
                                <div className="flex items-start gap-2.5">
                                  <div className="w-8 h-8 rounded-lg bg-[#008080]/10 flex items-center justify-center flex-shrink-0 mt-0.5 border border-[#008080]/15">
                                    <MapPin size={16} className="text-[#008080]" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-sm text-white/85">{ev.name}</h4>
                                    <p className="text-[10px] text-white/35">Added by {ev.addedBy}</p>
                                    {selectedJam.type === "voting" && ev.votes && (
                                      <div className="flex items-center gap-2 mt-1.5">
                                        <button className="flex items-center gap-1 text-[10px] text-white/40 bg-white/5 px-2 py-0.5 rounded-full hover:bg-green-400/15 hover:text-green-400 transition-colors">
                                          <ThumbsUp size={10} /> {ev.votes.up}
                                        </button>
                                        <button className="flex items-center gap-1 text-[10px] text-white/40 bg-white/5 px-2 py-0.5 rounded-full hover:bg-red-400/15 hover:text-red-400 transition-colors">
                                          <ThumbsDown size={10} /> {ev.votes.down}
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex flex-col gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => moveEvent(ev.id, "up")} className="p-1 text-white/20 hover:text-white/60 rounded-md hover:bg-white/10 transition-colors"><ChevronUp size={12} /></button>
                                    <button onClick={() => moveEvent(ev.id, "down")} className="p-1 text-white/20 hover:text-white/60 rounded-md hover:bg-white/10 transition-colors"><ChevronRight className="rotate-90" size={12} /></button>
                                    <button onClick={() => removeEventFromJam(ev.id)} className="p-1 text-red-400/30 hover:text-red-400 rounded-md hover:bg-red-400/10 transition-colors"><Trash2 size={12} /></button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <MapPin size={36} strokeWidth={1} className="mx-auto text-white/12 mb-2" />
                          <p className="text-sm text-white/25 mb-1">No spots yet</p>
                          <p className="text-xs text-white/15">Add spots for the crew to check out</p>
                        </div>
                      )}
                   </div>
                )}

                {/* MEMBERS TAB - softer cards */}
                {activeTab === "members" && (
                   <div className="p-4 space-y-2 pb-20">
                      {selectedJam.members.map(m => (
                         <div key={m.id} className="flex items-center justify-between p-3 bg-white/4 rounded-xl border border-white/6">
                            <div className="flex items-center gap-3">
                               <div className="w-9 h-9 rounded-full bg-white/8 flex items-center justify-center text-[11px] font-bold text-white/60">
                                  {m.name[0]}
                               </div>
                               <span className="text-sm font-semibold text-white/75">{m.name}</span>
                            </div>
                            <span className={clsx("text-[9px] px-2.5 py-1 rounded-full font-semibold capitalize border flex items-center gap-1", rsvpColor[m.rsvp])}>
                               {m.rsvp === "going" && <CheckCircle2 size={10} />}
                               {m.rsvp === "maybe" && <CircleHelp size={10} />}
                               {m.rsvp === "pending" && <Clock size={10} />}
                               {m.rsvp === "not going" && <CircleX size={10} />}
                               {m.rsvp}
                            </span>
                         </div>
                      ))}
                      <button className="w-full mt-4 py-3 bg-[#F2E8CF] text-[#233216] rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform">
                         <Share2 size={14} /> Invite Friends
                      </button>
                   </div>
                )}
             </div>

             {/* SIDEBAR DRAWER */}
             <AnimatePresence>
                {showSidebar && (
                   <>
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
                          className="absolute inset-0 z-30 bg-black/50 backdrop-blur-sm" onClick={() => setShowSidebar(false)} />
                      <motion.div 
                          initial={{ x: "100%" }} 
                          animate={{ x: 0 }} 
                          exit={{ x: "100%" }} 
                          transition={{ duration: 0.2, type: "spring", stiffness: 500, damping: 40 }}
                          className="absolute top-0 right-0 bottom-0 w-72 bg-[#1a2e12] border-l border-white/8 z-40 p-6 shadow-2xl flex flex-col overflow-y-auto"
                      >
                          <div className="flex items-center justify-between mb-6">
                            <h3 className="text-sm font-bold text-white">Jam Settings</h3>
                            <button onClick={() => setShowSidebar(false)} className="p-1 text-white/40 hover:text-white"><X size={18} /></button>
                          </div>
                          
                          <div className="mb-6 space-y-5">
                             {/* Profile Image Edit */}
                             <div className="flex flex-col items-center gap-2">
                                <label className="relative w-20 h-20 rounded-2xl bg-white/5 border-2 border-dashed border-white/12 flex items-center justify-center cursor-pointer hover:border-[#F2E8CF]/30 transition-colors overflow-hidden group shadow-inner">
                                   {sidebarEditImage ? <img src={sidebarEditImage} className="w-full h-full object-cover" /> : <Camera size={24} className="text-white/15 group-hover:text-[#F2E8CF]/50 transition-colors" />}
                                   <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Pencil size={16} className="text-white" />
                                   </div>
                                   <input type="file" accept="image/*" className="hidden" onChange={handleSidebarImageChange} />
                                </label>
                                <p className="text-[10px] text-white/25 font-semibold">Tap to edit</p>
                             </div>

                             {/* Name Edit */}
                             <div>
                                <label className="text-[10px] font-semibold text-white/30 capitalize tracking-wider mb-2 block">Jam Name</label>
                                <input 
                                  value={sidebarEditName} 
                                  onChange={e => setSidebarEditName(e.target.value)}
                                  className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-3 text-sm text-white focus:border-[#F2E8CF]/30 outline-none font-semibold placeholder:text-white/20"
                                  placeholder="Name your jam"
                                />
                             </div>

                             {/* Category Edit */}
                             <div>
                                <label className="text-[10px] font-semibold text-white/30 capitalize tracking-wider mb-2 block">Category</label>
                                <div className="flex flex-wrap gap-1.5">
                                  {jamCategories.map(cat => {
                                    const CatIcon = cat.icon;
                                    return (
                                      <button key={cat.id} onClick={() => setSidebarEditCategory(cat.id)}
                                        className={clsx("px-2.5 py-1.5 rounded-lg text-[9px] font-semibold flex items-center gap-1 border transition-all",
                                          sidebarEditCategory === cat.id ? "bg-[#F2E8CF]/15 border-[#F2E8CF] text-[#F2E8CF]" : "bg-white/5 border-white/8 text-white/35"
                                        )}>
                                        <CatIcon size={10} /> {cat.label}
                                      </button>
                                    );
                                  })}
                                </div>
                                {sidebarEditCategory === "custom" && (
                                  <input
                                    placeholder="Custom category..."
                                    value={sidebarCustomCategory}
                                    onChange={e => setSidebarCustomCategory(e.target.value)}
                                    className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white mt-2 focus:border-[#F2E8CF]/30 outline-none placeholder:text-white/20"
                                  />
                                )}
                             </div>

                             <button onClick={saveSidebarChanges} className="w-full py-3 bg-[#F2E8CF] text-[#1a2e12] rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform">
                                <Save size={14} /> Save Changes
                             </button>
                          </div>

                          <div className="space-y-1">
                             <button onClick={addJamToPlan} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 text-left transition-colors group">
                                <ArrowRight size={16} className="text-white/40 group-hover:text-[#F2E8CF]" />
                                <span className="text-xs font-semibold text-white/60 group-hover:text-white">Add to Plan</span>
                             </button>
                             <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 text-left transition-colors group">
                                <Settings size={16} className="text-white/40 group-hover:text-[#F2E8CF]" />
                                <span className="text-xs font-semibold text-white/60 group-hover:text-white">Preferences</span>
                             </button>
                             <button onClick={archiveJam} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 text-left transition-colors group">
                                <Archive size={16} className="text-white/40 group-hover:text-[#F2E8CF]" />
                                <span className="text-xs font-semibold text-white/60 group-hover:text-white">Archive Jam</span>
                             </button>
                          </div>

                          <div className="mt-auto pt-4 border-t border-white/8 pb-4">
                             <button className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-red-500/10 text-left transition-colors text-white/40 hover:text-red-400 border border-white/8 hover:border-red-500/15">
                                <LogOut size={16} />
                                <span className="text-xs font-semibold">Leave Jam</span>
                             </button>
                          </div>
                      </motion.div>
                   </>
                )}
             </AnimatePresence>
          </motion.div>
        )}

        {/* CREATE WIZARD - Multi-step like Plans */}
        {view === "create" && (
           <motion.div 
              key="create"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="px-5 flex-1 flex flex-col"
           >
              {/* Back + Progress */}
              <div className="flex items-center justify-between pt-2 mb-3">
                <button onClick={() => setView("list")} className="flex items-center gap-1.5 text-white/40 text-xs font-semibold hover:text-white transition-colors">
                    <ArrowLeft size={14} /> Cancel
                </button>
                <div className="flex gap-1.5">
                  {(["name", "style", "events"] as CreateStep[]).map((s, i) => (
                    <div key={s} className={clsx("h-1.5 rounded-full transition-all", 
                      s === createStep ? "w-5 bg-[#F2E8CF]" : 
                      (["name", "style", "events"].indexOf(createStep) > i ? "w-2.5 bg-[#F2E8CF]/40" : "w-2.5 bg-white/10")
                    )} />
                  ))}
                </div>
              </div>

              <div className="flex-1 flex flex-col justify-center">
                <AnimatePresence mode="wait">
                  {/* Step 1: Name + Image + Date */}
                  {createStep === "name" && (
                    <motion.div key="name" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="bg-[#1a2e12]/60 backdrop-blur-xl rounded-2xl border border-white/8 p-5 shadow-2xl"
                    >
                      <p className="text-[10px] text-white/30 capitalize tracking-wider font-semibold mb-1">Step 1 of 3</p>
                      <h2 className="text-2xl font-bold text-white mb-1">Name your jam</h2>
                      <p className="text-sm text-white/35 mb-5">Give it a vibe.</p>

                      {/* Profile image */}
                      <div className="flex justify-center mb-5">
                        <label className="relative w-16 h-16 rounded-2xl bg-white/5 border-2 border-dashed border-white/12 flex items-center justify-center cursor-pointer hover:border-[#F2E8CF]/30 transition-colors overflow-hidden group">
                          {profileImage ? <img src={profileImage} className="w-full h-full object-cover" /> : <Camera size={24} className="text-white/15 group-hover:text-[#F2E8CF]/50 transition-colors" />}
                          <input type="file" accept="image/*" className="hidden" onChange={handleProfileImageCreate} />
                        </label>
                      </div>

                      <div className="flex gap-2 mb-4">
                        <input placeholder="e.g. Taco Tuesday" value={newName} onChange={e => setNewName(e.target.value)} 
                          className="flex-1 bg-white/8 border border-white/12 rounded-xl px-4 py-3.5 font-semibold text-white focus:outline-none focus:border-[#F2E8CF]/30 placeholder:text-white/20" autoFocus />
                        <button onClick={generateName} className="px-3 bg-white/10 border border-white/15 rounded-xl text-[#F2E8CF] active:scale-95 transition-transform" title="Generate Name">
                          <Sparkles size={20} />
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 mb-5">
                        <div>
                          <label className="text-[10px] font-semibold text-white/25 capitalize tracking-wider mb-1.5 block flex items-center gap-1"><Calendar size={9} /> Date</label>
                          <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="w-full bg-white/8 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#F2E8CF]/30 [color-scheme:dark]" />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-white/25 capitalize tracking-wider mb-1.5 block flex items-center gap-1"><Clock size={9} /> Time</label>
                          <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} className="w-full bg-white/8 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#F2E8CF]/30 [color-scheme:dark]" />
                        </div>
                      </div>

                      <button onClick={() => setCreateStep("style")} disabled={!newName.trim()}
                        className="w-full py-3 bg-[#F2E8CF] text-[#233216] rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-md disabled:opacity-40 active:scale-[0.97] transition-transform">
                        Next <ArrowRight size={16} />
                      </button>
                    </motion.div>
                  )}

                  {/* Step 2: Decision Style */}
                  {createStep === "style" && (
                    <motion.div key="style" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="bg-[#1a2e12]/60 backdrop-blur-xl rounded-2xl border border-white/8 p-5 shadow-2xl max-h-[80vh] overflow-y-auto"
                    >
                      <p className="text-[10px] text-white/30 capitalize tracking-wider font-semibold mb-1">Step 2 of 3</p>
                      <h2 className="text-xl font-bold text-white mb-1">Vibe & Style</h2>
                      <p className="text-sm text-white/35 mb-4">What kind of jam is this?</p>

                      {/* Category picker */}
                      <p className="text-[10px] font-semibold text-white/30 mb-2">Category</p>
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {jamCategories.map(cat => {
                          const CatIcon = cat.icon;
                          return (
                            <button key={cat.id} onClick={() => setNewCategory(cat.id)}
                              className={clsx("px-3 py-2 rounded-xl text-[10px] font-semibold flex items-center gap-1.5 border transition-all active:scale-95",
                                newCategory === cat.id ? "bg-[#F2E8CF]/15 border-[#F2E8CF] text-[#F2E8CF]" : "bg-white/5 border-white/8 text-white/40"
                              )}>
                              <CatIcon size={12} /> {cat.label}
                            </button>
                          );
                        })}
                      </div>

                      {newCategory === "custom" && (
                        <input
                          placeholder="Type your category..."
                          value={newCustomCategory}
                          onChange={e => setNewCustomCategory(e.target.value)}
                          className="w-full bg-white/8 border border-white/12 rounded-xl px-4 py-2.5 text-sm text-white mb-4 focus:outline-none focus:border-[#F2E8CF]/30 placeholder:text-white/20"
                        />
                      )}

                      {/* Decision style */}
                      <p className="text-[10px] font-semibold text-white/30 mb-2">Decision Style</p>
                      <div className="grid grid-cols-2 gap-2 mb-5">
                        <button onClick={() => setNewType("locked")}
                          className={clsx("p-4 rounded-xl border-2 text-center transition-all active:scale-95 flex flex-col items-center gap-1.5", newType === "locked" ? "bg-[#F2E8CF]/10 border-[#F2E8CF] text-[#F2E8CF]" : "bg-white/4 border-white/8 text-white/35")}
                        >
                           <Lock size={22} />
                           <span className="text-xs font-bold block">Locked</span>
                           <span className="text-[9px] opacity-60 font-normal block">You decide</span>
                        </button>
                        <button onClick={() => setNewType("voting")}
                          className={clsx("p-4 rounded-xl border-2 text-center transition-all active:scale-95 flex flex-col items-center gap-1.5", newType === "voting" ? "bg-[#F2E8CF]/10 border-[#F2E8CF] text-[#F2E8CF]" : "bg-white/4 border-white/8 text-white/35")}
                        >
                           <Vote size={22} />
                           <span className="text-xs font-bold block">Voting</span>
                           <span className="text-[9px] opacity-60 font-normal block">Group votes</span>
                        </button>
                      </div>

                      <div className="flex gap-3">
                        <button onClick={() => setCreateStep("name")} className="flex-1 py-3 text-white/25 font-semibold rounded-xl border border-white/8 bg-white/4 active:scale-[0.97] transition-transform">Back</button>
                        <button onClick={() => setCreateStep("events")} className="flex-1 py-3 bg-[#F2E8CF] text-[#233216] rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-md active:scale-[0.97] transition-transform">
                          Next <ArrowRight size={16} />
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* Step 3: Add Spots */}
                  {createStep === "events" && (
                    <motion.div key="events" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="bg-[#1a2e12]/60 backdrop-blur-xl rounded-2xl border border-white/8 p-5 shadow-2xl max-h-[75vh] flex flex-col"
                    >
                      <p className="text-[10px] text-white/30 capitalize tracking-wider font-semibold mb-1">Step 3 of 3</p>
                      <h2 className="text-2xl font-bold text-white mb-1">Add spots</h2>
                      <p className="text-sm text-white/35 mb-3">Find places for the crew.</p>

                      <div className="relative mb-3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={14} />
                        <input type="text" placeholder="Search places..." value={eventSearch} onChange={e => setEventSearch(e.target.value)}
                          className="w-full bg-white/6 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#F2E8CF]/25"
                        />
                      </div>

                      {/* Search results */}
                      <div className="flex-1 overflow-y-auto space-y-1 max-h-[140px] mb-3">
                        {searchedPlaces.map(p => (
                          <button key={p.id} onClick={() => addEventToJam(p.name, p.id)}
                            className="w-full flex items-center gap-2.5 p-2 rounded-lg bg-white/4 border border-white/6 active:bg-white/8 transition-colors text-left">
                            <img src={p.image} className="w-8 h-8 rounded-md object-cover flex-shrink-0" loading="lazy" />
                            <div className="flex-1 min-w-0"><p className="text-[11px] font-semibold text-white/65 truncate">{p.name}</p><p className="text-[9px] text-white/25">{p.category}</p></div>
                            <Plus size={14} className="text-white/20" />
                          </button>
                        ))}
                      </div>

                      {/* Added spots */}
                      {newEvents.length > 0 && (
                        <div className="mb-3">
                           <p className="text-[9px] font-semibold text-white/25 capitalize tracking-wider mb-1.5">Your Spots ({newEvents.length})</p>
                           <div className="flex flex-col gap-1.5 max-h-[100px] overflow-y-auto">
                              {newEvents.map((e, idx) => (
                                <div key={e.id} className="flex items-center gap-2 bg-[#F2E8CF]/8 p-2 rounded-lg border border-[#F2E8CF]/8">
                                   <div className="w-5 h-5 rounded-full bg-[#F2E8CF]/15 flex items-center justify-center text-[10px] font-bold text-[#F2E8CF]/70">{idx + 1}</div>
                                   <MapPin size={12} className="text-[#008080]/60" />
                                   <span className="text-xs font-semibold text-white/75 truncate flex-1">{e.name}</span>
                                   <button onClick={() => removeEventFromJam(e.id)} className="text-white/25 hover:text-white/60"><Trash2 size={12} /></button>
                                </div>
                              ))}
                           </div>
                        </div>
                      )}

                      <div className="flex gap-3 mt-auto">
                        <button onClick={() => setCreateStep("style")} className="flex-1 py-3 text-white/25 font-semibold rounded-xl border border-white/8 bg-white/4">Back</button>
                        <button onClick={finishCreate} className="flex-1 py-3 bg-[#F2E8CF] text-[#233216] rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-md active:scale-[0.97] transition-transform">
                          <CheckCircle2 size={16} /> Create
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
           </motion.div>
        )}
      </AnimatePresence>

      {/* Add Event Modal */}
      <AnimatePresence>
         {showAddEvent && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-end justify-center" onClick={() => setShowAddEvent(false)}>
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={e => e.stopPropagation()} className="w-full max-w-md bg-[#1a2e12]/95 backdrop-blur-2xl rounded-t-2xl p-4 border-t border-white/10 h-[60vh] flex flex-col shadow-2xl">
                  <div className="w-12 h-1 bg-white/15 rounded-full mx-auto mb-5" />
                  <h3 className="text-sm font-bold text-white mb-3">Add a Spot</h3>
                  <input placeholder="Search spots..." value={eventSearch} onChange={e => setEventSearch(e.target.value)} className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-3 mb-3 text-sm text-white focus:outline-none focus:border-[#F2E8CF]/30 placeholder:text-white/20" />
                  <div className="flex-1 overflow-y-auto space-y-2">
                     {searchedPlaces.map(p => (
                        <button key={p.id} onClick={() => addEventToJam(p.name, p.id)} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 text-left transition-colors group">
                           <img src={p.image} className="w-10 h-10 rounded-lg object-cover" />
                           <div className="flex-1">
                              <p className="text-xs font-semibold text-white group-hover:text-[#F2E8CF] transition-colors">{p.name}</p>
                              <p className="text-[10px] text-white/35">{p.category}</p>
                           </div>
                           <Plus size={16} className="text-white/15 group-hover:text-[#F2E8CF]" />
                        </button>
                     ))}
                  </div>
               </motion.div>
            </motion.div>
         )}
      </AnimatePresence>
      <BottomNav />
    </div>
  );
}